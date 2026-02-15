
import { GoogleGenAI, Type } from "@google/genai";
import { EstimationResult, ConstructionCategory, MarketPriceList } from "../types";

// Cache durations: Market is shorter now (1 hour) to fix stale data issues on tab revisit
const MARKET_CACHE_EXPIRY = 60 * 60 * 1000; 
const ESTIMATE_CACHE_EXPIRY = 2 * 60 * 60 * 1000;
const IMAGE_CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 Days

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
    // Generate a unique key based on relevant inputs
    const cleanObj = { ...obj };
    // Don't include personal details in cache key to allow reuse across similar project dimensions
    delete cleanObj.clientName; 
    delete cleanObj.clientPhone;
    return `${prefix}_${JSON.stringify(cleanObj).replace(/\s+/g, '')}`;
  }
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
  Return strictly as JSON. Ensure prices reflect the current 2026 market trends in Hyderabad.
  
  Format Requirement:
  Only return a JSON object that matches the requested schema. No conversational text.`;

  try {
    const response = await ai.models.generateContent({
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
                }
              }
            },
            laborCost: { type: Type.NUMBER },
            estimatedDays: { type: Type.NUMBER },
            precautions: { type: Type.ARRAY, items: { type: Type.STRING } },
            totalEstimatedCost: { type: Type.NUMBER },
            expertTips: { type: Type.STRING },
            visualPrompt: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Empty response from AI model.");
    }
    const result = JSON.parse(text);
    cache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error("Gemini Content Error:", error);
    throw new Error("Failed to generate estimate due to a model error. Please check your inputs and try again.");
  }
};

export const generateDesignImage = async (category: string, visualPrompt: string): Promise<string | null> => {
  // Reuse same image for each category to save costs
  const categoryCacheKey = `img_cat_${category}`;
  const cachedImg = cache.get<string>(categoryCacheKey, IMAGE_CACHE_EXPIRY);
  if (cachedImg) return cachedImg;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High-quality architect render for ${category} category: ${visualPrompt}. Luxury interior or exterior, realistic materials, photorealistic construction finishing.` }]
      },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    
    // Defensive check for candidates and parts
    const candidates = response.candidates;
    const imagePart = candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const base64 = imagePart?.inlineData?.data;
    
    if (base64) {
      const dataUrl = `data:image/png;base64,${base64}`;
      cache.set(categoryCacheKey, dataUrl);
      return dataUrl;
    }
  } catch (e) { 
    console.error("Gemini Image Error:", e);
  }
  return null;
};

export const getRawMaterialPriceList = async (): Promise<MarketPriceList> => {
  const cachedMarket = cache.get<MarketPriceList>('market_prices', MARKET_CACHE_EXPIRY);
  if (cachedMarket) return cachedMarket;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "Current 2026 Construction Market Price Index for Hyderabad (Cement, Steel, Tiles, Plumbing, Electrical). Return JSON only.",
      config: { responseMimeType: "application/json" }
    });
    
    const text = response.text?.trim();
    if (!text) {
      throw new Error("Empty response from market API.");
    }
    const result = JSON.parse(text);
    cache.set('market_prices', result);
    return result;
  } catch (error) {
    console.error("Gemini Market Error:", error);
    // Fallback static data if API fails to avoid complete breakage
    return {
      lastUpdated: new Date().toISOString(),
      categories: [
        { title: "Basics", items: [{ category: "Basics", brandName: "UltraTech", specificType: "PPC Cement", priceWithGst: 415, unit: "bag", trend: "stable" }] }
      ]
    };
  }
};
