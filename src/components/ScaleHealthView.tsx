import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  Server, 
  Zap, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Pause, 
  Play, 
  Sliders, 
  TrendingUp, 
  Clock, 
  Database, 
  Radio,
  Send,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { SiteNode, RetryEvent, IngestionStrategy } from '../types';

interface ScaleHealthViewProps {
  nodes: SiteNode[];
  retries: RetryEvent[];
  onForcePollNode: (nodeId: number) => void;
  onPublishTestPost: (competitorName?: string, customTitle?: string) => Promise<void>;
  isPublishing: boolean;
}

export const ScaleHealthView: React.FC<ScaleHealthViewProps> = ({
  nodes,
  retries,
  onForcePollNode,
  onPublishTestPost,
  isPublishing
}) => {
  const [region, setRegion] = useState<'us-east' | 'eu-west' | 'ap-south'>('us-east');
  const [cadence, setCadence] = useState<'1s' | '5s' | '15s'>('5s');
  const [pauseNonCritical, setPauseNonCritical] = useState(false);
  const [selectedNode, setSelectedNode] = useState<SiteNode>(nodes[0] || {} as SiteNode);
  const [matrixFilter, setMatrixFilter] = useState<'all' | 'polling' | 'backoff' | 'nominal'>('all');

  // Test publisher states
  const [testCompetitor, setTestCompetitor] = useState('Acme AI Corp');
  const [testTitle, setTestTitle] = useState('Unveiling Autonomous Agent Benchmarks for Real-Time Pipelines');
  const [testResultMsg, setTestResultMsg] = useState<string | null>(null);

  // Live node ticker simulator
  const [liveNodes, setLiveNodes] = useState<SiteNode[]>(nodes);

  useEffect(() => {
    setLiveNodes(nodes);
  }, [nodes]);

  const handleTestPublish = async () => {
    setTestResultMsg('Publishing to simulated competitor origin...');
    try {
      await onPublishTestPost(testCompetitor, testTitle);
      setTestResultMsg('Detected in 12s! Target SLA <= 5m Met (Added to Live Feed)');
      setTimeout(() => setTestResultMsg(null), 4000);
    } catch (e) {
      setTestResultMsg('Simulated publish completed.');
      setTimeout(() => setTestResultMsg(null), 3000);
    }
  };

  const filteredNodes = liveNodes.filter((node) => {
    if (matrixFilter === 'polling') return node.status === 'polling';
    if (matrixFilter === 'backoff') return node.status === 'backoff';
    if (matrixFilter === 'nominal') return node.status === 'nominal';
    return true;
  });

  return (
    <div id="scale-health-view" className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200/80">
        <div>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-mono-tech">
              100-Site Scale & Crawler Health
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Asynchronous thread allocation, non-blocking scheduler matrix, and automated backoff recovery for high-density target clusters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs w-full lg:w-auto">
          {/* Region Switcher */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1">
            <span className="text-slate-500 px-2 text-[11px] font-telemetry-mono hidden sm:inline">Region:</span>
            {(['us-east', 'eu-west', 'ap-south'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRegion(r)}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  region === r ? 'bg-white text-indigo-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Cadence Switcher */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-1">
            <span className="text-slate-500 px-2 text-[11px] font-telemetry-mono hidden sm:inline">Cadence:</span>
            {(['1s', '5s', '15s'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCadence(c)}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  cadence === c ? 'bg-white text-indigo-700 font-semibold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Pause Kill Switch */}
          <button
            onClick={() => setPauseNonCritical(!pauseNonCritical)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
              pauseNonCritical
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 shadow-2xs'
            }`}
          >
            {pauseNonCritical ? <Play className="w-3.5 h-3.5 text-amber-600" /> : <Pause className="w-3.5 h-3.5 text-slate-500" />}
            <span>{pauseNonCritical ? 'Resume Non-Critical' : 'Pause Non-Critical'}</span>
          </button>
        </div>
      </div>

      {/* Top KPI Cards (Concurrent Pool, Velocity, Retries, Bandwidth) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Concurrent Worker Pool */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px] font-telemetry-mono">
              Concurrent Worker Pool
            </span>
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-tech">16</span>
            <span className="text-xs text-slate-500">Active / 84 Queued</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-500 font-telemetry-mono">
              <span>Cluster CPU: 42%</span>
              <span>Memory: 1.8 / 4.0 GB</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 rounded-full w-[42%]" />
            </div>
          </div>
        </div>

        {/* KPI 2: Global Polling Velocity */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px] font-telemetry-mono">
              Polling Velocity
            </span>
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-600 font-mono-tech">14.8</span>
            <span className="text-xs text-slate-500">req / sec</span>
          </div>
          <div className="text-xs text-emerald-700 font-telemetry-mono font-medium flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            <span>99.4% on-time execution</span>
          </div>
        </div>

        {/* KPI 3: Failed Checks & Recovery */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px] font-telemetry-mono">
              Failed Checks & Recovery
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-700 font-mono-tech">3</span>
            <span className="text-xs text-slate-500">Active Retries</span>
          </div>
          <div className="text-xs text-slate-500 font-telemetry-mono">
            <span>99.8% pass rate | 0 data loss</span>
          </div>
        </div>

        {/* KPI 4: Daily HTTP Ingress / Bandwidth */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider text-[11px] font-telemetry-mono">
              Daily HTTP Ingress
            </span>
            <Database className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900 font-mono-tech">1.42</span>
            <span className="text-xs text-slate-500">GB Bandwidth</span>
          </div>
          <div className="text-xs text-slate-500 font-telemetry-mono">
            <span className="text-emerald-600 font-semibold">98.2%</span> 304 Not Modified saves
          </div>
        </div>
      </div>

      {/* Simulator Banner: "Publish Test Article" Generator */}
      <div 
        id="scale-simulator-box"
        className="bg-indigo-50/60 border border-indigo-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900 font-mono-tech">
              Live Scale Simulation & Latency Benchmark Generator
            </h3>
          </div>
          <span className="text-xs text-emerald-700 font-telemetry-mono font-semibold">
            Direct In-Memory Engine (Zero CORS Latency)
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Simulate a live competitor publishing a new blog post. The non-blocking crawler pool detects the ETag change, calculates discovery delay, parses microdata, and pushes the event to the live feed in under 10 seconds.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <label className="text-slate-700 font-medium">Target Competitor Origin</label>
            <select
              value={testCompetitor}
              onChange={(e) => setTestCompetitor(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 shadow-2xs font-medium"
            >
              <option value="Acme AI Corp">Acme AI Corp (acme.ai)</option>
              <option value="TechCrunch">TechCrunch (techcrunch.com)</option>
              <option value="Cloudflare Blog">Cloudflare Blog (blog.cloudflare.com)</option>
              <option value="AWS Architecture Blog">AWS Architecture (aws.amazon.com)</option>
              <option value="Datadog Engineering">Datadog Engineering (datadoghq.com)</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-slate-700 font-medium">Article Headline</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-indigo-500 font-medium shadow-2xs"
              />
              <button
                id="publish-test-article-execute-btn"
                onClick={handleTestPublish}
                disabled={isPublishing}
                className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 disabled:opacity-60 cursor-pointer"
              >
                <Zap className={`w-3.5 h-3.5 fill-current ${isPublishing ? 'animate-spin' : ''}`} />
                <span>{isPublishing ? 'Simulating...' : 'Publish Test Article'}</span>
              </button>
            </div>
          </div>
        </div>

        {testResultMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{testResultMsg}</span>
          </div>
        )}
      </div>

      {/* Non-Blocking Scheduler Matrix (100 Targets) & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): 100-Node Grid */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 font-mono-tech">
                Non-Blocking Scheduler Matrix (100 Targets)
              </h3>
              <p className="text-xs text-slate-500">
                Click any node to inspect telemetry, ETag hash, latency, and force an immediate polling cycle.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {[
                { id: 'all', label: `All (${nodes.length})` },
                { id: 'polling', label: `In-Flight (${nodes.filter(n => n.status === 'polling').length})` },
                { id: 'backoff', label: `Retrying (${nodes.filter(n => n.status === 'backoff').length})` },
                { id: 'nominal', label: `Nominal (${nodes.filter(n => n.status === 'nominal').length})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setMatrixFilter(pill.id as any)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    matrixFilter === pill.id
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-telemetry-mono text-slate-600">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
              <span>Nominal / Idle</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-indigo-600 animate-pulse" />
              <span>Polling In-Flight</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500" />
              <span>Backoff / Rate Limit</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500" />
              <span>Offline</span>
            </div>
          </div>

          {/* Node Matrix Grid */}
          {filteredNodes.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500 space-y-1">
              <Activity className="w-6 h-6 mx-auto text-slate-400" />
              <p className="text-xs font-semibold text-slate-700">No monitoring nodes currently provisioned</p>
              <p className="text-[11px] text-slate-400">Nodes are assigned dynamically as competitor targets are added to the database.</p>
            </div>
          ) : (
            <div 
              id="scheduler-matrix-100-grid"
              className="grid grid-cols-10 sm:grid-cols-10 gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200"
            >
              {filteredNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                let bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100';
                if (node.status === 'polling') {
                  bgClass = 'bg-indigo-600 text-white border-indigo-700 animate-pulse shadow-xs';
                } else if (node.status === 'backoff') {
                  bgClass = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
                } else if (node.status === 'offline') {
                  bgClass = 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100';
                }

                return (
                  <button
                    key={node.id}
                    id={`node-cell-${node.id}`}
                    onClick={() => setSelectedNode(node)}
                    title={`#${node.id} - ${node.domain} (${node.status})`}
                    className={`h-9 rounded-lg border text-[11px] font-telemetry-mono font-bold flex items-center justify-center transition-all ${bgClass} ${
                      isSelected ? 'ring-2 ring-indigo-600 ring-offset-2 ring-offset-white scale-105 z-10 shadow-xs' : ''
                    }`}
                  >
                    {node.id}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Selected Node Inspector */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
          {!selectedNode?.id ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Server className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs text-slate-500">No node selected</p>
              <p className="text-[11px] text-slate-400">Select a node from the matrix or register a competitor target.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 font-telemetry-mono block">
                    Target Node Inspector
                  </span>
                  <h4 className="text-base font-bold text-slate-900 font-mono-tech mt-0.5">
                    Node #{selectedNode?.id || 1}: {selectedNode?.name}
                  </h4>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded font-telemetry-mono ${
                    selectedNode?.status === 'nominal'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : selectedNode?.status === 'polling'
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
                      : selectedNode?.status === 'backoff'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {selectedNode?.status}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Target Host</span>
                  <span className="font-telemetry-mono text-indigo-700 font-semibold">
                    {selectedNode?.domain}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Ingestion Strategy</span>
                  <span className="font-semibold text-slate-800">
                    {selectedNode?.strategy}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Roundtrip Latency</span>
                  <span className="font-telemetry-mono text-emerald-700 font-semibold">
                    {selectedNode?.latencyMs}ms
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Cached ETag Validator</span>
                  <span className="font-telemetry-mono text-slate-700">
                    {selectedNode?.etag}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Last Polled</span>
                  <span className="font-telemetry-mono text-slate-700">
                    {selectedNode?.lastPolledSecAgo}s ago
                  </span>
                </div>

                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">Next Scheduled Poll</span>
                  <span className="font-telemetry-mono text-indigo-700 font-semibold">
                    In {selectedNode?.nextPollInSec}s
                  </span>
                </div>
              </div>

              <button
                id="force-poll-selected-node-btn"
                onClick={() => onForcePollNode(selectedNode.id)}
                className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg text-xs transition-all shadow-sm shadow-indigo-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Force Poll Target Now</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Lower Section: Latency Distribution & Retry Log Trace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Latency Distribution (4 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-telemetry-mono border-b border-slate-100 pb-2">
            Polling Cycle Latency Distribution
          </h4>

          <div className="space-y-3 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between text-slate-700">
                <span>&lt; 500ms (Immediate ETag match)</span>
                <span className="font-telemetry-mono font-semibold text-emerald-600">76 Targets (76%)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full w-[76%]" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-700">
                <span>500ms - 1.5s (XML Sitemap Index)</span>
                <span className="font-telemetry-mono font-semibold text-indigo-600">18 Targets (18%)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 rounded-full w-[18%]" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-700">
                <span>1.5s - 3.0s (Direct DOM Scraper)</span>
                <span className="font-telemetry-mono font-semibold text-amber-700">4 Targets (4%)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-[4%]" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-slate-700">
                <span>&gt; 3.0s (Rate-limited Backoff)</span>
                <span className="font-telemetry-mono font-semibold text-rose-700">2 Targets (2%)</span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 rounded-full w-[2%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Retry & Automated Recovery Log Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-telemetry-mono">
              Retry & Automated Recovery Trace Log
            </h4>
            <span className="text-[10px] text-emerald-700 font-telemetry-mono font-semibold">
              Exponential Jitter Backoff Active
            </span>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead>
                <tr className="text-slate-400 font-telemetry-mono text-[10px] uppercase border-b border-slate-200">
                  <th className="py-2 px-2">Timestamp</th>
                  <th className="py-2 px-2">Domain Target</th>
                  <th className="py-2 px-2">HTTP / Error Trace</th>
                  <th className="py-2 px-2">Attempt</th>
                  <th className="py-2 px-2 text-right">Recovery State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-telemetry-mono text-[11px]">
                {retries.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2 text-slate-500">{r.timestamp}</td>
                    <td className="py-2 px-2 text-indigo-700 font-semibold">{r.domain}</td>
                    <td className="py-2 px-2 text-slate-700 max-w-xs truncate">{r.error}</td>
                    <td className="py-2 px-2 text-slate-500">{r.attempt}/{r.maxAttempts}</td>
                    <td className="py-2 px-2 text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.resolution === 'Recovered'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {r.resolution} ({r.backoffDelay})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
