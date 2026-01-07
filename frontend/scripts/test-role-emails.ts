import { notifyEmployeeRoleAssigned, notifyManagerNewEmployeeAssigned } from '../lib/email-notifications';

async function testRoleEmails() {
  console.log('Testing role assignment email notifications...\n');

  try {
    // Test 1: Employee Role Assignment Email
    console.log('1. Sending employee role assignment email...');
    const employeeResult = await notifyEmployeeRoleAssigned({
      employeeEmail: 'nbhupathi@gmail.com',
      employeeName: 'Nikhil Bhupathi',
      role: 'EMPLOYEE',
      jobTitle: 'Senior Software Engineer',
      departmentName: 'Engineering',
      managerName: 'John Smith',
      organizationName: 'Zenora Tech Solutions',
      assignedBy: 'Admin User',
    });

    if (employeeResult) {
      console.log('✅ Employee role assignment email sent successfully\n');
    } else {
      console.log('❌ Failed to send employee role assignment email\n');
    }

    // Test 2: Manager New Employee Assignment Email
    console.log('2. Sending manager new employee assignment email...');
    const managerResult = await notifyManagerNewEmployeeAssigned({
      managerEmail: 'nbhupathi@gmail.com',
      managerName: 'Nikhil Bhupathi',
      employeeName: 'Jane Doe',
      employeeEmail: 'jane.doe@example.com',
      role: 'EMPLOYEE',
      jobTitle: 'Junior Developer',
      departmentName: 'Engineering',
      organizationName: 'Zenora Tech Solutions',
      assignedBy: 'Admin User',
    });

    if (managerResult) {
      console.log('✅ Manager new employee assignment email sent successfully\n');
    } else {
      console.log('❌ Failed to send manager new employee assignment email\n');
    }

    console.log('='.repeat(60));
    console.log('Email testing completed!');
    console.log('Check your inbox at nbhupathi@gmail.com');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error testing emails:', error);
  }
}

testRoleEmails();
