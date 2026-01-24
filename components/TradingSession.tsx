
import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { TradingRule, UserStats, EntryMode, PendingTrade, TradeSession } from '../types';
import { supabaseService } from '../services/supabaseClient';

interface TradingSessionProps {
  rules: TradingRule[];
  stats: UserStats;
  history: TradeSession[];
  onUpdateStats: (newStats: Partial<UserStats>) => void;
  onUpdateHistory: (session: TradeSession) => void;
  onSetHistory: (history: TradeSession[]) => void;
  onRemovePendingTrade: (tradeId: string) => void;
  entryMode: EntryMode;
  pendingTrades: PendingTrade[];
  onRefresh?: () => Promise<void>;
  onOpenSetup?: () => void;
}

const TradingSession: React.FC<TradingSessionProps> = ({ 
  rules, stats, history, onUpdateStats, onUpdateHistory, onSetHistory, onRemovePendingTrade, entryMode, pendingTrades, onRefresh, onOpenSetup 
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{followed: string[], broken: string[]} | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<PendingTrade | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [showResultForm, setShowResultForm] = useState(false);
  const [tradeAmount, setTradeAmount] = useState('');
  const [tradeResult, setTradeResult] = useState<'WIN' | 'LOSS' | 'BE'>('WIN');

  // Estado para controlar la confirmación de borrado individual
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTrade) {
      const profit = selectedTrade.profit || 0;
      setTradeAmount(Math.abs(profit).toFixed(2));
      if (profit > 0) setTradeResult('WIN');
      else if (profit < 0) setTradeResult('LOSS');
      else setTradeResult('BE');
    }
  }, [selectedTrade]);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleAnalyze = async (tradeToProcess?: PendingTrade) => {
    const textToAnalyze = input.trim();
    if (!textToAnalyze && !tradeToProcess) return;
    setLoading(true);
    try {
      const result: any = await geminiService.analyzeTrade(textToAnalyze || `Operación en ${tradeToProcess?.symbol || 'MT5'}`, rules, stats);
      setFeedback(result.feedback);
      setAnalysis({ followed: result.followedRules, broken: result.brokenRules });
      const isQuotaError = result.feedback.includes('MAESTRO EN MEDITACIÓN') || result.feedback.includes('cuota');
      const brokenCount = result.brokenRules?.length || 0;
      const followedCount = result.followedRules?.length || 0;
      const healthDamage = isQuotaError ? 0 : brokenCount * 15;
      const xpGain = isQuotaError ? 10 : (followedCount * 50 + (tradeToProcess ? 50 : 0)); 
      onUpdateStats({
        totalTrades: stats.totalTrades + (tradeToProcess?.is_closed ? 0 : 1),
        disciplinedTrades: stats.disciplinedTrades + (!isQuotaError && brokenCount === 0 ? 1 : 0),
        health: Math.max(0, stats.health - healthDamage),
        xp: stats.xp + xpGain
      });
      if (tradeToProcess) await supabaseService.markTradeAsProcessed(tradeToProcess.id);
      setShowResultForm(true);
    } catch (err: any) {
      alert("Error de conexión. Intenta archivar directamente.");
      setShowResultForm(true);
      setFeedback("El Dojo está en silencio. Confía en tu propia disciplina.");
    } finally {
      setLoading(false);
    }
  };

  const saveFinalResult = () => {
    if (!selectedTrade) return;
    const profit = parseFloat(tradeAmount) || 0;
    const amount = tradeResult === 'LOSS' ? -Math.abs(profit) : profit;
    const tradeId = selectedTrade.id;

    onUpdateHistory({
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticket: selectedTrade.ticket,
      timestamp: Date.now(),
      symbol: selectedTrade.symbol,
      tradeType: (selectedTrade.trade_type as 'BUY' | 'SELL') || undefined,
      lots: selectedTrade.lots,
      setupDescription: input,
      rulesFollowed: analysis?.followed || [],
      rulesBroken: analysis?.broken || [],
      feedback: feedback || '',
      profit: amount,
      result: tradeResult
    });

    onUpdateStats({
      totalPnL: stats.totalPnL + (selectedTrade.is_closed ? 0 : amount),
      winRate: Math.round(((history.filter(h => h.result === 'WIN').length + (tradeResult === 'WIN' ? 1 : 0)) / (stats.totalTrades + 1 || 1)) * 100)
    });

    onRemovePendingTrade(tradeId);
    supabaseService.markTradeAsProcessed(tradeId);
    setShowResultForm(false);
    setFeedback(null);
    setSelectedTrade(null);
    setInput('');
  };

  // FUNCIÓN DE BORRADO INFALIBLE: Sin window.confirm
  const handleHistoryDelete = (e: React.MouseEvent, item: TradeSession) => {
    e.preventDefault();
    e.stopPropagation();

    const itemId = item.id || String(item.timestamp);

    if (confirmingDeleteId === itemId) {
      // Segundo clic: Ejecutar borrado real
      const newHistory = history.filter(h => {
        const hId = h.id || String(h.timestamp);
        return hId !== itemId;
      });
      onSetHistory(newHistory);
      setConfirmingDeleteId(null);
    } else {
      // Primer clic: Activar confirmación visual
      setConfirmingDeleteId(itemId);
      // Resetear confirmación tras 3 segundos si no se pulsa de nuevo
      setTimeout(() => setConfirmingDeleteId(null), 3000);
    }
  };

  const dismissPendingTrade = async (e: React.MouseEvent, tradeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    onRemovePendingTrade(tradeId);
    await supabaseService.markTradeAsProcessed(tradeId);
  };

  const clearAllHistory = () => {
    if (window.confirm('⚠️ ¿BORRAR TODO EL HISTORIAL?')) {
      onSetHistory([]);
    }
  };

  const openTrades = pendingTrades.filter(t => !t.is_closed);
  const closedTrades = pendingTrades.filter(t => t.is_closed);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Radar MT5 Section */}
      {(entryMode === EntryMode.AUTOMATIC || pendingTrades.length > 0) && !showResultForm && (
        <div className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
              Radar MetaTrader 5
              {pendingTrades.length > 0 && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>}
            </h3>
            <div className="flex gap-4">
               <button onClick={onOpenSetup} className="text-[9px] font-black text-slate-500 hover:text-indigo-400 transition-colors uppercase">EA Setup</button>
               <button onClick={handleRefresh} disabled={isRefreshing} className="text-slate-500 hover:text-emerald-400 transition-colors">
                <i className={`fa-solid fa-arrows-rotate ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`}></i>
              </button>
            </div>
          </div>
          
          {/* Trades Activos */}
          {openTrades.length > 0 && (
            <div className="space-y-3">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-2">En Curso ({openTrades.length})</p>
              {openTrades.map(trade => (
                <div key={trade.id} onClick={() => { setSelectedTrade(trade); setInput(`Operación activa en ${trade.symbol}...`); }}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group/trade ${selectedTrade?.id === trade.id ? 'bg-indigo-600/20 border-indigo-500 shadow-lg' : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600'}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${trade.trade_type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {trade.trade_type}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200">{trade.symbol}</p>
                        <span className="text-[7px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full font-black border border-indigo-500/30 uppercase tracking-widest">FLOTANTE</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-sm font-black ${trade.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => dismissPendingTrade(e, trade.id)}
                        className="p-2 text-slate-600 hover:text-rose-500 transition-all bg-slate-900/50 rounded-lg"
                      >
                        <i className="fa-solid fa-trash-can text-xs"></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Historial Detectado */}
          {closedTrades.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Sincronizado de MT5 ({closedTrades.length})</p>
                <p className="text-[7px] text-slate-600 font-bold uppercase">Click para registrar</p>
              </div>
              <div className="max-h-64 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {closedTrades.map(trade => (
                  <div key={trade.id} onClick={() => { setSelectedTrade(trade); setInput(`Sincronización de trade finalizado en ${trade.symbol}.`); }}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex justify-between items-center group/trade ${selectedTrade?.id === trade.id ? 'bg-emerald-600/20 border-emerald-500 shadow-lg' : 'bg-slate-800/20 border-slate-700/50 hover:border-emerald-900/40'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[9px] ${trade.trade_type === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {trade.trade_type}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 text-xs">{trade.symbol}</p>
                        <p className="text-[7px] text-slate-500 uppercase font-bold">Ticket: {trade.ticket}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-xs font-black ${trade.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
                        </p>
                      </div>
                      <button 
                        onClick={(e) => dismissPendingTrade(e, trade.id)}
                        className="p-1.5 text-slate-600 hover:text-rose-500 transition-all bg-slate-900/50 rounded-lg"
                      >
                        <i className="fa-solid fa-trash-can text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Formulario de Análisis */}
      {!showResultForm ? (
        <div className="bg-slate-800/50 p-6 rounded-[2.5rem] border border-slate-700/50 shadow-xl">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-bold flex items-center gap-2 text-white">
              <i className="fa-solid fa-pen-nib text-indigo-400 text-sm"></i>
              {selectedTrade ? `Crónica de ${selectedTrade.symbol}` : 'Registro Manual'}
            </h2>
          </div>
          {selectedTrade ? (
            <>
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="¿Seguiste el plan? Cuéntale al maestro..."
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-3xl p-5 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none mb-4 transition-all text-sm leading-relaxed"
              />
              <button 
                onClick={() => handleAnalyze(selectedTrade || undefined)}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-black py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em]"
              >
                {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : 'VALIDAR CON KARMA'}
              </button>
            </>
          ) : (
            <div className="text-center py-4 text-slate-500 border-2 border-dashed border-slate-700 rounded-3xl">
               <i className="fa-solid fa-satellite mb-2 block text-indigo-500/30 text-2xl"></i>
               <p className="text-[10px] font-bold uppercase tracking-widest px-4">Selecciona un trade del radar para archivarlo en tu historial.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800 p-8 rounded-[2.5rem] border-2 border-emerald-500/30 animate-slideUp shadow-2xl">
          <div className="mb-6 bg-slate-900/50 p-5 rounded-3xl border border-indigo-500/20">
            <p className="text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">Veredicto</p>
            <p className={`text-xs italic leading-relaxed ${feedback?.includes('MAESTRO') ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
              "{feedback}"
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setTradeResult('WIN')} className={`py-4 rounded-2xl font-black text-[10px] transition-all ${tradeResult === 'WIN' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>WIN</button>
              <button onClick={() => setTradeResult('LOSS')} className={`py-4 rounded-2xl font-black text-[10px] transition-all ${tradeResult === 'LOSS' ? 'bg-rose-500 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>LOSS</button>
              <button onClick={() => setTradeResult('BE')} className={`py-4 rounded-2xl font-black text-[10px] transition-all ${tradeResult === 'BE' ? 'bg-slate-700 text-white shadow-lg' : 'bg-slate-900 text-slate-500'}`}>B.E.</button>
            </div>

            <div className="bg-slate-900/50 p-6 rounded-[2rem] border border-slate-700 text-center">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Resultado Final</p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black">$</span>
                <input type="number" value={tradeAmount} onChange={(e) => setTradeAmount(e.target.value)}
                  className="w-full bg-transparent text-white text-4xl font-black text-center focus:outline-none"
                />
              </div>
            </div>

            <button onClick={saveFinalResult} className="w-full bg-white text-slate-900 font-black py-5 rounded-2xl shadow-xl hover:bg-slate-100 transition-all uppercase tracking-[0.2em] text-xs">
              ARCHIVAR EN EL DIARIO
            </button>
          </div>
        </div>
      )}

      {/* Registro de Crónicas */}
      <div className="pt-4 pb-10">
        <div className="flex justify-between items-center mb-4 px-2">
           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Registro de Crónicas</h3>
           {history.length > 0 && (
              <button 
                onClick={clearAllHistory}
                className="text-[8px] font-black text-rose-500 hover:text-rose-400 transition-colors uppercase border border-rose-500/20 px-2 py-1 rounded-md"
              >
                Limpiar Diario
              </button>
           )}
        </div>
        <div className="space-y-3">
          {history.map(h => {
            const itemId = h.id || String(h.timestamp);
            const isConfirming = confirmingDeleteId === itemId;

            return (
              <div key={itemId} className="p-5 bg-slate-800/30 rounded-[2rem] border border-slate-700/50 flex justify-between items-center transition-all hover:bg-slate-800/50 group animate-fadeIn">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-inner ${h.result === 'WIN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : h.result === 'LOSS' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-slate-700/20 text-slate-400'}`}>
                    <i className={`fa-solid ${h.result === 'WIN' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-200 group-hover:text-white transition-colors">{h.symbol || 'Manual'}</p>
                      <span className={`text-[7px] font-black uppercase tracking-widest ${h.tradeType === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}`}>{h.tradeType || ''}</span>
                    </div>
                    <p className="text-[9px] text-slate-600 font-bold uppercase">{new Date(h.timestamp).toLocaleDateString()} {h.ticket ? `• T: ${h.ticket}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`font-black text-xl block leading-none ${h.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {h.profit >= 0 ? '+' : ''}{h.profit.toFixed(2)}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => handleHistoryDelete(e, h)}
                    className={`p-4 transition-all rounded-xl border flex items-center justify-center w-12 h-12 ${isConfirming ? 'bg-rose-600 text-white border-rose-400 scale-110 shadow-lg shadow-rose-900/40' : 'bg-slate-900/40 text-slate-500 border-slate-700/50 hover:text-rose-500 hover:scale-110 active:scale-95'}`}
                    aria-label="Eliminar crónica"
                  >
                    {isConfirming ? <i className="fa-solid fa-check text-sm"></i> : <i className="fa-solid fa-trash-can text-sm"></i>}
                  </button>
                </div>
              </div>
            );
          })}
          {history.length === 0 && (
            <div className="text-center py-10 bg-slate-800/20 rounded-[2.5rem] border border-dashed border-slate-700/50">
              <i className="fa-solid fa-box-open text-slate-700 text-3xl mb-3 block"></i>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No hay registros en tu diario</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TradingSession;
