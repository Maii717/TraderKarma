
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import DojoDashboard from './components/DojoDashboard';
import TradingSession from './components/TradingSession';
import RulesEditor from './components/RulesEditor';
import Auth from './components/Auth';
import { AppState, EntryMode, TradeSession, UserStats } from './types';
import { INITIAL_STATS, DEFAULT_RULES } from './constants';
import { supabase, supabaseService } from './services/supabaseClient';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  const isInitialMount = useRef(true);

  const [state, setState] = useState<AppState>({
    stats: INITIAL_STATS,
    rules: DEFAULT_RULES,
    history: [],
    settings: { entryMode: EntryMode.MANUAL, dojoKey: '' },
    pendingTrades: []
  });

  const updateStats = (newStats: Partial<UserStats>) => {
    setState(prev => ({ ...prev, stats: { ...prev.stats, ...newStats } }));
  };

  const removePendingTrade = (tradeId: string) => {
    setState(prev => ({
      ...prev,
      pendingTrades: prev.pendingTrades.filter(t => t.id !== tradeId)
    }));
  };

  const setEntryMode = (mode: EntryMode) => {
    setState(prev => ({
      ...prev,
      settings: { ...prev.settings, entryMode: mode }
    }));
  };

  const toggleRule = (id: string) => {
    setState(prev => ({
      ...prev,
      rules: prev.rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r)
    }));
  };

  const deleteRule = (id: string) => {
    setState(prev => ({
      ...prev,
      rules: prev.rules.filter(r => r.id !== id)
    }));
  };

  const refreshPendingTrades = async () => {
    if (!session?.user?.id) return;
    try {
      const pending = await supabaseService.getPendingTrades(session.user.id);
      
      if (pending) {
        const syncPackets = pending.filter((t: any) => String(t.ticket) === "0");
        if (syncPackets.length > 0) {
          const latestSync = syncPackets[0];
          setLastSync(new Date());
          if (latestSync.meta_data) {
            const meta = latestSync.meta_data;
            
            updateStats({
              winRate: typeof meta.win_rate === 'number' ? Math.round(meta.win_rate) : 0,
              totalTrades: meta.total_trades || 0,
              accountBalance: meta.balance || 0,
              equity: meta.equity || 0,
              totalPnL: meta.total_pnl || 0,
              startingBalance: meta.initial_deposit || 10000 // Usamos el cálculo matemático del EA
            });
          }
          for (const p of syncPackets) {
            await supabaseService.markTradeAsProcessed(p.id);
          }
        }
        
        const realTrades = pending.filter((t: any) => String(t.ticket) !== "0");
        setState(prev => ({ ...prev, pendingTrades: realTrades }));
      }
    } catch (err: any) {
      if (err.message === "NETWORK_BLOCKED") setSyncStatus('error');
    }
  };

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    if (session?.user?.id && syncStatus !== 'error') {
      const timeoutId = setTimeout(async () => {
        setSyncStatus('syncing');
        try {
          const { error } = await supabaseService.saveAppState(session.user.id, state);
          setSyncStatus(error ? 'error' : 'synced');
        } catch (e) {
          setSyncStatus('error');
        }
      }, 400); 
      return () => clearTimeout(timeoutId);
    }
  }, [state.stats, state.rules, state.history, state.settings.entryMode, session]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    const loadData = async () => {
      const data = await supabaseService.loadAppState(session.user.id);
      if (data) {
        const sanitizedHistory = (data.history || []).map((h: any) => ({
          ...h,
          id: h.id || `hist-${h.timestamp}-${Math.random().toString(36).substr(2, 4)}`
        }));

        setState(prev => ({
          ...prev,
          stats: { ...INITIAL_STATS, ...(data.stats || {}) },
          rules: data.rules || DEFAULT_RULES,
          history: sanitizedHistory,
          settings: {
            entryMode: (data.entry_mode as EntryMode) || EntryMode.MANUAL,
            dojoKey: session.user.id
          }
        }));
      }
      refreshPendingTrades();
    };
    loadData();
    const pollInterval = setInterval(refreshPendingTrades, 8000); 
    return () => clearInterval(pollInterval);
  }, [session]);

  const { url, key } = supabaseService.getProjectCredentials();

  const mqlCode = `// --- KarmaBridge EA v5.2 Precision Architecture ---
#property strict
input string SupabaseUrl = "${url}";
input string SupabaseKey = "${key}";
input string NinjaID     = "${session?.user?.id || 'LOGIN_REQUIRED'}";

int OnInit() { 
   Print("KARMA: EA v5.2 - Auditoría de Historial Iniciada");
   EventSetTimer(30); 
   return(INIT_SUCCEEDED); 
}

void OnTimer() { 
   SendHeartbeat(); 
   ScanActivePositions();
}

void SendHeartbeat() {
   double history_pnl = 0; int win_count = 0; int total_h_trades = 0;
   
   // Seleccionamos todo el historial para calcular el beneficio acumulado real
   if(HistorySelect(0, TimeCurrent())) {
      int deals = HistoryDealsTotal();
      for(int i=0; i<deals; i++) {
         ulong t = HistoryDealGetTicket(i);
         // Solo contamos cierres de operaciones (DEAL_ENTRY_OUT)
         if(HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_OUT) {
            double p = HistoryDealGetDouble(t, DEAL_PROFIT) + 
                      HistoryDealGetDouble(t, DEAL_COMMISSION) + 
                      HistoryDealGetDouble(t, DEAL_SWAP) +
                      HistoryDealGetDouble(t, DEAL_FEE);
            history_pnl += p; 
            total_h_trades++; 
            if(p > 0) win_count++;
         }
      }
   }
   
   // CÁLCULO MATEMÁTICO DEL DEPÓSITO INICIAL
   // Balance Actual = Depósito Inicial + Profit Neto Acumulado
   // Por tanto: Depósito Inicial = Balance Actual - Profit Neto Acumulado
   double current_balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double calculated_initial_deposit = current_balance - history_pnl;
   
   double win_rate = (total_h_trades > 0) ? ((double)win_count / total_h_trades) * 100.0 : 0;
   
   string payload = StringFormat("{\\"user_id\\":\\"%s\\",\\"ticket\\":0,\\"symbol\\":\\"SYNC\\",\\"trade_type\\":\\"SYNC\\",\\"processed\\":false,\\"meta_data\\":{\\"balance\\":%.2f,\\"equity\\":%.2f,\\"total_pnl\\":%.2f,\\"total_trades\\":%d,\\"win_rate\\":%.2f,\\"initial_deposit\\":%.2f}}", 
      NinjaID, current_balance, AccountInfoDouble(ACCOUNT_EQUITY), history_pnl, total_h_trades, win_rate, calculated_initial_deposit);
   
   SendToSupabase(payload, false);
}

void ScanActivePositions() {
   for(int i=0; i<PositionsTotal(); i++) {
      ulong t = PositionGetTicket(i);
      if(PositionSelectByTicket(t)) {
         double profit = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP) + PositionGetDouble(POSITION_COMMISSION);
         string type = (PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY) ? "BUY" : "SELL";
         SendTrade(t, PositionGetString(POSITION_SYMBOL), type, PositionGetDouble(POSITION_VOLUME), profit, false);
      }
   }
}

void SendTrade(ulong ticket, string symbol, string type, double lots, double profit, bool closed) {
   string payload = StringFormat("{\\"user_id\\":\\"%s\\",\\"ticket\\":%I64u,\\"symbol\\":\\"%s\\",\\"trade_type\\":\\"%s\\",\\"lots\\":%.2f,\\"profit\\":%.2f,\\"is_closed\\":%s,\\"processed\\":false}", 
      NinjaID, ticket, symbol, type, lots, profit, (closed?"true":"false"));
   
   SendToSupabase(payload, true);
}

void SendToSupabase(string payload, bool isUpsert) {
   string endpoint = SupabaseUrl + "/rest/v1/pending_trades";
   if(isUpsert) endpoint += "?on_conflict=user_id,ticket";
   string headers = "apikey: "+SupabaseKey+"\\r\\nAuthorization: Bearer "+SupabaseKey+"\\r\\nContent-Type: application/json\\r\\n";
   if(isUpsert) headers += "Prefer: resolution=merge-duplicates\\r\\n";
   char data[]; StringToCharArray(payload, data, 0, StringLen(payload));
   char res[]; string res_h; WebRequest("POST", endpoint, headers, 5000, data, res, res_h);
}`;

  if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest">Sincronizando Dojo...</div>;
  if (!session) return <Auth />;

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab} sessionBadgeCount={state.pendingTrades.length} syncStatus={syncStatus}>
      {activeTab === 'home' && <DojoDashboard stats={state.stats} lastSync={lastSync} />}
      {activeTab === 'session' && (
        <TradingSession 
          rules={state.rules} stats={state.stats} history={state.history}
          onUpdateStats={updateStats} 
          onUpdateHistory={(h) => setState(prev => ({...prev, history: [h, ...prev.history]}))}
          onSetHistory={(h) => setState(prev => ({...prev, history: h}))}
          onRemovePendingTrade={removePendingTrade}
          entryMode={state.settings.entryMode} pendingTrades={state.pendingTrades} 
          onRefresh={refreshPendingTrades}
          onOpenSetup={() => { setWizardStep(1); setShowWizard(true); }}
        />
      )}
      {activeTab === 'rules' && <RulesEditor rules={state.rules} onToggleRule={toggleRule} onDeleteRule={deleteRule} />}
      {activeTab === 'profile' && (
        <div className="animate-fadeIn px-2 space-y-8 pb-10">
          <div className="text-center py-6">
            <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-2xl border-4 border-slate-800">🥷</div>
            <input 
              type="text" 
              value={state.stats.username}
              onChange={(e) => updateStats({ username: e.target.value })}
              className="text-2xl font-black text-white bg-transparent text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg px-2"
            />
            <div className="bg-slate-800 inline-block px-4 py-1 rounded-full border border-slate-700 mt-2">
              <p className="text-slate-400 text-[9px] uppercase font-bold tracking-[0.1em]">Ninja ID: <span className="text-indigo-400 select-all font-mono">{session.user.id}</span></p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Modo de Diario</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setEntryMode(EntryMode.MANUAL)}
                className={`p-5 rounded-[2rem] border-2 transition-all text-left ${state.settings.entryMode === EntryMode.MANUAL ? 'bg-indigo-600/10 border-indigo-500 shadow-lg' : 'bg-slate-800/40 border-slate-700/50 opacity-60'}`}
              >
                <i className="fa-solid fa-hand-pointer text-xl mb-3 text-indigo-400"></i>
                <p className="font-bold text-white text-sm">Manual</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-1">Escribo mis trades.</p>
              </button>

              <button 
                onClick={() => setEntryMode(EntryMode.AUTOMATIC)}
                className={`p-5 rounded-[2rem] border-2 transition-all text-left ${state.settings.entryMode === EntryMode.AUTOMATIC ? 'bg-emerald-600/10 border-emerald-500 shadow-lg' : 'bg-slate-800/40 border-slate-700/50 opacity-60'}`}
              >
                <i className="fa-solid fa-bolt text-xl mb-3 text-emerald-400"></i>
                <p className="font-bold text-white text-sm">Automático</p>
                <p className="text-[10px] text-slate-400 leading-tight mt-1">Conexión con MT5.</p>
              </button>
            </div>
          </div>

          {state.settings.entryMode === EntryMode.AUTOMATIC && (
            <div className="space-y-4 animate-slideUp">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Configuración MT5</h3>
              <button 
                onClick={() => { setWizardStep(1); setShowWizard(true); }}
                className="w-full p-6 bg-slate-800/50 rounded-[2rem] border border-slate-700 flex items-center justify-between group hover:border-emerald-500/50 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                    <i className="fa-solid fa-gear"></i>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-200 text-sm">Setup de KarmaBridge</p>
                    <p className="text-[10px] text-slate-500">Ver código e instrucciones</p>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-slate-600 group-hover:text-emerald-500 transition-colors"></i>
              </button>
            </div>
          )}

          <button onClick={() => supabaseService.signOut()} className="w-full py-4 bg-slate-800 text-rose-500 rounded-2xl font-bold border border-rose-500/10 hover:bg-rose-500/5 transition-colors">
            Cerrar Sesión
          </button>
        </div>
      )}

      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/98 backdrop-blur-2xl">
          <div className="bg-slate-900 w-full max-w-lg rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-1 rounded-md uppercase tracking-widest">CONECTOR MT5</span>
                <h3 className="text-2xl font-black text-white mt-2">
                  {wizardStep === 1 ? 'KarmaBridge v5.2' : wizardStep === 2 ? 'Copiar Código' : '¡Listo!'}
                </h3>
              </div>
              <button onClick={() => setShowWizard(false)} className="text-slate-500 hover:text-white transition-colors p-2"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar text-slate-300">
              {wizardStep === 1 && (
                <div className="space-y-4 animate-fadeIn">
                  <p className="text-sm font-bold">1. Abre MetaTrader 5</p>
                  <p className="text-sm">2. Ve a <span className="text-emerald-400">Tools {'>'} MetaQuotes Language Editor</span></p>
                  <p className="text-sm">3. Crea un <span className="text-emerald-400">New Expert Advisor</span> llamado KarmaBridge</p>
                  <p className="text-sm">4. Borra todo y pega el código que te daré a continuación.</p>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="relative">
                    <pre className="bg-slate-950 p-4 rounded-xl text-[9px] font-mono text-emerald-300 overflow-x-auto max-h-64 border border-slate-700">{mqlCode}</pre>
                    <button onClick={() => {navigator.clipboard.writeText(mqlCode); alert('¡Código Copiado!');}} className="absolute bottom-4 right-4 bg-emerald-600 hover:bg-emerald-500 text-[10px] px-4 py-2 rounded-lg font-black shadow-lg">COPIAR</button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4 animate-fadeIn text-center py-10">
                   <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 text-emerald-400">
                      <i className="fa-solid fa-check text-4xl"></i>
                   </div>
                   <p className="text-sm font-bold">¡EA Configurado!</p>
                   <p className="text-xs text-slate-500">Compila el código en MT5 y arrastra el EA a cualquier gráfico. No olvides habilitar "Allow WebRequest" en las opciones de MT5.</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              {wizardStep > 1 && (
                <button onClick={() => setWizardStep(wizardStep - 1)} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest">Atrás</button>
              )}
              <button 
                onClick={() => { if(wizardStep < 3) setWizardStep(wizardStep + 1); else setShowWizard(false); }}
                className="flex-[2] py-4 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                {wizardStep === 3 ? 'FINALIZAR' : 'SIGUIENTE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
