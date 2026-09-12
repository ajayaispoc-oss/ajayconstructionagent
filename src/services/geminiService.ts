
import { EstimationResult, ConstructionCategory, MarketPriceList } from "../types";

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
    } catch (e) {
      return null;
    }
  }
};

/**
 * Streams chat responses from the server-side Gemini endpoint via Server-Sent Events
 */
export async function* sendMessageToAssistant(message: string): AsyncGenerator<{ text: string }> {
  const response = await fetch('/api/gemini/chat-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to connect to assistant. Please try again.');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.replace(/^data:\s*/, '');
      if (dataStr === '[DONE]') return;
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.text) {
          yield { text: parsed.text };
        }
      } catch (e) {
        // ignore incomplete chunks
      }
    }
  }
}

/**
 * Fetches civil/structural estimation from the server
 */
export const getConstructionEstimate = async (
  category: ConstructionCategory,
  inputs: Record<string, any>
): Promise<EstimationResult> => {
  const cacheKey = `est_${category}_${inputs.totalArea || inputs.area || 'gen'}`;
  const cached = cache.get<EstimationResult>(cacheKey, 3600000);
  if (cached) return cached;

  const response = await fetch('/api/gemini/estimate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, inputs }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Estimation server error. Please retry in a few moments.');
  }

  const result = await response.json();
  cache.set(cacheKey, result);
  return result;
};

/**
 * Fetches Hyderabad market price index
 */
export const getRawMaterialPriceList = async (): Promise<MarketPriceList> => {
  const cacheKey = 'market_price_list';
  const cached = cache.get<MarketPriceList>(cacheKey, 21600000);
  if (cached) return cached;

  try {
    const response = await fetch('/api/gemini/price-list');
    if (!response.ok) {
      throw new Error('Server returned non-ok status');
    }
    const parsed = await response.json();
    if (!parsed.categories || !Array.isArray(parsed.categories)) {
      throw new Error('Invalid structure');
    }
    cache.set(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.error('Price list fetch error, using local fallback data', err);
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

/**
 * Translates/polishes developer input into natural, human-crafted communication
 */
export const translateTechSpeak = async (
  text: string,
  mode: string,
  tone: string
): Promise<string> => {
  const response = await fetch('/api/gemini/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, mode, tone }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Translation service temporarily unavailable. Please try again.');
  }

  const data = await response.json();
  return data.translatedText || 'Could not generate translation.';
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

/**
 * Generates structured Agile Jira ticket
 */
export const generateJiraTicket = async (
  requirements: string,
  ticketType: 'Task' | 'Story' | 'Bug'
): Promise<JiraTicketResult> => {
  const response = await fetch('/api/gemini/jira-ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requirements, ticketType }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to generate Jira ticket. Please try again.');
  }

  return (await response.json()) as JiraTicketResult;
};


