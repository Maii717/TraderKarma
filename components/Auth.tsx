
import React, { useState } from 'react';
import { supabaseService } from '../services/supabaseClient';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = isLogin 
      ? await supabaseService.signIn(email, password)
      : await supabaseService.signUp(email, password);

    if (authError) {
      setError(authError.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8 animate-fadeIn">
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center rotate-3 shadow-xl shadow-indigo-500/20 mb-6">
            <i className="fa-solid fa-k text-3xl text-white"></i>
          </div>
          <h1 className="text-4xl font-extrabold gradient-text tracking-tight mb-2">TradeKarma</h1>
          <p className="text-slate-400 font-medium">El Dojo de la Disciplina</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-6">
            {isLogin ? 'Bienvenido de nuevo, Ninja' : 'Crea tu cuenta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Email</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Contraseña</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg text-rose-400 text-sm flex items-center gap-2">
                <i className="fa-solid fa-circle-exclamation"></i>
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <i className="fa-solid fa-spinner animate-spin"></i> : <i className="fa-solid fa-bolt"></i>}
              {isLogin ? 'Entrar al Dojo' : 'Comenzar Entrenamiento'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-slate-400 hover:text-indigo-400 text-sm font-medium transition-colors"
            >
              {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
        </div>

        <p className="text-center text-slate-500 text-xs px-10 leading-relaxed">
          Al entrar, aceptas que el Maestro Karma juzgará tus trades sin piedad para forjar tu disciplina.
        </p>
      </div>
    </div>
  );
};

export default Auth;
