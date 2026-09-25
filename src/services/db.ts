import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import getDb from '../lib/firebase';
import { Article, Competitor, TelemetryLog, MonitoringCheck, RetryEvent } from '../types';

const ARTICLES_COL = 'articles';
const COMPETITORS_COL = 'competitors';
const LOGS_COL = 'logs';
const MONITORING_CHECKS_COL = 'monitoring_checks';
const RETRIES_COL = 'retries';

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

// Real-time listener for captured competitor articles
export function subscribeToArticles(
  onData: (articles: Article[]) => void,
  onError?: (err: Error) => void
) {
  let unsubscribe: (() => void) | null = null;
  let isCancelled = false;

  getDb()
    .then((database) => {
      if (isCancelled) return;
      const q = query(collection(database, ARTICLES_COL), limit(100));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const articles: Article[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const delaySec = typeof data.delaySec === 'number' ? data.delaySec : 120;
            const isBackCatalog = data.isBackCatalog !== undefined ? Boolean(data.isBackCatalog) : delaySec > 1800;
            const ingestType: 'live' | 'back-catalog' = data.ingestType || (isBackCatalog ? 'back-catalog' : 'live');
            const targetMet = isBackCatalog ? true : (data.targetMet !== undefined ? Boolean(data.targetMet) : delaySec <= 300);
            const slaStatus: 'met' | 'breached' | 'back-catalog' = data.slaStatus || (isBackCatalog ? 'back-catalog' : (targetMet ? 'met' : 'breached'));
            const exactDelayText = safeString(data.exactDelayText) || formatExactDelayText(delaySec);
            const ingestMethod = (data.ingestMethod || 'RSS Feed') as 'Direct DOM Poller' | 'RSS Feed' | 'XML Sitemap';
            const publicationSource = safeString(data.publicationSource) || (ingestMethod === 'RSS Feed' ? 'RSS <pubDate>' : ingestMethod === 'XML Sitemap' ? 'Sitemap <lastmod>' : 'JSON-LD / HTML Meta');

            articles.push({
              id: docSnap.id,
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
            });
          });
          onData(articles);
        },
        (error) => {
          console.warn('Firestore articles subscription notice:', error.message);
          if (onError) onError(error);
        }
      );
    })
    .catch((err) => {
      console.warn('Error setting up articles subscription:', err);
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    });

  return () => {
    isCancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

// Real-time listener for registered competitors
export function subscribeToCompetitors(
  onData: (competitors: Competitor[]) => void,
  onError?: (err: Error) => void
) {
  let unsubscribe: (() => void) | null = null;
  let isCancelled = false;

  getDb()
    .then((database) => {
      if (isCancelled) return;
      const q = query(collection(database, COMPETITORS_COL), orderBy('createdAt', 'desc'), limit(100));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const competitors: Competitor[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            competitors.push({
              id: docSnap.id,
              name: data.name || 'Unnamed Competitor',
              domain: data.domain || '',
              blogUrl: data.blogUrl || `https://${data.domain || 'example.com'}/blog`,
              feedUrl: data.feedUrl,
              status: data.status || 'Active',
              strategy: data.strategy || 'Hybrid RSS+Sitemap',
              lastChecked: data.lastChecked || 'Just now',
              lastDetection: data.lastDetection || 'Pending sweep',
              articlesScraped: typeof data.articlesScraped === 'number' ? data.articlesScraped : 0,
              healthScore: typeof data.healthScore === 'number' ? data.healthScore : 100,
              etag: data.etag,
              cadence: data.cadence || '15m polling',
              detectedFeeds: data.detectedFeeds || [],
              discoveredSitemaps: data.discoveredSitemaps || [],
              discoveredConfig: data.discoveredConfig
            });
          });
          onData(competitors);
        },
        (error) => {
          console.warn('Firestore competitors subscription notice:', error.message);
          if (onError) onError(error);
        }
      );
    })
    .catch((err) => {
      console.warn('Error setting up competitors subscription:', err);
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    });

  return () => {
    isCancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

// Real-time listener for crawler telemetry logs
export function subscribeToLogs(
  onData: (logs: TelemetryLog[]) => void,
  onError?: (err: Error) => void
) {
  let unsubscribe: (() => void) | null = null;
  let isCancelled = false;

  getDb()
    .then((database) => {
      if (isCancelled) return;
      const q = query(collection(database, LOGS_COL), orderBy('createdAt', 'desc'), limit(50));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const logs: TelemetryLog[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            logs.push({
              id: docSnap.id,
              timestamp: data.timestamp || new Date().toISOString().split('T')[1].slice(0, 8),
              level: data.level || 'info',
              source: data.source || 'crawler-system',
              message: data.message || '',
              durationMs: data.durationMs
            });
          });
          onData(logs);
        },
        (error) => {
          console.warn('Firestore logs subscription notice:', error.message);
          if (onError) onError(error);
        }
      );
    })
    .catch((err) => {
      console.warn('Error setting up logs subscription:', err);
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    });

  return () => {
    isCancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

// Real-time listener for persistent monitoring check audit logs
export function subscribeToMonitoringChecks(
  onData: (checks: MonitoringCheck[]) => void,
  onError?: (err: Error) => void
) {
  let unsubscribe: (() => void) | null = null;
  let isCancelled = false;

  getDb()
    .then((database) => {
      if (isCancelled) return;
      const q = query(collection(database, MONITORING_CHECKS_COL), orderBy('createdAt', 'desc'), limit(100));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const checks: MonitoringCheck[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            checks.push({
              id: docSnap.id,
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
            });
          });
          onData(checks);
        },
        (error) => {
          console.warn('Firestore monitoring_checks subscription notice:', error.message);
          if (onError) onError(error);
        }
      );
    })
    .catch((err) => {
      console.warn('Error setting up monitoring_checks subscription:', err);
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    });

  return () => {
    isCancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

// Real-time listener for crawler retry events & backoff traces
export function subscribeToRetries(
  onData: (retries: RetryEvent[]) => void,
  onError?: (err: Error) => void
) {
  let unsubscribe: (() => void) | null = null;
  let isCancelled = false;

  getDb()
    .then((database) => {
      if (isCancelled) return;
      const q = query(collection(database, RETRIES_COL), orderBy('createdAt', 'desc'), limit(50));
      unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const retries: RetryEvent[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            retries.push({
              id: docSnap.id,
              timestamp: safeString(data.timestamp, new Date().toLocaleTimeString()),
              domain: safeString(data.domain, ''),
              error: safeString(data.error, 'Network timeout / error'),
              code: typeof data.code === 'number' ? data.code : 500,
              attempt: typeof data.attempt === 'number' ? data.attempt : 1,
              maxAttempts: typeof data.maxAttempts === 'number' ? data.maxAttempts : 3,
              resolution: (data.resolution || 'Backoff') as 'Recovered' | 'Backoff' | 'Pending',
              backoffDelay: safeString(data.backoffDelay, '30s exponential'),
              createdAt: data.createdAt ? safeString(data.createdAt) : undefined
            });
          });
          onData(retries);
        },
        (error) => {
          console.warn('Firestore retries subscription notice:', error.message);
          if (onError) onError(error);
        }
      );
    })
    .catch((err) => {
      console.warn('Error setting up retries subscription:', err);
      if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    });

  return () => {
    isCancelled = true;
    if (unsubscribe) unsubscribe();
  };
}

// Save monitoring check cycle result to database
export async function saveMonitoringCheckToDb(check: MonitoringCheck): Promise<void> {
  const database = await getDb();
  const checkId = check.id || `chk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const docRef = doc(database, MONITORING_CHECKS_COL, checkId);
  const payload = cleanFirestoreData({
    ...check,
    id: checkId,
    createdAt: check.createdAt || new Date().toISOString()
  });
  await setDoc(docRef, payload);
}

// Save retry event to database
export async function saveRetryEventToDb(retry: RetryEvent): Promise<void> {
  const database = await getDb();
  const retryId = retry.id || `ret-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const docRef = doc(database, RETRIES_COL, retryId);
  const payload = cleanFirestoreData({
    ...retry,
    id: retryId,
    createdAt: retry.createdAt || new Date().toISOString()
  });
  await setDoc(docRef, payload);
}

/**
 * Recursively removes any undefined fields from an object so Firestore setDoc/updateDoc
 * will never throw "Unsupported field value: undefined".
 */
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
    // Preserve Date or FieldValue objects (e.g. serverTimestamp)
    if (data instanceof Date || typeof (data as any).toMillis === 'function' || (data as any)._methodName) {
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

// Add new captured article to database
export async function saveArticleToDb(article: Article): Promise<void> {
  const database = await getDb();
  const docRef = doc(database, ARTICLES_COL, article.id);
  const payload = cleanFirestoreData({
    ...article,
    createdAt: new Date().toISOString(),
    serverTimestamp: serverTimestamp()
  });
  await setDoc(docRef, payload);
}

// Update article with Gemini AI strategic analysis
export async function updateArticleInDb(articleId: string, updates: Partial<Article>): Promise<void> {
  const database = await getDb();
  const docRef = doc(database, ARTICLES_COL, articleId);
  const payload = cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString()
  });
  await setDoc(docRef, payload, { merge: true });
}

// Add new monitored competitor target to database
export async function saveCompetitorToDb(competitor: Competitor): Promise<void> {
  const database = await getDb();
  const docRef = doc(database, COMPETITORS_COL, competitor.id);
  const payload = cleanFirestoreData({
    ...competitor,
    createdAt: new Date().toISOString(),
    serverTimestamp: serverTimestamp()
  });
  await setDoc(docRef, payload);
}

// Update competitor status (Active / Paused)
export async function updateCompetitorInDb(competitorId: string, updates: Partial<Competitor>): Promise<void> {
  const database = await getDb();
  const docRef = doc(database, COMPETITORS_COL, competitorId);
  const payload = cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString()
  });
  await setDoc(docRef, payload, { merge: true });
}

// Delete competitor target from database
export async function deleteCompetitorFromDb(competitorId: string): Promise<void> {
  const database = await getDb();
  const docRef = doc(database, COMPETITORS_COL, competitorId);
  await deleteDoc(docRef);
}

// Save telemetry log event to database
export async function saveLogToDb(log: Omit<TelemetryLog, 'id'> & { id?: string }): Promise<void> {
  const database = await getDb();
  const logId = log.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const docRef = doc(database, LOGS_COL, logId);
  const payload = cleanFirestoreData({
    ...log,
    id: logId,
    createdAt: new Date().toISOString()
  });
  await setDoc(docRef, payload);
}

// Clear or seed helpers
export async function checkHasData(): Promise<boolean> {
  try {
    const database = await getDb();
    const compSnap = await getDocs(query(collection(database, COMPETITORS_COL), limit(1)));
    const artSnap = await getDocs(query(collection(database, ARTICLES_COL), limit(1)));
    return !compSnap.empty || !artSnap.empty;
  } catch {
    return false;
  }
}
