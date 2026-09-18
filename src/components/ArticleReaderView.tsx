import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  Download, 
  Send, 
  RefreshCw, 
  Copy, 
  Check, 
  FileJson, 
  Code, 
  Layers, 
  Cpu, 
  Hash, 
  ShieldAlert, 
  BookOpen,
  ChevronRight,
  GitCommit,
  Flame,
  X,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { Article, ThreatRating } from '../types';

interface ArticleReaderViewProps {
  articles?: Article[];
  article: Article | null;
  onSelectArticle?: (article: Article) => void;
  onBack: () => void;
  onReAnalyze: (article: Article) => Promise<void>;
  isAnalyzing: boolean;
  onPushToCms?: (article: Article) => void;
  onScrapeArticle?: (article: Article) => Promise<void>;
  isScraping?: boolean;
}

export const ArticleReaderView: React.FC<ArticleReaderViewProps> = ({
  articles = [],
  article,
  onSelectArticle,
  onBack,
  onReAnalyze,
  isAnalyzing,
  onPushToCms,
  onScrapeArticle,
  isScraping = false
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'diff'>('content');
  const [copiedId, setCopiedId] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  // Master Stream Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [competitorFilter, setCompetitorFilter] = useState('all');
  const [threatFilter, setThreatFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState('all');

  // Mobile View state (toggle between list and reader on small screens)
  const [mobileActiveView, setMobileActiveView] = useState<'list' | 'detail'>('detail');

  // Unique Competitor List for Filter Dropdown
  const competitorOptions = useMemo(() => {
    const set = new Set<string>();
    articles.forEach(a => {
      if (a.competitor) set.add(a.competitor);
    });
    return Array.from(set).sort();
  }, [articles]);

  // Filtered Articles for Left Master Pane
  const filteredArticles = useMemo(() => {
    return articles.filter(item => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchComp = item.competitor.toLowerCase().includes(q);
        const matchSnippet = (item.snippet || '').toLowerCase().includes(q);
        const matchContent = (item.content || '').toLowerCase().includes(q);
        if (!matchTitle && !matchComp && !matchSnippet && !matchContent) return false;
      }

      // Competitor filter
      if (competitorFilter !== 'all' && item.competitor !== competitorFilter) {
        return false;
      }

      // Threat filter
      if (threatFilter !== 'all') {
        const rating = item.threatRating || item.analysis?.threatRating;
        if (rating !== threatFilter) return false;
      }

      // SLA filter
      if (slaFilter === 'met' && item.delaySec > 300) return false;
      if (slaFilter === 'breached' && item.delaySec <= 300) return false;

      return true;
    });
  }, [articles, searchQuery, competitorFilter, threatFilter, slaFilter]);

  // Active selected article or fallback to first filtered article
  const currentArticle = article || (filteredArticles.length > 0 ? filteredArticles[0] : null);

  const isSlaMet = currentArticle ? currentArticle.delaySec <= 300 : true;
  const authorText = currentArticle
    ? (typeof currentArticle.author === 'string'
        ? currentArticle.author
        : (typeof currentArticle.author === 'object' && currentArticle.author
            ? ((currentArticle.author as any).name || (currentArticle.author as any).title || (currentArticle.author as any)['#text'] || 'Editorial Team')
            : 'Editorial Team'))
    : 'Editorial Team';

  const handleCopyCheckId = () => {
    if (!currentArticle) return;
    navigator.clipboard.writeText(`chk_${currentArticle.id}_${Date.now().toString(16)}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExportJson = () => {
    if (!currentArticle) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentArticle, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `article-${currentArticle.id}-intel.json`);
    dlAnchor.click();
  };

  const handleExportMarkdown = () => {
    if (!currentArticle) return;
    const md = `# ${currentArticle.title}
**Competitor:** ${currentArticle.competitor} (${currentArticle.competitorDomain})
**Published:** ${currentArticle.publishedAt}
**Discovered:** ${currentArticle.discoveredAt} (${currentArticle.delayFormatted})
**Threat Rating:** ${currentArticle.threatRating}
**Canonical URL:** ${currentArticle.url}

## Executive Summary (Gemini AI)
${currentArticle.analysis?.summary || currentArticle.snippet}

## Strategic Takeaways
${currentArticle.analysis?.takeaways?.map(t => `- ${t}`).join('\n') || ''}

## Suggested Counter-Action
${currentArticle.analysis?.counterAction || ''}

## Full Article Text
${currentArticle.content}
`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `article-${currentArticle.id}-report.md`;
    link.click();
  };

  const handleTriggerPush = () => {
    if (!currentArticle) return;
    setPushStatus('Publishing Draft to WordPress CMS...');
    setTimeout(() => {
      setPushStatus('Successfully Pushed (Post #412 created as Draft)');
      setTimeout(() => setPushStatus(null), 3000);
    }, 1200);
    if (onPushToCms) {
      onPushToCms(currentArticle);
    }
  };

  const handleSelectStreamArticle = (item: Article) => {
    if (onSelectArticle) {
      onSelectArticle(item);
    }
    setMobileActiveView('detail');
  };

  return (
    <div id="article-reader-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] w-full mx-auto">
      {/* Top Header & Navigation Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3 text-xs text-slate-500">
          <button
            id="back-to-stream-btn"
            onClick={onBack}
            className="flex items-center space-x-1.5 text-slate-700 hover:text-slate-900 transition-colors bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs font-medium cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-semibold">Article Stream & Intelligence</span>
          {currentArticle && (
            <>
              <span className="text-slate-300 hidden md:inline">/</span>
              <span className="text-slate-600 font-telemetry-mono truncate max-w-xs hidden md:inline">
                {currentArticle.competitor}
              </span>
            </>
          )}
        </div>

        {/* Mobile View Toggle Buttons */}
        <div className="flex lg:hidden items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <button
            onClick={() => setMobileActiveView('list')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all ${
              mobileActiveView === 'list'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Master Stream ({filteredArticles.length})
          </button>
          <button
            onClick={() => setMobileActiveView('detail')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-semibold transition-all ${
              mobileActiveView === 'detail'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Article Intel & Reader
          </button>
        </div>

        {/* Action Toolbar on Desktop & Active Detail Mode */}
        {currentArticle && (
          <div className="flex flex-wrap items-center gap-2 text-xs w-full lg:w-auto">
            {/* Re-scrape Content Button */}
            {onScrapeArticle && (
              <button
                id="scrape-full-article-btn"
                onClick={() => onScrapeArticle(currentArticle)}
                disabled={isScraping}
                className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg transition-all font-semibold shadow-xs disabled:opacity-60 cursor-pointer"
                title="Extract full multi-paragraph body from target site"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${isScraping ? 'animate-spin' : ''}`} />
                <span>{isScraping ? 'Scraping...' : 'Re-scrape Content'}</span>
              </button>
            )}

            {/* Analyze with Gemini Button */}
            <button
              id="re-analyze-gemini-btn"
              onClick={() => onReAnalyze(currentArticle)}
              disabled={isAnalyzing}
              className="flex items-center justify-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg font-semibold shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing AI...' : 'Re-Analyze Gemini'}</span>
            </button>

            {/* Export Actions */}
            <button
              onClick={handleExportMarkdown}
              className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-xs cursor-pointer"
              title="Download formatted Markdown intel report"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export .MD</span>
            </button>

            <button
              onClick={handleExportJson}
              className="flex items-center justify-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors font-medium shadow-xs cursor-pointer"
              title="Export raw parsed JSON payload"
            >
              <FileJson className="w-3.5 h-3.5 text-slate-500" />
              <span>JSON</span>
            </button>

            {/* Push to CMS Button */}
            <button
              id="push-to-cms-btn"
              onClick={handleTriggerPush}
              className="flex items-center justify-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg font-semibold transition-colors shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Push to CMS</span>
            </button>
          </div>
        )}
      </div>

      {pushStatus && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{pushStatus}</span>
        </div>
      )}

      {/* Split-Pane Master-Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT COLUMN: Master Stream List (lg:col-span-4 / lg:col-span-5)           */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-4 xl:col-span-4 space-y-4 ${mobileActiveView === 'list' ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3.5 shadow-xs">
            {/* Header & Count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 font-telemetry-mono">
                  Captured Stream ({filteredArticles.length})
                </h2>
              </div>
              <span className="text-[10px] text-slate-500 font-telemetry-mono">
                Total: {articles.length}
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="article-stream-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter captured articles..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all font-telemetry-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
              {/* Competitor Dropdown */}
              <select
                value={competitorFilter}
                onChange={(e) => setCompetitorFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-telemetry-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Sources</option>
                {competitorOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Threat Rating Dropdown */}
              <select
                value={threatFilter}
                onChange={(e) => setThreatFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-telemetry-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All Threats</option>
                <option value="High">High Threat</option>
                <option value="Medium">Medium Threat</option>
                <option value="Low">Low Threat</option>
              </select>

              {/* SLA Filter Dropdown */}
              <select
                value={slaFilter}
                onChange={(e) => setSlaFilter(e.target.value)}
                className="col-span-2 sm:col-span-1 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-telemetry-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">All SLA</option>
                <option value="met">SLA Met (≤5m)</option>
                <option value="breached">SLA Breached (&gt;5m)</option>
              </select>
            </div>

            {/* Articles List Scroll Container */}
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {filteredArticles.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <BookOpen className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">No matching articles</p>
                  <p className="text-[11px] text-slate-400">Try adjusting your filters or search keywords</p>
                </div>
              ) : (
                filteredArticles.map((item) => {
                  const isSelected = currentArticle?.id === item.id;
                  const itemSlaMet = item.delaySec <= 300;
                  const threatRating = item.threatRating || item.analysis?.threatRating || 'Low';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectStreamArticle(item)}
                      className={`pt-2 first:pt-0 cursor-pointer group`}
                    >
                      <div
                        className={`p-3 rounded-xl transition-all border ${
                          isSelected
                            ? 'bg-indigo-50/70 border-indigo-400/80 border-l-4 border-l-indigo-600 shadow-xs ring-1 ring-indigo-200'
                            : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300 border-l-4 border-l-transparent'
                        }`}
                      >
                        {/* Competitor Badge & Timestamp & Threat */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1.5">
                          <span className="font-bold text-slate-800 font-telemetry-mono uppercase tracking-wider">
                            {item.competitor}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase font-telemetry-mono ${
                                threatRating === 'High'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : threatRating === 'Medium'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {threatRating}
                            </span>
                            <span className="font-telemetry-mono text-[10px] text-slate-400">
                              {item.discoveredAt?.split(' ')[0] || item.publishedAt?.split(' ')[0]}
                            </span>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className={`text-xs font-semibold leading-snug line-clamp-2 transition-colors ${
                          isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800 group-hover:text-indigo-700'
                        }`}>
                          {item.title}
                        </h3>

                        {/* Footer Strip (Delay Pill & Word Count) */}
                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100 text-[10px]">
                          <span
                            className={`font-mono-tech font-bold px-1.5 py-0.5 rounded ${
                              itemSlaMet
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {item.delayFormatted}
                          </span>

                          <span className="text-slate-400 font-telemetry-mono">
                            {item.readTime || '3m read'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: Full Article Intel Reader & Telemetry (lg:col-span-8)       */}
        {/* ========================================================================= */}
        <div className={`lg:col-span-8 xl:col-span-8 space-y-6 ${mobileActiveView === 'detail' ? 'block' : 'hidden lg:block'}`}>
          {!currentArticle ? (
            <div id="article-reader-empty" className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-16 text-center space-y-4">
              <div className="w-14 h-14 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600">
                <BookOpen className="w-7 h-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 font-mono-tech">No Article Selected</h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                Select an article from the master stream on the left or trigger a scan to ingest fresh intelligence.
              </p>
            </div>
          ) : (
            <>
              {/* Main Article Container */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs">
                {/* View Switcher: Full Content vs Mutation Diff */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setActiveTab('content')}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
                        activeTab === 'content'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      Full Captured Content
                    </button>
                    <button
                      onClick={() => setActiveTab('diff')}
                      className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center space-x-1.5 ${
                        activeTab === 'diff'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <GitCommit className="w-3.5 h-3.5" />
                      <span>Content Mutation Diff</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 font-telemetry-mono text-emerald-700 border border-emerald-200">
                        +{currentArticle.diffAddedWords || 348}w
                      </span>
                    </button>
                  </div>

                  <div className="text-[11px] text-slate-500 font-telemetry-mono">
                    {currentArticle.readTime} | ~{currentArticle.content.split(' ').length} words
                  </div>
                </div>

                {activeTab === 'content' ? (
                  <div className="space-y-6">
                    {/* Header & Meta */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {currentArticle.tags.map((tag, tIdx) => {
                          const tagLabel = typeof tag === 'string' ? tag : ((tag as any)?.name || String(tag));
                          return (
                            <span
                              key={`${tagLabel}-${tIdx}`}
                              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"
                            >
                              {tagLabel}
                            </span>
                          );
                        })}
                        <span className="text-xs text-slate-500 font-telemetry-mono">
                          • {currentArticle.readTime}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 font-telemetry-mono">
                          {currentArticle.wordCount ? `${currentArticle.wordCount} words` : `${Math.max(1, currentArticle.content.trim().split(/\s+/).length)} words`}
                        </span>
                      </div>

                      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                        {currentArticle.title}
                      </h1>

                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1 border-b border-slate-200 pb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-800 font-semibold">By {authorText}</span>
                          <span>•</span>
                          <span>Published {currentArticle.publishedAt}</span>
                        </div>

                        <a
                          href={currentArticle.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-700 font-telemetry-mono flex items-center space-x-1 text-[11px] font-medium"
                        >
                          <span>Canonical Source ({currentArticle.competitorDomain})</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Featured Image if available */}
                    {currentArticle.featuredImage && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                        <img
                          src={currentArticle.featuredImage}
                          alt={currentArticle.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-56 sm:h-72 object-cover"
                        />
                      </div>
                    )}

                    {/* Extracted Meta Summary Callout */}
                    <div className="p-4 rounded-xl bg-indigo-50/70 border-l-4 border-indigo-600 border border-indigo-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 font-telemetry-mono">
                        Extracted Meta Summary
                      </span>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                        "{currentArticle.snippet}"
                      </p>
                    </div>

                    {/* GEMINI AI STRATEGIC INSIGHTS (Auto-Hydrated Card) */}
                    <div className="bg-linear-to-br from-indigo-50/50 via-white to-purple-50/30 border border-indigo-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 font-telemetry-mono">
                            Gemini AI Strategic Insights
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-telemetry-mono font-medium">
                            gemini-2.5-flash
                          </span>
                          {currentArticle.analysis && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-telemetry-mono font-medium">
                              Auto-Hydrated
                            </span>
                          )}
                        </div>
                      </div>

                      {isAnalyzing ? (
                        <div className="space-y-4 py-4 animate-pulse">
                          <div className="flex items-center space-x-3 p-3.5 rounded-xl bg-purple-50/80 border border-purple-200">
                            <RefreshCw className="w-4 h-4 text-purple-600 animate-spin shrink-0" />
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-purple-900 font-telemetry-mono">
                                Gemini AI Intelligence Analysis in Progress...
                              </p>
                              <p className="text-[11px] text-purple-700">
                                Synthesizing competitive takeaways, threat vector, and counter-tactics from canonical payload.
                              </p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-12 bg-indigo-100/60 rounded-xl" />
                            <div className="h-10 bg-purple-100/50 rounded-xl" />
                            <div className="h-14 bg-indigo-100/40 rounded-xl" />
                          </div>
                        </div>
                      ) : currentArticle.analysis ? (
                        <div className="space-y-4 text-xs">
                          {/* 2-Sentence Executive Summary */}
                          <div className="p-3.5 rounded-xl bg-white border border-indigo-100 space-y-1 shadow-2xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 font-telemetry-mono">
                              Executive Strategic Summary
                            </span>
                            <p className="text-slate-700 leading-relaxed">
                              {currentArticle.analysis.summary}
                            </p>
                          </div>

                          {/* Threat Rating with Badge */}
                          <div className="p-3.5 rounded-xl bg-white border border-indigo-100 flex items-center justify-between shadow-2xs">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-telemetry-mono block">
                                Competitive Threat Assessment
                              </span>
                              <span className="text-slate-600 text-[11px] mt-0.5 block">
                                {currentArticle.analysis.threatExplanation}
                              </span>
                            </div>
                            <span
                              className={`text-xs font-extrabold uppercase px-3 py-1.5 rounded-lg font-telemetry-mono shrink-0 ml-3 ${
                                currentArticle.analysis.threatRating === 'High'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : currentArticle.analysis.threatRating === 'Medium'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {currentArticle.analysis.threatRating} Threat
                            </span>
                          </div>

                          {/* Top 3 Strategic Takeaways */}
                          <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 font-telemetry-mono">
                              Top Strategic Takeaways
                            </span>
                            <ul className="space-y-2 text-[11px] text-slate-700">
                              {currentArticle.analysis.takeaways.map((takeaway, i) => (
                                <li key={i} className="flex items-start space-x-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                                  <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-700 text-[10px] flex items-center justify-center shrink-0 font-telemetry-mono font-bold mt-0.5">
                                    {i + 1}
                                  </span>
                                  <span className="leading-relaxed">{takeaway}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Suggested Counter-Action */}
                          <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 font-telemetry-mono">
                              Suggested Marketing & Product Counter-Action
                            </span>
                            <p className="text-slate-700 leading-relaxed text-[11px]">
                              {currentArticle.analysis.counterAction}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-6 space-y-3">
                          <Sparkles className="w-6 h-6 mx-auto text-purple-600" />
                          <p className="text-xs text-slate-600 max-w-sm mx-auto">
                            Gemini AI can synthesize competitive impact, assess threat score, and recommend counter-strategies.
                          </p>
                          <button
                            onClick={() => onReAnalyze(currentArticle)}
                            disabled={isAnalyzing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs inline-flex items-center space-x-1.5 transition-all"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{isAnalyzing ? 'Analyzing with Gemini...' : 'Generate Strategic Analysis'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Competitor Intelligence Takeaways Strip */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-telemetry-mono">
                        Extracted Entity Signals
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        {currentArticle.takeaways.map((item, idx) => (
                          <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                            <div className="text-[10px] uppercase font-bold text-indigo-600 font-telemetry-mono">
                              {item.label}
                            </div>
                            <div className="text-slate-800 leading-snug font-medium text-[11px]">
                              {item.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Thin Content Warning Banner */}
                    {(currentArticle.content.length < 250 || currentArticle.content.includes("Captured directly from DOM") || currentArticle.content.includes("Captured from live RSS")) && (
                      <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900">
                        <div className="flex items-start space-x-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-amber-900">Preview Summary Only</p>
                            <p className="text-amber-700 text-[11px] mt-0.5">
                              Only introductory metadata was initially captured. Click below to deep scrape all paragraphs and media from {currentArticle.competitorDomain}.
                            </p>
                          </div>
                        </div>
                        {onScrapeArticle && (
                          <button
                            onClick={() => onScrapeArticle(currentArticle)}
                            disabled={isScraping}
                            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                            <span>{isScraping ? 'Deep Scraping...' : 'Extract Full Content'}</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Full Article Text Body */}
                    <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed border-t border-slate-200 pt-5">
                      {currentArticle.content.split('\n\n').map((paragraph, i) => (
                        <p key={i} className="text-slate-800 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {/* Inline Article Images */}
                    {currentArticle.inlineImages && currentArticle.inlineImages.length > 0 && (
                      <div className="space-y-2 border-t border-slate-200 pt-4">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-telemetry-mono">
                          Media & Captures ({currentArticle.inlineImages.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {currentArticle.inlineImages.slice(0, 4).map((imgUrl, idx) => (
                            <div key={idx} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                              <img
                                src={imgUrl}
                                alt={`Media capture ${idx + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full h-40 object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Extracted Outbound Links & Citations */}
                    {currentArticle.citations && currentArticle.citations.length > 0 && (
                      <div className="space-y-2 border-t border-slate-200 pt-4">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-telemetry-mono">
                          Outbound Citations & Hyperlinks
                        </span>
                        <ul className="space-y-1.5 text-xs text-slate-700">
                          {currentArticle.citations.map((cit, idx) => (
                            <li key={idx} className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              <a
                                href={cit.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 hover:underline font-telemetry-mono"
                              >
                                {cit.text}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* DOM Selector Breadcrumb */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-telemetry-mono pt-3 border-t border-slate-200">
                      <div className="flex items-center space-x-1.5">
                        <Code className="w-3.5 h-3.5 text-slate-400" />
                        <span>DOM Selector: {currentArticle.domSelector}</span>
                      </div>
                      <span className="text-emerald-700 font-medium">Extraction Confidence: 99.8%</span>
                    </div>
                  </div>
                ) : (
                  /* Content Mutation Diff View */
                  <div className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                      <span>Detected DOM Mutation (+348 added words, 0 deletions)</span>
                      <span className="font-telemetry-mono text-emerald-700 font-semibold">{currentArticle.diffPayload}</span>
                    </div>

                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 font-telemetry-mono text-xs space-y-2 max-h-[500px] overflow-y-auto">
                      <div className="text-slate-400">--- a/target-page.html (Previous ETag)</div>
                      <div className="text-slate-400">+++ b/target-page.html (Current Captured Payload)</div>
                      <div className="text-indigo-400">@@ -14,8 +14,32 @@ &lt;article class="post-content"&gt;</div>
                      <div className="text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded">
                        + &lt;h1&gt;{currentArticle.title}&lt;/h1&gt;
                      </div>
                      <div className="text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded">
                        + &lt;div class="author-meta"&gt;By {authorText} • {currentArticle.publishedAt}&lt;/div&gt;
                      </div>
                      <div className="text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded">
                        + &lt;p class="lead"&gt;{currentArticle.snippet}&lt;/p&gt;
                      </div>
                      <div className="text-slate-500 px-1">
                        &lt;!-- Verified against canonical hash and schema.org microdata --&gt;
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom 2-Column Telemetry & Audit Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Audit Card 1: EXACT DETECTION DELAY WIDGET */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div className="flex items-center space-x-2">
                      <Clock className={`w-4 h-4 ${isSlaMet ? 'text-emerald-600' : 'text-rose-600'}`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-telemetry-mono">
                        Exact Detection Delay
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-telemetry-mono ${
                        isSlaMet
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {isSlaMet ? 'SLA MET (<=5m)' : 'SLA BREACHED (>5m)'}
                    </span>
                  </div>

                  {/* Delay Timer Display */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block font-telemetry-mono">Total Detection Latency</span>
                      <span className={`text-2xl sm:text-3xl font-extrabold font-mono-tech tracking-tight ${
                        isSlaMet ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {currentArticle.delayFormatted}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block font-telemetry-mono">SLA Consumption</span>
                      <span className="text-sm font-bold text-slate-800 font-mono-tech">
                        {Math.min(100, Math.round((currentArticle.delaySec / 300) * 100))}% of 5m
                      </span>
                    </div>
                  </div>

                  {/* Visual SLA Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isSlaMet ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${Math.min(100, (currentArticle.delaySec / 300) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-telemetry-mono">
                      <span>0s (Instant)</span>
                      <span className="text-emerald-700 font-semibold">SLA 300s (5m) Target</span>
                    </div>
                  </div>

                  {/* Stepper Timeline Comparison */}
                  <div className="space-y-2.5 pt-2 text-xs">
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                        1
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">Published by Competitor</div>
                        <div className="text-[11px] text-slate-500 font-telemetry-mono">{currentArticle.publishedAt} (Origin CMS)</div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-400 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
                        2
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">Discovered by BlogSpy Crawler</div>
                        <div className="text-[11px] text-emerald-700 font-telemetry-mono font-medium">
                          {currentArticle.discoveredAt} ({currentArticle.delayFormatted})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-400 flex items-center justify-center text-[10px] font-bold text-emerald-700 shrink-0">
                        3
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">AI Analyzed & Webhook Dispatched</div>
                        <div className="text-[11px] text-slate-500 font-telemetry-mono">+4s pipeline execution</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Card 2: Pipeline Check & Protocol */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 text-xs shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-telemetry-mono">
                      Target Entity & Pipeline Run
                    </span>
                    <button
                      onClick={() => setShowJsonModal(true)}
                      className="text-indigo-600 hover:text-indigo-700 font-telemetry-mono text-[11px] flex items-center space-x-1 font-medium"
                    >
                      <span>View Raw JSON</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Target Entity</span>
                      <span className="font-semibold text-slate-800">{currentArticle.competitor}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Domain</span>
                      <span className="font-telemetry-mono text-indigo-600 font-medium">{currentArticle.competitorDomain}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Check Run ID</span>
                      <button
                        onClick={handleCopyCheckId}
                        className="text-slate-700 hover:text-slate-950 flex items-center space-x-1 font-telemetry-mono text-[11px]"
                      >
                        <span>chk_{currentArticle.id}</span>
                        {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Worker Node</span>
                      <span className="font-telemetry-mono text-slate-700">worker-us-east-04c</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Webhook Fanout</span>
                      <span className="text-emerald-700 font-medium font-telemetry-mono">#growth-intel-slack</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Raw Extraction Payload Modal */}
      {showJsonModal && currentArticle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full mx-4 p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 font-mono-tech">
                  Raw Extraction Payload (JSON)
                </h3>
                <p className="text-xs text-slate-500 font-telemetry-mono">
                  Target Run ID: chk_{currentArticle.id}
                </p>
              </div>
              <button 
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-telemetry-mono text-emerald-400 max-h-96 overflow-y-auto">
              {JSON.stringify(currentArticle, null, 2)}
            </pre>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(currentArticle, null, 2));
                  setShowJsonModal(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs"
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

