
import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { EstimationResult, ConstructionCategory, MarketPriceList } from "../types";

const MARKET_CACHE_EXPIRY = 60 * 60 * 1000; 
const ESTIMATE_CACHE_EXPIRY = 2 * 60 * 60 * 1000;
const IMAGE_CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000;

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache = {
  set: <T>(key: string, data: T) => {
    try {
      localStorage.setItem(`ajay_v4_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
      console.warn("Cache storage quota full.");
    }
  },
  get: <T>(key: string, expiry: number): T | null => {
    const raw = localStorage.getItem(`ajay_v4_${key}`);
    if (!raw) return null;
    try {
      const item: CacheItem<T> = JSON.parse(raw);
      if (Date.now() - item.timestamp > expiry) return null;
      return item.data;
    } catch (e) { return null; }
  },
  generateKey: (prefix: string, obj: any) => {
    const cleanObj = { ...obj };
    delete cleanObj.clientName; 
    delete cleanObj.clientPhone;
    return `${prefix}_${JSON.stringify(cleanObj).replace(/\s+/g, '')}`;
  }
};

/**
 * Robust retry utility with exponential backoff.
 * Retries on 5xx (Server Unavailable/Demand Spikes) and 429 (Rate Limit).
 */
async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1500): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.error?.code;
      
      // Retry for server errors (500, 503, etc.) or rate limits (429)
      if ((status >= 500 && status <= 599) || status === 429) {
        const delay = baseDelay * Math.pow(2, i);
        console.warn(`Gemini API busy (Status: ${status}). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      // For other errors (4xx client errors), throw immediately
      throw err;
    }
  }
  throw lastError;
}

let activeChat: Chat | null = null;

export const startAssistantChat = () => {
  // Use gemini-flash-lite-latest as per aliases guidelines
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  activeChat = ai.chats.create({
    model: 'gemini-flash-lite-latest',
    config: {
      systemInstruction: `You are the Virtual Site Engineer for Ajay Infra, Hyderabad. 
      You are an expert in construction materials (UltraTech, Vizag Steel, Ashirvad pipes, Asian Paints).
      Your tone is professional, helpful, and localized to Hyderabad (mentioning areas like Madhapur, Gachibowli, Troop Bazar).
      If the user asks for a price, refer to current 2026 market trends. 
      Always encourage the user to generate a 'Professional Quote' using the tools on the left if they need exact numbers.`,
    },
  });
  return activeChat;
};

export const sendMessageToAssistant = async (message: string) => {
  if (!activeChat) startAssistantChat();
  // Streaming requests are retried differently; for now, we rely on the lite model's stability.
  const response = await activeChat!.sendMessageStream({ message });
  return response;
};

export const getConstructionEstimate = async (
  category: ConstructionCategory,
  inputs: Record<string, any>
): Promise<EstimationResult> => {
  const cacheKey = cache.generateKey('est_ledger', { category, ...inputs });
  const cachedData = cache.get<EstimationResult>(cacheKey, ESTIMATE_CACHE_EXPIRY);
  if (cachedData) return cachedData;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  const prompt = `Act as a Senior Construction Estimator for Hyderabad (Jan 2026 Index).
  Provide a detailed Bill of Materials (BOM) for the task: ${category}.
  User Inputs: ${JSON.stringify(inputs)}.
  Enforce Brand usage: Ashirvad for plumbing, Goldmedal/Finolex for electrical, Asian Paints for finishing.
  Return strictly as JSON. Ensure prices reflect the current 2026 market trends in Hyderabad.`;

  try {
    // FIX: Added explicit generic type GenerateContentResponse to retryWithBackoff to ensure 'response' is correctly typed.
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            materials: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  unitPrice: { type: Type.NUMBER },
                  totalPrice: { type: Type.NUMBER },
                  brandSuggestion: { type: Type.STRING }
                },
                required: ["name", "quantity", "unitPrice", "totalPrice"]
              }
            },
            laborCost: { type: Type.NUMBER },
            estimatedDays: { type: Type.NUMBER },
            precautions: { type: Type.ARRAY, items: { type: Type.STRING } },
            totalEstimatedCost: { type: Type.NUMBER },
            expertTips: { type: Type.STRING },
            visualPrompt: { type: Type.STRING }
          },
          required: ["category", "materials", "totalEstimatedCost", "laborCost", "estimatedDays", "visualPrompt"]
        }
      }
    }));

    // FIX: Using .text property instead of method as per GenAI SDK guidelines
    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from AI model.");
    const result = JSON.parse(text);
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Gemini Content Error after retries:", error);
    throw new Error("The estimation service is currently under heavy load. Please try again in a few minutes.");
  }
};

export const generateDesignImage = async (category: string, visualPrompt: string): Promise<string | null> => {
  const categoryCacheKey = `img_cat_${category}`;
  const cachedImg = cache.get<string>(categoryCacheKey, IMAGE_CACHE_EXPIRY);
  if (cachedImg) return cachedImg;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  try {
    // FIX: Added explicit generic type GenerateContentResponse to retryWithBackoff to ensure 'response' is correctly typed.
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High-quality architect render for ${category}: ${visualPrompt}. Realistic materials, photorealistic.` }]
      },
      config: { imageConfig: { aspectRatio: "16:9" } }
    }));
    
    // FIX: response is now typed as GenerateContentResponse, allowing access to candidates property
    const candidates = response.candidates;
    const imagePart = candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const base64 = imagePart?.inlineData?.data;
    
    if (base64) {
      const dataUrl = `data:image/png;base64,${base64}`;
      cache.set(categoryCacheKey, dataUrl);
      return dataUrl;
    }
  } catch (e) { 
    console.error("Gemini Image Error after retries:", e);
  }
  return null;
};

export const getRawMaterialPriceList = async (): Promise<MarketPriceList> => {
  const cachedMarket = cache.get<MarketPriceList>('market_prices', MARKET_CACHE_EXPIRY);
  if (cachedMarket) return cachedMarket;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  try {
    // FIX: Added explicit generic type GenerateContentResponse to retryWithBackoff to ensure 'response' is correctly typed.
    const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Current 2026 Construction Market Price Index for Hyderabad (Cement, Steel, Tiles, Plumbing, Electrical).",
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lastUpdated: { type: Type.STRING },
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        category: { type: Type.STRING },
                        brandName: { type: Type.STRING },
                        specificType: { type: Type.STRING },
                        priceWithGst: { type: Type.NUMBER },
                        unit: { type: Type.STRING },
                        trend: { type: Type.STRING }
                      }
                    }
                  }
                }
              }
            }
          },
          required: ["lastUpdated", "categories"]
        }
      }
    }));
    
    // FIX: Using .text property instead of method as per GenAI SDK guidelines
    const text = response.text?.trim();
    if (!text) throw new Error("Empty response from market API.");
    const result = JSON.parse(text);
    cache.set('market_prices', result);
    return result;
  } catch (error) {
    console.error("Gemini Market Error after retries:", error);
    // Return a safe local fallback if the API is completely down
    return {
      lastUpdated: new Date().toISOString(),
      categories: [
        { 
          title: "Critical Basics (Offline Data)", 
          items: [
            { category: "Basics", brandName: "UltraTech", specificType: "PPC Cement", priceWithGst: 415, unit: "bag", trend: "stable" },
            { category: "Basics", brandName: "Vizag Steel", specificType: "12mm TMT", priceWithGst: 72400, unit: "ton", trend: "stable" }
          ] 
        }
      ]
    };
  }
};
