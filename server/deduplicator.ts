import crypto from "crypto";

export interface DedupCheckResult {
  isDuplicate: boolean;
  matchedBy?: "canonical_url" | "source_url" | "title_hash" | "content_hash";
  matchedKey?: string;
  existingId?: string;
}

export interface DedupRecord {
  id: string;
  url: string;
  canonicalUrl?: string;
  title: string;
  competitorDomain: string;
  ingestMethod: string;
  detectedAt: string;
}

// Common analytics and tracking query parameters to purge
const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "ref",
  "source",
  "ref_src",
  "_ga",
  "_gl",
  "igshid",
  "spm",
  "ved"
]);

/**
 * Normalizes a URL to its canonical form:
 * - Resolves relative URLs if base is provided
 * - Purges tracking / campaign query parameters
 * - Strips URL fragment (#hash)
 * - Lowercases hostname
 * - Removes default ports (:80, :443)
 * - Strips trailing slash on non-root paths
 * - Sorts remaining query parameters deterministically
 */
export function normalizeCanonicalUrl(rawUrl: string, baseUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return "";

  try {
    let urlObj: URL;
    if (baseUrl) {
      urlObj = new URL(rawUrl.trim(), baseUrl);
    } else {
      const clean = rawUrl.trim();
      urlObj = new URL(clean.startsWith("http://") || clean.startsWith("https://") ? clean : `https://${clean}`);
    }

    // Lowercase hostname
    urlObj.hostname = urlObj.hostname.toLowerCase();

    // Strip hash
    urlObj.hash = "";

    // Remove tracking query parameters
    const paramsToDelete: string[] = [];
    urlObj.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      if (TRACKING_PARAMS.has(lowerKey) || lowerKey.startsWith("utm_")) {
        paramsToDelete.push(key);
      }
    });
    for (const p of paramsToDelete) {
      urlObj.searchParams.delete(p);
    }

    // Sort remaining query params for deterministic string matching
    urlObj.searchParams.sort();

    // Normalize pathname - strip trailing slash if length > 1
    let pathname = urlObj.pathname;
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    urlObj.pathname = pathname;

    return urlObj.toString();
  } catch {
    // If parsing fails, do basic string normalization
    return rawUrl.trim().toLowerCase().replace(/\/$/, "");
  }
}

/**
 * Computes a domain-scoped title fingerprint:
 * Strips punctuation, whitespace, and special characters, then hashes with domain.
 */
export function generateTitleFingerprint(competitorDomain: string, title: string): string {
  const normDomain = (competitorDomain || "").toLowerCase().trim();
  const normTitle = (title || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const combined = `${normDomain}::${normTitle}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
}

/**
 * Computes a content fingerprint from the first 500 characters of clean article body.
 */
export function generateContentFingerprint(competitorDomain: string, content: string): string {
  const normDomain = (competitorDomain || "").toLowerCase().trim();
  const cleanBody = (content || "")
    .replace(/<[^>]*>?/gm, "") // strip html tags
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  const combined = `${normDomain}::${cleanBody}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
}

/**
 * Canonical De-duplication Engine:
 * Guarantees zero duplicate articles and zero duplicate alerts across multiple detection
 * vectors (e.g. RSS Feed, XML Sitemap, Direct DOM) running concurrently in Hybrid mode.
 */
export class CanonicalDeduplicationEngine {
  private canonicalUrlSet = new Set<string>();
  private titleFingerprintSet = new Set<string>();
  private contentFingerprintSet = new Set<string>();
  private inFlightLocks = new Set<string>();

  // Lookup maps for existing records
  private urlToArticleId = new Map<string, string>();
  private titleToArticleId = new Map<string, string>();

  // Telemetry metrics
  private duplicatesPrevented = 0;
  private breakdown = {
    canonicalUrl: 0,
    sourceUrl: 0,
    titleHash: 0,
    contentHash: 0
  };
  private recentSuppressed: Array<{
    title: string;
    competitor: string;
    source: string;
    matchedBy: string;
    timestamp: string;
  }> = [];

  /**
   * Evaluates whether a candidate publication is a duplicate across:
   * 1. Canonical URL
   * 2. Source / Discovery URL
   * 3. Domain + Normalized Title Hash
   * 4. Article Content Hash
   */
  public checkDuplicate(candidate: {
    url: string;
    canonicalUrl?: string;
    title: string;
    content?: string;
    competitorDomain: string;
  }): DedupCheckResult {
    const normSourceUrl = normalizeCanonicalUrl(candidate.url);
    const normCanonicalUrl = candidate.canonicalUrl
      ? normalizeCanonicalUrl(candidate.canonicalUrl, candidate.url)
      : normSourceUrl;

    // Check 1: Canonical URL
    if (normCanonicalUrl && this.canonicalUrlSet.has(normCanonicalUrl)) {
      this.recordSuppression(candidate.title, candidate.competitorDomain, "canonical_url");
      return {
        isDuplicate: true,
        matchedBy: "canonical_url",
        matchedKey: normCanonicalUrl,
        existingId: this.urlToArticleId.get(normCanonicalUrl)
      };
    }

    // Check 2: Source URL
    if (normSourceUrl && this.canonicalUrlSet.has(normSourceUrl)) {
      this.recordSuppression(candidate.title, candidate.competitorDomain, "source_url");
      return {
        isDuplicate: true,
        matchedBy: "source_url",
        matchedKey: normSourceUrl,
        existingId: this.urlToArticleId.get(normSourceUrl)
      };
    }

    // Check 3: Domain + Title Fingerprint
    if (candidate.title && candidate.title.length > 5) {
      const titleFp = generateTitleFingerprint(candidate.competitorDomain, candidate.title);
      if (this.titleFingerprintSet.has(titleFp)) {
        this.recordSuppression(candidate.title, candidate.competitorDomain, "title_hash");
        return {
          isDuplicate: true,
          matchedBy: "title_hash",
          matchedKey: titleFp,
          existingId: this.titleToArticleId.get(titleFp)
        };
      }
    }

    // Check 4: Content Fingerprint
    if (candidate.content && candidate.content.length > 80) {
      const contentFp = generateContentFingerprint(candidate.competitorDomain, candidate.content);
      if (this.contentFingerprintSet.has(contentFp)) {
        this.recordSuppression(candidate.title, candidate.competitorDomain, "content_hash");
        return {
          isDuplicate: true,
          matchedBy: "content_hash",
          matchedKey: contentFp
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Acquire temporary in-flight reservation during concurrent pipeline processing
   */
  public claimInFlight(url: string, canonicalUrl?: string): boolean {
    const key = normalizeCanonicalUrl(canonicalUrl || url);
    if (!key || this.canonicalUrlSet.has(key) || this.inFlightLocks.has(key)) {
      return false;
    }
    this.inFlightLocks.add(key);
    return true;
  }

  public releaseInFlight(url: string, canonicalUrl?: string): void {
    const key = normalizeCanonicalUrl(canonicalUrl || url);
    if (key) {
      this.inFlightLocks.delete(key);
    }
  }

  /**
   * Registers a newly captured article across all deduplication indices.
   */
  public register(article: {
    id: string;
    url: string;
    canonicalUrl?: string;
    title: string;
    content?: string;
    competitorDomain: string;
    ingestMethod?: string;
  }): void {
    const normSourceUrl = normalizeCanonicalUrl(article.url);
    const normCanonicalUrl = article.canonicalUrl
      ? normalizeCanonicalUrl(article.canonicalUrl, article.url)
      : normSourceUrl;

    if (normSourceUrl) {
      this.canonicalUrlSet.add(normSourceUrl);
      this.urlToArticleId.set(normSourceUrl, article.id);
      this.inFlightLocks.delete(normSourceUrl);
    }

    if (normCanonicalUrl) {
      this.canonicalUrlSet.add(normCanonicalUrl);
      this.urlToArticleId.set(normCanonicalUrl, article.id);
      this.inFlightLocks.delete(normCanonicalUrl);
    }

    if (article.title) {
      const titleFp = generateTitleFingerprint(article.competitorDomain, article.title);
      this.titleFingerprintSet.add(titleFp);
      this.titleToArticleId.set(titleFp, article.id);
    }

    if (article.content && article.content.length > 80) {
      const contentFp = generateContentFingerprint(article.competitorDomain, article.content);
      this.contentFingerprintSet.add(contentFp);
    }
  }

  /**
   * Synchronizes the in-memory deduplication index with articles from Firestore on server boot.
   */
  public syncWithDatabase(
    articles: Array<{
      id: string;
      url: string;
      canonicalUrl?: string;
      title: string;
      content?: string;
      competitorDomain?: string;
      ingestMethod?: string;
    }>
  ): void {
    for (const art of articles) {
      this.register({
        id: art.id,
        url: art.url,
        canonicalUrl: art.canonicalUrl,
        title: art.title,
        content: art.content,
        competitorDomain: art.competitorDomain || "",
        ingestMethod: art.ingestMethod
      });
    }
  }

  private recordSuppression(
    title: string,
    competitor: string,
    matchedBy: "canonical_url" | "source_url" | "title_hash" | "content_hash"
  ) {
    this.duplicatesPrevented++;
    if (matchedBy === "canonical_url") this.breakdown.canonicalUrl++;
    else if (matchedBy === "source_url") this.breakdown.sourceUrl++;
    else if (matchedBy === "title_hash") this.breakdown.titleHash++;
    else if (matchedBy === "content_hash") this.breakdown.contentHash++;

    this.recentSuppressed.unshift({
      title: title.slice(0, 60),
      competitor,
      source: "Hybrid multi-source scan",
      matchedBy,
      timestamp: new Date().toLocaleTimeString()
    });

    if (this.recentSuppressed.length > 20) {
      this.recentSuppressed.pop();
    }
  }

  /**
   * Telemetry stats for dashboard inspection
   */
  public getStats() {
    return {
      indexedUrlsCount: this.canonicalUrlSet.size,
      indexedTitlesCount: this.titleFingerprintSet.size,
      indexedContentCount: this.contentFingerprintSet.size,
      duplicatesPrevented: this.duplicatesPrevented,
      breakdown: { ...this.breakdown },
      recentSuppressed: [...this.recentSuppressed]
    };
  }

  public clear(): void {
    this.canonicalUrlSet.clear();
    this.titleFingerprintSet.clear();
    this.contentFingerprintSet.clear();
    this.inFlightLocks.clear();
    this.urlToArticleId.clear();
    this.titleToArticleId.clear();
  }
}

// Global Singleton
export const deduplicationEngine = new CanonicalDeduplicationEngine();
