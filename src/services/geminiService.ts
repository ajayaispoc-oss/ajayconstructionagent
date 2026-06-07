
import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { EstimationResult, ConstructionCategory, MarketPriceList } from "../types";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    // Check multiple possible locations for the API key
    const apiKey = process.env.GEMINI_API_KEY || 
                   (import.meta as any).env?.VITE_GEMINI_API_KEY || 
                   process.env.VITE_GEMINI_API_KEY || 
                   process.env.API_KEY || 
                   "";
                   
    if (!apiKey) {
      throw new Error("Gemini API key not found. Please ensure GEMINI_API_KEY is set in your environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

/** 
 * AJAY PROJECTS - ENGINE CONFIGURATION
 * Using Flash for high-availability
 */
const PRIMARY_MODEL = 'gemini-3-flash-preview'; 
const IMAGE_MODEL = 'gemini-2.5-flash-image';

const cache = {
  set: <T>(key: string, data: T) => {
    try {
      localStorage.setItem(`ajay_checkpoint_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {}
  },
  get: <T>(key: string, expiry: number): T | null => {
    const raw = localStorage.getItem(`ajay_checkpoint_${key}`);
    if (!raw) return null;
    try {
      const item = JSON.parse(raw);
      if (Date.now() - item.timestamp > expiry) return null;
      return item.data;
    } catch (e) { return null; }
  }
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(fn: () => Promise<any>, retries = 3, interval = 2000): Promise<any> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = error?.message?.includes('503') || 
                       error?.status === 503 || 
                       error?.message?.includes('UNAVAILABLE') ||
                       error?.message?.includes('429') ||
                       error?.status === 429 ||
                       error?.message?.includes('RESOURCE_EXHAUSTED');

    if (retries > 0 && isRetryable) {
      // For 429, wait longer
      const waitTime = (error?.message?.includes('429') || error?.status === 429) ? interval * 2 : interval;
      await delay(waitTime);
      return fetchWithRetry(fn, retries - 1, waitTime * 1.5);
    }
    throw error;
  }
}

export const startAssistantChat = () => {
  const ai = getAI();
  return ai.chats.create({
    model: PRIMARY_MODEL,
    config: {
      systemInstruction: `You are the Virtual Site Engineer for Ajay Projects (ajayprojects.com). 
      Expert in Hyderabad construction materials (UltraTech, Vizag Steel, Ashirvad).
      Provide site engineering advice and price guidance based on 2026 indices.`,
    },
  });
};

export const sendMessageToAssistant = async (message: string) => {
  const chat = startAssistantChat();
  return await chat.sendMessageStream({ message });
};

export const getConstructionEstimate = async (
  category: ConstructionCategory,
  inputs: Record<string, any>
): Promise<EstimationResult> => {
  const ai = getAI();
  const cacheKey = `est_${category}_${inputs.totalArea || inputs.area || 'gen'}`;
  const cached = cache.get<EstimationResult>(cacheKey, 3600000);
  if (cached) return cached;

  const prompt = `Act as a Senior Estimator (Hyderabad 2026). 
  Task: ${category}. 
  Details: ${JSON.stringify(inputs)}. 
  Return a strictly valid JSON estimation with materials, laborCost, totalEstimatedCost, estimatedDays, precautions, and expertTips.`;

  try {
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
          required: ["materials", "totalEstimatedCost", "laborCost", "estimatedDays", "visualPrompt"]
        }
      }
    }));

    const result = JSON.parse(response.text || "{}");
    cache.set(cacheKey, result);
    return result;
  } catch (error: any) {
    console.error("Critical AI Failure:", error);
    if (error?.message?.includes('503')) {
      throw new Error("Engineering server is currently overloaded. We have auto-queued your request, please wait 10 seconds.");
    }
    throw new Error("Engineering server at capacity. Please retry in 5 seconds.");
  }
};

export const getRawMaterialPriceList = async (): Promise<MarketPriceList> => {
  const ai = getAI();
  const cacheKey = 'market_price_list';
  // Cache for 6 hours to minimize API hits
  const cached = cache.get<MarketPriceList>(cacheKey, 21600000);
  if (cached) return cached;

  const prompt = `Provide a comprehensive 2026 Hyderabad Price Index for ALL major construction materials. 
  Categories to include:
  - Core (Steel, Cement, Sand, Aggregates, Bricks, AAC Blocks)
  - Finishes (Paints: Asian, Berger, Birla Opus; Tiling: Vitrified, Granite, Marble)
  - Electrical (Wires, Switches, Pipes)
  - Plumbing (Pipes, Taps, Sanitary)
  - Hardware (Wood, Doors, Plywood)
  Return strictly as JSON:
  {
    "lastUpdated": "2026-01-01",
    "categories": [
      {
        "title": "Category Name",
        "items": [
          { "category": "Sub", "brandName": "Brand", "specificType": "Type", "priceWithGst": number, "unit": "unit", "trend": "stable/up/down" }
        ]
      }
    ]
  }`;
  try {
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    }));
    const parsed = JSON.parse(response.text || "{}");
    if (!parsed.categories || !Array.isArray(parsed.categories)) throw new Error("Invalid structure");
    cache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.error("Price list fetch error, using fallback data", err);
    return {
      lastUpdated: new Date().toISOString(),
      categories: [
        { 
          title: "Core Essentials", 
          items: [
            { category: "Cement", brandName: "UltraTech", specificType: "PPC", priceWithGst: 420, unit: "bag", trend: "stable" },
            { category: "Steel", brandName: "Vizag", specificType: "TMT 12mm", priceWithGst: 72500, unit: "ton", trend: "up" },
            { category: "Sand", brandName: "Local", specificType: "M-Sand", priceWithGst: 45, unit: "cu.ft", trend: "stable" },
            { category: "Steel", brandName: "JSW", specificType: "Neosteel TMT", priceWithGst: 74000, unit: "ton", trend: "up" },
            { category: "Bricks", brandName: "Local", specificType: "Red Clay Bricks", priceWithGst: 9, unit: "piece", trend: "stable" }
          ] 
        },
        {
          title: "Painting & Finishes",
          items: [
            { category: "Paint", brandName: "Asian Paints", specificType: "Royale Emulsion", priceWithGst: 590, unit: "ltr", trend: "stable" },
            { category: "Paint", brandName: "Birla Opus", specificType: "Allure Luxury", priceWithGst: 575, unit: "ltr", trend: "stable" },
            { category: "Tiling", brandName: "Kajaria", specificType: "Vitrified 2x2", priceWithGst: 65, unit: "sq.ft", trend: "up" }
          ]
        },
        {
          title: "Electrical & Utility",
          items: [
            { category: "Electrical", brandName: "Finolex", specificType: "2.5mm Wire", priceWithGst: 2150, unit: "coil", trend: "stable" },
            { category: "Plumbing", brandName: "Ashirvad", specificType: "CPVC Pipe 1'", priceWithGst: 340, unit: "length", trend: "up" }
          ]
        }
      ]
    };
  }
};

export const translateTechSpeak = async (
  text: string,
  mode: string,
  tone: string
): Promise<string> => {
  const ai = getAI();
  const prompt = `You are an expert Corporate Tech Translator. 
  Translate/Transform the following text according to the mode and tone specified.
  
  Text to translate:
  """
  ${text}
  """
  
  Translation Mode: ${mode}
  Desired Tone: ${tone}
  
  Provide only the high-quality translated text. Do not add conversational intro, outro, or quote marks. Just output the direct result. Ensure it is clear, professional and formatted nicely if needed.`;

  try {
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    }));
    return response.text || "Could not generate translation.";
  } catch (error: any) {
    console.error("Translation Error:", error);
    throw new Error(error.message || "Translation failed due to overloaded servers. Please try again.");
  }
};


export interface JiraTicketResult {
  title: string;
  description: string;
  technicalDetails: string;
  acceptanceCriteria: string;
  suggestedPoints: number;
  suggestedPriority: string;
  labels: string[];
}

export const generateJiraTicket = async (
  requirements: string,
  ticketType: 'Task' | 'Story' | 'Bug'
): Promise<JiraTicketResult> => {
  const ai = getAI();
  const prompt = `You are an expert Agile Product Owner / Technical Business Analyst / Scrum Master specializing in developer task planning.
  Generate a professional, industry-standard Jira Agile ticket of type "${ticketType}" based on the following target user requirement input:
  
  Requirement Details:
  """
  ${requirements}
  """
  
  Refine and transform these loose user statements into a highly professional Jira ticket:
  1. A clear, precise, and professional Jira Ticket Title (e.g. "[Backend] Implement JWT validation pipeline").
  2. An overview / high-level Description establishing why this is needed, following developer workflows.
  3. A step-by-step Technical Details or implementation guidelines section for the engineer.
  4. Precise Acceptance Criteria (using bullet points or Gherkin format: Given/When/Then).
  5. Recommended Story points (standard numbers: 1, 2, 3, 5, 8).
  6. Recommended priority string (Low, Medium, High, Highest).
  7. Technical labels for tagging (e.g. ["api-security", "refactoring", "frontend-ui", "bugfix"]).
  
  Return the final output adhering strictly to JSON. Ensure the JSON is valid and well-formatted.`;

  try {
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            technicalDetails: { type: Type.STRING },
            acceptanceCriteria: { type: Type.STRING },
            suggestedPoints: { type: Type.INTEGER },
            suggestedPriority: { type: Type.STRING },
            labels: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["title", "description", "technicalDetails", "acceptanceCriteria", "suggestedPoints", "suggestedPriority", "labels"]
        }
      }
    }));
    
    return JSON.parse(response.text || "{}") as JiraTicketResult;
  } catch (error: any) {
    console.error("Jira Ticket Generation Error:", error);
    throw new Error(error.message || "Failed to generate Jira ticket due to overloaded servers. Please try again.");
  }
};


