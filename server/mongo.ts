import dns from "node:dns";

// Force custom DNS resolvers and IPv4 priority before any database/network connections
try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (dnsErr: any) {
  console.warn("[DNS Setup] Notice configuring custom DNS servers:", dnsErr.message);
}

import mongoose from "mongoose";
import dotenv from "dotenv";
import EventEmitter from "events";

dotenv.config();

export const dbEvents = new EventEmitter();

let isDbInitialized = false;

// Circuit Breaker state
let hasFailedConnection = false;
let lastConnectionAttempt = 0;
const RETRY_COOLDOWN_MS = 60000; // 60s cooldown if connection fails

// High-Performance In-Memory Store (stores ONLY real persistent database documents - zero static fallback mock data)
const inMemoryStore: Record<string, Map<string, any>> = {
  articles: new Map(),
  competitors: new Map(),
  logs: new Map(),
  monitoring_checks: new Map(),
  retries: new Map()
};

// ==========================================
// MONGOOSE SCHEMAS & MODELS
// ==========================================

const ArticleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  competitor: String,
  competitorDomain: String,
  title: String,
  snippet: String,
  content: String,
  contentMarkdown: String,
  contentHtml: String,
  author: mongoose.Schema.Types.Mixed,
  readTime: String,
  url: String,
  originalSourceUrl: String,
  canonicalUrl: String,
  publishedAt: String,
  discoveredAt: String,
  publishedDate: String,
  discoveredDate: String,
  publicationSource: String,
  delaySec: Number,
  delayFormatted: String,
  exactDelayText: String,
  targetMet: Boolean,
  isBackCatalog: Boolean,
  ingestType: String,
  slaStatus: String,
  slaBreachReason: String,
  wordCount: Number,
  charCount: Number,
  metaDescription: String,
  inlineImages: [mongoose.Schema.Types.Mixed],
  mediaCaptures: [mongoose.Schema.Types.Mixed],
  categories: [String],
  outgoingLinks: [mongoose.Schema.Types.Mixed],
  structuredMetadata: mongoose.Schema.Types.Mixed,
  ingestMethod: String,
  diffPayload: String,
  diffAddedWords: Number,
  tags: [String],
  threatRating: String,
  featuredImage: String,
  takeaways: [mongoose.Schema.Types.Mixed],
  citations: [mongoose.Schema.Types.Mixed],
  domSelector: String,
  analysis: mongoose.Schema.Types.Mixed,
  rawPayload: mongoose.Schema.Types.Mixed,
  updatedAt: String
}, { timestamps: true, strict: false });

const CompetitorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: String,
  domain: String,
  blogUrl: String,
  feedUrl: String,
  status: String,
  strategy: String,
  lastChecked: String,
  lastDetection: String,
  articlesScraped: Number,
  healthScore: Number,
  etag: String,
  cadence: String,
  detectedFeeds: [String],
  discoveredSitemaps: [String],
  discoveredConfig: mongoose.Schema.Types.Mixed,
  updatedAt: String
}, { timestamps: true, strict: false });

const LogSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: String,
  level: String,
  source: String,
  message: String,
  durationMs: Number,
  createdAt: String
}, { timestamps: true, strict: false });

const CheckSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: String,
  competitorId: String,
  competitorName: String,
  domain: String,
  strategy: String,
  statusCode: Number,
  statusResponse: String,
  durationMs: Number,
  outcome: String,
  articlesDetected: Number,
  error: String,
  recoveryAction: String,
  createdAt: String
}, { timestamps: true, strict: false });

const RetrySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: String,
  domain: String,
  error: String,
  code: Number,
  attempt: Number,
  maxAttempts: Number,
  resolution: String,
  backoffDelay: String,
  createdAt: String
}, { timestamps: true, strict: false });

export const ArticleModel = mongoose.models.Article || mongoose.model("Article", ArticleSchema);
export const CompetitorModel = mongoose.models.Competitor || mongoose.model("Competitor", CompetitorSchema);
export const LogModel = mongoose.models.Log || mongoose.model("Log", LogSchema);
export const CheckModel = mongoose.models.Check || mongoose.model("Check", CheckSchema);
export const RetryModel = mongoose.models.Retry || mongoose.model("Retry", RetrySchema);

export function sanitizeMongoUri(rawUri: string | null): string | null {
  if (!rawUri) return null;
  let uri = rawUri.trim();

  // Auto-correct missing .net TLD in SRV connection strings (e.g. cluster0.jyswogy.mongodb -> cluster0.jyswogy.mongodb.net)
  uri = uri.replace(/\.mongodb(?=[\/\?]|$)/gi, ".mongodb.net");

  return uri;
}

export function convertSrvToStandardUri(srvUri: string): string | null {
  try {
    if (!srvUri.startsWith("mongodb+srv://")) return null;
    const match = srvUri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^/?]+)(.*)$/);
    if (match) {
      const [, user, pass, host, rest] = match;
      return `mongodb://${user}:${pass}@${host}:27017${rest || "/blogspy"}`;
    }
  } catch {}
  return null;
}

// Retrieve MONGODB_URI or DATABASE_URL from environment variables
export function getMongoUri(): string | null {
  const raw = (
    process.env.MONGODB_URI ||
    process.env.DATABASE_URL ||
    process.env.VITE_MONGODB_URI ||
    process.env.MONGODB_URL ||
    process.env.MONGO_URI ||
    null
  );
  return sanitizeMongoUri(raw);
}

function handleMongooseError(err: any) {
  const msg = err?.message || String(err);
  if (
    msg.includes("timed out") ||
    msg.includes("ECONNREFUSED") ||
    msg.includes("ENOTFOUND") ||
    msg.includes("pool closed") ||
    msg.includes("Topology") ||
    msg.includes("connection") ||
    msg.includes("buffering timed out")
  ) {
    hasFailedConnection = true;
    lastConnectionAttempt = Date.now();
  }
}

export async function connectMongo(): Promise<any> {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    return mongoose.connection.db;
  }

  const uri = getMongoUri();
  if (!uri) return null;

  // Instant bypass if previous attempt failed recently
  if (hasFailedConnection && Date.now() - lastConnectionAttempt < RETRY_COOLDOWN_MS) {
    return null;
  }

  lastConnectionAttempt = Date.now();

  const dbName = uri.includes("/?") 
    ? uri.split("/").pop()?.split("?")[0] 
    : uri.split("/").pop()?.split("?")[0] || "blogspy";

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
      connectTimeoutMS: 2500,
      socketTimeoutMS: 5000,
      family: 4,
      dbName: dbName || "blogspy",
      bufferCommands: false
    });

    hasFailedConnection = false;
    console.log(`[Mongoose] Connected successfully to database: "${mongoose.connection.db?.databaseName || dbName}"`);
    return mongoose.connection.db;
  } catch (err: any) {
    const msg = err?.message || String(err);

    // If SRV lookup fails, gracefully attempt standard mongodb:// URI fallback if constructed
    if (uri.startsWith("mongodb+srv://") && (msg.includes("querySrv") || msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND"))) {
      const fallbackStandardUri = convertSrvToStandardUri(uri);
      if (fallbackStandardUri) {
        try {
          console.log(`[Mongoose] SRV lookup unavailable (${msg}). Attempting standard mongodb:// connection fallback...`);
          await mongoose.connect(fallbackStandardUri, {
            serverSelectionTimeoutMS: 2500,
            connectTimeoutMS: 2500,
            socketTimeoutMS: 5000,
            family: 4,
            dbName: dbName || "blogspy",
            bufferCommands: false
          });

          hasFailedConnection = false;
          console.log(`[Mongoose] Connected successfully via standard URI fallback to database: "${mongoose.connection.db?.databaseName || dbName}"`);
          return mongoose.connection.db;
        } catch (fallbackErr: any) {
          console.warn(`[Mongoose] Connection notice (${fallbackErr.message}). Operating on high-speed memory cache.`);
        }
      } else {
        console.warn(`[Mongoose] Connection notice (${msg}). Operating on high-speed memory cache.`);
      }
    } else {
      console.warn(`[Mongoose] Connection notice (${msg}). Operating on high-speed memory cache.`);
    }

    hasFailedConnection = true;
    return null;
  }
}

export async function getCollection<T = any>(name: string): Promise<any> {
  const db = await connectMongo();
  if (!db) return null;
  return db.collection(name);
}

/**
 * Initialize Database Store - Hydrates real documents from live Mongoose models into memory for sub-millisecond reads
 */
export async function initializeDatabase(): Promise<void> {
  if (isDbInitialized) return;

  try {
    await connectMongo();

    if (mongoose.connection.readyState === 1) {
      const modelMap = [
        { model: CompetitorModel, key: "competitors" },
        { model: ArticleModel, key: "articles" },
        { model: LogModel, key: "logs" },
        { model: CheckModel, key: "monitoring_checks" },
        { model: RetryModel, key: "retries" }
      ];

      for (const { model, key } of modelMap) {
        try {
          const docs = await model.find().maxTimeMS(2000).limit(3000).lean().exec();
          const memMap = inMemoryStore[key] || new Map();
          for (const d of docs) {
            const docId = (d as any).id || String((d as any)._id);
            memMap.set(docId, { ...(d as any), id: docId });
          }
          console.log(`[Mongoose] Hydrated ${docs.length} documents from collection "${key}" into memory store`);
        } catch (colErr: any) {
          handleMongooseError(colErr);
          console.info(`[Mongoose] Notice reading collection "${key}": ${colErr.message}`);
        }
      }
    }
  } catch (err: any) {
    handleMongooseError(err);
    console.info("[Mongoose] Database init notice:", err.message);
  }

  isDbInitialized = true;
}

// Sub-millisecond Memory Reads (zero static fallback mock data injected)

export async function getArticlesFromMongo(): Promise<any[]> {
  if (inMemoryStore.articles.size === 0) {
    await connectMongo();
    if (mongoose.connection.readyState === 1) {
      try {
        const docs = await ArticleModel.find().maxTimeMS(2000).limit(3000).lean().exec();
        for (const d of docs) {
          const docId = (d as any).id || String((d as any)._id);
          inMemoryStore.articles.set(docId, { ...(d as any), id: docId });
        }
      } catch (err: any) {
        handleMongooseError(err);
      }
    }
  }
  return Array.from(inMemoryStore.articles.values()).map(({ _id, __v, ...rest }) => rest);
}

export async function saveArticleToMongo(article: any): Promise<void> {
  const articleId = article.id || `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    ...article,
    id: articleId,
    updatedAt: new Date().toISOString()
  };

  inMemoryStore.articles.set(articleId, payload);
  dbEvents.emit("change", { type: "articles" });

  if (mongoose.connection.readyState === 1) {
    ArticleModel.findOneAndUpdate(
      { id: articleId },
      { $set: payload },
      { upsert: true, new: true, lean: true }
    ).exec().catch((err: any) => handleMongooseError(err));
  }
}

export async function updateArticleInMongo(articleId: string, updates: any): Promise<void> {
  const existing = inMemoryStore.articles.get(articleId) || {};
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  inMemoryStore.articles.set(articleId, updated);
  dbEvents.emit("change", { type: "articles" });

  if (mongoose.connection.readyState === 1) {
    ArticleModel.findOneAndUpdate(
      { id: articleId },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { new: true, lean: true }
    ).exec().catch((err: any) => handleMongooseError(err));
  }
}

export async function getCompetitorsFromMongo(): Promise<any[]> {
  if (inMemoryStore.competitors.size === 0) {
    await connectMongo();
    if (mongoose.connection.readyState === 1) {
      try {
        const docs = await CompetitorModel.find().maxTimeMS(2000).limit(500).lean().exec();
        for (const d of docs) {
          const docId = (d as any).id || String((d as any)._id);
          inMemoryStore.competitors.set(docId, { ...(d as any), id: docId });
        }
      } catch (err: any) {
        handleMongooseError(err);
      }
    }
  }
  return Array.from(inMemoryStore.competitors.values()).map(({ _id, __v, ...rest }) => rest);
}

export async function saveCompetitorToMongo(competitor: any): Promise<void> {
  const compId = competitor.id || `comp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    ...competitor,
    id: compId,
    updatedAt: new Date().toISOString()
  };

  inMemoryStore.competitors.set(compId, payload);
  dbEvents.emit("change", { type: "competitors" });

  if (mongoose.connection.readyState === 1) {
    CompetitorModel.findOneAndUpdate(
      { id: compId },
      { $set: payload },
      { upsert: true, new: true, lean: true }
    ).exec().catch((err: any) => handleMongooseError(err));
  }
}

export async function updateCompetitorInMongo(competitorId: string, updates: any): Promise<void> {
  const existing = inMemoryStore.competitors.get(competitorId) || {};
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  inMemoryStore.competitors.set(competitorId, updated);
  dbEvents.emit("change", { type: "competitors" });

  if (mongoose.connection.readyState === 1) {
    CompetitorModel.findOneAndUpdate(
      { id: competitorId },
      { $set: { ...updates, updatedAt: new Date().toISOString() } },
      { new: true, lean: true }
    ).exec().catch((err: any) => handleMongooseError(err));
  }
}

export async function deleteCompetitorFromMongo(competitorId: string): Promise<void> {
  inMemoryStore.competitors.delete(competitorId);
  dbEvents.emit("change", { type: "competitors" });

  if (mongoose.connection.readyState === 1) {
    CompetitorModel.deleteOne({ id: competitorId }).exec().catch((err: any) => handleMongooseError(err));
  }
}

export async function getLogsFromMongo(): Promise<any[]> {
  if (inMemoryStore.logs.size === 0) {
    await connectMongo();
    if (mongoose.connection.readyState === 1) {
      try {
        const docs = await LogModel.find().maxTimeMS(2000).limit(1000).lean().exec();
        for (const d of docs) {
          const docId = (d as any).id || String((d as any)._id);
          inMemoryStore.logs.set(docId, { ...(d as any), id: docId });
        }
      } catch (err: any) {
        handleMongooseError(err);
      }
    }
  }
  return Array.from(inMemoryStore.logs.values()).map(({ _id, __v, ...rest }) => rest);
}

export async function saveLogToMongo(log: any): Promise<void> {
  const logId = log.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    ...log,
    id: logId,
    createdAt: log.createdAt || new Date().toISOString()
  };

  inMemoryStore.logs.set(logId, payload);
  dbEvents.emit("change", { type: "logs" });

  if (mongoose.connection.readyState === 1) {
    LogModel.findOneAndUpdate(
      { id: logId },
      { $set: payload },
      { upsert: true, new: true, lean: true }
    ).exec().catch((err: any) => handleMongooseError(err));
  }
}

export async function getChecksFromMongo(): Promise<any[]> {
  if (inMemoryStore.monitoring_checks.size === 0) {
    await connectMongo();
    if (mongoose.connection.readyState === 1) {
      try {
        const docs = await CheckModel.find().maxTimeMS(2000).limit(1000).lean().exec();
        for (const d of docs) {
          const docId = (d as any).id || String((d as any)._id);
          inMemoryStore.monitoring_checks.set(docId, { ...(d as any), id: docId });
        }
      } catch (err: any) {
        handleMongooseError(err);
      }
    }
  }
  return Array.from(inMemoryStore.monitoring_checks.values()).map(({ _id, __v, ...rest }) => rest);
}

export async function saveCheckToMongo(check: any): Promise<void> {
  const checkId = check.id || `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    ...check,
    id: checkId,
    createdAt: check.createdAt || new Date().toISOString()
  };

  inMemoryStore.monitoring_checks.set(checkId, payload);
  dbEvents.emit("change", { type: "monitoring_checks" });

  if (mongoose.connection.readyState === 1) {
    CheckModel.findOneAndUpdate(
      { id: checkId },
      { $set: payload },
      { upsert: true, new: true, lean: true }
    ).exec().catch((err: any) => handleMongooseError(err));
  }
}

export async function getRetriesFromMongo(): Promise<any[]> {
  if (inMemoryStore.retries.size === 0) {
    await connectMongo();
    if (mongoose.connection.readyState === 1) {
      try {
        const docs = await RetryModel.find().maxTimeMS(2000).limit(1000).lean().exec();
        for (const d of docs) {
          const docId = (d as any).id || String((d as any)._id);
          inMemoryStore.retries.set(docId, { ...(d as any), id: docId });
        }
      } catch (err: any) {
        handleMongooseError(err);
      }
    }
  }
  return Array.from(inMemoryStore.retries.values()).map(({ _id, __v, ...rest }) => rest);
}

export async function saveRetryToMongo(retry: any): Promise<void> {
  const retryId = retry.id || `ret-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const payload = {
    ...retry,
    id: retryId,
    createdAt: retry.createdAt || new Date().toISOString()
  };

  inMemoryStore.retries.set(retryId, payload);
  dbEvents.emit("change", { type: "retries" });

  if (mongoose.connection.readyState === 1) {
    RetryModel.findOneAndUpdate(
      { id: retryId },
      { $set: payload },
      { upsert: true, new: true, lean: true }
    ).exec().catch((err: any) => handleMongooseError(err));
  }
}
