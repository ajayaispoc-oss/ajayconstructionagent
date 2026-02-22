
import { supabase } from "./supabaseClient";

/**
 * AJAY PROJECTS - HIGH RELIABILITY NOTIFICATION
 * Primary Alert Target: ajay.ai.spoc@gmail.com
 */
export type CloudEvent = 'access' | 'quote_requested' | 'invoice_generated' | 'callback_requested';

export const notifyCloud = async (event: CloudEvent, payload: any) => {
  const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  
  // 1. Data Context Extraction
  const inputs = payload.inputs || {};
  const result = payload.result || {};
  
  // DATABASE FIX: Ensure agentId is a valid UUID or NULL
  // UUID Regex: 8-4-4-4-12 hex chars
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const rawAgentId = payload.agentId || null;
  const agentId = (rawAgentId && uuidRegex.test(rawAgentId)) ? rawAgentId : null;
  
  const clientName = inputs.clientName || payload.clientName || "Engineering Prospect";
  
  // 2. Strict Mapping Strategy for Webhook
  const webhookPayload = {
    "Event": event.toUpperCase(),
    "User Name": clientName,
    "Mobile": inputs.clientPhone || payload.clientPhone || "0",
    "Location": inputs.area_location || payload.area_location || "Not Selected",
    "Service": payload.task || inputs.project_subtype || "General Inquiry",
    "Total Quote": result.totalEstimatedCost ? `₹${result.totalEstimatedCost.toLocaleString()}` : "Calculation Only",
    "Timestamp": timestamp,
    "Domain": "ajayprojects.com",
    "AdminRecipient": "ajay.ai.spoc@gmail.com",
    "AgentContext": payload.agent || "Guest Portal"
  };

  const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbx461H4dAuwgPus4AW5mcjQgaNJaxWqlRYk4SQvEAldYmeIWyC-WgB5vYPouzeyH8hcWw/exec";

  // Fire-and-forget for the webhook
  fetch(WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    cache: 'no-cache',
    keepalive: true,
    body: JSON.stringify(webhookPayload)
  }).catch(() => {});

  // 3. DATABASE FIX: Backup sync to Supabase with strict mapping
  try {
    if (['quote_requested', 'invoice_generated'].includes(event)) {
      const { data, error } = await supabase.from('estimations').insert({
        client_name: clientName,
        client_phone: String(webhookPayload["Mobile"]),
        category: String(webhookPayload["Service"]),
        inputs: inputs,
        result: result,
        agent_id: agentId // Validated UUID or null
      });
      
      if (error) {
        console.error("Supabase write failure (estimations):", error.message, error.details);
        return false;
      }
    }
  } catch (dbErr) {
    console.error("Database infrastructure unreachable:", dbErr);
    return false;
  }

  return true;
};
