export type NavigationTab = 
  | 'dashboard'
  | 'competitors'
  | 'reader'
  | 'scale'
  | 'integrations'
  | 'reports';

export type IngestionStrategy = 
  | 'Hybrid RSS+Sitemap'
  | 'Sitemap Index'
  | 'Direct DOM Poller'
  | 'RSS Stream';

export type ThreatRating = 'Low' | 'Medium' | 'High';

export interface GeminiAnalysis {
  summary: string;
  threatRating: ThreatRating;
  threatExplanation: string;
  takeaways: string[];
  counterAction: string;
  analyzedAt?: string;
  source?: string;
}

export interface MediaCaptureItem {
  url: string;
  alt?: string;
  caption?: string;
  width?: number;
  height?: number;
  isHero?: boolean;
}

export interface OutgoingLinkItem {
  text: string;
  url: string;
  domain: string;
  isExternal: boolean;
}

export interface StructuredMetadataPayload {
  jsonLd?: Record<string, any>[];
  openGraph?: Record<string, string>;
  twitter?: Record<string, string>;
  lang?: string;
  wordCount?: number;
  charCount?: number;
  readTime?: string;
  domSelector?: string;
  extractedAt?: string;
  hasSchemaOrg?: boolean;
  hasOpenGraph?: boolean;
  hasTwitterCard?: boolean;
}

export interface Article {
  id: string;
  competitor: string;
  competitorDomain: string;
  title: string;
  snippet: string;
  content: string;
  contentMarkdown?: string;
  contentHtml?: string;
  author: string;
  readTime: string;
  url: string;
  originalSourceUrl?: string;
  canonicalUrl?: string;
  publishedAt: string;
  discoveredAt: string;
  publishedDate?: string; // ISO 8601 string for exact mathematical precision
  discoveredDate?: string; // ISO 8601 string of discovery
  publicationSource?: string; // Source of publication timestamp: RSS <pubDate>, Sitemap <lastmod>, JSON-LD datePublished, HTML meta article:published_time, etc.
  delaySec: number;
  delayFormatted: string;
  exactDelayText?: string; // e.g. "3 minutes 12 seconds" or "20 minutes 0 seconds"
  targetMet: boolean; // <= 300s (5 min) SLA benchmark
  isBackCatalog?: boolean; // Separates initial historical archive ingestion from live new article detections
  ingestType?: 'live' | 'back-catalog';
  slaStatus?: 'met' | 'breached' | 'back-catalog';
  ingestMethod: 'RSS Feed' | 'XML Sitemap' | 'Direct DOM Poller';
  diffPayload: string;
  diffAddedWords?: number;
  categories?: string[];
  tags: string[];
  metaDescription?: string;
  threatRating: ThreatRating;
  featuredImage?: string;
  inlineImages?: string[];
  mediaCaptures?: MediaCaptureItem[];
  outgoingLinks?: OutgoingLinkItem[];
  structuredMetadata?: StructuredMetadataPayload;
  takeaways: {
    label: string;
    value: string;
    type: 'launch' | 'threat' | 'metric';
  }[];
  citations: {
    text: string;
    url: string;
  }[];
  domSelector: string;
  analysis?: GeminiAnalysis;
  rawPayload?: Record<string, any>;
  slaBreachReason?: string;
  wordCount?: number;
  charCount?: number;
}

export interface DiscoveredConfig {
  primaryStrategy: IngestionStrategy;
  activeStrategies: ('RSS Feed' | 'XML Sitemap' | 'Direct DOM Poller')[];
  feedUrl?: string;
  sitemapUrl?: string;
  subSitemaps?: string[];
  blogHubUrl: string;
  urlPattern?: string;
  etagSupported: boolean;
  initialEtag?: string;
  hasLastModInSitemap: boolean;
  htmlSelectors: {
    articleContainer: string;
    titleSelector: string;
    dateSelector: string;
    authorSelector: string;
    canonicalTagSelector: string;
  };
  supports304: boolean;
  pollingCadenceSec: number;
  avgDetectionExpected: string;
  discoveredAt: string;
}

export interface Competitor {
  id: string;
  name: string;
  domain: string;
  blogUrl: string;
  feedUrl?: string;
  status: 'Active' | 'Paused' | 'Error';
  strategy: IngestionStrategy;
  lastChecked: string;
  lastDetection: string;
  articlesScraped: number;
  healthScore: number;
  etag?: string;
  cadence: string;
  detectedFeeds?: string[];
  discoveredSitemaps?: string[];
  discoveredConfig?: DiscoveredConfig;
}

export interface SiteNode {
  id: number;
  name: string;
  domain: string;
  status: 'nominal' | 'polling' | 'backoff' | 'offline' | 'queued' | 'rate_limited';
  strategy: IngestionStrategy;
  latencyMs: number;
  lastPolledSecAgo: number;
  nextPollInSec: number;
  etag: string;
  statusCode: number;
  region: string;
  articlesCount: number;
  // Section 10 High-Scale Fields
  slotId?: number;
  batchIndex?: number;
  circuitBreakerState?: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  activeRetriesCount?: number;
  lastError?: string;
  dedupSignature?: string;
  socketTimeMs?: number;
  bandwidthBytes?: number;
}

export interface ScaleQueueStatus {
  total: number;
  queued: number;
  processing: number;
  completed: number;
  cached: number;
  failed: number;
  retrying: number;
  rateLimited: number;
  timedOut: number;
}

export interface ScaleSystemLoad {
  cpuLoopLagMs: number;
  activeSockets: number;
  maxSockets: number;
  socketUtilizationPct: number;
  throughputItemsPerSec: number;
  egressKbPerSec: number;
  memoryUsageMb: number;
  eventLoopHealth: 'OPTIMAL' | 'DEGRADED' | 'OVERLOADED';
}

export interface CircuitBreakerRecord {
  domain: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  failureThreshold: number;
  lastFailureAt: string;
  nextTrialAt: string;
  cooldownSecRemaining: number;
  consecutiveSuccesses: number;
  reason: string;
}

export interface DeduplicationMetrics {
  totalProcessed: number;
  uniqueIngested: number;
  duplicatesBlocked: number;
  canonicalMatches: number;
  contentHashMatches: number;
  simHashMatches: number;
  duplicateRatePct: number;
  zeroLeakageVerified: boolean;
  recentBlockedHashes: {
    hash: string;
    domain: string;
    title: string;
    matchType: 'canonical_url' | 'content_hash' | 'simhash_title';
    timestamp: string;
  }[];
}

export interface ScaleBenchmarkResult {
  id: string;
  timestamp: string;
  scenario: 'nominal' | 'slow_timeouts' | 'rate_limits' | 'syndication_storm' | 'real_web_scrape';
  totalTargets: number;
  concurrencyLimit: number;
  batchSize: number;
  elapsedMs: number;
  throughputPerSec: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  nominal200Count: number;
  cached304Count: number;
  timeout504Count: number;
  rateLimited429Count: number;
  circuitBreakersTripped: number;
  bandwidthSavedKb: number;
  duplicatesBlocked: number;
  zeroDuplicateGuarantee: boolean;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  source: string;
  message: string;
  durationMs?: number;
}

export interface MonitoringCheck {
  id: string;
  timestamp: string;
  competitorId: string;
  competitorName: string;
  domain: string;
  strategy: string;
  statusCode: number;
  statusResponse: string;
  durationMs: number;
  outcome: 'success' | 'cached' | 'error' | 'rate_limited';
  articlesDetected: number;
  error?: string;
  recoveryAction?: string;
  createdAt?: string;
}

export interface RetryEvent {
  id: string;
  timestamp: string;
  domain: string;
  error: string;
  code: number;
  attempt: number;
  maxAttempts: number;
  resolution: 'Recovered' | 'Backoff' | 'Pending';
  backoffDelay: string;
  createdAt?: string;
}

export interface ProbeResult {
  domain: string;
  status: string;
  protocol: string;
  blogHubUrl: string;
  blogHubConfidence: number;
  rssFeeds: { path: string; status: string; items: number; live: boolean }[];
  sitemaps: { path: string; indexedUrls: number; type: string; hasLastMod?: boolean; subSitemaps?: string[] }[];
  microdata: {
    canonicalTag: string;
    publishedDateSelector: string;
    authorSelector: string;
    openGraphDetected: boolean;
    jsonLdDetected?: boolean;
    articlePatternDetected?: string;
  };
  recommendedProfile: {
    strategy: IngestionStrategy;
    cadence: string;
    avgDetectionExpected: string;
    description: string;
  };
  discoveredConfig?: DiscoveredConfig;
  latencyMs?: number;
  serverHeader?: string;
  etag?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  fromAddress: string;
  recipients: string[];
  rules: {
    instantDelayAlert: boolean;
    highThreatAlert: boolean;
    dailyDigest: boolean;
    systemHealthAlert: boolean;
  };
}

export interface WordPressConfig {
  endpoint: string;
  appPassword: string;
  defaultStatus: 'draft' | 'pending' | 'publish';
  targetCategory: string;
  canonicalAttribution: boolean;
  aiAutoTagging: boolean;
  connected: boolean;
}

export interface WebhookConfig {
  url: string;
  secretKey: string;
  retries: number;
  active: boolean;
}

export interface CrawlerSettings {
  pollingIntervalMin: number;
  concurrencyLimit: number;
  respectRobotsTxt: boolean;
  userAgent: string;
  requestJitter: boolean;
}
