import { BiometricData } from '../types';
import api from './api'; // Import authenticated axios instance

export const getNutritionistChat = (biometrics: BiometricData) => {
  return {
    sendMessage: async (msg: string) => {
      // Re-route to general sendChatMessage which now uses backend proxy
      return {
        text: () => sendChatMessage(msg, [], biometrics, {}, 'nutrition')
      };
    }
  };
};

// Backend Proxy for Food Analysis (Secure)
export const analyzeFoodImage = async (base64Image: string): Promise<string> => {
  try {
    const payload = {
      image: base64Image,
      prompt: 'Analiza plato. JSON: {foodName, calories, protein, carbs, fats, suggestions[]}. Español.'
    };

    // Use authorized API call to backend
    const response = await api.post('/chat/food-analysis', payload);
    const data = response.data;

    console.log("[FoodScanner] Response (via Backend):", data);

    let rawOutput = "";

    // Normalize n8n response format
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      if (firstItem.output) rawOutput = typeof firstItem.output === 'string' ? firstItem.output : JSON.stringify(firstItem.output);
      else if (firstItem.json) rawOutput = JSON.stringify(firstItem.json);
      else if (firstItem.text) rawOutput = firstItem.text;
      else rawOutput = JSON.stringify(firstItem);
    }
    else if (typeof data === 'object') {
      if (data.output) rawOutput = typeof data.output === 'string' ? data.output : JSON.stringify(data.output);
      else if (data.message) rawOutput = data.message;
      else rawOutput = JSON.stringify(data);
    } else {
      rawOutput = String(data);
    }

    // --- ROBUST JSON EXTRACTION ---
    let jsonString = "";
    let conversationalText = "";

    // 1. Try to find markdown JSON blocks
    const jsonBlockMatch = rawOutput.match(/```json([\s\S]*?)```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      jsonString = jsonBlockMatch[1].trim();
      conversationalText = rawOutput.replace(jsonBlockMatch[0], '').trim();
    } else {
      // 2. If no blocks, find the first '{' and last '}'
      const startIndex = rawOutput.indexOf('{');
      const endIndex = rawOutput.lastIndexOf('}');

      if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
        jsonString = rawOutput.substring(startIndex, endIndex + 1);
        conversationalText = (rawOutput.substring(0, startIndex) + rawOutput.substring(endIndex + 1)).trim();
      } else {
        // Fallback: assume the whole string is JSON but clean potential markdown syntax
        jsonString = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      }
    }

    try {
      const parsedData = JSON.parse(jsonString);

      // Inject conversational text if available and analysisText is missing
      if (conversationalText && !parsedData.analysisText) {
        parsedData.analysisText = conversationalText.replace(/`/g, '').trim();
      }

      return JSON.stringify(parsedData);
    } catch {
      console.warn("Returned invalid JSON, returning raw");
      return rawOutput;
    }

  } catch (error: any) {
    console.error("Food Analysis Failed:", error);
    if (error.response && error.response.status === 403) {
      throw new Error("No tienes suficientes tokens (20 requeridos).");
    }
    throw new Error(`Error en análisis: ${error.message}`);
  }
};

// Backend Proxy for Chat (Secure)
export const sendChatMessage = async (
  message: string,
  history: any[],
  biometrics: any,
  userContext: any,
  mode: 'nutrition' | 'trainer' = 'nutrition'
): Promise<string> => {
  try {
    const payload = {
      message,
      history,
      biometrics,
      context: userContext,
      mode
    };

    // Use authorized API call to backend
    const response = await api.post('/chat/message', payload);
    const data = response.data;

    console.log("Chat Response (via Backend):", data);

    let rawOutput = "";

    // Normalize n8n response format (same logic as before, just reusing what comes back from backend)
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0];
      if (firstItem.output) rawOutput = typeof firstItem.output === 'string' ? firstItem.output : JSON.stringify(firstItem.output);
      else if (firstItem.json) rawOutput = JSON.stringify(firstItem.json);
      else if (firstItem.text) rawOutput = firstItem.text;
      else rawOutput = JSON.stringify(firstItem);
    }
    else if (typeof data === 'object') {
      if (data.output) rawOutput = typeof data.output === 'string' ? data.output : JSON.stringify(data.output);
      else if (data.message) rawOutput = data.message; // some standard errors use message
      else rawOutput = JSON.stringify(data);
    } else {
      rawOutput = String(data);
    }

    // Clean Markdown
    const jsonBlockMatch = rawOutput.match(/```json([\s\S]*?)```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      rawOutput = jsonBlockMatch[1].trim();
    } else {
      rawOutput = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
    }

    try {
      const parsedResponse = JSON.parse(rawOutput);
      return parsedResponse.text || rawOutput;
    } catch (e) {
      return rawOutput;
    }

  } catch (error: any) {
    console.error("Chat Message Failed:", error);
    if (error.response && error.response.status === 403) {
      throw new Error("No tienes suficientes tokens para este mensaje.");
    }
    throw error;
  }
};

// Meal Planner Webhook (Now via Backend Proxy)
// const MEAL_PLAN_WEBHOOK_URL = 'https://n8n.miwebsiteonline.com/webhook/plan_aliment_semanal';

export const generateWeeklyPlan = async (biometrics: BiometricData, metrics: any, favoriteFoods: string, clientContext?: any): Promise<any> => {
  try {
    const payload = {
      biometrics: {
        ...biometrics,
        tdee: metrics?.tdee || 2000
      },
      favorites: (() => {
        let favs = favoriteFoods;
        if (clientContext) {
          // PROMPT INJECTION: We instruct the AI to respect the specific TDEE and Macros.
          favs += ` -- SISTEMA: ESTE ES UN PLAN PARA UN CLIENTE. `;
          favs += `META CALÓRICA EXACTA: ${metrics?.tdee || 2000} kcal (Déficit ya calculado). `;
          favs += `TU META ES LLEGAR A ESE NÚMERO. `;
          if (clientContext.macros) {
            favs += `DISTRIBUCIÓN MACROS: Proteína ${clientContext.macros.protein}%, Carbohidratos ${clientContext.macros.carbs}%, Grasas ${clientContext.macros.fats}%. `;
          }
        }
        return favs;
      })(),
      sessionId: 'user-session-' + new Date().getDate(),
      clientContext // Optional extra data for Coach generated plans
    };

    // Use authorized API call to backend (Avoids CORS, uses server-side parsing)
    console.log("[MealPlan] Requesting plan via Backend Proxy...", payload);
    const response = await api.post('/chat/meal-plan', payload);
    const data = response.data;

    console.log("[MealPlan] Plan Received:", data);
    return data; // Backend now returns the parsed clean JSON directly

  } catch (error: any) {
    console.error("Meal Plan Generation Failed:", error);
    if (error.response) {
      if (error.response.status === 403) throw new Error("No tienes suficientes tokens (50 requeridos).");
      if (error.response.status === 502) throw new Error("La IA generó una respuesta inválida. Intenta nuevamente.");
      // Propagate the actual server error message for debugging
      if (error.response.data && error.response.data.message) {
        throw new Error(error.response.data.message);
      }
    }
    throw error;
  }
};
