import React, { useState, useMemo, useEffect } from 'react';
import { 
  Globe, 
  Clock, 
  FileText, 
  Activity, 
  Download, 
  Play, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  ArrowRight,
  Terminal,
  Zap,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Radio,
  BarChart3,
  BookOpen,
  ChevronDown,
  Bell,
  RefreshCw,
  SlidersHorizontal,
  Check,
  Layers,
  Cpu,
  Power,
  Send,
  X
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  ReferenceLine 
} from 'recharts';
import { Article, Competitor, MonitoringCheck, TelemetryLog, ThreatRating } from '../types';

interface DashboardViewProps {
  articles: Article[];
  competitors?: Competitor[];
  monitoringChecks?: MonitoringCheck[];
  onSelectArticle: (article: Article) => void;
  onTriggerScan: () => void;
  onForceCrawl?: (competitor: Competitor) => void;
  isScanning: boolean;
  logs: TelemetryLog[];
  avgDelay: string;
  competitorsCount?: number;
  onPublishTestPost?: (
    competitor?: string, 
    title?: string, 
    scenario?: 'live_fast' | 'live_breach' | 'back_catalog',
    delaySec?: number,
    isBackCatalog?: boolean,
    publicationSource?: string,
    customContent?: string
  ) => void;
  onNavigateToCompetitors?: () => void;
  onNavigateToArticles?: () => void;
  onNavigateToReports?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  articles,
  competitors = [],
  monitoringChecks = [],
  onSelectArticle,
  onTriggerScan,
  onForceCrawl,
  isScanning,
  logs,
  avgDelay,
  competitorsCount = 0,
  onPublishTestPost,
  onNavigateToCompetitors,
  onNavigateToArticles,
  onNavigateToReports
}) => {
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d'>('24h');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [competitorSearch, setCompetitorSearch] = useState('');
  const [competitorStatusFilter, setCompetitorStatusFilter] = useState<'all' | 'Active' | 'Paused'>('all');
  const [notificationFilter, setNotificationFilter] = useState<'all' | 'high_threat' | 'sla_met' | 'sla_breached'>('all');
  const [isLiveLogPaused, setIsLiveLogPaused] = useState(false);
  const [showSimMenu, setShowSimMenu] = useState(false);
  const [breachTab, setBreachTab] = useState<'breaches' | 'backlog'>('breaches');
  const [ingestFilter, setIngestFilter] = useState<'all' | 'live' | 'backlog'>('all');
  const [dashboardTab, setDashboardTab] = useState<'overview' | 'competitors_health' | 'live_feed'>('overview');
  
  // Controlled Demo Web Sources & Testing Modal State
  const [showControlledDemoModal, setShowControlledDemoModal] = useState(false);
  const [demoTarget, setDemoTarget] = useState('Acme AI Corp');
  const [demoTitle, setDemoTitle] = useState('Distributed Vector State Synchronization at Edge');
  const [demoContent, setDemoContent] = useState('Our engineering research discloses production benchmarks and architectural patterns across distributed computing clusters. Evaluating data freshness, serialization latency, and egress traffic reductions provides predictable operational overhead for high-concurrency enterprise pipelines.');
  const [demoScenario, setDemoScenario] = useState<'live_fast' | 'live_breach' | 'back_catalog'>('live_fast');
  const [demoDelaySec, setDemoDelaySec] = useState<number>(192);
  const [demoSource, setDemoSource] = useState('RSS <pubDate>');
  const [demoRootCause, setDemoRootCause] = useState('Feed Cache Headers (300s TTL)');

  const [scaleStats, setScaleStats] = useState<{
    failedChecks: number;
    totalChecks: number;
    successfulChecks: number;
    activeWorkers: number;
    retriesCount: number;
    slaComplianceRate: number;
  }>({
    failedChecks: 0,
    totalChecks: 0,
    successfulChecks: 0,
    activeWorkers: 0,
    retriesCount: 0,
    slaComplianceRate: 100
  });

  // Fetch live background engine metrics from API
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/scale-metrics');
        if (res.ok) {
          const data = await res.json();
          setScaleStats({
            failedChecks: data.failedChecks || 0,
            totalChecks: data.totalChecks || 0,
            successfulChecks: data.successfulChecks || 0,
            activeWorkers: data.activeWorkers || 0,
            retriesCount: data.retriesCount || 0,
            slaComplianceRate: typeof data.slaComplianceRate === 'number' ? data.slaComplianceRate : 100
          });
        }
      } catch {
        // ignore network error
      }
    };
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 12000);
    return () => clearInterval(interval);
  }, []);

  // Section 9.3: Aggregated Detection Metrics Calculations
  const liveArticles = useMemo(() => articles.filter(a => !a.isBackCatalog), [articles]);
  const backCatalogArticles = useMemo(() => articles.filter(a => !!a.isBackCatalog), [articles]);

  const targetArticles = liveArticles.length > 0 ? liveArticles : articles;
  const avgDelaySec = useMemo(() => {
    if (targetArticles.length === 0) return 0;
    return Math.round(targetArticles.reduce((acc, a) => acc + a.delaySec, 0) / targetArticles.length);
  }, [targetArticles]);

  const isAvgSlaMet = avgDelaySec <= 300;

  // Fastest and Slowest detection times across all competitors
  const fastestArticle = useMemo(() => {
    if (targetArticles.length === 0) return null;
    return targetArticles.reduce((min, a) => (!min || a.delaySec < min.delaySec ? a : min), targetArticles[0]);
  }, [targetArticles]);

  const slowestArticle = useMemo(() => {
    if (targetArticles.length === 0) return null;
    return targetArticles.reduce((max, a) => (!max || a.delaySec > max.delaySec ? a : max), targetArticles[0]);
  }, [targetArticles]);

  // SLA compliance metrics
  const breachedArticles = useMemo(() => liveArticles.filter(a => a.delaySec > 300), [liveArticles]);
  const slaCompliancePct = useMemo(() => {
    if (liveArticles.length === 0) return 100;
    return Math.round(((liveArticles.length - breachedArticles.length) / liveArticles.length) * 100);
  }, [liveArticles, breachedArticles]);

  // Check success rate percentage
  const totalChecksCount = scaleStats.totalChecks || monitoringChecks.length || 1;
  const failedChecksCount = scaleStats.failedChecks || monitoringChecks.filter(c => c.outcome === 'error').length;
  const successRatePct = Math.max(0, Math.min(100, Math.round(((totalChecksCount - failedChecksCount) / totalChecksCount) * 1000) / 10));

  // Section 9.1: Competitor Health Overview List & Stats
  const activeCompetitorsCount = competitors.filter(c => c.status === 'Active').length;
  const pausedCompetitorsCount = competitors.filter(c => c.status === 'Paused' || c.status === 'Error').length;
  const totalCompetitorsCount = competitors.length || competitorsCount;

  const filteredCompetitors = useMemo(() => {
    return competitors.filter(c => {
      if (competitorStatusFilter !== 'all' && c.status !== competitorStatusFilter) return false;
      if (competitorSearch.trim()) {
        const q = competitorSearch.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q) || c.strategy.toLowerCase().includes(q);
      }
      return true;
    });
  }, [competitors, competitorStatusFilter, competitorSearch]);

  // Section 9.2: Real-Time Notification Feed Filtered Items
  const notificationFeedArticles = useMemo(() => {
    return articles.filter(art => {
      if (notificationFilter === 'high_threat') {
        return art.threatRating === 'High' || art.analysis?.threatRating === 'High';
      }
      if (notificationFilter === 'sla_met') {
        return !art.isBackCatalog && art.delaySec <= 300;
      }
      if (notificationFilter === 'sla_breached') {
        return !art.isBackCatalog && art.delaySec > 300;
      }
      return true;
    });
  }, [articles, notificationFilter]);

  // General Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesSearch = 
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.competitor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.snippet.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.tags.some(t => String(t).toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (ingestFilter === 'live' && art.isBackCatalog) return false;
      if (ingestFilter === 'backlog' && !art.isBackCatalog) return false;

      if (sourceFilter === 'rss') return art.ingestMethod === 'RSS Feed';
      if (sourceFilter === 'sitemap') return art.ingestMethod === 'XML Sitemap';
      if (sourceFilter === 'dom') return art.ingestMethod === 'Direct DOM Poller';
      return true;
    });
  }, [articles, searchQuery, ingestFilter, sourceFilter]);

  const displayedArticles = filteredArticles.slice(0, 10);

  const formatLatencyTick = (val: number) => {
    if (val === 0) return '0m';
    if (val < 60) return `${val}s`;
    const mins = Math.floor(val / 60);
    if (mins < 60) return `${mins}m`;
    const hours = (val / 3600);
    return `${hours % 1 === 0 ? hours : hours.toFixed(1)}h`;
  };

  // Strictly chronological chart data
  const telemetryChartData = useMemo(() => {
    if (articles.length === 0) {
      return [
        { name: '10:00:00', delay: 42, competitor: 'AWS', isBreach: false, formattedDelay: '00m 42s' },
        { name: '10:05:00', delay: 84, competitor: 'TechCrunch', isBreach: false, formattedDelay: '01m 24s' },
        { name: '10:10:00', delay: 28, competitor: 'Cloudflare', isBreach: false, formattedDelay: '00m 28s' },
        { name: '10:15:00', delay: 112, competitor: 'Acme AI', isBreach: false, formattedDelay: '01m 52s' },
        { name: '10:20:00', delay: 56, competitor: 'Datadog', isBreach: false, formattedDelay: '00m 56s' },
        { name: '10:25:00', delay: 72, competitor: 'Vercel', isBreach: false, formattedDelay: '01m 12s' },
      ];
    }

    const sorted = [...articles].sort((a, b) => {
      const parseTime = (item: Article) => {
        const raw = item.discoveredDate || item.discoveredAt || item.publishedDate || item.publishedAt;
        if (!raw) return 0;
        const parsed = Date.parse(raw);
        if (!isNaN(parsed)) return parsed;
        const timeMatch = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (timeMatch) {
          return parseInt(timeMatch[1], 10) * 3600 + parseInt(timeMatch[2], 10) * 60 + (parseInt(timeMatch[3] || '0', 10));
        }
        return 0;
      };
      return parseTime(a) - parseTime(b);
    });

    const recentItems = sorted.slice(-14);

    return recentItems.map((art, idx) => {
      let timeLabel = art.discoveredAt || art.publishedAt || `#${idx + 1}`;
      if (timeLabel.includes('T')) {
        const timePart = timeLabel.split('T')[1]?.replace('Z', '').split('.')[0];
        if (timePart) timeLabel = timePart;
      } else if (timeLabel.includes(' ')) {
        const parts = timeLabel.split(' ');
        const tMatch = parts.find(p => /^\d{1,2}:\d{2}/.test(p));
        if (tMatch) timeLabel = tMatch;
      }

      return {
        name: timeLabel,
        delay: art.delaySec,
        competitor: art.competitor,
        title: art.title,
        isBreach: art.delaySec > 300,
        formattedDelay: art.delayFormatted
      };
    });
  }, [articles]);

  const maxChartDelay = useMemo(() => {
    return Math.max(...telemetryChartData.map(d => d.delay), 360);
  }, [telemetryChartData]);

  const breachGradientOffset = useMemo(() => {
    if (maxChartDelay <= 300) return 100;
    return Math.max(0, Math.min(100, (1 - (300 / maxChartDelay)) * 100));
  }, [maxChartDelay]);

  const chartHasBreach = useMemo(() => {
    return telemetryChartData.some(d => d.delay > 300);
  }, [telemetryChartData]);

  const handleExportCSV = () => {
    const headers = ['Competitor', 'Title', 'URL', 'PublishedAt', 'DiscoveredAt', 'Delay', 'IngestMethod', 'ThreatRating'];
    const rows = filteredArticles.map(a => [
      `"${a.competitor}"`,
      `"${a.title.replace(/"/g, '""')}"`,
      `"${a.url}"`,
      `"${a.publishedAt}"`,
      `"${a.discoveredAt}"`,
      `"${a.delayFormatted}"`,
      `"${a.ingestMethod}"`,
      `"${a.threatRating}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `blogspy-intel-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="dashboard-view-container" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header & Tab Navigator */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-mono-tech">
              Dashboard &amp; Real-Time Performance Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
            Autonomous competitor monitoring hub with sub-5m detection benchmarks, real-time alert feed, and live health telemetry.
          </p>
        </div>

        {/* Action Controls & Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Section 9 View Tab Switcher */}
          <div className="flex items-center bg-slate-100 border border-slate-200 p-1 rounded-xl text-xs">
            <button
              onClick={() => setDashboardTab('overview')}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                dashboardTab === 'overview'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Metrics & Latency</span>
            </button>
            <button
              onClick={() => setDashboardTab('competitors_health')}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                dashboardTab === 'competitors_health'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Competitor Health ({totalCompetitorsCount})</span>
            </button>
            <button
              onClick={() => setDashboardTab('live_feed')}
              className={`px-3 py-1.5 rounded-lg transition-all font-semibold flex items-center space-x-1.5 cursor-pointer ${
                dashboardTab === 'live_feed'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>Live Alerts ({articles.length})</span>
            </button>
          </div>

          {onNavigateToReports && (
            <button
              id="dashboard-open-reports-btn"
              onClick={onNavigateToReports}
              className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
              title="Open SLA Performance Reports and System Architecture Documentation"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>SLA Reports &amp; Docs</span>
            </button>
          )}

          <button
            id="export-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* Controlled Demo Testing Button */}
          {onPublishTestPost && (
            <button
              id="open-controlled-demo-modal-btn"
              onClick={() => setShowControlledDemoModal(true)}
              className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
              title="Publish on controlled demo sources with customizable parameters and observe real-time detection"
            >
              <Send className="w-3.5 h-3.5 text-indigo-600" />
              <span>Controlled Demo Hub</span>
            </button>
          )}

          {/* Test Simulation Quick Button */}
          {onPublishTestPost && (
            <div className="relative">
              <div className="inline-flex rounded-lg shadow-2xs border border-amber-300 bg-amber-50">
                <button
                  id="page-publish-test-btn"
                  onClick={() => onPublishTestPost(undefined, undefined, 'live_fast')}
                  className="flex items-center space-x-1.5 hover:bg-amber-100/90 text-amber-900 px-3 py-1.5 rounded-l-lg text-xs font-semibold transition-all cursor-pointer"
                  title="Simulate live detection event"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500/20 shrink-0" />
                  <span>Quick Alert</span>
                </button>
                <button
                  id="page-publish-menu-toggle-btn"
                  onClick={() => setShowSimMenu(!showSimMenu)}
                  className="px-1.5 hover:bg-amber-100/90 text-amber-800 border-l border-amber-200 rounded-r-lg transition-colors flex items-center cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {showSimMenu && (
                <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-sans divide-y divide-slate-100 animate-in fade-in">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 font-telemetry-mono tracking-wider">
                    SLA Simulation Scenarios
                  </div>
                  <button
                    onClick={() => {
                      setShowSimMenu(false);
                      onPublishTestPost(undefined, undefined, 'live_fast');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 transition-colors flex items-start space-x-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">1. Fast Live Detection (SLA Met)</div>
                      <div className="text-[11px] text-slate-500 font-telemetry-mono">Delay: 3m 12s &bull; Origin: RSS &lt;pubDate&gt;</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowSimMenu(false);
                      onPublishTestPost('AWS Architecture Blog', undefined, 'live_breach');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 transition-colors flex items-start space-x-2 cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">2. Live SLA Breach Warning</div>
                      <div className="text-[11px] text-slate-500 font-telemetry-mono">Delay: 8m 42s (&gt;5m) &bull; Flags Breach Alert</div>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setShowSimMenu(false);
                      onPublishTestPost('Snowflake Developers', undefined, 'back_catalog');
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors flex items-start space-x-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-slate-800">3. Historical Back-catalog Ingestion</div>
                      <div className="text-[11px] text-slate-500 font-telemetry-mono">Age: 2 days &bull; Separated from live SLA</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Trigger Scan Button */}
          <button
            id="page-trigger-scan-btn"
            onClick={onTriggerScan}
            disabled={isScanning}
            className={`flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              isScanning ? 'opacity-75 cursor-not-allowed' : 'hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <Play className={`w-3.5 h-3.5 fill-white ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'Crawling Targets...' : 'Trigger Global Sweep'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 9.3: AGGREGATED DETECTION METRICS (Top KPI Cards Row)             */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total New Articles Detected */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] font-telemetry-mono text-slate-500">
              Total Articles Detected
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-tech">{articles.length}</span>
            <span className="text-xs text-slate-500">Detected</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 pt-0.5">
            <span className="text-emerald-700 font-semibold font-telemetry-mono">
              {liveArticles.length} Live Detections
            </span>
            <span>•</span>
            <span className="text-amber-700 font-telemetry-mono">{backCatalogArticles.length} Back-catalog</span>
          </div>
        </div>

        {/* Card 2: Average Detection Delay Across Competitors */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] font-telemetry-mono text-slate-500">
              Average Detection Delay
            </span>
            <div className={`w-8 h-8 rounded-lg ${isAvgSlaMet ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'} border flex items-center justify-center`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-extrabold font-mono-tech tracking-tight ${isAvgSlaMet ? 'text-emerald-600' : 'text-rose-600'}`}>
              {articles.length > 0 ? avgDelay : '--'}
            </span>
            {articles.length > 0 && (
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                isAvgSlaMet 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-100 text-rose-800 border-rose-200'
              }`}>
                {isAvgSlaMet ? 'SLA MET (<=5m)' : 'SLA BREACHED (>5m)'}
              </span>
            )}
          </div>
          <div className={`flex items-center space-x-1 text-xs font-telemetry-mono font-medium ${isAvgSlaMet ? 'text-emerald-700' : 'text-rose-700'}`}>
            <TrendingDown className="w-3.5 h-3.5" />
            <span>
              {articles.length > 0 
                ? (isAvgSlaMet ? 'Sub-5m SLA target guaranteed across fleet' : 'Fleet average latency exceeds 5m threshold') 
                : 'Awaiting publication events'}
            </span>
          </div>
        </div>

        {/* Card 3: Fastest & Slowest Detection Times */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] font-telemetry-mono text-slate-500">
              Fastest vs. Slowest
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <div>
              <span className="text-[10px] text-slate-500 font-telemetry-mono block">Fastest</span>
              <span className="text-lg font-bold font-mono-tech text-emerald-600">
                {fastestArticle ? fastestArticle.delayFormatted : '--'}
              </span>
              <span className="text-[10px] text-slate-500 truncate block">
                {fastestArticle ? fastestArticle.competitor : 'N/A'}
              </span>
            </div>
            <div className="border-l border-slate-100 pl-2">
              <span className="text-[10px] text-slate-500 font-telemetry-mono block">Slowest</span>
              <span className={`text-lg font-bold font-mono-tech ${slowestArticle && slowestArticle.delaySec > 300 ? 'text-rose-600' : 'text-slate-800'}`}>
                {slowestArticle ? slowestArticle.delayFormatted : '--'}
              </span>
              <span className="text-[10px] text-slate-500 truncate block">
                {slowestArticle ? slowestArticle.competitor : 'N/A'}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 font-telemetry-mono flex items-center justify-between pt-1 border-t border-slate-100">
            <span>SLA Compliance:</span>
            <span className={`font-bold ${slaCompliancePct >= 90 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {slaCompliancePct}% &le; 300s
            </span>
          </div>
        </div>

        {/* Card 4: Total Failed Checks & Success Rate */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px] font-telemetry-mono text-slate-500">
              Health & Success Rate
            </span>
            <div className={`w-8 h-8 rounded-lg ${failedChecksCount === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'} border flex items-center justify-center`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className={`text-3xl font-extrabold font-mono-tech ${failedChecksCount === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {successRatePct}%
            </span>
            <span className="text-xs text-slate-500">Success Rate</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 pt-0.5">
            <span className={`font-semibold font-telemetry-mono ${failedChecksCount === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {failedChecksCount} Failed Checks
            </span>
            <span>•</span>
            <span className="text-slate-600 font-telemetry-mono">{totalChecksCount} Total Probes</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 9.1: COMPETITOR HEALTH OVERVIEW (Dedicated Interactive Section)   */}
      {/* ========================================================================= */}
      {(dashboardTab === 'competitors_health' || dashboardTab === 'overview') && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900 font-mono-tech">
                  Competitor Health Overview
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold font-telemetry-mono">
                  {totalCompetitorsCount} Monitored
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time online/offline status, last checked timestamps, and automated ingestion strategies across all targets.
              </p>
            </div>

            {/* Quick Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs">
                <button
                  onClick={() => setCompetitorStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                    competitorStatusFilter === 'all' ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({competitors.length})
                </button>
                <button
                  onClick={() => setCompetitorStatusFilter('Active')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1 ${
                    competitorStatusFilter === 'Active' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Active ({activeCompetitorsCount})</span>
                </button>
                <button
                  onClick={() => setCompetitorStatusFilter('Paused')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-all flex items-center space-x-1 ${
                    competitorStatusFilter === 'Paused' ? 'bg-white text-amber-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>Paused ({pausedCompetitorsCount})</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter competitor..."
                  value={competitorSearch}
                  onChange={(e) => setCompetitorSearch(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-500 font-telemetry-mono"
                />
              </div>

              {onNavigateToCompetitors && (
                <button
                  onClick={onNavigateToCompetitors}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1 ml-1 cursor-pointer"
                >
                  <span>Manage</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Competitor Health Grid / Table */}
          {competitors.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-2">
              <Globe className="w-6 h-6 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No Competitor Targets Configured Yet</p>
              <p className="text-[11px] text-slate-400">Add competitor websites to begin automated health polling and content detection.</p>
              {onNavigateToCompetitors && (
                <button
                  onClick={onNavigateToCompetitors}
                  className="mt-2 inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Add First Competitor Target</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCompetitors.map((comp) => {
                const isActive = comp.status === 'Active';
                const strategy = comp.strategy || 'Hybrid RSS+Sitemap';
                const articlesCountForComp = articles.filter(a => a.competitor === comp.name || a.competitorDomain === comp.domain).length;

                return (
                  <div
                    key={comp.id}
                    className="p-3.5 rounded-xl bg-slate-50/70 hover:bg-slate-50 border border-slate-200 hover:border-indigo-200 transition-all space-y-2.5 shadow-2xs"
                  >
                    {/* Header: Name, Domain & Online/Offline Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug truncate max-w-[200px]">
                          {comp.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-telemetry-mono block truncate">
                          {comp.domain}
                        </span>
                      </div>

                      {/* Online/Offline Status Badge */}
                      <span
                        className={`inline-flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full font-telemetry-mono ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                        <span>{isActive ? 'Online / Active' : 'Paused / Offline'}</span>
                      </span>
                    </div>

                    {/* Strategy and Cadence Strip */}
                    <div className="space-y-1 text-[11px] font-telemetry-mono bg-white p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Strategy:</span>
                        <span className="font-semibold text-indigo-700">{strategy}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Last Checked:</span>
                        <span className="font-medium text-slate-800">{comp.lastChecked || 'Just now'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400">Captured Articles:</span>
                        <span className="font-bold text-slate-900">{articlesCountForComp || comp.articlesScraped || 0}</span>
                      </div>
                    </div>

                    {/* Quick Probe Action */}
                    {onForceCrawl && (
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <span className="text-[10px] text-emerald-700 font-semibold font-telemetry-mono">
                          {comp.healthScore || 100}% Health Score
                        </span>
                        <button
                          onClick={() => onForceCrawl(comp)}
                          disabled={isScanning}
                          className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold hover:underline cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
                          <span>Probe Now</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9.2: REAL-TIME NOTIFICATION FEED (Live Alerts on Dashboard)       */}
      {/* ========================================================================= */}
      {(dashboardTab === 'live_feed' || dashboardTab === 'overview') && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-amber-500 animate-bounce" />
                <h2 className="text-base font-bold text-slate-900 font-mono-tech">
                  Real-Time Notification Feed
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold font-telemetry-mono flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Live Stream Connected</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Instant notification alerts triggered whenever fresh competitor articles are detected.
              </p>
            </div>

            {/* Notification Filter Controls */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                onClick={() => setNotificationFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  notificationFilter === 'all'
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                All Alerts ({articles.length})
              </button>
              <button
                onClick={() => setNotificationFilter('high_threat')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 cursor-pointer ${
                  notificationFilter === 'high_threat'
                    ? 'bg-rose-600 text-white font-semibold shadow-2xs'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                <span>High Threat</span>
              </button>
              <button
                onClick={() => setNotificationFilter('sla_met')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 cursor-pointer ${
                  notificationFilter === 'sla_met'
                    ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>SLA Met (≤5m)</span>
              </button>
              <button
                onClick={() => setNotificationFilter('sla_breached')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 cursor-pointer ${
                  notificationFilter === 'sla_breached'
                    ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                <span>SLA Breaches</span>
              </button>
            </div>
          </div>

          {/* Live Notification Cards List */}
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {notificationFeedArticles.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-2">
                <Bell className="w-6 h-6 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No New Alerts Matching Filter</p>
                <p className="text-[11px] text-slate-400">Live alerts will appear automatically when crawler sweeps or simulation triggers detect new competitor posts.</p>
              </div>
            ) : (
              notificationFeedArticles.slice(0, 8).map((art, idx) => {
                const isSlaMet = !art.isBackCatalog && art.delaySec <= 300;
                const threatRating = art.threatRating || art.analysis?.threatRating || 'Low';

                return (
                  <div
                    key={art.id || `notif-${idx}`}
                    className="p-4 rounded-xl bg-white hover:bg-indigo-50/30 border border-slate-200/90 hover:border-indigo-300 transition-all space-y-2.5 shadow-2xs group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        {/* New Alert Badge */}
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-telemetry-mono bg-indigo-100 text-indigo-800 border border-indigo-200">
                          <Radio className="w-2.5 h-2.5 text-indigo-600 animate-pulse" />
                          <span>NEW DETECTION</span>
                        </span>

                        <span className="font-bold text-xs text-slate-900 font-telemetry-mono">
                          {art.competitor}
                        </span>

                        <span className="text-[11px] text-slate-500 font-telemetry-mono">
                          via {art.publicationSource || art.ingestMethod}
                        </span>
                      </div>

                      {/* Detection Delay Pill */}
                      <div className="flex items-center space-x-2 text-xs font-telemetry-mono">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            art.isBackCatalog
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : isSlaMet
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {art.isBackCatalog ? 'HISTORICAL' : (isSlaMet ? `⚡ ${art.delayFormatted} (SLA MET)` : `⚠️ ${art.delayFormatted} (SLA BREACHED)`)}
                        </span>
                        <span className="text-slate-400">{art.discoveredAt?.split(' ')[0] || 'Just now'}</span>
                      </div>
                    </div>

                    {/* Headline */}
                    <div className="flex items-start justify-between gap-3">
                      <h3
                        onClick={() => onSelectArticle(art)}
                        className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer leading-snug line-clamp-2"
                      >
                        {art.title}
                      </h3>
                      <button
                        onClick={() => onSelectArticle(art)}
                        className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                      >
                        <span>Inspect Intel</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Snippet / Takeaway */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {art.snippet || art.content.slice(0, 180) + '...'}
                    </p>

                    {/* Footer Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px]">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-0.5 rounded font-bold uppercase font-telemetry-mono ${
                            threatRating === 'High'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : threatRating === 'Medium'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          Threat: {threatRating}
                        </span>
                        {art.tags.slice(0, 3).map((tag, tIdx) => (
                          <span key={tIdx} className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                            #{typeof tag === 'string' ? tag : (tag as any)?.name}
                          </span>
                        ))}
                      </div>

                      <span className="text-slate-400 font-telemetry-mono">
                        Word count: {art.wordCount || art.content.split(' ').length} words
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REAL-TIME DETECTION DELAY SLA TELEMETRY CHART                             */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900 font-mono-tech">
                Real-Time Detection Latency vs. 5-Minute SLA Benchmark
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live crawler cycle latency telemetry across recent article ingestion events (Benchmark: 5m / 300s).
            </p>
          </div>
          <div className="flex items-center space-x-3 text-xs font-telemetry-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-600">Detection Latency</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-0.5 bg-rose-500" />
              <span className="text-rose-600 font-semibold">5m SLA Benchmark Line</span>
            </div>
          </div>
        </div>

        {/* Responsive Chart Container */}
        <div className="responsive-container w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={telemetryChartData}
              margin={{ top: 15, right: 25, left: 0, bottom: 5 }}
            >
              <defs>
                <linearGradient id="latencyAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  {chartHasBreach ? (
                    <>
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.45} />
                      <stop offset={`${breachGradientOffset}%`} stopColor="#EF4444" stopOpacity={0.25} />
                      <stop offset={`${breachGradientOffset}%`} stopColor="#10B981" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
                    </>
                  ) : (
                    <>
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
                    </>
                  )}
                </linearGradient>
                <linearGradient id="latencyStrokeGradient" x1="0" y1="0" x2="0" y2="1">
                  {chartHasBreach ? (
                    <>
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset={`${breachGradientOffset}%`} stopColor="#EF4444" />
                      <stop offset={`${breachGradientOffset}%`} stopColor="#10B981" />
                      <stop offset="100%" stopColor="#10B981" />
                    </>
                  ) : (
                    <stop offset="0%" stopColor="#10B981" />
                  )}
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                interval="preserveStartEnd"
                minTickGap={35}
                height={32}
                dy={4}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false} 
                tickFormatter={formatLatencyTick}
                domain={[0, (dataMax: number) => Math.max(360, Math.ceil((dataMax * 1.15) / 60) * 60)]}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                formatter={(value: any, name: any, item: any) => [
                  `${value}s (${item?.payload?.formattedDelay || `${Math.floor(Number(value) / 60)}m ${Number(value) % 60}s`}) ${Number(value) > 300 ? '⚠️ [SLA BREACHED]' : '✅ [SLA MET]'}`,
                  'Detection Latency'
                ]}
                labelFormatter={(label, payload) => {
                  const item = payload?.[0]?.payload;
                  return `${label}${item?.competitor ? ` · ${item.competitor}` : ''}${item?.title ? ` - ${item.title}` : ''}`;
                }}
              />
              <ReferenceLine 
                y={300} 
                stroke="#EF4444" 
                strokeDasharray="4 4" 
                strokeWidth={1.5}
              />
              <Area 
                type="monotone" 
                dataKey="delay" 
                stroke={chartHasBreach ? "url(#latencyStrokeGradient)" : "#10B981"} 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#latencyAreaGradient)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main 70/30 Split Layout for Deep Feeds & Daemon Terminals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (70% - 8 cols): Live Detected Articles Master Table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
                <h2 className="text-base font-semibold text-slate-900 font-mono-tech">
                  Ingested Intelligence Repository
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-telemetry-mono">
                  {filteredArticles.length} events
                </span>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter articles or competitor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 shadow-2xs font-telemetry-mono"
                />
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-b border-slate-100 pb-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-500 mr-1 flex items-center font-medium">
                  Classification:
                </span>
                <button
                  onClick={() => setIngestFilter('all')}
                  className={`text-xs px-3 py-1 rounded-lg transition-all font-medium flex items-center space-x-1.5 cursor-pointer ${
                    ingestFilter === 'all'
                      ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>All ({articles.length})</span>
                </button>
                <button
                  onClick={() => setIngestFilter('live')}
                  className={`text-xs px-3 py-1 rounded-lg transition-all font-medium flex items-center space-x-1.5 cursor-pointer ${
                    ingestFilter === 'live'
                      ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Live ({liveArticles.length})</span>
                </button>
                <button
                  onClick={() => setIngestFilter('backlog')}
                  className={`text-xs px-3 py-1 rounded-lg transition-all font-medium flex items-center space-x-1.5 cursor-pointer ${
                    ingestFilter === 'backlog'
                      ? 'bg-amber-600 text-white font-semibold shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Backlog ({backCatalogArticles.length})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All Protocols' },
                  { id: 'rss', label: 'RSS' },
                  { id: 'sitemap', label: 'Sitemap' },
                  { id: 'dom', label: 'DOM' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setSourceFilter(pill.id)}
                    className={`text-[11px] px-2.5 py-0.5 rounded transition-all font-medium cursor-pointer ${
                      sourceFilter === pill.id
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Articles List */}
            <div className="space-y-3.5 pt-2 max-h-[580px] overflow-y-auto pr-2">
              {articles.length === 0 ? (
                <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 text-center space-y-4">
                  <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mx-auto text-indigo-600 shadow-2xs">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-bold text-slate-900 font-mono-tech">No Captured Articles in Database</h4>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                      Your Firestore database is connected and active. Run the publisher simulator or register a competitor target to capture real-time blog updates.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    {onPublishTestPost && (
                      <button
                        onClick={() => onPublishTestPost()}
                        className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Simulate Test Publication</span>
                      </button>
                    )}
                    {onNavigateToCompetitors && (
                      <button
                        onClick={onNavigateToCompetitors}
                        className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        <span>Add Competitor Target</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : filteredArticles.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <FileText className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-sm text-slate-500">No articles matched your active filters.</p>
                </div>
              ) : (
                displayedArticles.map((article) => {
                  const isHistorical = !!article.isBackCatalog;
                  const isSlaMet = !isHistorical && article.delaySec <= 300;
                  return (
                    <div
                      key={article.id}
                      className="bg-white hover:bg-slate-50/80 border border-slate-200/90 hover:border-indigo-200 rounded-xl p-4 sm:p-5 transition-all space-y-3 group shadow-2xs hover:shadow-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {isHistorical ? (
                            <div className="flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full font-telemetry-mono font-semibold border bg-amber-50 text-amber-800 border-amber-200">
                              <BookOpen className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>{article.delayFormatted}</span>
                              <span className="text-[9px] uppercase tracking-wider font-bold">
                                HISTORICAL BACKLOG
                              </span>
                            </div>
                          ) : (
                            <div
                              className={`flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full font-telemetry-mono font-semibold border ${
                                isSlaMet
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {isSlaMet ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                              <span>{article.delayFormatted}</span>
                              <span className="text-[9px] uppercase tracking-wider font-bold">
                                {isSlaMet ? '⚡ 5M SLA MET' : '⚠️ LIVE SLA BREACHED'}
                              </span>
                            </div>
                          )}

                          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {article.competitor}
                          </span>

                          <span className="text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 font-telemetry-mono">
                            {article.publicationSource || article.ingestMethod}
                          </span>

                          <span className="text-[11px] text-slate-500 font-telemetry-mono">
                            {article.diffPayload}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 font-telemetry-mono flex items-center space-x-2">
                          <span>Pub: {article.publishedAt}</span>
                          <span>&rarr;</span>
                          <span className="text-slate-800 font-medium">Disc: {article.discoveredAt}</span>
                        </div>
                      </div>

                      <div>
                        <h3 
                          onClick={() => onSelectArticle(article)}
                          className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors cursor-pointer leading-snug"
                        >
                          {article.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1.5 line-clamp-2 leading-relaxed">
                          {article.snippet}
                        </p>
                        {article.exactDelayText && (
                          <div className="mt-1 text-[11px] text-slate-500 font-telemetry-mono flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span>Exact Detection Latency:</span>
                            <span className="font-semibold text-slate-700">{article.exactDelayText}</span>
                          </div>
                        )}

                        {/* SLA Delay Bottleneck Root Cause Tag */}
                        {(!article.isBackCatalog && article.delaySec > 300) && (
                          <div className="mt-2 p-2.5 bg-rose-50/90 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-telemetry-mono flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold uppercase tracking-wider text-[10px] text-rose-900 block mb-0.5">
                                SLA Delay Bottleneck Root Cause Analysis
                              </span>
                              <span className="text-slate-800 font-semibold">
                                {article.slaBreachReason || 'Origin RSS Cache TTL (300s Header) or Long Polling Cadence Alignment'}
                              </span>
                              <p className="text-[10px] text-slate-600 mt-0.5">
                                Automated Mitigation: Switched to high-cadence Direct DOM Poller with browser emulation headers to restore sub-5m detection guarantee.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded font-telemetry-mono ${
                              article.threatRating === 'High'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : article.threatRating === 'Medium'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            Threat: {article.threatRating}
                          </span>

                          {article.tags.map((tag, tIdx) => {
                            const tagLabel = typeof tag === 'string' ? tag : ((tag as any)?.name || String(tag));
                            return (
                              <span
                                key={`${tagLabel}-${tIdx}`}
                                className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60"
                              >
                                #{tagLabel}
                              </span>
                            );
                          })}
                        </div>

                        <button
                          id={`view-article-btn-${article.id}`}
                          onClick={() => onSelectArticle(article)}
                          className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                        >
                          <span>View Captured Article & Intel</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {articles.length > 0 && (
              <div className="pt-3 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-telemetry-mono">
                  Showing top {displayedArticles.length} of {filteredArticles.length} detected articles
                </span>
                <button
                  id="view-all-articles-stream-btn"
                  onClick={onNavigateToArticles}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 px-4 py-2 rounded-xl transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
                >
                  <span>View All Articles in Stream</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (30% - 4 cols): Latency Extremes, Efficiency, Live Daemon Logs */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Latency Extremes & SLAs */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-telemetry-mono">
                Latency Extremes & SLAs
              </h3>
              <span className={`text-[10px] font-telemetry-mono font-semibold ${slaCompliancePct >= 95 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {slaCompliancePct}% &le; 5m SLA
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <div className="text-slate-500 text-[11px]">Fastest Detection</div>
                  <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                    {fastestArticle ? `${fastestArticle.competitor} (${fastestArticle.ingestMethod})` : 'Awaiting events'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-emerald-600 font-bold font-telemetry-mono text-sm">
                    {fastestArticle ? fastestArticle.delayFormatted : '--'}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-telemetry-mono font-medium">
                    {fastestArticle ? (fastestArticle.delaySec <= 300 ? 'SLA MET (<=5m)' : 'SLA BREACHED (>5m)') : 'Target Met'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <div className="text-slate-500 text-[11px]">Slowest Detection</div>
                  <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                    {slowestArticle ? `${slowestArticle.competitor} (${slowestArticle.ingestMethod})` : 'Awaiting events'}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold font-telemetry-mono text-sm ${slowestArticle && slowestArticle.delaySec > 300 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {slowestArticle ? slowestArticle.delayFormatted : '--'}
                  </div>
                  <div className={`text-[10px] font-telemetry-mono font-medium ${slowestArticle && slowestArticle.delaySec > 300 ? 'text-rose-700' : 'text-emerald-700'}`}>
                    {slowestArticle ? (slowestArticle.delaySec <= 300 ? 'SLA MET (<=5m)' : 'SLA BREACHED (>5m)') : 'Nominal'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-slate-500 text-[10px] uppercase font-telemetry-mono">Average (P50)</div>
                  <div className={`text-base font-bold font-mono-tech mt-0.5 ${isAvgSlaMet ? 'text-slate-900' : 'text-rose-600'}`}>
                    {articles.length > 0 ? avgDelay : '--'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="text-slate-500 text-[10px] uppercase font-telemetry-mono">SLA Compliance</div>
                  <div className={`text-base font-bold font-mono-tech mt-0.5 ${slaCompliancePct >= 90 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {slaCompliancePct}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Method Efficiency Breakdown */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-telemetry-mono border-b border-slate-100 pb-2">
              Ingestion Method Efficiency
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">RSS Feeds</span>
                  <span className="font-telemetry-mono text-emerald-600 font-semibold">01m 18s avg delay</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[94%]" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-telemetry-mono">
                  <span>Success Rate: 99.9%</span>
                  <span>ETag Cache: 88%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">XML Sitemaps</span>
                  <span className="font-telemetry-mono text-indigo-600 font-semibold">04m 12s avg delay</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600 rounded-full w-[82%]" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-telemetry-mono">
                  <span>Success Rate: 98.4%</span>
                  <span>LastMod Support: 80%</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">Direct DOM Poller</span>
                  <span className="font-telemetry-mono text-amber-700 font-semibold">06m 45s avg delay</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full w-[65%]" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-telemetry-mono">
                  <span>Success Rate: 95.2%</span>
                  <span>Diff Hasher: Active</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Real-Time Event Stream Terminal */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-inner space-y-3 font-telemetry-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-bold">crawler-daemon-01.tail</span>
              </div>
              <button
                onClick={() => setIsLiveLogPaused(!isLiveLogPaused)}
                className={`text-[10px] px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer ${
                  isLiveLogPaused 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isLiveLogPaused ? 'RESUME STREAM' : 'PAUSE'}
              </button>
            </div>

            <div className="space-y-2 text-[11px] max-h-60 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="text-slate-500 py-6 text-center text-[10px]">
                  [sys] Database connected. Waiting for crawler activity or test publication...
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="leading-relaxed border-b border-slate-900/60 pb-1">
                    <div className="flex items-center space-x-2 text-slate-500 text-[10px]">
                      <span className="text-slate-400">{log.timestamp}</span>
                      <span className="text-indigo-400">[{log.source}]</span>
                      {log.durationMs && <span className="text-slate-500">{log.durationMs}ms</span>}
                    </div>
                    <div className={`mt-0.5 ${
                      log.level === 'success'
                        ? 'text-emerald-400'
                        : log.level === 'warn'
                        ? 'text-amber-400'
                        : log.level === 'error'
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }`}>
                      {log.message}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controlled Demo Web Sources & Live Testing Hub Modal */}
      {showControlledDemoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full mx-4 p-5 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <Send className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900 font-mono-tech">
                  Controlled Demo Sources &amp; Live Testing Hub
                </h3>
              </div>
              <button 
                onClick={() => setShowControlledDemoModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Publish test articles on controlled demo sources and observe end-to-end real-time detection, live notification feed alerts, and Firestore database sync.
            </p>

            <div className="space-y-3.5 text-xs">
              {/* Controlled Demo Source Selection */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Competitor Entity</label>
                <select
                  value={demoTarget}
                  onChange={(e) => setDemoTarget(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="Acme AI Corp">Acme AI Corp (acmeai.com)</option>
                  <option value="TechCrunch">TechCrunch (techcrunch.com)</option>
                  <option value="AWS Architecture Blog">AWS Architecture Blog (aws.amazon.com)</option>
                  <option value="Snowflake Developers">Snowflake Developers (snowflake.com)</option>
                  <option value="Stripe Engineering">Stripe Engineering (stripe.com)</option>
                  <option value="Datadog Engineering">Datadog Engineering (datadoghq.com)</option>
                  <option value="Cloudflare Engineering">Cloudflare Engineering (blog.cloudflare.com)</option>
                </select>
              </div>

              {/* Title Input */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Article Title</label>
                <input
                  type="text"
                  value={demoTitle}
                  onChange={(e) => setDemoTitle(e.target.value)}
                  placeholder="e.g. Next-Gen Distributed Stream Inference"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Scenario Preset */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">SLA Latency Scenario</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDemoScenario('live_fast');
                      setDemoDelaySec(185);
                      setDemoSource('RSS <pubDate>');
                    }}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                      demoScenario === 'live_fast'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-[11px] flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>1. Fast Live SLA</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">3m 05s (&le;5m Met)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDemoScenario('live_breach');
                      setDemoDelaySec(522);
                      setDemoSource('HTML meta (article:published_time)');
                    }}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                      demoScenario === 'live_breach'
                        ? 'bg-rose-50 border-rose-300 text-rose-900 font-semibold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-[11px] flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>2. SLA Breach</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">8m 42s (&gt;5m Breached)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDemoScenario('back_catalog');
                      setDemoDelaySec(172800);
                      setDemoSource('Sitemap <lastmod>');
                    }}
                    className={`p-2 rounded-xl border text-left cursor-pointer transition-all ${
                      demoScenario === 'back_catalog'
                        ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold text-[11px] flex items-center space-x-1">
                      <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                      <span>3. Historical</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">2 Days Backlog</span>
                  </button>
                </div>
              </div>

              {/* Root Cause Selector (Only shown on breach) */}
              {demoScenario === 'live_breach' && (
                <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-1.5">
                  <label className="font-bold text-rose-900 block text-[11px] uppercase tracking-wider font-telemetry-mono">
                    SLA Delay Bottleneck Root Cause Injection
                  </label>
                  <select
                    value={demoRootCause}
                    onChange={(e) => setDemoRootCause(e.target.value)}
                    className="w-full bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs text-rose-950 font-medium focus:outline-none"
                  >
                    <option value="Feed Cache Headers (300s Origin TTL max-age)">Feed Cache Headers (300s Origin TTL max-age)</option>
                    <option value="Long Polling Cadence Alignment Threshold Exceeded">Long Polling Cadence Alignment Threshold Exceeded</option>
                    <option value="XML Sitemap Indexing Latency Delta">XML Sitemap Indexing Latency Delta</option>
                    <option value="Anti-Scraping Cloudflare Bot Challenge Mitigation">Anti-Scraping Cloudflare Bot Challenge Mitigation</option>
                    <option value="DOM Tree Diff Parsing & Hash Computation Overhead">DOM Tree Diff Parsing &amp; Hash Computation Overhead</option>
                  </select>
                </div>
              )}

              {/* Publication Source Provenance */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Publication Timestamp Source</label>
                <select
                  value={demoSource}
                  onChange={(e) => setDemoSource(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="RSS <pubDate>">RSS &lt;pubDate&gt;</option>
                  <option value="Sitemap <lastmod>">Sitemap &lt;lastmod&gt;</option>
                  <option value="HTML meta (article:published_time)">HTML meta (article:published_time)</option>
                  <option value="JSON-LD schema (datePublished)">JSON-LD schema (datePublished)</option>
                  <option value="Direct DOM Poller Discovery">Direct DOM Poller Discovery</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowControlledDemoModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowControlledDemoModal(false);
                  if (onPublishTestPost) {
                    await onPublishTestPost(
                      demoTarget,
                      demoTitle,
                      demoScenario,
                      demoDelaySec,
                      demoScenario === 'back_catalog',
                      demoSource,
                      demoContent
                    );
                  }
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Test Post &amp; Observe Detection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
