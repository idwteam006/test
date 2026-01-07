import { notifyAdminNewSystemUser } from '../lib/email-notifications';

async function testNewEmailTemplate() {
  console.log('🧪 Testing New System User Email Template\n');
  console.log('Sending test email to: nbhupathi@gmail.com\n');

  try {
    const result = await notifyAdminNewSystemUser({
      adminEmail: 'nbhupathi@gmail.com',
      adminName: 'Naveen',
      newUserName: 'John Smith',
      newUserEmail: 'john.smith@example.com',
      newUserRole: 'MANAGER',
      organizationName: 'Acme Corporation',
      createdByName: 'Sarah Johnson (HR)',
    });

    if (result) {
      console.log('✅ Test email sent successfully!');
      console.log('📧 Check nbhupathi@gmail.com inbox\n');
      console.log('Template Details:');
      console.log('  - Professional, lightweight design');
      console.log('  - Clean white card layout');
      console.log('  - Modern table-based structure');
      console.log('  - Role badge color: Blue (#2563eb) for MANAGER');
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

testNewEmailTemplate();
