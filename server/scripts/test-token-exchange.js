const { google } = require('googleapis');
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_DRIVE_REDIRECT_URI || 'http://localhost:3000';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
const code = '4/0Aci98E_on866zCvvOD2IyJKhkFaoXbtxOq4nR36msJ5ahJIKrDPNcMo_0W7-9nzqW7d0Aw';

async function get() {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('SUCCESS_TOKEN_IS=' + tokens.refresh_token);
  } catch(e) {
    console.log('ERROR=' + e.message);
  }
}
get();
