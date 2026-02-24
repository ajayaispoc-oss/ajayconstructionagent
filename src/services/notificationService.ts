
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
  
  const clientName = payload.fullName || inputs.clientName || payload.clientName || "Engineering Prospect";
  
  // 2. Strict Mapping Strategy for Webhook
  let eventName = event.toUpperCase();
  if (event === 'quote_requested') eventName = 'QUOTE_REQUESTED';
  if (event === 'access' && payload.event === 'LOGIN') eventName = 'USER_LOGIN';
  if (event === 'access' && payload.event === 'SIGNUP') eventName = 'USER_SIGNUP';

  const totalQuoteValue = result.totalEstimatedCost || payload.totalCost;

  const webhookPayload = {
    "Event": eventName,
    "User Name": clientName,
    "Mobile": payload.phone || inputs.clientPhone || payload.clientPhone || "0",
    "Location": payload.location || inputs.area_location || payload.area_location || "Not Selected",
    "Service": payload.serviceType || payload.task || inputs.project_subtype || "General Inquiry",
    "Total Quote": totalQuoteValue ? `₹${totalQuoteValue.toLocaleString()}` : "N/A",
    "Timestamp": timestamp,
    "Domain": "ajayprojects.com",
    "AdminRecipient": "ajay.ai.spoc@gmail.com",
    "AgentContext": payload.agent || "Guest Portal",
    "FullData": JSON.stringify(result && Object.keys(result).length > 0 ? result : payload)
  };

  const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxzYXyzkiJnih5MMWsUx8HV5F2je8A8zw6mS96o91EGCXKoU2gB1rJdsf0rSp9HMqyK/exec";

  console.log('Email Payload:', webhookPayload);

  // Fire-and-forget for the webhook
  fetch(WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    cache: 'no-cache',
    keepalive: true,
    headers: {
      'Content-Type': 'text/plain'
    },
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
