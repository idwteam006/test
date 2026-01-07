/**
 * Test All Email Templates
 * Sends all email templates to developer@zenora.ai for testing
 */

import {
  sendMagicLinkEmail,
  sendOnboardingInvite,
  sendTaskAssignedEmail,
  testResendConfiguration,
  sendWelcomeEmail,
  sendOnboardingSubmissionNotification,
  sendOnboardingApprovalEmail,
  sendChangesRequestedEmail,
  sendInvoiceEmail,
  sendInvoicePaymentConfirmation,
  getLeaveApprovedEmail,
  getLeaveRejectedEmail,
  getTimesheetApprovedEmail,
  getTimesheetRejectedEmail,
  getTaskAssignedEmail,
} from '../lib/resend-email';

import { Resend } from 'resend';

const testEmail = 'developer@zenora.ai';
const resend = new Resend(process.env.RESEND_API_KEY);

// Add delay to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendEmailDirect(subject: string, html: string, text: string) {
  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Zenora <noreply@zenora.ai>',
      to: testEmail,
      subject,
      html,
      text,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send: ${subject}`, error);
    return false;
  }
}

async function main() {
  console.log('📧 Sending all test emails to:', testEmail);
  console.log('============================================================');
  console.log('(Adding 1 second delay between emails to avoid rate limiting)');

  const results: { name: string; success: boolean }[] = [];

  // 1. Magic Link / OTP Email
  console.log('\n1. Sending Magic Link / OTP Email...');
  const testCode = '123456';
  const testToken = 'test-token-' + Date.now();
  const magicLinkResult = await sendMagicLinkEmail(testEmail, 'Developer', testCode, testToken);
  results.push({ name: 'Magic Link / OTP', success: magicLinkResult });
  console.log(magicLinkResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 2. Onboarding Invite Email
  console.log('\n2. Sending Onboarding Invite Email...');
  const onboardingInviteResult = await sendOnboardingInvite({
    to: testEmail,
    firstName: 'Developer',
    token: 'test-invite-token-' + Date.now(),
    invitedBy: 'Zenora HR',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  });
  results.push({ name: 'Onboarding Invite', success: onboardingInviteResult });
  console.log(onboardingInviteResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 3. Task Assigned Email (sendTaskAssignedEmail - uses options object)
  console.log('\n3. Sending Task Assigned Email (sendTaskAssignedEmail)...');
  const taskAssignedResult = await sendTaskAssignedEmail({
    to: testEmail,
    employeeName: 'Developer',
    taskName: 'Complete Onboarding Documents',
    description: 'Please complete all required onboarding documents including tax forms and emergency contacts.',
    dueDate: '2025-01-15',
    projectName: 'New Hire Onboarding',
    assignedBy: 'HR Manager',
  });
  results.push({ name: 'Task Assigned (direct)', success: taskAssignedResult });
  console.log(taskAssignedResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 4. Test Configuration Email
  console.log('\n4. Sending Test Configuration Email...');
  const testConfigResult = await testResendConfiguration(testEmail);
  results.push({ name: 'Test Configuration', success: testConfigResult });
  console.log(testConfigResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 5. Welcome Email
  console.log('\n5. Sending Welcome Email...');
  const welcomeResult = await sendWelcomeEmail(
    testEmail,
    'Developer',
    'Zenora'
  );
  results.push({ name: 'Welcome Email', success: welcomeResult });
  console.log(welcomeResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 6. Onboarding Submission Notification
  console.log('\n6. Sending Onboarding Submission Notification...');
  const submissionResult = await sendOnboardingSubmissionNotification(
    testEmail,
    'New Employee',
    'newemployee@zenora.ai',
    'http://localhost:3000/hr/onboarding/test-user-123'
  );
  results.push({ name: 'Onboarding Submission', success: submissionResult });
  console.log(submissionResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 7. Onboarding Approval Email
  console.log('\n7. Sending Onboarding Approval Email...');
  const approvalResult = await sendOnboardingApprovalEmail(
    testEmail,
    'Developer',
    'http://localhost:3000/employee/dashboard'
  );
  results.push({ name: 'Onboarding Approval', success: approvalResult });
  console.log(approvalResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 8. Changes Requested Email
  console.log('\n8. Sending Changes Requested Email...');
  const changesResult = await sendChangesRequestedEmail(
    testEmail,
    'Developer',
    'Please update your emergency contact information and upload a clearer photo ID.',
    'http://localhost:3000/onboarding/test-token'
  );
  results.push({ name: 'Changes Requested', success: changesResult });
  console.log(changesResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 9. Invoice Email
  console.log('\n9. Sending Invoice Email...');
  const invoiceResult = await sendInvoiceEmail({
    to: testEmail,
    invoiceNumber: 'INV-2025-001',
    clientName: 'Developer',
    companyName: 'Zenora',
    invoiceDate: '2024-12-30',
    dueDate: '2025-01-30',
    total: 5000.00,
    currency: 'USD',
    invoiceUrl: 'http://localhost:3000/invoices/test-invoice-123',
  });
  results.push({ name: 'Invoice Email', success: invoiceResult });
  console.log(invoiceResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 10. Invoice Payment Confirmation
  console.log('\n10. Sending Invoice Payment Confirmation...');
  const paymentResult = await sendInvoicePaymentConfirmation({
    to: testEmail,
    invoiceNumber: 'INV-2025-001',
    clientName: 'Developer',
    companyName: 'Zenora',
    paidDate: '2024-12-30',
    total: 5000.00,
    currency: 'USD',
  });
  results.push({ name: 'Payment Confirmation', success: paymentResult });
  console.log(paymentResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 11. Leave Approved Email (template function)
  console.log('\n11. Sending Leave Approved Email...');
  const leaveApproved = getLeaveApprovedEmail({
    employeeName: 'Developer',
    leaveType: 'Annual Leave',
    startDate: '2025-01-15',
    endDate: '2025-01-20',
    days: 5,
  });
  const leaveApprovedResult = await sendEmailDirect(
    leaveApproved.subject,
    leaveApproved.html,
    'Your leave request has been approved.'
  );
  results.push({ name: 'Leave Approved', success: leaveApprovedResult });
  console.log(leaveApprovedResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 12. Leave Rejected Email (template function)
  console.log('\n12. Sending Leave Rejected Email...');
  const leaveRejected = getLeaveRejectedEmail({
    employeeName: 'Developer',
    leaveType: 'Sick Leave',
    startDate: '2025-01-10',
    endDate: '2025-01-12',
    days: 2,
    reason: 'Insufficient leave balance. Please check your available leave days.',
  });
  const leaveRejectedResult = await sendEmailDirect(
    leaveRejected.subject,
    leaveRejected.html,
    'Your leave request has been rejected.'
  );
  results.push({ name: 'Leave Rejected', success: leaveRejectedResult });
  console.log(leaveRejectedResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 13. Timesheet Approved Email (template function)
  console.log('\n13. Sending Timesheet Approved Email...');
  const timesheetApproved = getTimesheetApprovedEmail({
    employeeName: 'Developer',
    weekStart: '2024-12-23',
    weekEnd: '2024-12-29',
    totalHours: 40,
  });
  const timesheetApprovedResult = await sendEmailDirect(
    timesheetApproved.subject,
    timesheetApproved.html,
    'Your timesheet has been approved.'
  );
  results.push({ name: 'Timesheet Approved', success: timesheetApprovedResult });
  console.log(timesheetApprovedResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 14. Timesheet Rejected Email (template function)
  console.log('\n14. Sending Timesheet Rejected Email...');
  const timesheetRejected = getTimesheetRejectedEmail({
    employeeName: 'Developer',
    weekStart: '2024-12-16',
    weekEnd: '2024-12-22',
    totalHours: 35,
    reason: 'Missing project codes for 3 entries. Please add the correct project codes and resubmit.',
  });
  const timesheetRejectedResult = await sendEmailDirect(
    timesheetRejected.subject,
    timesheetRejected.html,
    'Your timesheet has been rejected.'
  );
  results.push({ name: 'Timesheet Rejected', success: timesheetRejectedResult });
  console.log(timesheetRejectedResult ? '   ✅ Sent' : '   ❌ Failed');
  await delay(1000);

  // 15. Task Assigned Email (template function)
  console.log('\n15. Sending Task Assigned Email (getTaskAssignedEmail)...');
  const taskAssigned = getTaskAssignedEmail({
    employeeName: 'Developer',
    taskName: 'Review Q4 Reports',
    description: 'Review and approve the Q4 financial reports before the deadline.',
    dueDate: '2025-01-10',
    projectName: 'Finance Review',
    assignedBy: 'Finance Manager',
  });
  const taskAssigned2Result = await sendEmailDirect(
    taskAssigned.subject,
    taskAssigned.html,
    'You have been assigned a new task.'
  );
  results.push({ name: 'Task Assigned (template)', success: taskAssigned2Result });
  console.log(taskAssigned2Result ? '   ✅ Sent' : '   ❌ Failed');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal: ${results.length} emails`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  console.log('\nDetailed Results:');
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.name}: ${r.success ? '✅' : '❌'}`);
  });

  console.log('\n📬 Check your inbox at:', testEmail);
}

main().catch(console.error);
