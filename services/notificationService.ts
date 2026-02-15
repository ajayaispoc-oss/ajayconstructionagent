
import { UserData } from "../types";

/**
 * CLOUD NOTIFICATION ENGINE
 * Syncs data to Google Sheets & triggers Gmail alerts.
 */
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxS4Ni2D2q-6qF4CEIQJW_idQoOJJquvDntgBf5vO7W7UkStXtCysWAEdUG3eJ3M6GVyw/exec"; 

export type CloudEvent = 'access' | 'quote' | 'upgrade' | 'callback' | 'work_order' | 'invoice_sent';

export const notifyCloud = async (event: CloudEvent, data: any) => {
  // Retrieve last known user from storage if not provided in local data
  const storedUserRaw = localStorage.getItem('ajay_last_user');
  const userContext = data.user || (storedUserRaw ? JSON.parse(storedUserRaw) : null);

  const payload = {
    event,
    timestamp: new Date().toISOString(),
    project: "Ajay Infra - Hyderabad",
    domain: "ajayinfra.com",
    user: userContext ? {
      name: userContext.name || "N/A",
      phone: userContext.phone || "N/A",
      email: userContext.email || "N/A",
      location: userContext.location || "N/A"
    } : null,
    task: data.task || data.projectContext || "N/A",
    total: data.total || 0,
    inputs: data.inputs || null,
    details: data.details || data.materials || null
  };

  console.log(`[Cloud Sync] Triggering ${event}...`, payload);

  try {
    // Send as POST to avoid 'postData' being undefined in Google Script
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain', // Prevents pre-flight OPTIONS check for GAS
      },
      body: JSON.stringify(payload)
    });
    return true;
  } catch (error) {
    console.warn("Notification sync failed.", error);
    return false;
  }
};
