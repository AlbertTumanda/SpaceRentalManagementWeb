import { GoogleGenAI } from "@google/genai";
import { formatPHP } from "../utils";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFinancialInsights = async (
  income: number,
  expenses: number,
  expiringContracts: string
): Promise<string> => {
  try {
    const promptData = `Analyze these rental business stats:
      - Total Revenue: ${formatPHP(income)}
      - Expenses: ${formatPHP(expenses)}
      - Net Profit: ${formatPHP(income - expenses)}
      - Expiring Contracts: ${expiringContracts || 'None'}
      
      Provide 3 short, actionable financial tips or strategies. Keep it professional, concise, and formatted as bullet points.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptData,
      config: {
        systemInstruction: 'You are a professional property financial advisor.',
      }
    });

    return response.text || "No insights available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Insights currently unavailable due to network or configuration issues.";
  }
};
