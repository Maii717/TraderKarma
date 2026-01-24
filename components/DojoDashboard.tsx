
import React, { useEffect, useState } from 'react';
import { UserStats } from '../types';
import { geminiService } from '../services/geminiService';

interface DojoDashboardProps {
  stats: UserStats;
  lastSync: Date | null;
}

const DojoDashboard: React.FC<DojoDashboardProps> = ({ stats, lastSync }) => {
  const [wisdom, setWisdom] = useState('Cargando sabiduría...');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    geminiService.getDailyWisdom().then(setWisdom);
  }, []);

  useEffect(() => {
    const checkLiveStatus = () => {
      if (lastSync) {
        const now = new Date();
        const diff = (now.getTime() - lastSync.getTime()) / 1000;
        setIsLive(diff < 60); 
      } else {
        setIsLive(false);
      }
    };

    checkLiveStatus();
    const interval = setInterval(checkLiveStatus, 1000);
    return () => clearInterval(interval);
  }, [lastSync]);

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Status Bar */}
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-600 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`}></div>
          <span className={`text-[10px] font-black uppercase tracking-tighter ${isLive ? 'text-emerald-500' : 'text-rose-500'}`}>
            {isLive ? 'MT5 CONECTADO' : 'MT5 DESCONECTADO'}
          </span>
        </div>
        {lastSync && (
          <span className="text-[9px] font-bold text-slate-600">
            SYNC: {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
      </div>

      {/* Financial Overview */}
      <div className="bg-slate-800/80 p-6 rounded-[2.5rem] border border-slate-700/50 shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
          <i className="fa-solid fa-building-columns text-[120px] text-indigo-500"></i>
        </div>
        
        <div className="flex justify-between items-start mb-6 relative z-10">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Profit Histórico</p>
            <h2 className={`text-4xl font-black ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {stats.totalPnL >= 0 ? '+' : ''}{stats.totalPnL.toFixed(2)} <span className="text-lg opacity-50">USD</span>
            </h2>
          </div>
          <div className="text-right">
             <div className="flex items-center gap-1 justify-end mb-1">
                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">Equity Actual</p>
             </div>
             <p className="text-2xl font-black text-white leading-none tracking-tight">
               ${(stats.equity || stats.accountBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
             </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 relative z-10">
          <div className="bg-slate-900/60 backdrop-blur-sm p-3 rounded-2xl border border-slate-700/30">
            <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Win Rate</p>
            <p className="text-lg font-black text-emerald-400">{stats.winRate}%</p>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-sm p-3 rounded-2xl border border-slate-700/30">
            <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Depósito Inicial</p>
            <p className="text-lg font-black text-indigo-300">
              ${(stats.startingBalance || 10000).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}
            </p>
          </div>
          <div className="bg-slate-900/60 backdrop-blur-sm p-3 rounded-2xl border border-slate-700/30">
            <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">Balance Actual</p>
            <p className="text-lg font-black text-white">
              ${(stats.accountBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </p>
          </div>
        </div>
      </div>

      {/* Spirit Health Bar */}
      <div className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 relative overflow-hidden shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-xl shadow-inner shadow-black/20">🥷</div>
            <div>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Nivel {stats.level}</p>
              <h3 className="text-lg font-bold text-white">Espíritu de {stats.username}</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <i className={`fa-solid fa-heart text-rose-500 ${isLive ? 'animate-pulse' : ''}`}></i>
            <span className="text-2xl font-black text-white">{stats.health}</span>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5">
          <div className={`h-full rounded-full transition-all duration-1000 ${stats.health > 50 ? 'bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]'}`} style={{ width: `${stats.health}%` }} />
        </div>
      </div>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/30 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest">Batallas</p>
          <p className="text-3xl font-black text-slate-200">{stats.totalTrades}</p>
        </div>
        <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/30 text-center">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1 tracking-widest">Experiencia</p>
          <p className="text-3xl font-black text-indigo-400">{stats.xp}</p>
        </div>
      </div>

      <div className="bg-slate-800/30 border-l-4 border-indigo-500 p-5 rounded-r-3xl italic text-slate-300 text-xs leading-relaxed shadow-sm">
        <i className="fa-solid fa-quote-left text-indigo-500/50 mr-2 text-[10px]"></i>
        {wisdom}
      </div>
    </div>
  );
};

export default DojoDashboard;
