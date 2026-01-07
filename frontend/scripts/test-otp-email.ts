/**
 * Test OTP Email Script
 * Sends a test OTP email to specified email address
 */

import { sendMagicLinkEmail } from '../lib/resend-email';

async function main() {
  const email = process.argv[2] || 'developer@zenora.ai';
  const firstName = process.argv[3] || 'Developer';

  // Generate a test 6-digit code
  const testCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Generate a test token
  const testToken = 'test-token-' + Date.now();

  console.log('📧 Sending test OTP email...\n');
  console.log(`To: ${email}`);
  console.log(`Name: ${firstName}`);
  console.log(`Test Code: ${testCode}`);
  console.log(`Test Token: ${testToken}\n`);

  try {
    const result = await sendMagicLinkEmail(email, firstName, testCode, testToken);

    if (result) {
      console.log('✅ Test OTP email sent successfully!');
      console.log('\nCheck your inbox for the email from Zenora.');
    } else {
      console.log('❌ Failed to send test OTP email');
    }
  } catch (error: any) {
    console.error('❌ Error sending email:', error.message);
  }
}

main();
