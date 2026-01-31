
import { GoogleGenAI, Type } from "@google/genai";
import { EstimationResult, ConstructionCategory, MarketPriceList } from "../types";

export const getConstructionEstimate = async (
  category: ConstructionCategory,
  inputs: Record<string, any>
): Promise<EstimationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const locContext = `LOCATION: ${inputs.area_location}, Hyderabad. 
                     QUALITY: ${inputs.quality_grade}.
                     CONTEXT: ${inputs.project_subtype || 'Standard construction'}.`;

  const prompt = `Act as a Senior Construction Estimator for the Hyderabad Real Estate Market. 
  Task: Detailed Estimate for ${category.replace('_', ' ')} based on inputs: ${JSON.stringify(inputs)}.
  Pricing Date: January 2026 (Projected).
  
  HYDERABAD SPECIFIC RULES:
  - If project is "House", include slab and brickwork.
  - If project is "Flat", exclude structural costs and focus on interiors/shell finishing.
  - Labor: Use high-skilled daily wages for ${inputs.area_location} zone.
  - Transport: Account for logistics from Troop Bazaar to ${inputs.area_location}.
  - Materials: UltraTech/JSW for structural, Goldmedal/Finolex for electrical, Asian Paints Royale for luxury grade.
  
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
          visualPrompt: { type: Type.STRING }
        },
        required: ["materials", "laborCost", "estimatedDays", "precautions", "totalEstimatedCost", "visualPrompt", "timeline"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  return JSON.parse(text.trim());
};

export const getRawMaterialPriceList = async (): Promise<MarketPriceList> => {
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
  return JSON.parse(text.trim());
}

export const generateDesignImage = async (visualPrompt: string): Promise<string | null> => {
  if (!visualPrompt) return null;
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
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
  } catch (e) { console.error(e); }
  return null;
};
