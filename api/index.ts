import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();

app.use(express.json({ limit: "5mb" }));

// Permissive CORS middleware for Vercel preview and production deployments
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing on server");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function callGeminiWithRetry<T>(
  fn: (ai: GoogleGenAI, model: string) => Promise<T>,
  models = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"]
): Promise<T> {
  let lastError: any = null;
  const ai = getGeminiClient();

  for (const model of models) {
    try {
      return await fn(ai, model);
    } catch (err: any) {
      lastError = err;
      const isQuotaOrOverloaded =
        err?.message?.includes("429") ||
        err?.message?.includes("RESOURCE_EXHAUSTED") ||
        err?.message?.includes("503") ||
        err?.message?.includes("UNAVAILABLE") ||
        err?.status === 429 ||
        err?.status === 503;

      if (!isQuotaOrOverloaded) {
        try {
          await new Promise((r) => setTimeout(r, 500));
          return await fn(ai, model);
        } catch (retryErr: any) {
          lastError = retryErr;
        }
      }
    }
  }

  throw lastError || new Error("Failed to call the Gemini API.");
}

const apiRouter = express.Router();

// 1. Yahoo Finance CORS Proxy Endpoint
apiRouter.get("/yahoo", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    if (!url.startsWith("https://query1.finance.yahoo.com/")) {
      return res.status(400).json({ error: "Unauthorized target URL" });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Referer": "https://finance.yahoo.com/",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Yahoo API returned error status ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    console.error("Error in yahoo proxy:", error);
    res.status(500).json({ error: error.message || "Failed to fetch stock data from Yahoo Finance" });
  }
});

// 2. Health Check Endpoint
apiRouter.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 3. Gemini: Corporate / Developer Comms Translator
apiRouter.post("/gemini/translate", async (req, res) => {
  try {
    const { text, mode, tone } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid text input" });
    }

    const prompt = `You are a professional Developer Communications Polisher.
Your task is to transform/translate the following input draft text into a human-crafted professional response.

Input Text:
"""
${text}
"""

Target Output Format/Scenario: ${mode || "Daily Status Update"}
Selected Tone/Language Level: ${tone || "Simple English"}

CRITICAL: The output MUST look like it was written by an actual, competent human (specifically a software developer, manager, or lead in a tech company) and NOT by an AI.

Please follow these strict human-centric constraints to strip away all AI artifacts:
1. DO NOT add any conversational intro, meta-commentary, or transition sentences like "Sure, here is the translated text" or "Here is your standup report:". Output ONLY the actual refined text.
2. STRICTLY EXCLUDE robotic AI buzzwords and transitional cliches. Never use: "delve", "testament", "synergy", "seamlessly", "furthermore", "moreover", "leverage", "in conclusion", "it is important to note", "beacon", "realm", "revolutionize", "landscape", "robust", "demystify", "optimize", "streamline" (unless those exact tech words exist in the developer's raw draft, in which case use them naturally).
3. DO NOT use generic, stale AI email templates like "I hope this email finds you well" or "I am writing to...". Human emails are concise, standard, and start directly.
4. Avoid exclamation mark overload and the overly cheerful, submissive, or hyper-apologetic tone that AI models typically output. Write with realistic, composed, objective, and confident tech-industry poise.
5. If the Scenario is a "Daily Status Update" or "Daily Standup": Make it look like a Slack status update or scrum post. Use simple, direct sentences (e.g., "Yesterday: Finished X. Today: Working on Y. Blockers: Waiting on Z."). No flowery prose, no AI introduction.
6. If the Scenario is an "Email Draft": Structure it with a Subject line: [Subject] and a clean, direct body that is immediately usable and sounds highly authentic.
7. If the Scenario is "Comments to Jira Task": Write it like a clear, task-focused JIRA update. Be slightly clinical, professional, and straight to the point (e.g., notes about a bug, blocker explanation, API schema mismatch).

Specific Language Levels to adhere to:
- Simple English: Easy, straightforward words. No complex vocabulary. Very clear active sentences of 5-10 words. Ideal for swift universal reading.
- Functional Words: Business-standard. Employs formal action terms (e.g., "completed", "escalated", "resolved", "collaborated") but avoids showy developer jargon.
- More Technical: Advanced developer language. Uses real-world code & architecture concepts (e.g. "race conditions", "payload validation", "throttling", "indexing", "state mutation") naturally.
- HR Related / Polite: Extremely diplomatic and courteous. Uses supportive, soft-skills framed requests, tactful pushback, and highly professional boundaries.

Provide strictly the final output, ready for copy-paste with zero extra comments.`;

    const result = await callGeminiWithRetry(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      return response.text || "";
    });

    res.json({ translatedText: result });
  } catch (error: any) {
    console.error("Translate error:", error);
    res.status(500).json({ error: error.message || "Translation service error. Please try again." });
  }
});

// 4. Gemini: Jira Ticket Generator
apiRouter.post("/gemini/jira-ticket", async (req, res) => {
  try {
    const { requirements, ticketType } = req.body;
    if (!requirements || typeof requirements !== "string") {
      return res.status(400).json({ error: "Missing or invalid requirements" });
    }

    const type = ticketType || "Task";
    const prompt = `You are an expert Agile Product Owner / Technical Business Analyst / Scrum Master specializing in developer task planning.
Generate a professional, industry-standard Jira Agile ticket of type "${type}" based on the following target user requirement input:

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

    const ticket = await callGeminiWithRetry(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
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
                items: { type: Type.STRING },
              },
            },
            required: ["title", "description", "technicalDetails", "acceptanceCriteria", "suggestedPoints", "suggestedPriority", "labels"],
          },
        },
      });

      return JSON.parse(response.text || "{}");
    });

    res.json(ticket);
  } catch (error: any) {
    console.error("Jira generation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate Jira ticket. Please try again." });
  }
});

// 5. Gemini: Construction Estimate
apiRouter.post("/gemini/estimate", async (req, res) => {
  try {
    const { category, inputs } = req.body;
    const prompt = `Act as a Senior Estimator (Hyderabad 2026). 
Task: ${category}. 
Details: ${JSON.stringify(inputs || {})}. 
Return a strictly valid JSON estimation with materials, laborCost, totalEstimatedCost, estimatedDays, precautions, and expertTips.`;

    const result = await callGeminiWithRetry(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
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
                    brandSuggestion: { type: Type.STRING },
                  },
                  required: ["name", "quantity", "unitPrice", "totalPrice"],
                },
              },
              laborCost: { type: Type.NUMBER },
              estimatedDays: { type: Type.NUMBER },
              precautions: { type: Type.ARRAY, items: { type: Type.STRING } },
              totalEstimatedCost: { type: Type.NUMBER },
              expertTips: { type: Type.STRING },
              visualPrompt: { type: Type.STRING },
            },
            required: ["materials", "totalEstimatedCost", "laborCost", "estimatedDays", "visualPrompt"],
          },
        },
      });

      return JSON.parse(response.text || "{}");
    });

    res.json(result);
  } catch (error: any) {
    console.error("Estimate error:", error);
    res.status(500).json({ error: error.message || "Estimation server error. Please try again." });
  }
});

// 6. Gemini: Price List Index
apiRouter.get("/gemini/price-list", async (req, res) => {
  try {
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

    const result = await callGeminiWithRetry(async (ai, model) => {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      return JSON.parse(response.text || "{}");
    });

    res.json(result);
  } catch (error: any) {
    console.error("Price list error:", error);
    res.json({
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
    });
  }
});

// 7. Gemini: Chat Stream
apiRouter.post("/gemini/chat-stream", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message parameter" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const ai = getGeminiClient();
    const models = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
    let stream: any = null;
    let lastErr: any = null;

    for (const m of models) {
      try {
        stream = await ai.models.generateContentStream({
          model: m,
          contents: message,
          config: {
            systemInstruction: `You are the Virtual Site Engineer for Ajay Projects (ajayprojects.com). 
Expert in Hyderabad construction materials (UltraTech, Vizag Steel, Ashirvad).
Provide site engineering advice and price guidance based on 2026 indices.`,
          },
        });
        break;
      } catch (e: any) {
        lastErr = e;
      }
    }

    if (!stream) {
      throw lastErr || new Error("All chat models unavailable");
    }

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("Chat stream error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Failed to stream assistant response" });
    } else {
      res.write(`data: ${JSON.stringify({ error: error.message || "Stream interrupted" })}\n\n`);
      res.end();
    }
  }
});

// Mount router on both "/api" (standard Vite dev & container proxy)
// and "/" (for Vercel serverless functions when rewrites strip or forward /api)
app.use("/api", apiRouter);
app.use("/", apiRouter);

export default app;
