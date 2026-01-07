/**
 * Test script to send all active email notifications to a test email address
 * Run with: RESEND_API_KEY="your-key" npx tsx scripts/test-email-templates.ts
 */

import {
  notifyManagerTimesheetSubmitted,
  notifyEmployeeTimesheetApproved,
  notifyEmployeeTimesheetRejected,
  notifyManagerLeaveRequested,
  notifyEmployeeLeaveApproved,
  notifyEmployeeLeaveRejected,
  notifyManagerExpenseSubmitted,
  notifyEmployeeExpenseApproved,
  notifyEmployeeExpenseRejected,
  notifyEmployeeTaskAssigned,
  notifyEmployeeRoleAssigned,
  notifyManagerNewEmployeeAssigned,
} from '../lib/email-notifications';

import {
  sendMagicLinkEmail,
  sendOnboardingInvite,
  sendOnboardingApprovalEmail,
  sendChangesRequestedEmail,
  sendInvoiceEmail,
  sendInvoicePaymentConfirmation,
} from '../lib/resend-email';

const TEST_EMAIL = 'nbhupathi@gmail.com';
const DELAY_MS = 3000; // 3 seconds between emails to avoid rate limiting

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function testAllEmails() {
  console.log('🚀 Starting email template tests...\n');
  console.log(`📧 Sending all test emails to: ${TEST_EMAIL}\n`);

  let successCount = 0;
  let failCount = 0;

  // 1. Magic Link Email
  console.log('1/18. Testing: sendMagicLinkEmail');
  try {
    await sendMagicLinkEmail({
      to: TEST_EMAIL,
      code: '123456',
      magicLink: 'https://zenora.ai/auth/verify?token=test-token-123',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 2. Onboarding Invite
  console.log('2/18. Testing: sendOnboardingInvite');
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days
    await sendOnboardingInvite({
      to: TEST_EMAIL,
      invitedBy: 'HR Team',
      token: 'test-onboard-123',
      expiresAt,
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 3. Onboarding Approval
  console.log('3/18. Testing: sendOnboardingApprovalEmail');
  try {
    await sendOnboardingApprovalEmail({
      to: TEST_EMAIL,
      employeeName: 'Test Employee',
      companyName: 'Zenora Test Company',
      loginUrl: 'https://zenora.ai/login',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 4. Changes Requested
  console.log('4/18. Testing: sendChangesRequestedEmail');
  try {
    await sendChangesRequestedEmail({
      to: TEST_EMAIL,
      employeeName: 'Test Employee',
      feedback: 'Please update your emergency contact information and upload a clearer profile photo.',
      onboardingUrl: 'https://zenora.ai/onboard',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 5. Manager Timesheet Submitted
  console.log('5/18. Testing: notifyManagerTimesheetSubmitted');
  try {
    await notifyManagerTimesheetSubmitted({
      managerEmail: TEST_EMAIL,
      managerName: 'Test Manager',
      employeeName: 'John Developer',
      weekStart: 'Dec 2, 2024',
      weekEnd: 'Dec 8, 2024',
      totalHours: 42.5,
      reviewUrl: 'https://zenora.ai/manager/timesheets',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 6. Employee Timesheet Approved
  console.log('6/18. Testing: notifyEmployeeTimesheetApproved');
  try {
    await notifyEmployeeTimesheetApproved({
      employeeEmail: TEST_EMAIL,
      employeeName: 'Test Employee',
      weekStart: 'Dec 2, 2024',
      weekEnd: 'Dec 8, 2024',
      totalHours: 42.5,
      approvedBy: 'Sarah Manager',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 7. Employee Timesheet Rejected
  console.log('7/18. Testing: notifyEmployeeTimesheetRejected');
  try {
    await notifyEmployeeTimesheetRejected({
      employeeEmail: TEST_EMAIL,
      employeeName: 'Test Employee',
      weekStart: 'Dec 2, 2024',
      weekEnd: 'Dec 8, 2024',
      totalHours: 42.5,
      rejectedBy: 'Sarah Manager',
      reason: 'Please add more details to the project descriptions and verify the hours for Wednesday.',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 8. Manager Leave Requested
  console.log('8/18. Testing: notifyManagerLeaveRequested');
  try {
    await notifyManagerLeaveRequested({
      managerEmail: TEST_EMAIL,
      managerName: 'Test Manager',
      employeeName: 'John Developer',
      leaveType: 'Annual Leave',
      startDate: 'Dec 20, 2024',
      endDate: 'Dec 27, 2024',
      days: 5,
      reason: 'Family vacation for the holidays',
      reviewUrl: 'https://zenora.ai/manager/leave-approvals',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 9. Employee Leave Approved
  console.log('9/18. Testing: notifyEmployeeLeaveApproved');
  try {
    await notifyEmployeeLeaveApproved({
      employeeEmail: TEST_EMAIL,
      employeeName: 'Test Employee',
      leaveType: 'Annual Leave',
      startDate: 'Dec 20, 2024',
      endDate: 'Dec 27, 2024',
      days: 5,
      approvedBy: 'Sarah Manager',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 10. Employee Leave Rejected
  console.log('10/18. Testing: notifyEmployeeLeaveRejected');
  try {
    await notifyEmployeeLeaveRejected({
      employeeEmail: TEST_EMAIL,
      employeeName: 'Test Employee',
      leaveType: 'Annual Leave',
      startDate: 'Dec 20, 2024',
      endDate: 'Dec 27, 2024',
      days: 5,
      rejectedBy: 'Sarah Manager',
      reason: 'Unfortunately, this period conflicts with an important project deadline. Please consider alternative dates.',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 11. Manager Expense Submitted
  console.log('11/18. Testing: notifyManagerExpenseSubmitted');
  try {
    await notifyManagerExpenseSubmitted({
      managerEmail: TEST_EMAIL,
      managerName: 'Test Manager',
      employeeName: 'John Developer',
      expenseTitle: 'Client Meeting - Travel & Meals',
      amount: 245.50,
      currency: 'USD',
      category: 'Travel',
      expenseDate: 'Dec 5, 2024',
      reviewUrl: 'https://zenora.ai/manager/expenses',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 12. Employee Expense Approved
  console.log('12/18. Testing: notifyEmployeeExpenseApproved');
  try {
    await notifyEmployeeExpenseApproved({
      employeeEmail: TEST_EMAIL,
      employeeName: 'Test Employee',
      expenseTitle: 'Client Meeting - Travel & Meals',
      amount: 245.50,
      currency: 'USD',
      approvedBy: 'Sarah Manager',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 13. Employee Expense Rejected
  console.log('13/18. Testing: notifyEmployeeExpenseRejected');
  try {
    await notifyEmployeeExpenseRejected({
      employeeEmail: TEST_EMAIL,
      employeeName: 'Test Employee',
      expenseTitle: 'Client Meeting - Travel & Meals',
      amount: 245.50,
      currency: 'USD',
      rejectedBy: 'Sarah Manager',
      reason: 'Missing receipt for the meal expense. Please upload the receipt and resubmit.',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 14. Employee Task Assigned
  console.log('14/18. Testing: notifyEmployeeTaskAssigned');
  try {
    await notifyEmployeeTaskAssigned({
      employeeEmail: TEST_EMAIL,
      employeeName: 'Test Employee',
      taskName: 'Implement User Dashboard',
      taskDescription: 'Create a responsive dashboard with analytics widgets showing user activity and key metrics.',
      dueDate: 'Dec 15, 2024',
      projectName: 'Zenora Platform v2.0',
      assignedBy: 'Sarah Manager',
      taskUrl: 'https://zenora.ai/employee/tasks',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 15. Employee Role Assigned
  console.log('15/18. Testing: notifyEmployeeRoleAssigned');
  try {
    await notifyEmployeeRoleAssigned({
      employeeEmail: TEST_EMAIL,
      employeeName: 'Test Employee',
      role: 'Senior Developer',
      jobTitle: 'Senior Software Engineer',
      department: 'Engineering',
      managerName: 'Sarah Manager',
      organizationName: 'Zenora Test Company',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 16. Manager New Employee Assigned
  console.log('16/18. Testing: notifyManagerNewEmployeeAssigned');
  try {
    await notifyManagerNewEmployeeAssigned({
      managerEmail: TEST_EMAIL,
      managerName: 'Test Manager',
      employeeName: 'New Team Member',
      employeeEmail: 'new.member@example.com',
      role: 'Developer',
      jobTitle: 'Software Engineer',
      department: 'Engineering',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 17. Invoice Email (without PDF for test)
  console.log('17/18. Testing: sendInvoiceEmail');
  try {
    await sendInvoiceEmail({
      to: TEST_EMAIL,
      invoiceNumber: 'INV-2024-001',
      clientName: 'Test Client',
      companyName: 'Zenora Test Company',
      issueDate: 'Dec 1, 2024',
      dueDate: 'Dec 31, 2024',
      total: 5000.00,
      currency: 'USD',
      lineItems: [
        { description: 'Web Development Services', quantity: 40, rate: 100, amount: 4000 },
        { description: 'UI/UX Design', quantity: 10, rate: 100, amount: 1000 },
      ],
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }
  await sleep(DELAY_MS);

  // 18. Invoice Payment Confirmation
  console.log('18/18. Testing: sendInvoicePaymentConfirmation');
  try {
    await sendInvoicePaymentConfirmation({
      to: TEST_EMAIL,
      invoiceNumber: 'INV-2024-001',
      clientName: 'Test Client',
      companyName: 'Zenora Test Company',
      paidDate: 'Dec 7, 2024',
      total: 5000.00,
      currency: 'USD',
    });
    console.log('   ✅ Success\n');
    successCount++;
  } catch (err) {
    console.log(`   ❌ Failed: ${err}\n`);
    failCount++;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n📊 Test Results:`);
  console.log(`   ✅ Successful: ${successCount}/18`);
  console.log(`   ❌ Failed: ${failCount}/18`);
  console.log(`\n📧 All emails sent to: ${TEST_EMAIL}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Run the test
testAllEmails().catch(console.error);
