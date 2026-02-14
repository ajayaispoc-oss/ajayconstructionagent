
import { GoogleGenAI, Type } from "@google/genai";
import { EstimationResult, ConstructionCategory, MarketPriceList } from "../types";

const MARKET_CACHE_EXPIRY = 24 * 60 * 60 * 1000;
const ESTIMATE_CACHE_EXPIRY = 2 * 60 * 60 * 1000;
const IMAGE_CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 Days

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache = {
  set: <T>(key: string, data: T) => {
    try {
      localStorage.setItem(`ajay_v3_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
      console.warn("Cache storage quota full.");
    }
  },
  get: <T>(key: string, expiry: number): T | null => {
    const raw = localStorage.getItem(`ajay_v3_${key}`);
    if (!raw) return null;
    try {
      const item: CacheItem<T> = JSON.parse(raw);
      if (Date.now() - item.timestamp > expiry) return null;
      return item.data;
    } catch (e) { return null; }
  },
  generateKey: (prefix: string, obj: any) => {
    return `${prefix}_${JSON.stringify(obj).replace(/\s+/g, '')}`;
  }
};

export const getConstructionEstimate = async (
  category: ConstructionCategory,
  inputs: Record<string, any>
): Promise<EstimationResult> => {
  // 1. Strict Estimate Caching (Exact Inputs)
  const cacheKey = cache.generateKey('est_ledger', { category, ...inputs });
  const cachedData = cache.get<EstimationResult>(cacheKey, ESTIMATE_CACHE_EXPIRY);
  if (cachedData) return cachedData;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Act as a Construction Ledger Specialist for Hyderabad.
  Generate a detailed Bill of Materials (BOM) for ${category} with these inputs: ${JSON.stringify(inputs)}.
  Enforce Brand usage: Ashirvad for plumbing, Goldmedal/Finolex for electrical, Asian Paints for finishing.
  Return strictly as JSON.`;

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
          timeline: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { week: { type: Type.NUMBER }, activity: { type: Type.STRING } } } },
          totalEstimatedCost: { type: Type.NUMBER },
          expertTips: { type: Type.STRING },
          visualPrompt: { type: Type.STRING }
        }
      }
    }
  });

  const result = JSON.parse(response.text.trim());
  cache.set(cacheKey, result);
  return result;
};

export const generateDesignImage = async (category: string, visualPrompt: string): Promise<string | null> => {
  // 2. Strict Image Caching (By Category ONLY)
  // This ensures we don't generate new images for every slight input change
  const categoryCacheKey = `img_cat_${category}`;
  const cachedImg = cache.get<string>(categoryCacheKey, IMAGE_CACHE_EXPIRY);
  if (cachedImg) return cachedImg;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High-quality architect render of ${category}: ${visualPrompt}` }]
      },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    const base64 = response.candidates?.[0]?.content?.parts.find(p => p.inlineData)?.inlineData?.data;
    if (base64) {
      const dataUrl = `data:image/png;base64,${base64}`;
      cache.set(categoryCacheKey, dataUrl);
      return dataUrl;
    }
  } catch (e) { console.error(e); }
  return null;
};

export const getRawMaterialPriceList = async (): Promise<MarketPriceList> => {
  const cachedMarket = cache.get<MarketPriceList>('market_prices', MARKET_CACHE_EXPIRY);
  if (cachedMarket) return cachedMarket;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "Hyderabad Construction Market Prices Jan 2026. JSON.",
    config: { responseMimeType: "application/json" }
  });
  const result = JSON.parse(response.text.trim());
  cache.set('market_prices', result);
  return result;
};
