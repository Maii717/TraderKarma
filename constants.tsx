
import { RuleType, TradingRule, UserStats } from './types';

export const INITIAL_STATS: UserStats = {
  username: 'Ninja del Mercado',
  xp: 0,
  level: 1,
  streak: 0,
  health: 100,
  totalTrades: 0,
  disciplinedTrades: 0,
  totalPnL: 0,
  winRate: 0,
  accountBalance: 0,
  startingBalance: 0,
  equity: 0,
};

export const DEFAULT_RULES: TradingRule[] = [
  {
    id: 'rule-1',
    title: 'Stop Loss Obligatorio',
    description: 'Nunca entrar a un trade sin un stop loss definido.',
    type: RuleType.RISK,
    isActive: true,
  },
  {
    id: 'rule-2',
    title: 'Máximo 2 Trades/Día',
    description: 'Evitar el overtrading limitando las operaciones diarias.',
    type: RuleType.GENERAL,
    isActive: true,
  },
  {
    id: 'rule-3',
    title: 'Sin Revenge Trading',
    description: 'Si pierdo un trade, espero 1 hora antes de volver a mirar la gráfica.',
    type: RuleType.PSYCHOLOGY,
    isActive: true,
  },
  {
    id: 'rule-4',
    title: 'Confirmación Estratégica',
    description: 'Solo entrar si se cumplen al menos 3 de mis criterios técnicos.',
    type: RuleType.STRATEGY,
    isActive: true,
  }
];

export const MENTOR_SYSTEM_PROMPT = `
Eres "Karma", un mentor de trading cínico pero sabio. Tu objetivo es la DISCIPLINA.
Analiza si el usuario siguió sus reglas basándote en su descripción y los datos técnicos.
Si el usuario sigue las reglas, felicítalo. Si no, repréndelo duramente.
Usa un tono místico pero pragmático.
`;
