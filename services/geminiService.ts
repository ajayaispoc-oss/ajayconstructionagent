
import { GoogleGenAI, Type } from "@google/genai";
import { EstimationResult, ConstructionCategory, MarketPriceList } from "../types";

// Cache Configuration (in milliseconds)
const MARKET_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 Hours
const ESTIMATE_CACHE_EXPIRY = 1 * 60 * 60 * 1000; // 1 Hour
const IMAGE_CACHE_EXPIRY = 48 * 60 * 60 * 1000; // 48 Hours

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * Utility to handle localStorage caching
 */
const cache = {
  set: <T>(key: string, data: T) => {
    const item: CacheItem<T> = { data, timestamp: Date.now() };
    try {
      localStorage.setItem(`ajay_cache_${key}`, JSON.stringify(item));
    } catch (e) {
      console.warn("Cache storage failed (possibly quota exceeded)", e);
    }
  },
  get: <T>(key: string, expiry: number): T | null => {
    const raw = localStorage.getItem(`ajay_cache_${key}`);
    if (!raw) return null;
    try {
      const item: CacheItem<T> = JSON.parse(raw);
      if (Date.now() - item.timestamp > expiry) {
        localStorage.removeItem(`ajay_cache_${key}`);
        return null;
      }
      return item.data;
    } catch (e) {
      return null;
    }
  },
  generateKey: (prefix: string, obj: any) => {
    return `${prefix}_${JSON.stringify(obj).replace(/\s+/g, '')}`;
  }
};

export const getConstructionEstimate = async (
  category: ConstructionCategory,
  inputs: Record<string, any>
): Promise<EstimationResult> => {
  // 1. Check Cache
  const cacheKey = cache.generateKey('est', { category, ...inputs });
  const cachedData = cache.get<EstimationResult>(cacheKey, ESTIMATE_CACHE_EXPIRY);
  if (cachedData) {
    console.log("Serving estimate from cache...");
    return cachedData;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Act as a Senior Construction Estimator for the Hyderabad Real Estate Market. 
  Task: Detailed Estimate for ${category.replace('_', ' ')} based on inputs: ${JSON.stringify(inputs)}.
  Pricing Date: January 2026 (Projected).
  
  HYDERABAD SPECIFIC RULES:
  - If project is "House", include slab and brickwork.
  - If project is "Flat", exclude structural costs and focus on interiors/shell finishing.
  - Labor: Use high-skilled daily wages for ${inputs.area_location} zone.
  - Transport: Account for logistics from Troop Bazaar to ${inputs.area_location}.
  - Materials: Use specific brand prices if provided (Asian Paints, Birla Opus, etc.). 
  - For PAINTING: If a specific brand and range are selected, use the premium/standard market rate for that exact combination.
  - SUGGESTIONS: Include 5 popular paint codes/shades (e.g., "Asian Paints 0912 - Morning Dew") that match the quality grade and current 2026 trends.
  
  TIMELINE: Generate a 4-8 week project plan with specific milestones.

  Visual Prompt: High-end architectural photo of the finished ${category.replace('_', ' ')} in a luxury setting in ${inputs.area_location}.

  Return response in strict JSON format.`;

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
              },
              required: ["name", "quantity", "unitPrice", "totalPrice"]
            }
          },
          laborCost: { type: Type.NUMBER },
          estimatedDays: { type: Type.NUMBER },
          precautions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          timeline: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                week: { type: Type.NUMBER },
                activity: { type: Type.STRING },
                status: { type: Type.STRING }
              }
            }
          },
          totalEstimatedCost: { type: Type.NUMBER },
          expertTips: { type: Type.STRING },
          visualPrompt: { type: Type.STRING },
          paintCodeSuggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["materials", "laborCost", "estimatedDays", "precautions", "totalEstimatedCost", "visualPrompt", "timeline"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  const result = JSON.parse(text.trim());
  
  // 2. Save to Cache
  cache.set(cacheKey, result);
  return result;
};

export const getRawMaterialPriceList = async (): Promise<MarketPriceList> => {
  // 1. Check Cache
  const cachedMarket = cache.get<MarketPriceList>('market_prices', MARKET_CACHE_EXPIRY);
  if (cachedMarket) {
    console.log("Serving market prices from cache...");
    return cachedMarket;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Market Price Matrix for Hyderabad - Jan 2026. Return JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
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
        }
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  const result = JSON.parse(text.trim());
  
  // 2. Save to Cache
  cache.set('market_prices', result);
  return result;
}

export const generateDesignImage = async (visualPrompt: string): Promise<string | null> => {
  if (!visualPrompt) return null;

  // 1. Check Cache
  const cacheKey = cache.generateKey('img', { prompt: visualPrompt });
  const cachedImg = cache.get<string>(cacheKey, IMAGE_CACHE_EXPIRY);
  if (cachedImg) {
    console.log("Serving design image from cache...");
    return cachedImg;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: `High-quality 3D architectural render, ${visualPrompt}` }]
      },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        const base64 = `data:image/png;base64,${part.inlineData.data}`;
        // 2. Save to Cache
        cache.set(cacheKey, base64);
        return base64;
      }
    }
  } catch (e) { 
    console.error(e); 
  }
  return null;
};
