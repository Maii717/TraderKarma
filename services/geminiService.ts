import { GoogleGenAI, Type } from "@google/genai";
import { MENTOR_SYSTEM_PROMPT } from "../constants";
import { TradingRule } from "../types";

export class GeminiService {
  private getClient() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async analyzeTrade(
    setup: string, 
    userRules: TradingRule[], 
    stats: any
  ): Promise<{ feedback: string; followedRules: string[]; brokenRules: string[] }> {
    const ai = this.getClient();
    const activeRules = userRules.filter(r => r.isActive);
    const activeRulesText = activeRules.map(r => `- ${r.title}`).join('\n');
    
    // Reducimos el tamaño del prompt para consumir menos tokens
    const prompt = `TRADER L${stats.level}. REGLAS:\n${activeRulesText}\n\nTRADE: "${setup}"`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          systemInstruction: MENTOR_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              feedback: { type: Type.STRING },
              followedRules: { type: Type.ARRAY, items: { type: Type.STRING } },
              brokenRules: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['feedback', 'followedRules', 'brokenRules']
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("EMPTY_RESPONSE");
      
      const result = JSON.parse(text);
      
      return {
        feedback: result.feedback || "El silencio es mi respuesta.",
        followedRules: Array.isArray(result.followedRules) ? result.followedRules : [],
        brokenRules: Array.isArray(result.brokenRules) ? result.brokenRules : []
      };
    } catch (error: any) {
      console.error("Gemini Error:", error);
      
      const errorStr = JSON.stringify(error).toLowerCase();
      
      // Manejo prioritario de CUOTA (429)
      if (errorStr.includes('429') || errorStr.includes('resource_exhausted') || errorStr.includes('quota')) {
        return {
          feedback: "⚠️ MAESTRO EN MEDITACIÓN: Has agotado tu cuota gratuita de hoy. Karma volverá en 24h. Mantén la disciplina por tu cuenta mientras tanto.",
          followedRules: [],
          brokenRules: []
        };
      }

      return {
        feedback: "El Dojo está en silencio. Confía en tu propia disciplina por ahora.",
        followedRules: [],
        brokenRules: []
      };
    }
  }

  async getDailyWisdom(): Promise<string> {
    const CACHE_KEY = 'karma_wisdom_v2';
    const CACHE_TS = 'karma_wisdom_ts';
    const cached = localStorage.getItem(CACHE_KEY);
    const ts = localStorage.getItem(CACHE_TS);
    
    const now = Date.now();
    const isExpired = !ts || (now - parseInt(ts) > 86400000); // 24 horas

    if (cached && !isExpired) {
      return cached;
    }

    try {
      const ai = this.getClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: "Frase Zen de 10 palabras sobre trading.",
        config: {
          systemInstruction: "Eres un maestro Zen.",
          // Fix: Set both maxOutputTokens and thinkingConfig.thinkingBudget at the same time as per guidelines
          maxOutputTokens: 50,
          thinkingConfig: { thinkingBudget: 25 }
        }
      });
      
      const text = response.text || "La paciencia es la madre del profit.";
      localStorage.setItem(CACHE_KEY, text);
      localStorage.setItem(CACHE_TS, now.toString());
      return text;
    } catch (e: any) {
      // Si falla por cuota, devolvemos la última guardada o una por defecto sin gastar API
      return cached || "El mercado premia al que sabe esperar.";
    }
  }
}

export const geminiService = new GeminiService();