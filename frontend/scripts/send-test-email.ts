/**
 * Test script to send a welcome email
 * Usage: npx tsx scripts/send-test-email.ts
 */

import { sendWelcomeEmail } from '../lib/resend-email';

async function sendTestEmail() {
  console.log('🚀 Sending test email to nbhupathi@gmail.com...\n');

  try {
    const success = await sendWelcomeEmail(
      'nbhupathi@gmail.com',
      'Naresh',
      'AddTechno.com'
    );

    if (success) {
      console.log('✅ Test email sent successfully!');
      console.log('\nEmail Details:');
      console.log('  To: nbhupathi@gmail.com');
      console.log('  Template: Welcome Email');
      console.log('  First Name: Naresh');
      console.log('  Company: AddTechno.com');
    } else {
      console.error('❌ Failed to send test email');
      console.error('\nPlease check:');
      console.error('  1. RESEND_API_KEY is set in .env');
      console.error('  2. RESEND_FROM_EMAIL is set in .env');
      console.error('  3. Domain is verified in Resend dashboard');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

sendTestEmail();
