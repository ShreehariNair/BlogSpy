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
import { db } from '../lib/firebase';
import { Article, Competitor, TelemetryLog } from '../types';

const ARTICLES_COL = 'articles';
const COMPETITORS_COL = 'competitors';
const LOGS_COL = 'logs';

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

// Real-time listener for captured competitor articles
export function subscribeToArticles(
  onData: (articles: Article[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(collection(db, ARTICLES_COL), limit(100));
    return onSnapshot(
      q,
      (snapshot) => {
        const articles: Article[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          articles.push({
            id: docSnap.id,
            competitor: safeString(data.competitor, 'Unknown Competitor'),
            competitorDomain: safeString(data.competitorDomain, ''),
            title: safeString(data.title, 'Untitled Update'),
            snippet: safeString(data.snippet, ''),
            content: safeString(data.content, ''),
            author: safeAuthor(data.author),
            readTime: safeString(data.readTime, '2 min read'),
            url: safeString(data.url, '#'),
            publishedAt: safeString(data.publishedAt, 'Recently'),
            discoveredAt: safeString(data.discoveredAt, 'Just now'),
            delaySec: typeof data.delaySec === 'number' ? data.delaySec : 120,
            delayFormatted: safeString(data.delayFormatted, '2m 00s delay'),
            targetMet: data.targetMet ?? true,
            ingestMethod: (data.ingestMethod || 'RSS Feed') as 'Direct DOM Poller' | 'RSS Feed' | 'XML Sitemap',
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
  } catch (err) {
    console.warn('Error setting up articles subscription:', err);
    return () => {};
  }
}

// Real-time listener for registered competitors
export function subscribeToCompetitors(
  onData: (competitors: Competitor[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(collection(db, COMPETITORS_COL), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(
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
            discoveredSitemaps: data.discoveredSitemaps || []
          });
        });
        onData(competitors);
      },
      (error) => {
        console.warn('Firestore competitors subscription notice:', error.message);
        if (onError) onError(error);
      }
    );
  } catch (err) {
    console.warn('Error setting up competitors subscription:', err);
    return () => {};
  }
}

// Real-time listener for crawler telemetry logs
export function subscribeToLogs(
  onData: (logs: TelemetryLog[]) => void,
  onError?: (err: Error) => void
) {
  try {
    const q = query(collection(db, LOGS_COL), orderBy('createdAt', 'desc'), limit(50));
    return onSnapshot(
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
  } catch (err) {
    console.warn('Error setting up logs subscription:', err);
    return () => {};
  }
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
  const docRef = doc(db, ARTICLES_COL, article.id);
  const payload = cleanFirestoreData({
    ...article,
    createdAt: new Date().toISOString(),
    serverTimestamp: serverTimestamp()
  });
  await setDoc(docRef, payload);
}

// Update article with Gemini AI strategic analysis
export async function updateArticleInDb(articleId: string, updates: Partial<Article>): Promise<void> {
  const docRef = doc(db, ARTICLES_COL, articleId);
  const payload = cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString()
  });
  await updateDoc(docRef, payload);
}

// Add new monitored competitor target to database
export async function saveCompetitorToDb(competitor: Competitor): Promise<void> {
  const docRef = doc(db, COMPETITORS_COL, competitor.id);
  const payload = cleanFirestoreData({
    ...competitor,
    createdAt: new Date().toISOString(),
    serverTimestamp: serverTimestamp()
  });
  await setDoc(docRef, payload);
}

// Update competitor status (Active / Paused)
export async function updateCompetitorInDb(competitorId: string, updates: Partial<Competitor>): Promise<void> {
  const docRef = doc(db, COMPETITORS_COL, competitorId);
  const payload = cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString()
  });
  await updateDoc(docRef, payload);
}

// Delete competitor target from database
export async function deleteCompetitorFromDb(competitorId: string): Promise<void> {
  const docRef = doc(db, COMPETITORS_COL, competitorId);
  await deleteDoc(docRef);
}

// Save telemetry log event to database
export async function saveLogToDb(log: Omit<TelemetryLog, 'id'> & { id?: string }): Promise<void> {
  const logId = log.id || `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const docRef = doc(db, LOGS_COL, logId);
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
    const compSnap = await getDocs(query(collection(db, COMPETITORS_COL), limit(1)));
    const artSnap = await getDocs(query(collection(db, ARTICLES_COL), limit(1)));
    return !compSnap.empty || !artSnap.empty;
  } catch {
    return false;
  }
}
