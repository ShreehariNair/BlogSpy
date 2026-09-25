import React, { useState } from 'react';
import { 
  Server, 
  Search, 
  Bell, 
  Menu,
  X
} from 'lucide-react';

interface HeaderProps {
  onOpenSearch: () => void;
  avgDelay: string;
  avgDelaySec?: number;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  avgDelay,
  avgDelaySec = 0,
  onOpenMobileMenu
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const isSlaMet = avgDelaySec <= 300;

  const mockNotifications = [
    {
      id: 'notif-1',
      title: 'New Article Detected: TechCrunch',
      desc: 'Next-Gen Edge Inference (3m 12s SLA delay)',
      time: '4m ago',
      type: 'success'
    },
    {
      id: 'notif-2',
      title: 'Backoff Throttle Applied',
      desc: 'hashicorp.com rate limited: backoff 30s',
      time: '12m ago',
      type: 'warning'
    },
    {
      id: 'notif-3',
      title: 'SLA Met on Feeds',
      desc: 'US-East cluster real-time SLA verification active',
      time: '35m ago',
      type: 'info'
    }
  ];

  return (
    <header 
      id="main-app-header"
      className="h-16 bg-white/95 backdrop-blur border-b border-slate-200/90 px-3 sm:px-5 lg:px-6 flex items-center justify-between sticky top-0 z-40 shrink-0 gap-2 sm:gap-4"
    >
      {/* Left: Mobile Hamburger & Cluster / Live Sync Status */}
      <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink">
        {/* Mobile Hamburger Menu Button (<1024px) */}
        {onOpenMobileMenu && (
          <button
            id="mobile-menu-toggle-btn"
            onClick={onOpenMobileMenu}
            className="p-1.5 sm:p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors lg:hidden focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {/* Server Cluster Tag - visible only on large screens to prevent header overcrowding */}
        <div className="hidden xl:flex items-center space-x-2 text-xs text-slate-600 bg-slate-100/80 border border-slate-200 px-2.5 py-1.5 rounded-lg shrink-0">
          <Server className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
          <span className="font-telemetry-mono text-slate-800 font-medium">US-East-01</span>
          <span className="w-1 h-1 rounded-full bg-slate-400" />
          <span className="text-slate-500">Production</span>
        </div>

        {/* Live sync indicator with glowing pulse light and SLA status */}
        <div 
          id="header-live-sync-indicator"
          className={`inline-flex items-center space-x-1.5 sm:space-x-2 text-xs border px-2 sm:px-3 py-1.5 rounded-lg font-medium shadow-2xs shrink-0 select-none transition-colors ${
            isSlaMet 
              ? 'bg-emerald-50/90 border-emerald-200/90 text-emerald-800' 
              : 'bg-rose-50/90 border-rose-200/90 text-rose-800'
          }`}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isSlaMet ? 'bg-emerald-500' : 'bg-rose-500'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isSlaMet ? 'bg-emerald-500' : 'bg-rose-500'
            }`} />
          </span>
          <span className="text-slate-500 text-[11px] font-medium hidden md:inline">Live Latency:</span>
          <span className={`font-telemetry-mono font-bold tracking-tight text-xs whitespace-nowrap ${
            isSlaMet ? 'text-emerald-900' : 'text-rose-900'
          }`}>
            {avgDelay}
          </span>
          <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border hidden sm:inline-block whitespace-nowrap leading-none ${
            isSlaMet 
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200/80' 
              : 'bg-rose-100 text-rose-800 border-rose-200/80'
          }`}>
            {isSlaMet ? '≤ 5m SLA' : '> 5m Breach'}
          </span>
        </div>
      </div>

      {/* Right: Search Input, Notification Bell, and User Profile badge */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Cmd+K Search Trigger */}
        <button
          id="global-search-trigger"
          onClick={onOpenSearch}
          className="flex items-center bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 p-2 sm:px-3 sm:py-1.5 rounded-lg text-xs transition-colors w-8 h-8 sm:w-36 md:w-48 lg:w-56 justify-center sm:justify-between shadow-2xs shrink-0"
          title="Search articles, feeds, domains... (⌘K)"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="hidden sm:inline truncate text-slate-500">Search feeds...</span>
          </div>
          <kbd className="hidden md:inline-block font-telemetry-mono text-[10px] bg-white text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shadow-2xs shrink-0">
            ⌘K
          </kbd>
        </button>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            id="notifications-toggle-btn"
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 flex items-center justify-center relative transition-colors shadow-2xs"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <>
              {/* Invisible Backdrop for click-outside */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)}
              />

              <div 
                id="notifications-popover"
                className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl ring-1 ring-slate-900/10 p-3 z-50 text-xs animate-in fade-in zoom-in-95"
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="font-semibold text-slate-900">Crawler Activity Alerts</span>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
                    aria-label="Close notifications"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {mockNotifications.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{n.title}</span>
                        <span className="text-[10px] text-slate-500 font-telemetry-mono">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="flex items-center space-x-2 pl-1 sm:pl-2 border-l border-slate-200">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0">
            AM
          </div>
          <div className="hidden xl:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight">Alex Mercer</div>
            <div className="text-[10px] text-slate-500 leading-tight">SecOps & Crawler Eng</div>
          </div>
        </div>
      </div>
    </header>
  );
};
