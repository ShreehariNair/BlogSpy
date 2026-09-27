import { Article, Competitor, TelemetryLog, MonitoringCheck, RetryEvent } from '../types';
import { sortArticlesDescending } from '../utils/articleSort';

export function safeAuthor(raw: any): string {
  if (!raw) return 'Editorial Team';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        return safeAuthor(parsed);
      } catch {
        return trimmed;
      }
    }
    return trimmed || 'Editorial Team';
  }
  if (Array.isArray(raw)) {
    const list = raw.map(safeAuthor).filter(Boolean);
    return list.length > 0 ? list.join(', ') : 'Editorial Team';
  }
  if (typeof raw === 'object') {
    if (raw.name && typeof raw.name === 'string') return raw.name.trim();
    if (raw['#text'] && typeof raw['#text'] === 'string') return raw['#text'].trim();
    if (raw.author && typeof raw.author === 'string') return raw.author.trim();
    if (raw.title && typeof raw.title === 'string' && !raw.company) return raw.title.trim();
    if (raw.name && typeof raw.name === 'object') return safeAuthor(raw.name);
    if (raw.company && typeof raw.company === 'string') return raw.company.trim();
  }
  return String(raw) || 'Editorial Team';
}

function safeString(val: any, fallback = ''): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (typeof val.name === 'string') return val.name;
    if (typeof val.title === 'string') return val.title;
    if (typeof val['#text'] === 'string') return val['#text'];
    return fallback;
  }
  return String(val);
}

export function formatDelay(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s delay`;
  }
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (mins < 60) {
    return `${mins.toString().padStart(2, '0')}m ${remSec.toString().padStart(2, '0')}s delay`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) {
    return `${hours}h ${remMins.toString().padStart(2, '0')}m delay`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h delay`;
}

export function formatExactDelayText(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`;
  }
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (mins < 60) {
    if (remSec === 0) {
      return `${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
    }
    return `${mins} ${mins === 1 ? 'minute' : 'minutes'} ${remSec} ${remSec === 1 ? 'second' : 'seconds'}`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) {
    if (remMins === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    if (remSec === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remMins} ${remMins === 1 ? 'minute' : 'minutes'}`;
    }
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remMins} ${remMins === 1 ? 'minute' : 'minutes'} ${remSec} ${remSec === 1 ? 'second' : 'seconds'}`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days} ${days === 1 ? 'day' : 'days'} ${remHours} ${remHours === 1 ? 'hour' : 'hours'}`;
}

export function cleanFirestoreData<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as any;
  }
  if (typeof data === 'object') {
    if (data instanceof Date) return data;
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

// Data Transformers
export function transformArticles(rawList: any[]): Article[] {
  const articles: Article[] = rawList.map((data: any) => {
    const delaySec = typeof data.delaySec === 'number' ? data.delaySec : 120;
    const isBackCatalog = data.isBackCatalog !== undefined ? Boolean(data.isBackCatalog) : delaySec > 1800;
    const ingestType: 'live' | 'back-catalog' = data.ingestType || (isBackCatalog ? 'back-catalog' : 'live');
    const targetMet = isBackCatalog ? true : (data.targetMet !== undefined ? Boolean(data.targetMet) : delaySec <= 300);
    const slaStatus: 'met' | 'breached' | 'back-catalog' = data.slaStatus || (isBackCatalog ? 'back-catalog' : (targetMet ? 'met' : 'breached'));
    const exactDelayText = safeString(data.exactDelayText) || formatExactDelayText(delaySec);
    const ingestMethod = (data.ingestMethod || 'RSS Feed') as 'Direct DOM Poller' | 'RSS Feed' | 'XML Sitemap';
    const publicationSource = safeString(data.publicationSource) || (ingestMethod === 'RSS Feed' ? 'RSS <pubDate>' : ingestMethod === 'XML Sitemap' ? 'Sitemap <lastmod>' : 'JSON-LD / HTML Meta');

    return {
      id: data.id || data._id,
      competitor: safeString(data.competitor, 'Unknown Competitor'),
      competitorDomain: safeString(data.competitorDomain, ''),
      title: safeString(data.title, 'Untitled Update'),
      snippet: safeString(data.snippet, ''),
      content: safeString(data.content, ''),
      contentMarkdown: data.contentMarkdown ? safeString(data.contentMarkdown) : undefined,
      contentHtml: data.contentHtml ? safeString(data.contentHtml) : undefined,
      author: safeAuthor(data.author),
      readTime: safeString(data.readTime, '2 min read'),
      url: safeString(data.url, '#'),
      originalSourceUrl: safeString(data.originalSourceUrl, safeString(data.url, '#')),
      canonicalUrl: safeString(data.canonicalUrl, safeString(data.url, '#')),
      publishedAt: safeString(data.publishedAt, 'Recently'),
      discoveredAt: safeString(data.discoveredAt, 'Just now'),
      publishedDate: data.publishedDate ? safeString(data.publishedDate) : undefined,
      discoveredDate: data.discoveredDate ? safeString(data.discoveredDate) : undefined,
      publicationSource,
      delaySec,
      delayFormatted: safeString(data.delayFormatted) || formatDelay(delaySec),
      exactDelayText,
      targetMet,
      isBackCatalog,
      ingestType,
      slaStatus,
      slaBreachReason: data.slaBreachReason ? safeString(data.slaBreachReason) : undefined,
      wordCount: typeof data.wordCount === 'number' ? data.wordCount : undefined,
      charCount: typeof data.charCount === 'number' ? data.charCount : undefined,
      metaDescription: data.metaDescription ? safeString(data.metaDescription) : undefined,
      inlineImages: Array.isArray(data.inlineImages) ? data.inlineImages : undefined,
      mediaCaptures: Array.isArray(data.mediaCaptures) ? data.mediaCaptures : undefined,
      categories: Array.isArray(data.categories) ? data.categories : ['Industry Intelligence'],
      outgoingLinks: Array.isArray(data.outgoingLinks) ? data.outgoingLinks : undefined,
      structuredMetadata: typeof data.structuredMetadata === 'object' && data.structuredMetadata !== null ? data.structuredMetadata : undefined,
      ingestMethod,
      diffPayload: safeString(data.diffPayload, '+340B'),
      diffAddedWords: typeof data.diffAddedWords === 'number' ? data.diffAddedWords : 120,
      tags: Array.isArray(data.tags)
        ? data.tags.map((t: any) => (typeof t === 'string' ? t : (t?.name || String(t))))
        : ['Product'],
      threatRating: safeString(data.threatRating, 'Medium') as any,
      featuredImage: typeof data.featuredImage === 'string' ? data.featuredImage : undefined,
      takeaways: Array.isArray(data.takeaways)
        ? data.takeaways.map((t: any) => ({
            label: safeString(t?.label, 'Key Finding'),
            value: safeString(t?.value, ''),
            type: t?.type || 'metric'
          }))
        : [],
      citations: Array.isArray(data.citations)
        ? data.citations.map((c: any) =>
            typeof c === 'string'
              ? { text: c, url: '#' }
              : { text: safeString(c?.text, 'Citation'), url: safeString(c?.url, '#') }
          )
        : [],
      domSelector: safeString(data.domSelector, 'article.blog-entry'),
      analysis: data.analysis,
      rawPayload: typeof data.rawPayload === 'object' && data.rawPayload !== null ? data.rawPayload : undefined
    };
  });
  return sortArticlesDescending(articles);
}

export function transformCompetitors(rawList: any[]): Competitor[] {
  return rawList.map((data: any) => ({
    id: data.id || data._id,
    name: data.name || 'Unnamed Competitor',
    domain: data.domain || '',
    blogUrl: data.blogUrl || `https://${data.domain || 'example.com'}/blog`,
    feedUrl: data.feedUrl,
    status: data.status || 'Paused',
    strategy: data.strategy || 'Hybrid RSS+Sitemap',
    lastChecked: data.lastChecked || 'Never',
    lastDetection: data.lastDetection || 'Pending sweep',
    articlesScraped: typeof data.articlesScraped === 'number' ? data.articlesScraped : 0,
    healthScore: typeof data.healthScore === 'number' ? data.healthScore : 100,
    etag: data.etag,
    cadence: data.cadence || '15m polling',
    detectedFeeds: data.detectedFeeds || [],
    discoveredSitemaps: data.discoveredSitemaps || [],
    discoveredConfig: data.discoveredConfig
  }));
}

export function transformLogs(rawList: any[]): TelemetryLog[] {
  return rawList.map((data: any) => ({
    id: data.id || data._id,
    timestamp: data.timestamp || new Date().toISOString().split('T')[1].slice(0, 8),
    level: data.level || 'info',
    source: data.source || 'crawler-system',
    message: data.message || '',
    durationMs: data.durationMs
  }));
}

export function transformMonitoringChecks(rawList: any[]): MonitoringCheck[] {
  return rawList.map((data: any) => ({
    id: data.id || data._id,
    timestamp: safeString(data.timestamp, new Date().toLocaleTimeString()),
    competitorId: safeString(data.competitorId, ''),
    competitorName: safeString(data.competitorName, 'Target'),
    domain: safeString(data.domain, ''),
    strategy: safeString(data.strategy, 'Hybrid RSS+Sitemap'),
    statusCode: typeof data.statusCode === 'number' ? data.statusCode : 200,
    statusResponse: safeString(data.statusResponse, '200 OK'),
    durationMs: typeof data.durationMs === 'number' ? data.durationMs : 120,
    outcome: data.outcome || 'success',
    articlesDetected: typeof data.articlesDetected === 'number' ? data.articlesDetected : 0,
    error: data.error ? safeString(data.error) : undefined,
    recoveryAction: data.recoveryAction ? safeString(data.recoveryAction) : undefined,
    createdAt: data.createdAt ? safeString(data.createdAt) : undefined
  }));
}

export function transformRetries(rawList: any[]): RetryEvent[] {
  return rawList.map((data: any) => ({
    id: data.id || data._id,
    timestamp: safeString(data.timestamp, new Date().toLocaleTimeString()),
    domain: safeString(data.domain, ''),
    error: safeString(data.error, 'Network timeout / error'),
    code: typeof data.code === 'number' ? data.code : 500,
    attempt: typeof data.attempt === 'number' ? data.attempt : 1,
    maxAttempts: typeof data.maxAttempts === 'number' ? data.maxAttempts : 3,
    resolution: (data.resolution || 'Backoff') as 'Recovered' | 'Backoff' | 'Pending',
    backoffDelay: safeString(data.backoffDelay, '30s exponential'),
    createdAt: data.createdAt ? safeString(data.createdAt) : undefined
  }));
}

// Cache keys for local storage
const CACHE_KEY = 'blogspy_bootstrap_cache_v2';

function getLocalCache(): any {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY) || localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          articles: Array.isArray(parsed.articles) ? parsed.articles : [],
          competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
          logs: Array.isArray(parsed.logs) ? parsed.logs : [],
          checks: Array.isArray(parsed.checks) ? parsed.checks : [],
          retries: Array.isArray(parsed.retries) ? parsed.retries : []
        };
      }
    }
  } catch {}

  // Pure Empty State - NO static mock data
  return {
    articles: [],
    competitors: [],
    logs: [],
    checks: [],
    retries: []
  };
}

function setLocalCache(data: any): void {
  try {
    const str = JSON.stringify(data);
    sessionStorage.setItem(CACHE_KEY, str);
    localStorage.setItem(CACHE_KEY, str);
  } catch {}
}

// Global Listener Store
type ListenerSet = {
  articles: Set<(data: Article[]) => void>;
  competitors: Set<(data: Competitor[]) => void>;
  logs: Set<(data: TelemetryLog[]) => void>;
  checks: Set<(data: MonitoringCheck[]) => void>;
  retries: Set<(data: RetryEvent[]) => void>;
};

const listeners: ListenerSet = {
  articles: new Set(),
  competitors: new Set(),
  logs: new Set(),
  checks: new Set(),
  retries: new Set()
};

let isFetchPending = false;
let globalEventSource: EventSource | null = null;
let globalPollInterval: any = null;

async function executeBootstrapFetch() {
  if (isFetchPending) return;
  isFetchPending = true;

  try {
    const res = await fetch('/api/db/bootstrap');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    
    if (json && typeof json === 'object') {
      const updatedPayload = {
        articles: Array.isArray(json.articles) ? json.articles : [],
        competitors: Array.isArray(json.competitors) ? json.competitors : [],
        logs: Array.isArray(json.logs) ? json.logs : [],
        checks: Array.isArray(json.checks) ? json.checks : [],
        retries: Array.isArray(json.retries) ? json.retries : []
      };

      setLocalCache(updatedPayload);
      notifyAllSubscribers(updatedPayload);
    }
  } catch {
  } finally {
    isFetchPending = false;
  }
}

function notifyAllSubscribers(data: any) {
  if (Array.isArray(data.articles)) {
    const transformed = transformArticles(data.articles);
    listeners.articles.forEach(fn => fn(transformed));
  }
  if (Array.isArray(data.competitors)) {
    const transformed = transformCompetitors(data.competitors);
    listeners.competitors.forEach(fn => fn(transformed));
  }
  if (Array.isArray(data.logs)) {
    const transformed = transformLogs(data.logs);
    listeners.logs.forEach(fn => fn(transformed));
  }
  if (Array.isArray(data.checks)) {
    const transformed = transformMonitoringChecks(data.checks);
    listeners.checks.forEach(fn => fn(transformed));
  }
  if (Array.isArray(data.retries)) {
    const transformed = transformRetries(data.retries);
    listeners.retries.forEach(fn => fn(transformed));
  }
}

function initGlobalStreamsIfNeeded() {
  if (!globalPollInterval) {
    globalPollInterval = setInterval(executeBootstrapFetch, 8000);
  }
  if (!globalEventSource) {
    try {
      globalEventSource = new EventSource('/api/db/stream');
      globalEventSource.onmessage = () => {
        executeBootstrapFetch();
      };
    } catch {}
  }
}

// Subscriptions

export function subscribeToArticles(onData: (articles: Article[]) => void) {
  listeners.articles.add(onData);

  const cached = getLocalCache();
  if (cached && Array.isArray(cached.articles)) {
    onData(transformArticles(cached.articles));
  }

  initGlobalStreamsIfNeeded();
  executeBootstrapFetch();

  return () => {
    listeners.articles.delete(onData);
  };
}

export function subscribeToCompetitors(onData: (competitors: Competitor[]) => void) {
  listeners.competitors.add(onData);

  const cached = getLocalCache();
  if (cached && Array.isArray(cached.competitors)) {
    onData(transformCompetitors(cached.competitors));
  }

  initGlobalStreamsIfNeeded();
  executeBootstrapFetch();

  return () => {
    listeners.competitors.delete(onData);
  };
}

export function subscribeToLogs(onData: (logs: TelemetryLog[]) => void) {
  listeners.logs.add(onData);

  const cached = getLocalCache();
  if (cached && Array.isArray(cached.logs)) {
    onData(transformLogs(cached.logs));
  }

  initGlobalStreamsIfNeeded();
  executeBootstrapFetch();

  return () => {
    listeners.logs.delete(onData);
  };
}

export function subscribeToMonitoringChecks(onData: (checks: MonitoringCheck[]) => void) {
  listeners.checks.add(onData);

  const cached = getLocalCache();
  if (cached && Array.isArray(cached.checks)) {
    onData(transformMonitoringChecks(cached.checks));
  }

  initGlobalStreamsIfNeeded();
  executeBootstrapFetch();

  return () => {
    listeners.checks.delete(onData);
  };
}

export function subscribeToRetries(onData: (retries: RetryEvent[]) => void) {
  listeners.retries.add(onData);

  const cached = getLocalCache();
  if (cached && Array.isArray(cached.retries)) {
    onData(transformRetries(cached.retries));
  }

  initGlobalStreamsIfNeeded();
  executeBootstrapFetch();

  return () => {
    listeners.retries.delete(onData);
  };
}

// Database Persistence Mutators

export async function saveMonitoringCheckToDb(check: MonitoringCheck): Promise<void> {
  const cache = getLocalCache();
  cache.checks = [check, ...(cache.checks || [])];
  setLocalCache(cache);
  notifyAllSubscribers(cache);

  fetch('/api/db/monitoring_checks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanFirestoreData(check))
  }).then(() => executeBootstrapFetch()).catch(() => {});
}

export async function saveRetryEventToDb(retry: RetryEvent): Promise<void> {
  const cache = getLocalCache();
  cache.retries = [retry, ...(cache.retries || [])];
  setLocalCache(cache);
  notifyAllSubscribers(cache);

  fetch('/api/db/retries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanFirestoreData(retry))
  }).then(() => executeBootstrapFetch()).catch(() => {});
}

export async function saveArticleToDb(article: Article): Promise<void> {
  const cache = getLocalCache();
  cache.articles = [article, ...(cache.articles || []).filter((a: any) => (a.id || a._id) !== article.id)];
  setLocalCache(cache);
  notifyAllSubscribers(cache);

  fetch('/api/db/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanFirestoreData(article))
  }).then(() => executeBootstrapFetch()).catch(() => {});
}

export async function updateArticleInDb(articleId: string, updates: Partial<Article>): Promise<void> {
  const cache = getLocalCache();
  cache.articles = (cache.articles || []).map((a: any) =>
    (a.id || a._id) === articleId ? { ...a, ...updates } : a
  );
  setLocalCache(cache);
  notifyAllSubscribers(cache);

  fetch(`/api/db/articles/${articleId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanFirestoreData(updates))
  }).then(() => executeBootstrapFetch()).catch(() => {});
}

export async function saveCompetitorToDb(competitor: Competitor): Promise<void> {
  const cache = getLocalCache();
  cache.competitors = [competitor, ...(cache.competitors || []).filter((c: any) => (c.id || c._id) !== competitor.id)];
  setLocalCache(cache);
  notifyAllSubscribers(cache);

  fetch('/api/db/competitors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanFirestoreData(competitor))
  }).then(() => executeBootstrapFetch()).catch(() => {});
}

export async function updateCompetitorInDb(competitorId: string, updates: Partial<Competitor>): Promise<void> {
  const cache = getLocalCache();
  cache.competitors = (cache.competitors || []).map((c: any) =>
    (c.id || c._id) === competitorId ? { ...c, ...updates } : c
  );
  setLocalCache(cache);
  notifyAllSubscribers(cache);

  fetch(`/api/db/competitors/${competitorId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanFirestoreData(updates))
  }).then(() => executeBootstrapFetch()).catch(() => {});
}

export async function deleteCompetitorFromMongo(competitorId: string): Promise<void> {
  const cache = getLocalCache();
  cache.competitors = (cache.competitors || []).filter((c: any) => (c.id || c._id) !== competitorId);
  setLocalCache(cache);
  notifyAllSubscribers(cache);

  fetch(`/api/db/competitors/${competitorId}`, {
    method: 'DELETE'
  }).then(() => executeBootstrapFetch()).catch(() => {});
}

export async function deleteCompetitorFromDb(competitorId: string): Promise<void> {
  await deleteCompetitorFromMongo(competitorId);
}

export async function saveLogToDb(log: Omit<TelemetryLog, 'id'> & { id?: string }): Promise<void> {
  const cache = getLocalCache();
  cache.logs = [log, ...(cache.logs || [])];
  setLocalCache(cache);
  notifyAllSubscribers(cache);

  fetch('/api/db/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanFirestoreData(log))
  }).then(() => executeBootstrapFetch()).catch(() => {});
}

export async function checkHasData(): Promise<boolean> {
  try {
    const cached = getLocalCache();
    if (cached && Array.isArray(cached.articles) && cached.articles.length > 0) return true;
    const res = await fetch('/api/db/articles');
    const articles = await res.json();
    return Array.isArray(articles) && articles.length > 0;
  } catch {
    return false;
  }
}
