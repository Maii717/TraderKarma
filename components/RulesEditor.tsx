
import React, { useState } from 'react';
import { TradingRule } from '../types';

interface RulesEditorProps {
  rules: TradingRule[];
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
}

const RulesEditor: React.FC<RulesEditorProps> = ({ rules, onToggleRule, onDeleteRule }) => {
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirmingDeleteId === id) {
      onDeleteRule(id);
      setConfirmingDeleteId(null);
    } else {
      setConfirmingDeleteId(id);
      setTimeout(() => setConfirmingDeleteId(null), 3000);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-xl font-bold text-white">Tus Mandamientos</h2>
        <button className="bg-slate-800/80 p-2.5 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-slate-700/80 transition-all">
          <i className="fa-solid fa-plus text-sm"></i>
        </button>
      </div>

      <div className="space-y-4">
        {rules.map((rule) => {
          const isDeleting = confirmingDeleteId === rule.id;

          return (
            <div 
              key={rule.id}
              onClick={() => !isDeleting && onToggleRule(rule.id)}
              className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer relative group ${rule.isActive ? 'bg-slate-800 border-indigo-500/50 shadow-lg shadow-indigo-500/5' : 'bg-slate-900 border-slate-800/50 opacity-60 hover:opacity-100'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className={`font-black text-base ${rule.isActive ? 'text-white' : 'text-slate-400'}`}>{rule.title}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={(e) => handleDeleteClick(e, rule.id)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isDeleting ? 'bg-rose-600 text-white scale-110 shadow-lg shadow-rose-900/40' : 'bg-slate-900/60 text-slate-500 hover:text-rose-500 hover:bg-slate-800'}`}
                  >
                    <i className={`fa-solid ${isDeleting ? 'fa-check text-xs' : 'fa-trash-can text-xs'}`}></i>
                  </button>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${rule.isActive ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]' : 'bg-slate-800 text-slate-600'}`}>
                    {rule.isActive && <i className="fa-solid fa-check text-[10px]"></i>}
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-4">{rule.description}</p>
              
              <div className="flex justify-between items-center">
                <span className={`text-[9px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${rule.type === 'RISK' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-sky-500/10 text-sky-500 border border-sky-500/20'}`}>
                  {rule.type}
                </span>
                {isDeleting && (
                  <span className="text-[9px] font-black text-rose-500 uppercase animate-pulse">¿Confirmar borrado?</span>
                )}
              </div>
            </div>
          );
        })}

        {rules.length === 0 && (
          <div className="text-center py-16 bg-slate-800/20 rounded-[2.5rem] border border-dashed border-slate-700/50">
            <i className="fa-solid fa-scroll text-slate-700 text-4xl mb-4 block"></i>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">No has definido ningún mandamiento</p>
          </div>
        )}
      </div>

      <div className="bg-slate-800/30 p-8 rounded-[2.5rem] border border-dashed border-slate-700 text-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent"></div>
        <p className="text-slate-400 text-xs italic leading-relaxed">
          <i className="fa-solid fa-quote-left text-indigo-500/30 mr-2"></i>
          Un trader sin reglas es un gambler con suerte temporal. El mercado forja la paciencia de quien respeta sus límites.
          <i className="fa-solid fa-quote-right text-indigo-500/30 ml-2"></i>
        </p>
      </div>
    </div>
  );
};

export default RulesEditor;
