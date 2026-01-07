/**
 * Test Email Script
 * Sends sample emails for all major templates to verify they render correctly
 *
 * Usage: RESEND_API_KEY="your-key" RESEND_FROM_EMAIL="Zenora <noreply@zenora.ai>" npx ts-node scripts/test-emails.ts
 */

import {
  sendEmail,
  sendMagicLinkEmail,
  sendOnboardingInvite,
  sendTaskAssignedEmail,
  sendWelcomeEmail,
  sendOnboardingSubmissionNotification,
  sendOnboardingApprovalEmail,
  sendChangesRequestedEmail,
  sendInvoiceEmail,
  sendInvoicePaymentConfirmation,
  testResendConfiguration,
} from '../lib/resend-email';

import {
  notifyClientProjectCreated,
  notifyProjectManagerAssigned,
  notifyAdminProjectCreated,
  notifyAdminNewClient,
  notifyAccountManagerClientAssigned,
} from '../lib/email-notifications';

const TEST_EMAIL = 'developer@zenora.ai';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendTestEmails() {
  console.log('🚀 Starting email template tests...\n');
  console.log(`📧 Sending all test emails to: ${TEST_EMAIL}\n`);

  const results: { name: string; success: boolean }[] = [];

  // 1. Test Resend Configuration
  console.log('1. Testing Resend configuration...');
  const test1 = await testResendConfiguration(TEST_EMAIL);
  results.push({ name: 'Resend Config Test', success: test1 });
  console.log(test1 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 2. Magic Link Email
  console.log('2. Sending Magic Link email...');
  const test2 = await sendMagicLinkEmail(TEST_EMAIL, 'Developer', '123456', 'test-token-abc123');
  results.push({ name: 'Magic Link', success: test2 });
  console.log(test2 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 3. Welcome Email
  console.log('3. Sending Welcome email...');
  const test3 = await sendWelcomeEmail(TEST_EMAIL, 'Developer', 'Zenora Technologies');
  results.push({ name: 'Welcome Email', success: test3 });
  console.log(test3 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 4. Onboarding Invite
  console.log('4. Sending Onboarding Invite email...');
  const test4 = await sendOnboardingInvite({
    to: TEST_EMAIL,
    firstName: 'Developer',
    token: 'test-onboard-token',
    invitedBy: 'HR Manager',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });
  results.push({ name: 'Onboarding Invite', success: test4 });
  console.log(test4 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 5. Task Assigned Email
  console.log('5. Sending Task Assigned email...');
  const test5 = await sendTaskAssignedEmail({
    to: TEST_EMAIL,
    employeeName: 'Developer',
    taskName: 'Complete Q4 Report',
    description: 'Please review and finalize the Q4 financial report for stakeholder presentation.',
    dueDate: 'January 15, 2025',
    projectName: 'Annual Reports 2024',
    assignedBy: 'Project Manager',
  });
  results.push({ name: 'Task Assigned', success: test5 });
  console.log(test5 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 6. Onboarding Submission Notification (HR)
  console.log('6. Sending Onboarding Submission notification...');
  const test6 = await sendOnboardingSubmissionNotification(
    TEST_EMAIL,
    'John Doe',
    'john.doe@example.com',
    'https://zenora.ai/hr/onboarding/review/123'
  );
  results.push({ name: 'Onboarding Submission', success: test6 });
  console.log(test6 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 7. Onboarding Approval Email
  console.log('7. Sending Onboarding Approval email...');
  const test7 = await sendOnboardingApprovalEmail(
    TEST_EMAIL,
    'Developer',
    'https://zenora.ai/login'
  );
  results.push({ name: 'Onboarding Approval', success: test7 });
  console.log(test7 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 8. Changes Requested Email
  console.log('8. Sending Changes Requested email...');
  const test8 = await sendChangesRequestedEmail(
    TEST_EMAIL,
    'Developer',
    'Please upload a clearer copy of your ID document. The current image is blurry and we cannot verify the details.',
    'https://zenora.ai/onboard?token=test-token'
  );
  results.push({ name: 'Changes Requested', success: test8 });
  console.log(test8 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 9. Invoice Email
  console.log('9. Sending Invoice email...');
  const test9 = await sendInvoiceEmail({
    to: TEST_EMAIL,
    invoiceNumber: 'INV-2025-0001',
    clientName: 'Acme Corporation',
    companyName: 'Zenora Technologies',
    invoiceDate: 'December 30, 2024',
    dueDate: 'January 30, 2025',
    total: 15000.00,
    currency: 'INR',
    invoiceUrl: 'https://zenora.ai/invoices/INV-2025-0001',
  });
  results.push({ name: 'Invoice', success: test9 });
  console.log(test9 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 10. Invoice Payment Confirmation
  console.log('10. Sending Invoice Payment Confirmation email...');
  const test10 = await sendInvoicePaymentConfirmation({
    to: TEST_EMAIL,
    invoiceNumber: 'INV-2025-0001',
    clientName: 'Acme Corporation',
    companyName: 'Zenora Technologies',
    paidDate: 'December 30, 2024',
    total: 15000.00,
    currency: 'INR',
  });
  results.push({ name: 'Payment Confirmation', success: test10 });
  console.log(test10 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 11. Client Project Created Notification
  console.log('11. Sending Client Project Created notification...');
  const test11 = await notifyClientProjectCreated({
    clientEmail: TEST_EMAIL,
    clientName: 'Developer',
    projectName: 'Website Redesign',
    projectCode: 'ZENO-2025-0001',
    projectDescription: 'Complete redesign of the corporate website with modern UI/UX',
    startDate: 'January 1, 2025',
    endDate: 'March 31, 2025',
    projectManagerName: 'Sarah Johnson',
    organizationName: 'Zenora Technologies',
  });
  results.push({ name: 'Client Project Created', success: test11 });
  console.log(test11 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 12. Project Manager Assigned Notification
  console.log('12. Sending Project Manager Assigned notification...');
  const test12 = await notifyProjectManagerAssigned({
    managerEmail: TEST_EMAIL,
    managerName: 'Developer',
    projectName: 'Mobile App Development',
    projectCode: 'ZENO-2025-0002',
    projectDescription: 'Native iOS and Android app development for client portal',
    clientName: 'Tech Startup Inc.',
    startDate: 'January 15, 2025',
    endDate: 'June 30, 2025',
    budgetCost: 500000,
    currency: 'INR',
    organizationName: 'Zenora Technologies',
  });
  results.push({ name: 'PM Assigned', success: test12 });
  console.log(test12 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 13. Admin Project Created Notification
  console.log('13. Sending Admin Project Created notification...');
  const test13 = await notifyAdminProjectCreated({
    adminEmail: TEST_EMAIL,
    adminName: 'Developer',
    projectName: 'Cloud Migration',
    projectCode: 'ZENO-2025-0003',
    clientName: 'Enterprise Corp',
    projectManagerName: 'John Smith',
    startDate: 'February 1, 2025',
    endDate: 'August 31, 2025',
    budgetCost: 1000000,
    currency: 'INR',
    createdByName: 'Operations Manager',
    organizationName: 'Zenora Technologies',
  });
  results.push({ name: 'Admin Project Created', success: test13 });
  console.log(test13 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 14. Admin New Client Notification
  console.log('14. Sending Admin New Client notification...');
  const test14 = await notifyAdminNewClient({
    adminEmail: TEST_EMAIL,
    adminName: 'Developer',
    clientName: 'New Client LLC',
    clientId: 'CLI-2025-0001',
    contactName: 'Jane Smith',
    contactEmail: 'jane@newclient.com',
    accountManagerName: 'Mike Johnson',
    createdByName: 'Sales Rep',
    organizationName: 'Zenora Technologies',
  });
  results.push({ name: 'Admin New Client', success: test14 });
  console.log(test14 ? '   ✅ Success' : '   ❌ Failed');
  await delay(1000);

  // 15. Account Manager Client Assigned
  console.log('15. Sending Account Manager Client Assigned notification...');
  const test15 = await notifyAccountManagerClientAssigned({
    managerEmail: TEST_EMAIL,
    managerName: 'Developer',
    clientName: 'Important Client Co.',
    clientId: 'CLI-2025-0002',
    contactName: 'Bob Wilson',
    contactEmail: 'bob@importantclient.com',
    contactPhone: '+91 98765 43210',
    priority: 'HIGH',
    assignedByName: 'VP Sales',
    organizationName: 'Zenora Technologies',
  });
  results.push({ name: 'AM Client Assigned', success: test15 });
  console.log(test15 ? '   ✅ Success' : '   ❌ Failed');

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(50));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(r => {
    console.log(`   ${r.success ? '✅' : '❌'} ${r.name}`);
  });

  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log('='.repeat(50));

  if (failed > 0) {
    console.log('\n⚠️  Some emails failed to send. Check your RESEND_API_KEY and email configuration.');
  } else {
    console.log('\n🎉 All test emails sent successfully! Check your inbox at ' + TEST_EMAIL);
  }
}

// Run the tests
sendTestEmails().catch(console.error);