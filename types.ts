
export enum RuleType {
  RISK = 'RISK',
  PSYCHOLOGY = 'PSYCHOLOGY',
  STRATEGY = 'STRATEGY',
  GENERAL = 'GENERAL'
}

export enum EntryMode {
  MANUAL = 'MANUAL',
  AUTOMATIC = 'AUTOMATIC'
}

export interface TradingRule {
  id: string;
  title: string;
  description: string;
  type: RuleType;
  isActive: boolean;
}

export interface UserStats {
  username: string;
  xp: number;
  level: number;
  streak: number;
  health: number;
  totalTrades: number;
  disciplinedTrades: number;
  totalPnL: number;
  winRate: number;
  accountBalance: number;
  startingBalance: number;
  equity: number;
}

export interface PendingTrade {
  id: string;
  ticket: number;
  symbol: string;
  trade_type: 'BUY' | 'SELL' | 'SYNC';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  lots: number;
  profit: number;
  is_closed: boolean;
  timestamp: string;
  meta_data?: {
    win_rate: number;
    total_trades: number;
    balance: number;
    equity: number;
    total_pnl: number;
    initial_deposit: number; // Nuevo: Calculado por el EA
  };
}

export interface TradeSession {
  id: string;
  ticket?: number;
  timestamp: number;
  symbol: string;
  tradeType?: 'BUY' | 'SELL';
  lots?: number;
  setupDescription: string;
  rulesFollowed: string[];
  rulesBroken: string[];
  feedback: string;
  profit: number;
  result: 'WIN' | 'LOSS' | 'BE';
}

export interface AppState {
  stats: UserStats;
  rules: TradingRule[];
  history: TradeSession[];
  settings: {
    entryMode: EntryMode;
    dojoKey: string;
  };
  pendingTrades: PendingTrade[];
}
