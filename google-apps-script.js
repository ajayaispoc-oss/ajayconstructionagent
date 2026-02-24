// Google Apps Script - Magic Link Approver
// Deploy this as a Web App in Google Apps Script

const SUPABASE_URL = 'https://vaguthgeaqvpggsvdxiq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhZ3V0aGdlYXF2cGdnc3ZkeGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTMwMzk4NCwiZXhwIjoyMDg2ODc5OTg0fQ.Fpm7MJtGHLEcQmyYvyZdDYvYy2s2pgJu7tpmM2TITnY'; // Get this from Supabase Dashboard -> Settings -> API -> service_role secret
const ADMIN_EMAIL = 'ajay.ai.spoc@gmail.com'; // Your admin email

function doGet(e) {
  const emailToApprove = e.parameter.approve;
  
  if (!emailToApprove) {
    return ContentService.createTextOutput("Error: No email provided for approval.");
  }

  try {
    // 1. Get the user's profile ID from Supabase using their email
    // Note: This assumes you have a way to query by email, or you pass the user ID instead of email.
    // If you only have email in the profiles table, you can query it:
    const queryUrl = `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(emailToApprove)}&select=id`;
    
    const queryOptions = {
      method: 'get',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    };
    
    const queryResponse = UrlFetchApp.fetch(queryUrl, queryOptions);
    const profiles = JSON.parse(queryResponse.getContentText());
    
    if (!profiles || profiles.length === 0) {
      return ContentService.createTextOutput(`Error: User with email ${emailToApprove} not found in profiles table.`);
    }
    
    const userId = profiles[0].id;

    // 2. Update the is_premium status to TRUE
    const updateUrl = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`;
    const updatePayload = {
      is_premium: true
    };
    
    const updateOptions = {
      method: 'patch',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      payload: JSON.stringify(updatePayload)
    };
    
    UrlFetchApp.fetch(updateUrl, updateOptions);
    
    return ContentService.createTextOutput(`Success! User ${emailToApprove} has been approved for Premium Access.`);
    
  } catch (error) {
    return ContentService.createTextOutput(`Error: ${error.message}`);
  }
}

// Function to send the notification email (Call this from your webhook or trigger)
function sendNewUserNotification(userEmail, userName, userPhone) {
  // Replace with your actual deployed Web App URL (You get this URL AFTER deploying this script as a Web App)
  const webAppUrl = 'https://script.google.com/macros/s/AKfycbxmGDuJ-yFZGh39l0v-TIRZBRWY0WWKbWFK7rX-H0Eaf29BazecRIKsWZorwBqxc0bY/exec'; 
  const approveLink = `${webAppUrl}?approve=${encodeURIComponent(userEmail)}`;
  
  const subject = `New User Signup: ${userName}`;
  const body = `
    A new user has signed up and is waiting for approval.
    
    Name: ${userName}
    Email: ${userEmail}
    Phone: ${userPhone}
    
    If you have received their ₹499 UPI payment, click the link below to instantly approve them:
    
    ${approveLink}
  `;
  
  MailApp.sendEmail(ADMIN_EMAIL, subject, body);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const userEmail = data.email;
    const userName = data.name;
    const userPhone = data.phone;
    
    if (userEmail && userName && userPhone) {
      sendNewUserNotification(userEmail, userName, userPhone);
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Missing data' })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}
