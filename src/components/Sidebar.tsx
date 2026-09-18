import React from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  FileText, 
  Activity, 
  Send, 
  Radar, 
  CheckCircle2, 
  SlidersHorizontal,
  ExternalLink,
  X
} from 'lucide-react';
import { NavigationTab } from '../types';

interface SidebarProps {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  articlesCount: number;
  competitorsCount: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  articlesCount,
  competitorsCount,
  isMobileOpen = false,
  onCloseMobile
}) => {
  const navItems = [
    {
      id: 'dashboard' as NavigationTab,
      label: 'Dashboard Overview',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'competitors' as NavigationTab,
      label: 'Competitors Directory',
      icon: Building2,
      badge: `${competitorsCount} Active`
    },
    {
      id: 'reader' as NavigationTab,
      label: 'Article Stream & Intel',
      icon: FileText,
      badge: `${articlesCount}`
    },
    {
      id: 'scale' as NavigationTab,
      label: 'Scale & Node Health',
      icon: Activity,
      badge: competitorsCount > 0 ? `${competitorsCount} Nodes` : 'Ready'
    },
    {
      id: 'integrations' as NavigationTab,
      label: 'Auto-Publish & Hooks',
      icon: Send,
      badge: 'v2.4'
    }
  ];

  const handleNavClick = (tab: NavigationTab) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderNavContent = (isDrawer = false) => (
    <div className="flex flex-col justify-between h-full">
      <div>
        {/* Logo & Brand Header */}
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-500 p-0.5 shadow-md shadow-indigo-500/10 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <Radar className="w-5 h-5 text-indigo-600 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-slate-900 font-mono-tech">
                  BlogSpy<span className="text-indigo-600">.ai</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Enterprise Crawler Engine</p>
            </div>
          </div>

          {isDrawer && onCloseMobile && (
            <button
              id="close-mobile-sidebar-btn"
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors lg:hidden"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div className="px-3 py-5">
          <div className="px-3 mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-telemetry-mono">
              Intelligence Feeds
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}${isDrawer ? '-mobile' : ''}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-telemetry-mono ${
                        isActive
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 font-semibold'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer / System Telemetry Status */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/70 space-y-3.5">
        <div className="bg-white border border-slate-200/80 rounded-lg p-3 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute" />
              <span className="text-[11px] font-semibold text-slate-800 ml-2">
                {competitorsCount > 0 ? `${competitorsCount} Target${competitorsCount === 1 ? '' : 's'} Online` : 'Database Online'}
              </span>
            </div>
            <span className="text-[10px] font-bold text-emerald-700 font-telemetry-mono">HEALTHY</span>
          </div>

          {/* Worker Load bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500">
              <span>Worker Pool Load</span>
              <span className="font-telemetry-mono text-slate-700 font-semibold">74%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 to-indigo-600 rounded-full w-[74%]" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
          <span className="font-telemetry-mono text-[10px]">Engine v2.4.1-rc</span>
          <button 
            id={`view-scale-shortcut-btn${isDrawer ? '-mobile' : ''}`}
            onClick={() => handleNavClick('scale')}
            className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
          >
            <span>Telemetry Logs</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Left Sidebar (>=1024px / lg:flex) */}
      <aside 
        id="sidebar-navigation"
        className="hidden lg:flex w-72 bg-white border-r border-slate-200/90 flex-col justify-between shrink-0 h-screen sticky top-0 select-none z-30"
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Slide-Over Navigation Drawer (<1024px) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            id="mobile-sidebar-backdrop"
            onClick={onCloseMobile}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Slide-over Content */}
          <div 
            id="mobile-sidebar-drawer"
            className="relative w-72 sm:w-80 max-w-[85vw] bg-white h-full shadow-2xl z-50 flex flex-col justify-between select-none animate-in slide-in-from-left duration-200"
          >
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
