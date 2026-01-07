/**
 * Test Email Notifications
 *
 * This script tests all email notifications used in the system:
 * 1. Welcome Email (for system-users endpoint)
 * 2. Onboarding Invite Email (for invite-employee endpoint)
 *
 * Usage:
 * npx tsx scripts/test-email-notifications.ts <your-email@example.com>
 */

import { sendWelcomeEmail, sendOnboardingInvite } from '../lib/resend-email';

async function testEmailNotifications(testEmail: string) {
  console.log('🧪 Testing Email Notifications...\n');
  console.log('Test email:', testEmail);
  console.log('-----------------------------------\n');

  // Test 1: Welcome Email (System Users)
  console.log('1️⃣  Testing Welcome Email (System Users endpoint)...');
  try {
    const result1 = await sendWelcomeEmail(
      testEmail,
      'Test User',
      'Zenora Test Company'
    );

    if (result1) {
      console.log('   ✅ Welcome email sent successfully!');
    } else {
      console.log('   ❌ Welcome email failed to send');
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('');

  // Test 2: Onboarding Invite Email (Invite Employee)
  console.log('2️⃣  Testing Onboarding Invite Email (Invite Employee endpoint)...');
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const result2 = await sendOnboardingInvite({
      to: testEmail,
      firstName: 'Test Employee',
      token: 'test-token-123456789',
      invitedBy: 'hr@company.com',
      expiresAt,
    });

    if (result2) {
      console.log('   ✅ Onboarding invite email sent successfully!');
    } else {
      console.log('   ❌ Onboarding invite email failed to send');
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n-----------------------------------');
  console.log('📧 Email testing complete!');
  console.log('\nCheck your inbox at:', testEmail);
  console.log('\nNote: If you don\'t see the emails:');
  console.log('  1. Check your spam/junk folder');
  console.log('  2. Verify RESEND_API_KEY in .env');
  console.log('  3. Verify RESEND_FROM_EMAIL in .env');
  console.log('  4. Check Resend dashboard for delivery status');
}

// Get email from command line argument
const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Error: Please provide a test email address');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/test-email-notifications.ts your-email@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testEmail)) {
  console.error('❌ Error: Invalid email format');
  process.exit(1);
}

testEmailNotifications(testEmail)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
