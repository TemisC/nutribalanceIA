import { Request, Response } from 'express';
import { deductUserTokens } from '../models/userModel';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Webhooks (Using environment variables for security)
const CHAT_NUTRITION_URL = process.env.CHAT_NUTRITION_URL || 'https://n8n.miwebsiteonline.com/webhook/f4501365-0497-4158-9abe-c4fba2ab60e1/chat';
const CHAT_TRAINER_URL = process.env.CHAT_TRAINER_URL || 'https://n8n.miwebsiteonline.com/webhook/d4526618-41f9-4847-a2df-991fac2f5c8c/chat';

export const handleChatMessage = async (req: Request, res: Response) => {
    try {
        const { message, mode, history, biometrics, context } = req.body;
        // userId comes from auth middleware
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // 1. Deduct Tokens (5 tokens per message)
        const cost = 5;
        const hasBalance = await deductUserTokens(userId, cost);

        if (!hasBalance) {
            return res.status(403).json({ message: 'Fondos insuficientes (Tokens)' });
        }

        // 2. Select Webhook
        const targetUrl = mode === 'trainer' ? CHAT_TRAINER_URL : CHAT_NUTRITION_URL;

        // 3. Call n8n
        // We reconstruct the payload to match what n8n expects
        const n8nPayload = {
            chatInput: message,
            message,
            history,
            biometrics,
            sessionId: context?.sessionId || `session-${userId}`,
            context
        };

        const response = await axios.post(targetUrl, n8nPayload);

        // 4. Return result
        // n8n returns various formats, we pass it through for the frontend service to handle parsing
        res.json(response.data);

    } catch (error) {
        console.error('Chat Proxy Error:', error);
        res.status(500).json({ message: 'Error procesando el chat o conexión con IA' });
    }
};
// Food Analysis
const FOOD_ANALYSIS_URL = process.env.FOOD_ANALYSIS_URL || 'https://n8n.miwebsiteonline.com/webhook/analisis_de_platos_de_comida';

export const handleFoodAnalysis = async (req: Request, res: Response) => {
    try {
        const { image, prompt } = req.body;
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // 1. Deduct Tokens (20 tokens per analysis as requested)
        const cost = 20;
        const hasBalance = await deductUserTokens(userId, cost);

        if (!hasBalance) {
            return res.status(403).json({ message: 'Fondos insuficientes (20 Tokens requeridos)' });
        }

        // 2. Call n8n
        const n8nPayload = {
            image, // Base64 image
            prompt: prompt || 'Analiza plato. JSON: {foodName, calories, protein, carbs, fats, suggestions[]}. Español.'
        };

        const response = await axios.post(FOOD_ANALYSIS_URL, n8nPayload, {
            timeout: 300000, // 5 minutes timeout to avoid 502 on slow N8N
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        // 3. Return result
        res.json(response.data);

    } catch (error: any) {
        console.error('Food Analysis Proxy Error:', error.message);
        if (error.response) {
            console.error('N8N Status:', error.response.status);
            console.error('N8N Data:', error.response.data);

            if (error.response.status === 413) {
                return res.status(413).json({ message: 'La imagen es demasiado grande para procesar. Intenta con una más pequeña.' });
            }
        }
        res.status(500).json({ message: 'Error procesando el análisis de comida (Posible timeout o error de IA)' });
    }
};

// Meal Plan Generation
const MEAL_PLAN_WEBHOOK_URL = process.env.MEAL_PLAN_WEBHOOK_URL || 'https://n8n.miwebsiteonline.com/webhook/plan_aliment_semanal';
const COACH_MEAL_PLAN_WEBHOOK_URL = process.env.COACH_MEAL_PLAN_WEBHOOK_URL || 'https://n8n.miwebsiteonline.com/webhook/planes-coaches-470e-9cf9';

export const handleMealPlan = async (req: Request, res: Response) => {
    try {
        const { biometrics, favorites, sessionId, clientContext } = req.body;
        const userId = req.user?.id;

        console.log("[DEBUG] Meal Plan Request Body Keys:", Object.keys(req.body));
        console.log("[DEBUG] clientContext received:", clientContext ? "YES" : "NO");

        if (!userId) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        // 1. Deduct Tokens (10 for Coaches, 50 for Clients)
        const cost = clientContext ? 10 : 50;
        const hasBalance = await deductUserTokens(userId, cost);

        if (!hasBalance) {
            return res.status(403).json({ message: `Fondos insuficientes (${cost} Tokens requeridos)` });
        }

        // 2. Select Webhook URL
        const targetUrl = clientContext ? COACH_MEAL_PLAN_WEBHOOK_URL : MEAL_PLAN_WEBHOOK_URL;
        console.log(`[MealPlan] Selected Webhook: ${clientContext ? 'COACH (Optimized)' : 'STANDARD'}`);
        console.log("[MealPlan] Target URL:", targetUrl);

        let finalPlan: any = {};

        // 3. PARALLEL EXECUTION STRATEGY (Only for Coaches)
        if (clientContext) {
            console.log("[MealPlan] Executing PARALLEL generation for Coach (7 days)...");
            const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

            // BATCHING STRATEGY TO AVOID RATE LIMITS (429)
            // Gemini Flash has low concurrency limits on free tier. 
            // We split 7 days into chunks of 3.
            const chunkSize = 3;
            const results: any[] = [];

            for (let i = 0; i < daysOfWeek.length; i += chunkSize) {
                const batchDays = daysOfWeek.slice(i, i + chunkSize);
                console.log(`[MealPlan] Processing Batch ${i / chunkSize + 1}: ${batchDays.join(', ')}`);

                const batchPromises = batchDays.map(async (day) => {
                    // Clone payload
                    const dailyPayload = JSON.parse(JSON.stringify({
                        biometrics,
                        favorites,
                        sessionId: sessionId || `session-${userId}`,
                        clientContext
                    }));

                    // INJECT STRICT INSTRUCTION FOR THIS DAY
                    dailyPayload.favorites += ` . \n\n --- INSTRUCCIÓN CRÍTICA DE SISTEMA --- \n GENERAR SOLAMENTE EL DÍA: ${day}. \n NO generar ningún otro día. \n OMITIR introducción y conclusiones. JSON PURO del día ${day}.`;

                    // Also inject into context just in case user updates prompt to use it
                    dailyPayload.clientContext.targetDay = day;

                    console.log(`[MealPlan] Requesting Day: ${day}...`);

                    try {
                        const response = await axios.post(targetUrl, dailyPayload, {
                            timeout: 600000,
                            maxBodyLength: Infinity,
                            maxContentLength: Infinity
                        });

                        // Parse this day's JSON
                        const dayData = parseN8NResponse(response.data);

                        // Normalize to DayPlan object
                        let dayPlan = null;
                        if (dayData.days && Array.isArray(dayData.days) && dayData.days.length > 0) {
                            dayPlan = dayData.days[0];
                        } else if (dayData.meals) {
                            dayPlan = dayData;
                            dayPlan.day = day;
                        }

                        if (!dayPlan || !dayPlan.meals) {
                            console.error(`[MealPlan] Invalid structure for day ${day}:`, JSON.stringify(dayData).substring(0, 100));
                            throw new Error(`Invalid structure for ${day}`);
                        }

                        return dayPlan;
                    } catch (err: any) {
                        console.error(`[MealPlan] Error generating ${day}:`, err.message);
                        // If one day fails, try to return a null placeholder or rethrow?
                        // Rethrowing kills the whole batch. 
                        throw err;
                    }
                });

                // Wait for this batch
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);

                // Small delay between batches to be nice to the API
                if (i + chunkSize < daysOfWeek.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                }
            }

            // Merge results into WeeklyPlan
            finalPlan = {
                id: uuidv4(),
                userId: clientContext.clientName || "CoachClient",
                startDate: new Date().toISOString().split('T')[0],
                days: results, // Array of 7 day objects
                metadata: {
                    createdAt: new Date().toISOString()
                }
            };

            console.log("[MealPlan] Parallel generation complete. Days generated:", results.length);

        } else {
            // STANDARD SERIAL EXECUTION (Clients)
            const n8nPayload = {
                biometrics,
                favorites,
                sessionId: sessionId || `session-${userId}`,
                clientContext
            };

            console.log("[MealPlan] Executing STANDARD serial generation...");
            const response = await axios.post(targetUrl, n8nPayload, {
                timeout: 600000,
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });

            finalPlan = parseN8NResponse(response.data);

            // Fix ID
            finalPlan.id = uuidv4();
            if (!finalPlan.metadata) finalPlan.metadata = {};
            finalPlan.metadata.createdAt = new Date().toISOString();
        }

        // Return the robustly formed plan
        res.json(finalPlan);

    } catch (error: any) {
        console.error('Meal Plan Proxy Error:', error);
        if (error.response) console.error('n8n Status:', error.response.status);

        if (error instanceof SyntaxError) {
            return res.status(502).json({ message: 'La IA generó una respuesta inválida (JSON roto).' });
        }

        const errorMessage = error.message || 'Error desconocido';
        res.status(500).json({ message: `Error generando el plan de comidas: ${errorMessage}` });
    }
};

/**
 * Helper to parse loose JSON responses from N8N/LLMs
 */
function parseN8NResponse(data: any): any {
    let rawOutput = "";

    if (!data) throw new Error("Recibida data vacía de n8n");

    if (Array.isArray(data) && data.length > 0) {
        const firstItem = data[0];
        if (firstItem.output) rawOutput = typeof firstItem.output === 'string' ? firstItem.output : JSON.stringify(firstItem.output);
        else if (firstItem.json) rawOutput = JSON.stringify(firstItem.json);
        else if (firstItem.text) rawOutput = firstItem.text;
        else rawOutput = JSON.stringify(firstItem);
    } else if (typeof data === 'object') {
        if (data.output) rawOutput = typeof data.output === 'string' ? data.output : JSON.stringify(data.output);
        else rawOutput = JSON.stringify(data);
    } else {
        rawOutput = String(data);
    }

    let jsonString = "";
    const jsonBlockMatch = rawOutput.match(/```json([\s\S]*?)```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
        jsonString = jsonBlockMatch[1].trim();
    } else {
        const startIndex = rawOutput.indexOf('{');
        const endIndex = rawOutput.lastIndexOf('}');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            jsonString = rawOutput.substring(startIndex, endIndex + 1);
        } else {
            jsonString = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        }
    }

    return JSON.parse(jsonString);
}
