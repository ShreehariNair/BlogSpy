export type NavigationTab = 
  | 'dashboard'
  | 'competitors'
  | 'reader'
  | 'scale'
  | 'integrations';

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

export interface Article {
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
  targetMet: boolean; // <= 300s (5 min)
  ingestMethod: 'RSS Feed' | 'XML Sitemap' | 'Direct DOM Poller';
  diffPayload: string;
  diffAddedWords?: number;
  tags: string[];
  threatRating: ThreatRating;
  featuredImage?: string;
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
  inlineImages?: string[];
  wordCount?: number;
  canonicalUrl?: string;
  metaDescription?: string;
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
}

export interface SiteNode {
  id: number;
  name: string;
  domain: string;
  status: 'nominal' | 'polling' | 'backoff' | 'offline';
  strategy: IngestionStrategy;
  latencyMs: number;
  lastPolledSecAgo: number;
  nextPollInSec: number;
  etag: string;
  statusCode: number;
  region: string;
  articlesCount: number;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'warn' | 'error';
  source: string;
  message: string;
  durationMs?: number;
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
}

export interface ProbeResult {
  domain: string;
  status: string;
  protocol: string;
  blogHubUrl: string;
  blogHubConfidence: number;
  rssFeeds: { path: string; status: string; items: number; live: boolean }[];
  sitemaps: { path: string; indexedUrls: number; type: string }[];
  microdata: {
    canonicalTag: string;
    publishedDateSelector: string;
    authorSelector: string;
    openGraphDetected: boolean;
  };
  recommendedProfile: {
    strategy: IngestionStrategy;
    cadence: string;
    avgDetectionExpected: string;
    description: string;
  };
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
