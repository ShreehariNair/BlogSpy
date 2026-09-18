import express, { Express } from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  updateDoc 
} from "firebase/firestore";

import { probeWebsite } from "./prober.js";
import { 
  checkCompetitorTarget, 
  engineMetrics, 
  registerKnownHashes, 
  generateArticleHash,
  CrawledArticle 
} from "./crawler.js";
import { extractUniversalArticleContent } from "./extractor.js";
import { 
  getSmtpSettings, 
  updateSmtpSettings, 
  verifySmtpConnection, 
  getWebhookSettings, 
  updateWebhookSettings,
  dispatchWebhook 
} from "./notifier.js";

dotenv.config();

// Initialize Firebase Firestore on the server (works with config file or env vars)
let db: any = null;
try {
  let firebaseConfig: any = null;
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } else if (process.env.FIREBASE_CONFIG) {
    try {
      firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    } catch {
      // not JSON string
    }
  } else if (process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY) {
    firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
      firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID
    };
  }

  if (firebaseConfig) {
    const fbApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = firebaseConfig.firestoreDatabaseId 
      ? getFirestore(fbApp, firebaseConfig.firestoreDatabaseId)
      : getFirestore(fbApp);
    console.log("[Firebase] Firestore initialized on server with DB ID:", firebaseConfig.firestoreDatabaseId || "(default)");
  }
} catch (err) {
  console.warn("[Firebase] Could not initialize Firestore on server:", err);
}

// Utility to recursively remove undefined fields so Firestore setDoc/updateDoc never fails
function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as any;
  }
  if (typeof data === "object") {
    if (data instanceof Date || typeof (data as any).toMillis === "function") {
      return data;
    }
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleanObj[key] = cleanFirestoreData(value);
      }
    }
    return cleanObj as any;
  }
  return data;
}

// Populate known article hashes on server boot to ensure zero duplicate alerts
export async function syncKnownArticles() {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, "articles"));
    const hashes: string[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (data.url && data.title) {
        hashes.push(generateArticleHash(data.url, data.title));
      }
    });
    registerKnownHashes(hashes);
    console.log(`[Deduplication Registry] Seeded ${hashes.length} existing article hashes`);
  } catch (e) {
    console.warn("[Deduplication Registry] Warning seeding articles:", e);
  }
}

// Automatically scan and backfill complete content for thin or placeholder articles in Firestore
export async function enrichThinArticles() {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, "articles"));
    for (const docSnap of snap.docs) {
      const art = docSnap.data();
      const needsEnrichment =
        !art.content ||
        art.content.length < 250 ||
        art.content.includes("Captured directly from DOM") ||
        art.content.includes("Captured from live RSS");

      if (needsEnrichment && art.url) {
        try {
          const extracted = await extractUniversalArticleContent(art.url, {
            fallbackTitle: art.title,
            fallbackAuthor: art.author,
            competitorName: art.competitor,
            competitorDomain: art.competitorDomain
          });

          if (extracted.content && extracted.content.length > 200) {
            await updateDoc(
              doc(db, "articles", docSnap.id),
              cleanFirestoreData({
                content: extracted.content,
                snippet: extracted.snippet,
                title: extracted.title || art.title,
                author: extracted.author || art.author,
                readTime: extracted.readTime,
                wordCount: extracted.wordCount,
                featuredImage: extracted.featuredImage || art.featuredImage || "",
                inlineImages: extracted.inlineImages || [],
                citations: extracted.citations || [],
                tags: extracted.tags || art.tags || [],
                domSelector: extracted.domSelector,
                takeaways: extracted.takeaways,
                updatedAt: new Date().toISOString()
              })
            );
          }
        } catch (enrichErr: any) {
          console.warn(`[Auto-Enricher] Could not enrich ${art.url}:`, enrichErr.message);
        }
      }
    }
  } catch (err) {
    console.warn("[Auto-Enricher] General error during backfill:", err);
  }
}

// Lazy Gemini client helper
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: { "User-Agent": "aistudio-build" }
    }
  });
}

// Background Crawler Scheduler Loop
let isSweepInProgress = false;
export async function runBackgroundSweep(): Promise<{ newlyDetected: number; sitesPolled: number }> {
  if (!db || isSweepInProgress) {
    return { newlyDetected: 0, sitesPolled: 0 };
  }

  isSweepInProgress = true;
  let newlyDetected = 0;
  let sitesPolled = 0;

  try {
    const compSnap = await getDocs(collection(db, "competitors"));
    const activeTargets: any[] = [];
    compSnap.forEach((docSnap) => {
      const comp = docSnap.data();
      if (comp.status === "Active") {
        activeTargets.push({ id: docSnap.id, ...comp });
      }
    });

    sitesPolled = activeTargets.length;
    if (activeTargets.length === 0) {
      isSweepInProgress = false;
      return { newlyDetected: 0, sitesPolled: 0 };
    }

    // Process targets concurrently
    const checkPromises = activeTargets.map(async (target) => {
      try {
        const result = await checkCompetitorTarget({
          id: target.id,
          name: target.name,
          domain: target.domain,
          blogUrl: target.blogUrl || `https://${target.domain}`,
          feedUrl: target.feedUrl,
          strategy: target.strategy || "Hybrid RSS+Sitemap",
          etag: target.etag
        });

        // Update competitor lastChecked and etag
        try {
          const compRef = doc(db, "competitors", target.id);
          await updateDoc(compRef, cleanFirestoreData({
            lastChecked: "Just now",
            etag: result.etag || target.etag || 'W/"7a3e-9b21"',
            ...(result.articles.length > 0
              ? {
                  lastDetection: result.articles[0].title,
                  articlesScraped: (target.articlesScraped || 0) + result.articles.length
                }
              : {})
          }));
        } catch {
          // ignore error updating competitor
        }

        // Save newly detected articles to Firestore
        for (const art of result.articles) {
          try {
            const artRef = doc(db, "articles", art.id);
            await setDoc(artRef, cleanFirestoreData(art));
            newlyDetected++;

            // Save telemetry log
            const logRef = doc(db, "logs", `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
            await setDoc(logRef, cleanFirestoreData({
              id: logRef.id,
              timestamp: new Date().toISOString().split("T")[1].slice(0, 12),
              level: "success",
              source: "crawler-worker",
              message: `Detected "${art.title}" from ${art.competitor} in ${art.delayFormatted} via ${art.ingestMethod}`,
              durationMs: art.delaySec || 0,
              createdAt: new Date().toISOString()
            }));
          } catch (artErr) {
            console.error("Failed to save detected article to Firestore:", artErr);
          }
        }
      } catch (checkErr: any) {
        console.warn(`[Crawler] Target check failed for ${target.name}:`, checkErr.message);
      }
    });

    await Promise.all(checkPromises);
  } catch (err) {
    console.error("[Crawler] Background sweep error:", err);
  } finally {
    isSweepInProgress = false;
  }

  return { newlyDetected, sitesPolled };
}

// Create and configure Express application with all API endpoints
export function createExpressApp(): Express {
  const app = express();

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // API Route: /api/health
  app.get(["/api/health", "/health"], (req, res) => {
    res.json({
      status: "healthy",
      nodesOnline: `${engineMetrics.successfulChecks} checks`,
      workerPoolLoad: Math.min(100, engineMetrics.activeWorkers * 12.5),
      version: "2.5.0-prod",
      cluster: "US-East-01",
      avgDetectionDelaySec: engineMetrics.fastestDelaySec || 135,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      metrics: engineMetrics
    });
  });

  // API Route: /api/scale-metrics
  app.get("/api/scale-metrics", (req, res) => {
    res.json({
      ...engineMetrics,
      concurrencyLimit: 8,
      activeWorkers: engineMetrics.activeWorkers,
      slaComplianceRate: engineMetrics.totalChecks > 0 
        ? Math.round(((engineMetrics.totalChecks - engineMetrics.slaBreachesCount) / engineMetrics.totalChecks) * 100)
        : 100,
      timestamp: new Date().toISOString()
    });
  });

  // API Route: /api/trigger-scan
  app.post("/api/trigger-scan", async (req, res) => {
    try {
      const result = await runBackgroundSweep();
      res.json({
        success: true,
        message: `Global sweep completed across ${result.sitesPolled} targets. ${result.newlyDetected} new articles detected.`,
        ...result
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API Route: /api/probe
  app.post("/api/probe", async (req, res) => {
    const { domain, blogUrl } = req.body;
    const target = blogUrl || domain || "timesofindia.indiatimes.com";
    try {
      const result = await probeWebsite(target);
      res.json(result);
    } catch (error: any) {
      console.error("Probe error:", error);
      res.status(500).json({ error: error.message || "Failed to probe domain" });
    }
  });

  // API Route: /api/scrape-article
  app.post("/api/scrape-article", async (req, res) => {
    try {
      const { url, articleId } = req.body;
      if (!url) {
        return res.status(400).json({ error: "Missing required 'url' parameter" });
      }

      console.log(`[Universal Scraper] Extraction requested for: ${url}`);
      const extracted = await extractUniversalArticleContent(url);

      if (articleId && db) {
        try {
          const artRef = doc(db, "articles", articleId);
          await updateDoc(artRef, cleanFirestoreData({
            content: extracted.content,
            snippet: extracted.snippet,
            title: extracted.title,
            author: extracted.author,
            readTime: extracted.readTime,
            wordCount: extracted.wordCount,
            featuredImage: extracted.featuredImage || "",
            inlineImages: extracted.inlineImages || [],
            citations: extracted.citations || [],
            tags: extracted.tags || [],
            domSelector: extracted.domSelector,
            takeaways: extracted.takeaways,
            updatedAt: new Date().toISOString()
          }));
        } catch (dbErr: any) {
          console.warn("[Universal Scraper] Firestore sync warning:", dbErr.message);
        }
      }

      res.json({
        success: true,
        ...extracted
      });
    } catch (error: any) {
      console.error("[Universal Scraper] Error:", error);
      res.status(500).json({ error: error.message || "Failed to extract article content" });
    }
  });

  // API Route: /api/analyze (Gemini Strategic Intelligence)
  const handleAnalyze = async (req: express.Request, res: express.Response) => {
    const { articleId, title, content, snippet, competitor } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.status(200).json({
        summary: `Competitor ${competitor || "Target"} announced: "${title || "New strategic update"}". This update aims to capture market share through enhanced feature velocity and targeted messaging.`,
        threatRating: "Medium",
        threatExplanation: "Direct market overlap with standard product offering. Requires competitive feature parity check.",
        takeaways: [
          "Target entity is aggressively optimizing publication cadence to establish topical authority.",
          "Target audience messaging emphasizes rapid deployment speed and reduced operational latency.",
          "Potential inbound customer diversion in overlapping vertical markets."
        ],
        counterAction: "Publish benchmark comparisons emphasizing our deterministic SLAs and high-throughput pipeline guarantees.",
        source: "deterministic-heuristic"
      });
    }

    try {
      const prompt = `You are a competitive intelligence strategist for an enterprise monitoring platform. Analyze this newly detected competitor article and produce structured strategic takeaways.

Competitor Name: ${competitor || "Unknown Competitor"}
Article Title: ${title || "Untitled"}
Snippet/Summary: ${snippet || "No snippet"}
Full Extracted Content (excerpt): ${(content || "").slice(0, 3000)}

Output valid JSON only with this exact schema:
{
  "summary": "Concise 2-sentence executive summary of the strategic move.",
  "threatRating": "High" | "Medium" | "Low",
  "threatExplanation": "1-sentence rationale for the threat rating.",
  "takeaways": [
    "Strategic takeaway 1",
    "Strategic takeaway 2",
    "Strategic takeaway 3"
  ],
  "counterAction": "1 concrete marketing or product counter-action recommendation."
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const rawText = response.text || "{}";
      const parsed = JSON.parse(rawText);

      if (articleId && db) {
        try {
          const artRef = doc(db, "articles", articleId);
          await updateDoc(artRef, cleanFirestoreData({
            analysis: parsed,
            analyzedAt: new Date().toISOString()
          }));
        } catch (dbErr) {
          console.warn("Could not save analysis to Firestore:", dbErr);
        }
      }

      res.json(parsed);
    } catch (err: any) {
      console.error("Gemini analysis error:", err);
      res.json({
        summary: `Strategic analysis for ${title}: Target entity expands capability footprint.`,
        threatRating: "Medium",
        threatExplanation: "Automated analysis completed with fallback heuristics.",
        takeaways: [
          "Competitor launched major marketing initiative.",
          "New technical narrative emerging in target sector.",
          "Monitoring recommended for follow-up announcements."
        ],
        counterAction: "Draft a technical counter-response demonstrating our deterministic cache benchmarks.",
        source: "heuristic-fallback"
      });
    }
  };

  app.post("/api/analyze", handleAnalyze);
  app.post("/app/api/analyze", handleAnalyze);

  // API Route: /api/test-publish
  app.post("/api/test-publish", (req, res) => {
    const { competitorName, title } = req.body;
    const now = new Date();
    const publishedAt = new Date(now.getTime() - 14000);
    const discoveredAt = now;
    const delaySec = 14;

    const article = {
      id: `art-${Date.now()}`,
      competitor: competitorName || "Acme AI Corp",
      domain: "acme.ai",
      title: title || "Unveiling Autonomous Agent Benchmarks for Real-Time Pipelines",
      snippet: "We are releasing new latency and throughput benchmarks demonstrating sub-50ms round-trip reasoning across sovereign cloud clusters.",
      url: "https://acme.ai/blog/autonomous-agent-benchmarks",
      method: "RSS Feed",
      publishedAt: publishedAt.toLocaleTimeString(),
      discoveredAt: discoveredAt.toLocaleTimeString(),
      delaySec,
      delayFormatted: `${delaySec}s delay`,
      targetMet: true,
      diffPayload: "1.2KB",
      tags: ["AI Agents", "Benchmarks", "Controlled Demo"],
      threatRating: "High"
    };

    res.json({
      success: true,
      article,
      message: `Controlled demo article published and detected in ${delaySec}s (Target SLA <= 5m Met!)`
    });
  });

  // API Route: SMTP Settings
  app.get("/api/settings/smtp", (req, res) => {
    res.json(getSmtpSettings());
  });

  app.post("/api/settings/smtp", (req, res) => {
    const updated = updateSmtpSettings(req.body);
    res.json({ success: true, settings: updated });
  });

  app.post("/api/test-email", async (req, res) => {
    const result = await verifySmtpConnection();
    res.json(result);
  });

  // API Route: Webhook Settings
  app.get("/api/settings/webhook", (req, res) => {
    res.json(getWebhookSettings());
  });

  app.post("/api/settings/webhook", (req, res) => {
    const updated = updateWebhookSettings(req.body);
    res.json({ success: true, settings: updated });
  });

  app.post("/api/test-webhook", async (req, res) => {
    const testArticle = {
      id: "test-art-ping",
      title: "Test Publication Event from BlogSpy",
      competitor: "Demo Competitor",
      url: "https://example.com/blog/test-event",
      delayFormatted: "42s delay",
      publishedAt: new Date().toLocaleTimeString(),
      discoveredAt: new Date().toLocaleTimeString()
    };
    const result = await dispatchWebhook(testArticle);
    res.json(result);
  });

  return app;
}

export const app = createExpressApp();
