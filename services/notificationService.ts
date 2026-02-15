
import { UserData } from "../types";

/**
 * INSTRUCTIONS FOR AGENT:
 * To receive Gmails and Sheet updates:
 * 1. Create a Google Apps Script.
 * 2. Use doPost(e) logic to:
 *    a. Append data to a Spreadsheet.
 *    b. Use MailApp.sendEmail() to notify yourself.
 * 3. Deploy as Web App (Access: Anyone).
 * 4. Replace the URL below.
 */
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbysL0GwQvJ_pirhjDiLoODbsIFZ8lQXgYXJOO68uxx28frwva759lDSPe7nxWZPXlq9pw/exec"; 

export const notifyCloud = async (event: 'access' | 'quote' | 'upgrade', data: any) => {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    project: "Ajay Infra - Hyderabad",
    domain: "ajayinfra.com",
    ...data
  };

  console.log(`[Cloud Sync] Tracking ${event}...`, payload);

  try {
    // We use 'no-cors' if using a simple Google Script, or standard fetch if using a proper backend.
    // This ensures the data reaches your Sheet/Gmail even if the script doesn't return a JSON header.
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn("Notification ping failed. This usually happens if the Webhook URL is not set yet.", error);
  }
};
