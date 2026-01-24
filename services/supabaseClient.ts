
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sspwzpbxqnmecnoiuixx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcHd6cGJ4cW5tZWNub2l1aXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMDIxMzcsImV4cCI6MjA4NDY3ODEzN30.mIi2iqQmCt17LePCJZmS6gKwoK-JPoVjMUnsf8O0frg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const isNetworkError = (err: any) => {
  const msg = (err?.message || String(err)).toLowerCase();
  return msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch');
};

export const supabaseService = {
  async signUp(email: string, password: string) {
    return await supabase.auth.signUp({ email, password });
  },

  async signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  async saveAppState(userId: string, state: any) {
    if (!userId) return { error: 'No User ID' };

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({ 
          id: userId, 
          stats: state.stats, 
          rules: state.rules, 
          history: state.history,
          entry_mode: state.settings.entryMode,
          updated_at: new Date().toISOString() 
        });
      
      if (error) throw error;
      return { data, error: null };
    } catch (err: any) {
      if (isNetworkError(err)) throw new Error("NETWORK_BLOCKED");
      return { data: null, error: err };
    }
  },

  async loadAppState(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    } catch (err: any) {
      return null;
    }
  },

  async getPendingTrades(userId: string) {
    try {
      // Solo traemos trades no procesados. 
      // Al usar DELETE en el cliente, esta lista se mantendrá limpia.
      const { data, error } = await supabase
        .from('pending_trades')
        .select('*')
        .eq('user_id', userId)
        .eq('processed', false)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      if (isNetworkError(err)) throw new Error("NETWORK_BLOCKED");
      return [];
    }
  },

  async markTradeAsProcessed(tradeId: string) {
    try {
      // Cambiamos UPDATE por DELETE para que el EA no pueda resucitar el trade
      // mediante la restricción de unicidad.
      const { error } = await supabase
        .from('pending_trades')
        .delete()
        .eq('id', tradeId);
      
      if (error) throw error;
      return true;
    } catch (err) {
      console.error("Error al borrar trade pendiente:", err);
      return false;
    }
  },

  getProjectCredentials() {
    return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
  }
};
