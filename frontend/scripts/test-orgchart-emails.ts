/**
 * Test Email Notifications for Org Chart Actions
 *
 * This script tests email notifications triggered from org-chart module:
 * 1. Add User → Welcome Email
 * 2. Assign Role → Role Assignment Email + Manager Notification
 *
 * Usage:
 * npx tsx scripts/test-orgchart-emails.ts <test-email@example.com>
 */

import { sendWelcomeEmail } from '../lib/resend-email';
import {
  notifyEmployeeRoleAssigned,
  notifyManagerNewEmployeeAssigned
} from '../lib/email-notifications';

async function testOrgChartEmails(testEmail: string) {
  console.log('🧪 Testing Org Chart Email Notifications...\n');
  console.log('Test email:', testEmail);
  console.log('-----------------------------------\n');

  // Test 1: Add User from Org Chart → Welcome Email
  console.log('1️⃣  Testing Add User Action (Welcome Email)...');
  try {
    const result1 = await sendWelcomeEmail(
      testEmail,
      'John',
      'Zenora Test Company'
    );

    if (result1) {
      console.log('   ✅ Welcome email sent successfully!');
      console.log('   📧 This email is sent when admin adds user from org-chart');
    } else {
      console.log('   ❌ Welcome email failed to send');
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('');

  // Test 2: Assign Role from Org Chart → Role Assignment Email
  console.log('2️⃣  Testing Assign Role Action (Role Assignment Email)...');
  try {
    const result2 = await notifyEmployeeRoleAssigned({
      employeeEmail: testEmail,
      employeeName: 'John Doe',
      role: 'MANAGER',
      jobTitle: 'Senior Project Manager',
      departmentName: 'Engineering',
      managerName: 'Jane Smith',
      organizationName: 'Zenora Test Company',
      assignedBy: 'Admin User',
    });

    if (result2) {
      console.log('   ✅ Role assignment email sent successfully!');
      console.log('   📧 This email is sent when admin assigns/changes role from org-chart');
    } else {
      console.log('   ❌ Role assignment email failed to send');
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('');

  // Test 3: Assign Manager → Manager Notification
  console.log('3️⃣  Testing Manager Assignment (Manager Notification Email)...');
  try {
    const result3 = await notifyManagerNewEmployeeAssigned({
      managerEmail: testEmail,
      managerName: 'Jane Smith',
      employeeName: 'John Doe',
      employeeEmail: 'john.doe@company.com',
      role: 'EMPLOYEE',
      jobTitle: 'Software Developer',
      departmentName: 'Engineering',
      organizationName: 'Zenora Test Company',
      assignedBy: 'Admin User',
    });

    if (result3) {
      console.log('   ✅ Manager notification email sent successfully!');
      console.log('   📧 This email is sent to manager when employee is assigned to them');
    } else {
      console.log('   ❌ Manager notification email failed to send');
    }
  } catch (error) {
    console.log('   ❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n-----------------------------------');
  console.log('📧 Org Chart email testing complete!');
  console.log('\nCheck your inbox at:', testEmail);
  console.log('\n🔍 Email Flow in Org Chart:');
  console.log('   1. Click "Add Report" on employee card');
  console.log('      → Calls /api/admin/system-users');
  console.log('      → Sends Welcome Email');
  console.log('');
  console.log('   2. Click "Assign Role" on employee card');
  console.log('      → Calls /api/admin/employees/[id]/assign-role');
  console.log('      → Sends Role Assignment Email to employee');
  console.log('      → Sends Manager Notification to new manager (if assigned)');
  console.log('');
  console.log('Note: All emails tested above are from real org-chart actions!');
}

// Get email from command line argument
const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Error: Please provide a test email address');
  console.log('\nUsage:');
  console.log('  npx tsx scripts/test-orgchart-emails.ts your-email@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(testEmail)) {
  console.error('❌ Error: Invalid email format');
  process.exit(1);
}

testOrgChartEmails(testEmail)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
