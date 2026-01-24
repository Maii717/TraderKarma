
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  sessionBadgeCount?: number;
  syncStatus?: 'synced' | 'syncing' | 'error';
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  onTabChange, 
  sessionBadgeCount = 0,
  syncStatus = 'synced'
}) => {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-slate-900 shadow-2xl overflow-hidden relative border-x border-slate-800">
      {/* Header */}
      <header className="p-4 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center rotate-3 shadow-lg shadow-indigo-500/20">
            <i className="fa-solid fa-k scale-75 text-white"></i>
          </div>
          <h1 className="text-xl font-bold gradient-text tracking-tight">TradeKarma</h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1 text-orange-400 font-bold">
            <i className="fa-solid fa-fire text-xs"></i>
            <span className="text-xs">3</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400 font-bold">
            <i className="fa-solid fa-gem text-xs"></i>
            <span className="text-xs">420</span>
          </div>
          
          {/* Sync Indicator */}
          <div className="flex items-center justify-center ml-2">
            {syncStatus === 'syncing' && (
              <i className="fa-solid fa-cloud-arrow-up text-indigo-400 text-[10px] animate-bounce"></i>
            )}
            {syncStatus === 'synced' && (
              <i className="fa-solid fa-cloud text-emerald-500 text-[10px] opacity-60"></i>
            )}
            {syncStatus === 'error' && (
              <i className="fa-solid fa-cloud-bolt text-rose-500 text-[10px] animate-pulse"></i>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24 p-4">
        {syncStatus === 'error' && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 animate-slideUp">
            <i className="fa-solid fa-circle-exclamation text-rose-500"></i>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-tight">
              Error de Red: El Dojo no puede guardar tus progresos. Desactiva Adblockers.
            </p>
          </div>
        )}
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 flex justify-around p-3 z-20">
        <button 
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-indigo-400 scale-110' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-house text-xl"></i>
          <span className="text-[10px] font-medium">Dojo</span>
        </button>
        <button 
          onClick={() => onTabChange('session')}
          className={`relative flex flex-col items-center gap-1 transition-all ${activeTab === 'session' ? 'text-indigo-400 scale-110' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-bullseye text-xl"></i>
          <span className="text-[10px] font-medium">Session</span>
          {sessionBadgeCount > 0 && (
            <span className="absolute -top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-rose-500/40">
              {sessionBadgeCount}
            </span>
          )}
        </button>
        <button 
          onClick={() => onTabChange('rules')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'rules' ? 'text-indigo-400 scale-110' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-scroll text-xl"></i>
          <span className="text-[10px] font-medium">Reglas</span>
        </button>
        <button 
          onClick={() => onTabChange('profile')}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'text-indigo-400 scale-110' : 'text-slate-500'}`}
        >
          <i className="fa-solid fa-user-ninja text-xl"></i>
          <span className="text-[10px] font-medium">Ninja</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
