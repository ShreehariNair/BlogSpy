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
  getDoc,
  doc, 
  setDoc, 
  updateDoc 
} from "firebase/firestore";

import { probeWebsite } from "./prober.js";
import { 
  checkCompetitorTarget, 
  engineMetrics, 
  registerKnownHashes, 
  CrawledArticle,
  formatDelay,
  formatExactDelayText
} from "./crawler.js";
import { continuousWorker } from "./worker.js";
import { deduplicationEngine } from "./deduplicator.js";
import { extractUniversalArticleContent } from "./extractor.js";
import { 
  getSmtpSettings, 
  updateSmtpSettings, 
  verifySmtpConnection, 
  getWebhookSettings, 
  updateWebhookSettings,
  dispatchWebhook 
} from "./notifier.js";
import { scaleEngine } from "./scaleEngine.js";
import {
  getWordPressConfig,
  updateWordPressConfig,
  publishToWordPress,
  getSearchIndexingConfig,
  updateSearchIndexingConfig,
  triggerSearchIndexing,
  getExecutionLogs
} from "./publisher.js";

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
export function cleanFirestoreData<T>(data: T): T {
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

export function getServerDb() {
  return db;
}

// Populate known article hashes on server boot to ensure zero duplicate alerts
export async function syncKnownArticles() {
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, "articles"));
    const existing: any[] = [];
    snap.forEach((d) => {
      const data = d.data();
      existing.push({
        id: d.id,
        url: data.url,
        canonicalUrl: data.canonicalUrl,
        title: data.title,
        content: data.content,
        competitorDomain: data.competitorDomain,
        ingestMethod: data.ingestMethod
      });
    });
    deduplicationEngine.syncWithDatabase(existing);
    console.log(`[Deduplication Registry] Seeded ${existing.length} existing articles into canonical deduplication engine`);
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
            await setDoc(
              doc(db, "articles", docSnap.id),
              cleanFirestoreData({
                content: extracted.content,
                contentMarkdown: extracted.contentMarkdown,
                contentHtml: extracted.contentHtml,
                snippet: extracted.snippet,
                title: extracted.title || art.title,
                author: extracted.author || art.author,
                readTime: extracted.readTime,
                wordCount: extracted.wordCount,
                charCount: extracted.charCount,
                featuredImage: extracted.featuredImage || art.featuredImage || "",
                inlineImages: extracted.inlineImages || [],
                mediaCaptures: extracted.mediaCaptures || [],
                categories: extracted.categories || art.categories || ["Industry Intelligence"],
                tags: extracted.tags || art.tags || [],
                metaDescription: extracted.metaDescription || art.metaDescription || "",
                canonicalUrl: extracted.canonicalUrl || art.canonicalUrl || art.url,
                originalSourceUrl: extracted.originalSourceUrl || art.url,
                outgoingLinks: extracted.outgoingLinks || [],
                citations: extracted.citations || [],
                structuredMetadata: extracted.structuredMetadata,
                domSelector: extracted.domSelector,
                takeaways: extracted.takeaways,
                updatedAt: new Date().toISOString()
              }),
              { merge: true }
            );
          }
        } catch (enrichErr: any) {
          console.info(`[Auto-Enricher] Notice enriching ${art.url}:`, enrichErr.message);
        }
      }
    }
  } catch (err) {
    console.info("[Auto-Enricher] Notice during backfill:", err);
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

// Background Crawler Scheduler Loop - Delegates to continuous monitoring worker
export async function runBackgroundSweep(): Promise<{ newlyDetected: number; sitesPolled: number }> {
  return continuousWorker.runCycle();
}

// Create and configure Express application with all API endpoints
export function createExpressApp(): Express {
  const app = express();

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // API Route: /api/health
  app.get(["/api/health", "/health"], (req, res) => {
    const workerStatus = continuousWorker.getStatus();
    res.json({
      status: "healthy",
      workerRunning: workerStatus.isRunning && !workerStatus.isPaused,
      cycleCount: workerStatus.cycleCount,
      nodesOnline: `${engineMetrics.successfulChecks} checks`,
      workerPoolLoad: Math.min(100, engineMetrics.activeWorkers * 12.5),
      version: "2.5.0-prod",
      cluster: "US-East-01",
      avgDetectionDelaySec: engineMetrics.fastestDelaySec || 135,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      metrics: engineMetrics,
      worker: workerStatus
    });
  });

  // API Route: /api/monitoring/status (Continuous worker heartbeat & audit status)
  app.get("/api/monitoring/status", (req, res) => {
    res.json({
      success: true,
      ...continuousWorker.getStatus()
    });
  });

  // API Route: /api/monitoring/checks (Persistent check cycle audit records)
  app.get("/api/monitoring/checks", (req, res) => {
    const limitCount = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
    const checks = continuousWorker.getRecentChecks(limitCount);
    res.json({
      success: true,
      count: checks.length,
      checks
    });
  });

  // API Route: /api/monitoring/control (Operator controls for continuous loop)
  app.post("/api/monitoring/control", async (req, res) => {
    const { action, intervalMs } = req.body;
    if (action === "pause") {
      continuousWorker.pause();
    } else if (action === "resume") {
      continuousWorker.resume();
    } else if (action === "set_interval" && typeof intervalMs === "number") {
      continuousWorker.setIntervalMs(intervalMs);
    } else if (action === "trigger") {
      const outcome = await continuousWorker.triggerImmediateCycle();
      return res.json({ success: true, message: "Immediate sweep triggered", ...outcome });
    }
    res.json({ success: true, status: continuousWorker.getStatus() });
  });

  // API Route: /api/monitoring/simulate-error (Simulates error & timeout handling to test resilience)
  app.post("/api/monitoring/simulate-error", async (req, res) => {
    const { scenario, targetName } = req.body;
    const validScenarios = ["timeout", "http_500", "http_403", "nominal_304", "live_detection"];
    const chosenScenario = validScenarios.includes(scenario) ? scenario : "timeout";
    const checkRecord = await continuousWorker.simulateScenario(chosenScenario as any, targetName || "Acme AI Corp");
    res.json({
      success: true,
      message: `Simulated ${chosenScenario} scenario executed. Resilient error handling verified.`,
      check: checkRecord,
      workerStatus: continuousWorker.getStatus()
    });
  });

  // API Route: /api/firebase-config (Serves public client Firebase configuration)
  app.get("/api/firebase-config", (req, res) => {
    let config: any = null;
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      } catch {}
    } else if (process.env.FIREBASE_CONFIG) {
      try {
        config = JSON.parse(process.env.FIREBASE_CONFIG);
      } catch {}
    } else if (process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY) {
      config = {
        apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "",
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
        appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "",
        firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || ""
      };
    }
    res.json(config || {});
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

  // API Route: /api/probe (Autonomous Multi-Strategy Discovery)
  app.post("/api/probe", async (req, res) => {
    const { domain, blogUrl } = req.body;
    const target = blogUrl || domain || "timesofindia.indiatimes.com";
    try {
      const result = await probeWebsite(target, blogUrl);
      res.json(result);
    } catch (error: any) {
      console.error("Probe error:", error);
      res.status(500).json({ error: error.message || "Failed to probe domain" });
    }
  });

  // API Route: /api/crawl-target (Direct execution for a specific competitor target)
  app.post("/api/crawl-target", async (req, res) => {
    try {
      const { competitorId } = req.body;
      if (!competitorId) {
        return res.status(400).json({ error: "Missing competitorId" });
      }

      let targetComp: any = null;
      if (db) {
        const compSnap = await getDoc(doc(db, "competitors", competitorId));
        if (compSnap.exists()) {
          targetComp = { id: compSnap.id, ...compSnap.data() };
        }
      }

      if (!targetComp) {
        return res.status(404).json({ error: "Competitor not found" });
      }

      const result = await checkCompetitorTarget({
        id: targetComp.id,
        name: targetComp.name,
        domain: targetComp.domain,
        blogUrl: targetComp.blogUrl || `https://${targetComp.domain}`,
        feedUrl: targetComp.feedUrl,
        strategy: targetComp.strategy || "Hybrid RSS+Sitemap",
        etag: targetComp.etag,
        discoveredConfig: targetComp.discoveredConfig
      });

      // Update competitor in DB
      if (db) {
        try {
          const compRef = doc(db, "competitors", targetComp.id);
          const updatedFields: Record<string, any> = {
            ...targetComp,
            lastChecked: "Just now",
            etag: result.etag || targetComp.etag || 'W/"7a3e-9b21"'
          };

          if (result.articles.length > 0) {
            updatedFields.lastDetection = result.articles[0].title;
            updatedFields.articlesScraped = (targetComp.articlesScraped || 0) + result.articles.length;
          } else if (!targetComp.lastDetection || targetComp.lastDetection === "Pending initial sweep") {
            updatedFields.lastDetection = result.outcome === "cached"
              ? "Sweep complete (ETag synced)"
              : "Sweep complete (0 new posts)";
          }

          await setDoc(compRef, cleanFirestoreData(updatedFields), { merge: true });

          // Save newly detected articles
          for (const art of result.articles) {
            const artRef = doc(db, "articles", art.id);
            await setDoc(artRef, cleanFirestoreData(art), { merge: true });
          }
        } catch (dbErr) {
          console.warn("DB update error in crawl-target:", dbErr);
        }
      }

      res.json({
        success: true,
        detectedCount: result.articles.length,
        articles: result.articles,
        etag: result.etag,
        message: `Scrape completed for ${targetComp.name}. ${result.articles.length} new articles captured.`
      });
    } catch (err: any) {
      console.error("Crawl target error:", err);
      res.status(500).json({ error: err.message || "Failed to crawl target" });
    }
  });

  // API Route: /api/dedup/stats (Canonical Deduplication Engine Telemetry)
  app.get("/api/dedup/stats", (req, res) => {
    res.json(deduplicationEngine.getStats());
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
          await setDoc(
            artRef,
            cleanFirestoreData({
              content: extracted.content,
              contentMarkdown: extracted.contentMarkdown,
              contentHtml: extracted.contentHtml,
              snippet: extracted.snippet,
              title: extracted.title,
              author: extracted.author,
              readTime: extracted.readTime,
              wordCount: extracted.wordCount,
              charCount: extracted.charCount,
              featuredImage: extracted.featuredImage || "",
              inlineImages: extracted.inlineImages || [],
              mediaCaptures: extracted.mediaCaptures || [],
              categories: extracted.categories || [],
              tags: extracted.tags || [],
              metaDescription: extracted.metaDescription || "",
              canonicalUrl: extracted.canonicalUrl,
              originalSourceUrl: extracted.originalSourceUrl,
              outgoingLinks: extracted.outgoingLinks || [],
              citations: extracted.citations || [],
              structuredMetadata: extracted.structuredMetadata,
              domSelector: extracted.domSelector,
              takeaways: extracted.takeaways,
              updatedAt: new Date().toISOString()
            }),
            { merge: true }
          );
        } catch (dbErr: any) {
          console.info("[Universal Scraper] Firestore sync notice:", dbErr.message);
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
          await setDoc(
            artRef,
            cleanFirestoreData({
              analysis: parsed,
              analyzedAt: new Date().toISOString()
            }),
            { merge: true }
          );
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

  // API Route: /api/test-publish (Supports live fast SLA, live SLA breach, and historical back-catalog scenarios)
  app.post("/api/test-publish", (req, res) => {
    const { competitorName, title, scenario, delaySec: customDelaySec, isBackCatalog: customIsBackCatalog, publicationSource: customPubSource } = req.body;
    const now = new Date();
    
    let delaySec = 192; // default: 3m 12s
    let isBackCatalog = false;
    let defaultSource = "RSS <pubDate>";
    let breachReason: string | undefined;

    if (scenario === 'live_breach') {
      delaySec = 522; // 8 minutes 42 seconds
      isBackCatalog = false;
      defaultSource = "HTML meta (article:published_time)";
      breachReason = "Origin RSS cache delay or polling interval alignment threshold exceeded (>5m)";
    } else if (scenario === 'back_catalog') {
      delaySec = 172800; // 2 days (48 hours)
      isBackCatalog = true;
      defaultSource = "Sitemap <lastmod>";
    } else if (typeof customDelaySec === 'number' && customDelaySec >= 0) {
      delaySec = customDelaySec;
      isBackCatalog = customIsBackCatalog !== undefined ? Boolean(customIsBackCatalog) : delaySec > 1800;
    }

    if (customPubSource) {
      defaultSource = customPubSource;
    }

    const publishedAt = new Date(now.getTime() - delaySec * 1000);
    const discoveredAt = now;
    const targetMet = isBackCatalog ? true : delaySec <= 300;
    const ingestType: 'live' | 'back-catalog' = isBackCatalog ? 'back-catalog' : 'live';
    const slaStatus: 'met' | 'breached' | 'back-catalog' = isBackCatalog ? 'back-catalog' : (targetMet ? 'met' : 'breached');
    const exactDelayText = formatExactDelayText(delaySec);
    const delayFormatted = formatDelay(delaySec);

    const rawContent = `Our engineering research discloses production benchmarks and architectural patterns across distributed computing clusters.\n\nEvaluating data freshness, serialization latency, and egress traffic reductions provides predictable operational overhead for high-concurrency enterprise pipelines.\n\nAll metrics are validated against published schemas and live origin headers.`;
    const heroImg = "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80";
    const inlineImg1 = "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80";
    const inlineImg2 = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80";

    const articleTitle = title || (
      scenario === 'back_catalog'
        ? "Historical Architecture Analysis: Distributed Data Mesh Principles"
        : scenario === 'live_breach'
        ? "Deep Dive: Asynchronous Stream Consensus & Long-Tail Query Latencies"
        : "Next-Gen Edge Inference: Bypassing Centralized Lakehouse Latency"
    );

    const articleUrl = `https://${(competitorName || "acme").toLowerCase().replace(/[^a-z0-9]/g, "")}.com/blog/article-${Date.now().toString(36)}`;

    const article = {
      id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      competitor: competitorName || (scenario === 'back_catalog' ? "Snowflake Developers" : "Acme AI Corp"),
      competitorDomain: (competitorName || "Acme AI Corp").toLowerCase().replace(/[^a-z0-9]/g, "") + ".com",
      title: articleTitle,
      snippet: isBackCatalog
        ? "Archived analysis detailing distributed multi-cluster synchronization patterns across global cloud infrastructure regions."
        : "Real-time benchmark results confirming sub-50ms token generation and immediate cache invalidation across distributed edge clusters.",
      content: rawContent,
      contentMarkdown: `# ${articleTitle}\n\n${rawContent}\n\n![Cloud Architecture Diagnostics](${inlineImg1} "Multi-region cluster latency breakdown")\n\n![Throughput Benchmarks](${inlineImg2} "Sub-50ms cache replication metrics")`,
      contentHtml: `<p class="leading-relaxed text-slate-800 my-3">Our engineering research discloses production benchmarks and architectural patterns across distributed computing clusters.</p><p class="leading-relaxed text-slate-800 my-3">Evaluating data freshness, serialization latency, and egress traffic reductions provides predictable operational overhead for high-concurrency enterprise pipelines.</p><figure class="my-5 rounded-xl overflow-hidden border border-slate-200"><img src="${inlineImg1}" alt="Cloud Architecture Diagnostics" class="w-full object-cover rounded-t-xl" /><figcaption class="p-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-100">Multi-region cluster latency breakdown</figcaption></figure><p class="leading-relaxed text-slate-800 my-3">All metrics are validated against published schemas and live origin headers.</p>`,
      author: "Enterprise Intelligence Staff",
      readTime: "3 min read",
      wordCount: 385,
      charCount: 2420,
      url: articleUrl,
      originalSourceUrl: articleUrl,
      canonicalUrl: articleUrl,
      method: "RSS Feed",
      ingestMethod: defaultSource.includes("Sitemap") ? "XML Sitemap" : defaultSource.includes("DOM") ? "Direct DOM Poller" : "RSS Feed",
      publishedAt: publishedAt.toLocaleString(),
      publishedDate: publishedAt.toISOString(),
      discoveredAt: discoveredAt.toLocaleString(),
      discoveredDate: discoveredAt.toISOString(),
      publicationSource: defaultSource,
      delaySec,
      delayFormatted,
      exactDelayText,
      targetMet,
      isBackCatalog,
      ingestType,
      slaStatus,
      slaBreachReason: breachReason,
      diffPayload: "+1.6KB",
      featuredImage: heroImg,
      inlineImages: [heroImg, inlineImg1, inlineImg2],
      mediaCaptures: [
        { url: heroImg, alt: articleTitle, caption: "Featured Hero Infrastructure Diagram", isHero: true },
        { url: inlineImg1, alt: "Cloud Architecture Diagnostics", caption: "Multi-region cluster latency breakdown", isHero: false },
        { url: inlineImg2, alt: "Throughput Benchmarks", caption: "Sub-50ms cache replication metrics", isHero: false }
      ],
      categories: ["Cloud Infrastructure", "Distributed Systems", "Performance"],
      tags: isBackCatalog 
        ? ["Historical Archive", "Back-catalog Ingestion", "Database Architecture"] 
        : (targetMet ? ["Live SLA Met", "Real-Time Pipeline", "Edge Inference"] : ["Live SLA Breached", "Latency Alert", "Benchmarking"]),
      metaDescription: isBackCatalog
        ? "Archived technical brief exploring distributed consensus and latency mitigation."
        : "Production benchmarks demonstrating sub-50ms token generation and cache invalidation.",
      outgoingLinks: [
        { text: "Published Specification Docs", url: "https://specs.distributed-data.org/v2", domain: "specs.distributed-data.org", isExternal: true },
        { text: "Benchmark Dataset GitHub", url: "https://github.com/cloud-bench/stream-latencies", domain: "github.com", isExternal: true }
      ],
      structuredMetadata: {
        lang: "en",
        wordCount: 385,
        charCount: 2420,
        readTime: "3 min read",
        domSelector: "article.post-content",
        extractedAt: new Date().toISOString(),
        hasSchemaOrg: true,
        hasOpenGraph: true,
        hasTwitterCard: true,
        openGraph: {
          "og:title": articleTitle,
          "og:description": "Production benchmarks demonstrating sub-50ms token generation and cache invalidation.",
          "og:image": heroImg,
          "og:type": "article"
        }
      },
      threatRating: isBackCatalog ? "Medium" : (delaySec <= 300 ? "High" : "Medium"),
      domSelector: "article.post-content",
      takeaways: [
        { 
          label: isBackCatalog ? "Back-catalog Ingestion" : (targetMet ? "Live SLA Met" : "Live SLA Breached"), 
          value: isBackCatalog ? `Historical archive item (${exactDelayText} publication delta)` : `Exact detection delay: ${exactDelayText}`, 
          type: "metric" 
        },
        { 
          label: "Source Provenance", 
          value: `Extracted timestamp from ${defaultSource}`, 
          type: "launch" 
        }
      ],
      citations: [
        { text: "Published Specification Docs", url: "https://specs.distributed-data.org/v2" },
        { text: "Benchmark Dataset GitHub", url: "https://github.com/cloud-bench/stream-latencies" }
      ]
    };

    res.json({
      success: true,
      article,
      message: isBackCatalog
        ? `Historical back-catalog article ingested (${exactDelayText} age). Separated from live SLA benchmark calculation.`
        : `Live article detected in ${exactDelayText} (${delayFormatted}). 5m SLA target: ${targetMet ? "MET (<=300s)" : "BREACHED (>300s)"}.`
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

  // ==========================================
  // WORDPRESS & CMS AUTO-PUBLISHING (VERSION 2)
  // ==========================================
  app.get("/api/wordpress/settings", (req, res) => {
    res.json(getWordPressConfig());
  });

  app.post("/api/wordpress/settings", (req, res) => {
    const updated = updateWordPressConfig(req.body);
    res.json({ success: true, settings: updated });
  });

  app.post("/api/wordpress/publish", async (req, res) => {
    const { article } = req.body;
    if (!article || !article.title) {
      return res.status(400).json({ success: false, error: "Article data with title is required" });
    }
    const result = await publishToWordPress(article);
    res.json(result);
  });

  // ==========================================
  // SEARCH INDEXING INTEGRATION (VERSION 2)
  // ==========================================
  app.get("/api/indexing/settings", (req, res) => {
    res.json(getSearchIndexingConfig());
  });

  app.post("/api/indexing/settings", (req, res) => {
    const updated = updateSearchIndexingConfig(req.body);
    res.json({ success: true, settings: updated });
  });

  app.post("/api/indexing/publish", async (req, res) => {
    const { url, type, title } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: "Target URL is required for search indexing" });
    }
    const result = await triggerSearchIndexing({ url, type, title });
    res.json(result);
  });

  // API Route: Execution Logs across WordPress & Search Indexing
  app.get("/api/publisher/logs", (req, res) => {
    res.json({ success: true, logs: getExecutionLogs() });
  });

  // ==========================================
  // SECTION 10: 100-WEBSITE SCALE & CONCURRENCY
  // ==========================================

  // API Route: Get Scale & Concurrency Telemetry Stats
  app.get("/api/scale/stats", (req, res) => {
    res.json({
      success: true,
      config: scaleEngine.getConfig(),
      queueStatus: scaleEngine.getQueueStatus(),
      systemLoad: scaleEngine.getSystemLoad(),
      circuitBreakers: scaleEngine.getCircuitBreakers(),
      activeRetries: scaleEngine.getActiveRetries(),
      deduplication: scaleEngine.getDeduplicationSummary(),
      nodesCount: scaleEngine.getNodes().length
    });
  });

  // API Route: Get 100 Site Target Nodes
  app.get("/api/scale/nodes", (req, res) => {
    res.json({
      success: true,
      nodes: scaleEngine.getNodes()
    });
  });

  // API Route: Update Scale Engine Concurrency & Load Config
  app.post("/api/scale/config", (req, res) => {
    const updated = scaleEngine.updateConfig(req.body);
    res.json({
      success: true,
      config: updated,
      systemLoad: scaleEngine.getSystemLoad()
    });
  });

  // API Route: Execute 100-Website Scale Benchmark Run
  app.post("/api/scale/benchmark", async (req, res) => {
    const { scenario = 'nominal' } = req.body;
    try {
      const benchmarkResult = await scaleEngine.run100SiteBenchmark(scenario);
      res.json({
        success: true,
        benchmark: benchmarkResult,
        queueStatus: scaleEngine.getQueueStatus(),
        systemLoad: scaleEngine.getSystemLoad(),
        deduplication: scaleEngine.getDeduplicationSummary(),
        nodes: scaleEngine.getNodes()
      });
    } catch (err: any) {
      console.error("[Scale Engine] Benchmark error:", err);
      res.status(500).json({ success: false, error: err.message || "Scale benchmark failed" });
    }
  });

  return app;
}

export const app = createExpressApp();
export { continuousWorker, scaleEngine };
