const https = require('https');

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_gqjJuEKZ_Aw4GLi6P5f5wSHL69JxxzdU4';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Zenora <noreply@zenora.ai>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const currentYear = new Date().getFullYear();

const emailData = {
  from: FROM_EMAIL,
  to: 'nbhupathi@gmail.com',
  subject: 'Welcome to AddTechno.com - Zenora.ai',
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AddTechno.com</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>🎉 Welcome to AddTechno.com!</h1>
    <p>Hi Naresh,</p>
    <p>Your account has been created. We're excited to have you on board!</p>
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Getting Started:</h3>
      <p>Zenora.ai uses secure, passwordless authentication. Each time you log in, you'll receive a unique code via email.</p>
    </div>
    <center>
      <a href="${APP_URL}/login" style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">Login to Zenora.ai</a>
    </center>
    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">If you have any questions, please contact your administrator.<br>© ${currentYear} Zenora.ai. All rights reserved.</p>
  </div>
</body>
</html>`,
  text: `Welcome to Zenora.ai!\n\nHi Naresh,\n\nYour account has been created for AddTechno.com. We're excited to have you on board!\n\nTo get started, visit: ${APP_URL}/login\n\nZenora.ai uses secure, passwordless authentication. Each time you log in, you'll receive a unique code via email.\n\nIf you have any questions, please contact your administrator.\n\n© ${currentYear} Zenora.ai. All rights reserved.`
};

const postData = JSON.stringify(emailData);
const options = {
  hostname: 'api.resend.com',
  port: 443,
  path: '/emails',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + RESEND_API_KEY,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🚀 Sending test email to nbhupathi@gmail.com...\n');

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200) {
      const response = JSON.parse(data);
      console.log('✅ Email sent successfully!');
      console.log('\nEmail Details:');
      console.log('  To: nbhupathi@gmail.com');
      console.log('  From:', FROM_EMAIL);
      console.log('  Subject: Welcome to AddTechno.com - Zenora.ai');
      console.log('  First Name: Naresh');
      console.log('  Company: AddTechno.com');
      console.log('\nResend Response:');
      console.log('  Email ID:', response.id);
      console.log('\n📧 Check nbhupathi@gmail.com inbox for the welcome email!');
    } else {
      console.error('❌ Failed to send email');
      console.error('Status Code:', res.statusCode);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

req.write(postData);
req.end();
