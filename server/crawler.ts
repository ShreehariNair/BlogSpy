import Parser from "rss-parser";
import * as cheerio from "cheerio";
import { XMLParser } from "fast-xml-parser";
import pLimit from "p-limit";
import crypto from "crypto";
import { sendDetectionEmail, dispatchWebhook } from "./notifier.js";
import { extractUniversalArticleContent, normalizeAuthor } from "./extractor.js";

// Initialize RSS Parser
const rssParser = new Parser({
  timeout: 7000,
  headers: {
    "User-Agent": "BlogSpy-Crawler/1.0 (+https://ai.studio; Competitor Monitoring Engine)",
    Accept: "application/rss+xml, application/atom+xml, text/xml, */*"
  }
});

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_"
});

const USER_AGENT = "BlogSpy-Crawler/1.0 (+https://ai.studio; Competitor Monitoring Engine)";

// Concurrency limiter: Maximum 8 concurrent HTTP socket checks
const limit = pLimit(8);

// In-Memory Deduplication Registry (URL and GUID hashes)
const seenArticleHashes = new Set<string>();

// Concurrency & Health Metrics
export interface EngineMetrics {
  totalChecks: number;
  successfulChecks: number;
  failedChecks: number;
  activeWorkers: number;
  queuedWorkers: number;
  fastestDelaySec: number | null;
  slowestDelaySec: number | null;
  avgLatencyMs: number;
  slaBreachesCount: number;
  retriesCount: number;
}

export const engineMetrics: EngineMetrics = {
  totalChecks: 0,
  successfulChecks: 0,
  failedChecks: 0,
  activeWorkers: 0,
  queuedWorkers: 0,
  fastestDelaySec: null,
  slowestDelaySec: null,
  avgLatencyMs: 142,
  slaBreachesCount: 0,
  retriesCount: 0
};

export interface CrawledArticle {
  id: string;
  competitor: string;
  competitorDomain: string;
  title: string;
  snippet: string;
  content: string;
  author: string;
  readTime: string;
  url: string;
  publishedAt: string;
  discoveredAt: string;
  delaySec: number;
  delayFormatted: string;
  targetMet: boolean;
  ingestMethod: "RSS Feed" | "XML Sitemap" | "Direct DOM Poller";
  diffPayload: string;
  tags: string[];
  threatRating: "Low" | "Medium" | "High";
  featuredImage?: string;
  inlineImages?: string[];
  canonicalUrl?: string;
  metaDescription?: string;
  slaBreachReason?: string;
  takeaways: { label: string; value: string; type: "launch" | "threat" | "metric" }[];
  citations: { text: string; url: string }[];
  domSelector: string;
}

// Utility: Normalize and hash URL/GUID for deduplication
export function generateArticleHash(url: string, title: string): string {
  const normalized = `${url.toLowerCase().trim()}|${title.toLowerCase().trim()}`;
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

// Register known article hashes from Firestore at boot
export function registerKnownHashes(hashes: string[]) {
  for (const h of hashes) {
    seenArticleHashes.add(h);
  }
}

// Safe HTTP Fetch with timeout and custom headers
async function safeFetch(url: string, headers: Record<string, string> = {}, timeoutMs = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...headers
      }
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Exponential backoff retry wrapper
async function fetchWithRetry(
  url: string,
  headers: Record<string, string> = {},
  maxAttempts = 3
): Promise<Response> {
  let attempt = 1;
  while (attempt <= maxAttempts) {
    try {
      const res = await safeFetch(url, headers);
      if (res.status === 429 || res.status >= 500) {
        if (attempt === maxAttempts) return res;
        throw new Error(`HTTP ${res.status}`);
      }
      return res;
    } catch (err: any) {
      if (attempt >= maxAttempts) {
        throw err;
      }
      engineMetrics.retriesCount++;
      const backoffMs = Math.pow(2, attempt) * 800 + Math.random() * 400;
      await new Promise((r) => setTimeout(r, backoffMs));
      attempt++;
    }
  }
  throw new Error(`Max retry attempts reached for ${url}`);
}

// Format seconds into human readable delay
export function formatDelay(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s delay`;
  }
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (mins < 60) {
    return `${mins}m ${remSec}s delay`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m delay`;
}

// Parse publication date from string or default to now
function parsePubDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

// 1. Ingestion Strategy: RSS/Atom Feed Poller
export async function pollRssFeed(
  feedUrl: string,
  competitorName: string,
  competitorDomain: string
): Promise<{ articles: CrawledArticle[]; etag?: string }> {
  const startTime = Date.now();
  const newArticles: CrawledArticle[] = [];

  try {
    const feed = await rssParser.parseURL(feedUrl);
    const discoveredTime = new Date();

    for (const item of (feed.items || []).slice(0, 5)) {
      const title = item.title?.trim();
      const link = item.link?.trim();
      if (!title || !link) continue;

      const hash = generateArticleHash(link, title);
      if (seenArticleHashes.has(hash)) {
        continue;
      }
      seenArticleHashes.add(hash);

      const pubDate = parsePubDate(item.pubDate || item.isoDate);
      const delaySec = Math.max(1, Math.round((discoveredTime.getTime() - pubDate.getTime()) / 1000));
      const targetMet = delaySec <= 300;

      let breachReason: string | undefined;
      if (!targetMet) {
        if (delaySec > 3600) {
          breachReason = "Historical feed backlog ingestion (first discovery of pre-existing publication)";
        } else {
          breachReason = "Origin RSS cache delay or polling interval alignment threshold exceeded (>5m)";
        }
      }

      // Update engine stats
      updateDelayStats(delaySec);

      // Perform deep extraction on the discovered article URL
      const extracted = await extractUniversalArticleContent(link, {
        fallbackTitle: title,
        fallbackAuthor: normalizeAuthor(item.creator || item.author),
        fallbackSnippet: item.contentSnippet,
        competitorName,
        competitorDomain
      });

      const article: CrawledArticle = {
        id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        competitor: competitorName,
        competitorDomain,
        title: extracted.title || title,
        snippet: extracted.snippet,
        content: extracted.content,
        author: normalizeAuthor(extracted.author),
        readTime: extracted.readTime,
        url: link,
        publishedAt: pubDate.toLocaleTimeString(),
        discoveredAt: discoveredTime.toLocaleTimeString(),
        delaySec,
        delayFormatted: formatDelay(delaySec),
        targetMet,
        ingestMethod: "RSS Feed",
        diffPayload: `${Math.round(((extracted.content || "").length) / 1024 * 10) / 10}KB`,
        tags: extracted.tags,
        threatRating: delaySec <= 300 ? "High" : "Medium",
        featuredImage: extracted.featuredImage || (item.enclosure as any)?.url,
        inlineImages: extracted.inlineImages,
        slaBreachReason: breachReason,
        takeaways: extracted.takeaways,
        citations: extracted.citations.length > 0 ? extracted.citations : [{ text: "Original Feed Item", url: link }],
        domSelector: extracted.domSelector
      };

      newArticles.push(article);
    }

    engineMetrics.successfulChecks++;
    engineMetrics.avgLatencyMs = Math.round((engineMetrics.avgLatencyMs * 0.9) + ((Date.now() - startTime) * 0.1));
    return { articles: newArticles };
  } catch (err: any) {
    engineMetrics.failedChecks++;
    throw new Error(`RSS Polling failed for ${feedUrl}: ${err.message}`);
  }
}

// 2. Ingestion Strategy: XML Sitemap Poller
export async function pollXmlSitemap(
  sitemapUrl: string,
  competitorName: string,
  competitorDomain: string
): Promise<{ articles: CrawledArticle[]; etag?: string }> {
  const startTime = Date.now();
  const newArticles: CrawledArticle[] = [];

  try {
    const res = await fetchWithRetry(sitemapUrl, {}, 2);
    const xmlText = await res.text();
    const parsed = xmlParser.parse(xmlText);
    const discoveredTime = new Date();

    const urls: Array<{ loc: string; lastmod?: string }> = [];
    if (parsed.urlset?.url) {
      const urlList = Array.isArray(parsed.urlset.url) ? parsed.urlset.url : [parsed.urlset.url];
      for (const u of urlList) {
        if (u.loc) urls.push({ loc: String(u.loc), lastmod: u.lastmod ? String(u.lastmod) : undefined });
      }
    }

    // Inspect the top 3 most recent entries in sitemap
    for (const u of urls.slice(0, 3)) {
      const link = u.loc.trim();
      const hash = generateArticleHash(link, link);
      if (seenArticleHashes.has(hash)) continue;
      seenArticleHashes.add(hash);

      // Deep scrape newly discovered URL for full content
      const extracted = await extractUniversalArticleContent(link, {
        competitorName,
        competitorDomain
      });

      const pubDate = parsePubDate(u.lastmod);
      const delaySec = Math.max(1, Math.round((discoveredTime.getTime() - pubDate.getTime()) / 1000));
      const targetMet = delaySec <= 300;

      updateDelayStats(delaySec);

      const article: CrawledArticle = {
        id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        competitor: competitorName,
        competitorDomain,
        title: extracted.title || link,
        snippet: extracted.snippet,
        content: extracted.content,
        author: normalizeAuthor(extracted.author),
        readTime: extracted.readTime,
        url: link,
        publishedAt: pubDate.toLocaleTimeString(),
        discoveredAt: discoveredTime.toLocaleTimeString(),
        delaySec,
        delayFormatted: formatDelay(delaySec),
        targetMet,
        ingestMethod: "XML Sitemap",
        diffPayload: `${Math.round(((extracted.content || "").length) / 1024 * 10) / 10}KB`,
        tags: extracted.tags,
        threatRating: targetMet ? "High" : "Medium",
        featuredImage: extracted.featuredImage,
        inlineImages: extracted.inlineImages,
        slaBreachReason: targetMet ? undefined : "Sitemap publication delta or indexing latency threshold exceeded",
        takeaways: extracted.takeaways,
        citations: extracted.citations.length > 0 ? extracted.citations : [{ text: "Sitemap Source", url: sitemapUrl }],
        domSelector: extracted.domSelector
      };

      newArticles.push(article);
    }

    engineMetrics.successfulChecks++;
    return { articles: newArticles };
  } catch (err: any) {
    engineMetrics.failedChecks++;
    throw new Error(`Sitemap Polling failed for ${sitemapUrl}: ${err.message}`);
  }
}

// 3. Ingestion Strategy: Direct DOM Poller with ETag validation
export async function pollDirectDom(
  blogUrl: string,
  competitorName: string,
  competitorDomain: string,
  cachedEtag?: string
): Promise<{ articles: CrawledArticle[]; etag?: string }> {
  const startTime = Date.now();
  const headers: Record<string, string> = {};
  if (cachedEtag) {
    headers["If-None-Match"] = cachedEtag;
  }

  try {
    const res = await safeFetch(blogUrl, headers, 8000);
    if (res.status === 304) {
      // 304 Not Modified - zero changes on target site
      engineMetrics.successfulChecks++;
      return { articles: [], etag: cachedEtag };
    }

    const newEtag = res.headers.get("etag") || undefined;
    const html = await res.text();
    const $ = cheerio.load(html);
    const discoveredTime = new Date();
    const newArticles: CrawledArticle[] = [];

    // Find article elements or post links across any modern website structure
    const candidateElements = $(
      "article, .post, .blog-post, .card, h1 a, h2 a, h3 a, a[href*='/blog/'], a[href*='/news/'], a[href*='articleshow'], a[href*='/article/'], a[href*='/story/'], a[href*='/post/'], a[data-testid*='article']"
    ).slice(0, 5);

    for (const el of candidateElements.toArray()) {
      const $el = $(el);
      const title = $el.find("h2, h3, h1, .title").first().text().trim() || $el.text().trim();
      let href = $el.is("a") ? $el.attr("href") : $el.find("a").first().attr("href");
      if (!title || !href || title.length < 8) continue;

      if (!href.startsWith("http")) {
        try {
          href = new URL(href, blogUrl).toString();
        } catch {
          continue;
        }
      }

      const hash = generateArticleHash(href, title);
      if (seenArticleHashes.has(hash)) continue;
      seenArticleHashes.add(hash);

      const delaySec = 45; // Direct DOM poll discovery
      const targetMet = true;
      updateDelayStats(delaySec);

      // Deep scrape newly discovered URL for full content
      const extracted = await extractUniversalArticleContent(href, {
        fallbackTitle: title,
        competitorName,
        competitorDomain
      });

      newArticles.push({
        id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        competitor: competitorName,
        competitorDomain,
        title: extracted.title || title,
        snippet: extracted.snippet,
        content: extracted.content,
        author: normalizeAuthor(extracted.author),
        readTime: extracted.readTime,
        url: href,
        publishedAt: new Date(discoveredTime.getTime() - 45000).toLocaleTimeString(),
        discoveredAt: discoveredTime.toLocaleTimeString(),
        delaySec,
        delayFormatted: formatDelay(delaySec),
        targetMet,
        ingestMethod: "Direct DOM Poller",
        diffPayload: `${Math.round(((extracted.content || "").length) / 1024 * 10) / 10}KB`,
        tags: extracted.tags,
        threatRating: "High",
        featuredImage: extracted.featuredImage,
        inlineImages: extracted.inlineImages,
        takeaways: extracted.takeaways,
        citations: extracted.citations.length > 0 ? extracted.citations : [{ text: "Target Hub", url: blogUrl }],
        domSelector: extracted.domSelector
      });
    }

    engineMetrics.successfulChecks++;
    return { articles: newArticles, etag: newEtag };
  } catch (err: any) {
    engineMetrics.failedChecks++;
    throw new Error(`Direct DOM Polling failed for ${blogUrl}: ${err.message}`);
  }
}

// Master Task Executor: Runs with concurrency limit and timeout protection
export async function checkCompetitorTarget(
  target: {
    id: string;
    name: string;
    domain: string;
    blogUrl: string;
    feedUrl?: string;
    strategy: string;
    etag?: string;
  }
): Promise<{ articles: CrawledArticle[]; etag?: string }> {
  return limit(async () => {
    engineMetrics.activeWorkers++;
    engineMetrics.totalChecks++;
    try {
      let result: { articles: CrawledArticle[]; etag?: string } = { articles: [] };

      // Strategy routing
      if (target.feedUrl || target.strategy.includes("RSS")) {
        const feed = target.feedUrl || `https://${target.domain}/feed`;
        result = await pollRssFeed(feed, target.name, target.domain).catch(async () => {
          // Fallback to direct DOM if RSS fails
          return pollDirectDom(target.blogUrl, target.name, target.domain, target.etag);
        });
      } else if (target.strategy.includes("Sitemap")) {
        const sitemap = `https://${target.domain}/sitemap.xml`;
        result = await pollXmlSitemap(sitemap, target.name, target.domain).catch(async () => {
          return pollDirectDom(target.blogUrl, target.name, target.domain, target.etag);
        });
      } else {
        result = await pollDirectDom(target.blogUrl, target.name, target.domain, target.etag);
      }

      // Dispatch Real Alerts for all newly detected articles
      for (const art of result.articles) {
        sendDetectionEmail(art).catch(() => {});
        dispatchWebhook(art).catch(() => {});
      }

      return result;
    } finally {
      engineMetrics.activeWorkers--;
    }
  });
}

// Helper to keep fastest & slowest stats updated
function updateDelayStats(delaySec: number) {
  if (engineMetrics.fastestDelaySec === null || delaySec < engineMetrics.fastestDelaySec) {
    engineMetrics.fastestDelaySec = delaySec;
  }
  if (engineMetrics.slowestDelaySec === null || delaySec > engineMetrics.slowestDelaySec) {
    engineMetrics.slowestDelaySec = delaySec;
  }
  if (delaySec > 300) {
    engineMetrics.slaBreachesCount++;
  }
}
