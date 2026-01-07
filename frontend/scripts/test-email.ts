// Load environment variables FIRST before any other imports
import { config } from 'dotenv';
config();

// Now import after env is loaded
import { sendWelcomeEmail } from '../lib/resend-email';

async function testEmail() {
  try {
    console.log('Sending test welcome email to nbhupathi@gmail.com...');

    const result = await sendWelcomeEmail(
      'nbhupathi@gmail.com',
      'Test User',
      'Zenora Test Organization'
    );

    if (result) {
      console.log('✓ Email sent successfully!');
      process.exit(0);
    } else {
      console.log('✗ Email failed to send');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testEmail();
