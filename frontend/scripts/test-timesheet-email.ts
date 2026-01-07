import { notifyEmployeeTimesheetApproved } from '../lib/email-notifications';

async function testTimesheetEmailTemplate() {
  console.log('🧪 Testing Timesheet Approved Email Template\n');
  console.log('Sending test email to: nbhupathi@gmail.com\n');

  try {
    const result = await notifyEmployeeTimesheetApproved({
      employeeEmail: 'nbhupathi@gmail.com',
      employeeName: 'Naveen',
      weekStart: 'Dec 16, 2024',
      weekEnd: 'Dec 22, 2024',
      totalHours: 40,
      approvedBy: 'Sarah Johnson (Manager)',
    });

    if (result) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Check nbhupathi@gmail.com inbox\n');
      console.log('Template Details:');
      console.log('  - Professional, lightweight design');
      console.log('  - Clean white card layout');
      console.log('  - Green "APPROVED" badge');
      console.log('  - Modern table-based structure');
      console.log('  - Green CTA button (#059669)');
    } else {
      console.log('❌ Failed to send test email');
    }
  } catch (error) {
    console.error('❌ Error sending test email:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

testTimesheetEmailTemplate();
