import { Article } from '../types';

/**
 * Extracts a numeric epoch timestamp (in milliseconds) from an Article
 * to enable accurate chronological sorting.
 */
export function getArticleTimestamp(article: Article): number {
  if (!article) return 0;

  // 1. Try ISO 8601 publishedDate
  if (article.publishedDate) {
    const t = new Date(article.publishedDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 2. Try ISO 8601 discoveredDate
  if (article.discoveredDate) {
    const t = new Date(article.discoveredDate).getTime();
    if (!isNaN(t) && t > 0) return t;
  }

  // 3. Try parsing publishedAt directly if valid
  if (article.publishedAt && article.publishedAt !== 'Recently' && article.publishedAt !== 'Just now') {
    // Check if publishedAt starts with or contains MM/DD/YYYY or YYYY-MM-DD or Month DD, YYYY
    const dateMatch = article.publishedAt.match(/\b(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b/);
    if (dateMatch) {
      const parsed = new Date(dateMatch[1]).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const directParsed = new Date(article.publishedAt).getTime();
    if (!isNaN(directParsed) && directParsed > 0) return directParsed;
  }

  // 4. Try extracting 13-digit epoch timestamp from article.id (e.g. art-1790502424987-v1k4x)
  if (article.id) {
    const epochMatch = article.id.match(/\b(\d{13})\b/);
    if (epochMatch) {
      const epoch = parseInt(epochMatch[1], 10);
      if (!isNaN(epoch) && epoch > 1000000000000) return epoch;
    }
  }

  // 5. Try parsing discoveredAt if it has date or time information
  if (article.discoveredAt && article.discoveredAt !== 'Just now' && article.discoveredAt !== 'Recently') {
    const discParsed = new Date(article.discoveredAt).getTime();
    if (!isNaN(discParsed) && discParsed > 0) return discParsed;
  }

  return 0;
}

/**
 * Sorts articles and posts in descending order with latest / newest ones on top.
 */
export function sortArticlesDescending(articles: Article[]): Article[] {
  if (!Array.isArray(articles)) return [];
  return [...articles].sort((a, b) => {
    const timeA = getArticleTimestamp(a);
    const timeB = getArticleTimestamp(b);
    if (timeA !== timeB) {
      return timeB - timeA; // Descending: latest timestamp first
    }
    // Secondary fallback: compare IDs descending
    return (b.id || '').localeCompare(a.id || '');
  });
}

/**
 * Sorts articles and posts in ascending order (oldest first).
 */
export function sortArticlesAscending(articles: Article[]): Article[] {
  if (!Array.isArray(articles)) return [];
  return [...articles].sort((a, b) => {
    const timeA = getArticleTimestamp(a);
    const timeB = getArticleTimestamp(b);
    if (timeA !== timeB) {
      return timeA - timeB; // Ascending: oldest timestamp first
    }
    return (a.id || '').localeCompare(b.id || '');
  });
}
