import React, { useState, useEffect } from 'react';
import { 
  Search, 
  X, 
  FileText, 
  Building2, 
  Zap, 
  Download, 
  RefreshCw, 
  Activity, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Article, Competitor, NavigationTab } from '../types';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  competitors: Competitor[];
  onSelectArticle: (article: Article) => void;
  onNavigateTab: (tab: NavigationTab) => void;
  onTriggerScan: () => void;
  onPublishTestPost: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  articles,
  competitors,
  onSelectArticle,
  onNavigateTab,
  onTriggerScan,
  onPublishTestPost
}) => {
  const [query, setQuery] = useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Clear query and focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredArticles = articles.filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) ||
    a.competitor.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCompetitors = competitors.filter(c => 
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.domain.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-start justify-center pt-20 p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        id="command-palette-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-slate-100">
          <Search className="w-5 h-5 text-indigo-600 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, search articles, or competitor domain..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Quick Actions */}
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-500 font-telemetry-mono px-2 mb-1.5">
              Quick Actions
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  onPublishTestPost();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-left"
              >
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Publish Test Article (Simulate instant sub-5m detection)</span>
                </div>
                <span className="text-[10px] font-telemetry-mono text-amber-600 font-semibold">Run Simulator</span>
              </button>

              <button
                onClick={() => {
                  onTriggerScan();
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-left"
              >
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-indigo-600" />
                  <span>Trigger Global Crawl Now across 100 targets</span>
                </div>
                <span className="text-[10px] font-telemetry-mono text-slate-500">Sweep</span>
              </button>

              <button
                onClick={() => {
                  onNavigateTab('scale');
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-left"
              >
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Open 100-Site Scale & Health Matrix</span>
                </div>
                <span className="text-[10px] font-telemetry-mono text-slate-500">Tab</span>
              </button>

              <button
                onClick={() => {
                  onNavigateTab('reports');
                  onClose();
                }}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-left"
              >
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>View Reports & Architecture Docs (SLA, Topology, Setup)</span>
                </div>
                <span className="text-[10px] font-telemetry-mono text-slate-500">Docs</span>
              </button>
            </div>
          </div>

          {/* Articles */}
          {filteredArticles.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 font-telemetry-mono px-2 mb-1.5">
                Captured Articles ({filteredArticles.length})
              </div>
              <div className="space-y-1">
                {filteredArticles.slice(0, 4).map((art) => (
                  <button
                    key={art.id}
                    onClick={() => {
                      onSelectArticle(art);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{art.title}</span>
                      <span className="text-[10px] text-indigo-600 shrink-0">({art.competitor})</span>
                    </div>
                    <span className="text-[10px] font-telemetry-mono text-emerald-700 font-semibold shrink-0 ml-2">
                      {art.delayFormatted}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Competitors */}
          {filteredCompetitors.length > 0 && (
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-500 font-telemetry-mono px-2 mb-1.5">
                Competitors ({filteredCompetitors.length})
              </div>
              <div className="space-y-1">
                {filteredCompetitors.slice(0, 4).map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => {
                      onNavigateTab('competitors');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="font-semibold text-slate-800">{comp.name}</span>
                      <span className="text-[10px] text-slate-500 font-telemetry-mono">{comp.domain}</span>
                    </div>
                    <span className="text-[10px] font-telemetry-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                      {comp.strategy}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
