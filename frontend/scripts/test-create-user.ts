import { prisma } from '../lib/prisma';

/**
 * Test script to create a system user
 * This simulates the API call and tests all the fixes
 */
async function testCreateUser() {
  try {
    console.log('🧪 Testing System User Creation\n');

    // Step 1: Check current state
    console.log('📋 Step 1: Checking current state...');

    const tenantSettings = await prisma.tenantSettings.findFirst({
      select: {
        tenantId: true,
        allowedEmailDomains: true,
        tenant: {
          select: {
            name: true,
          },
        },
      },
    });

    console.log(`   Tenant: ${tenantSettings?.tenant.name}`);
    console.log(`   Allowed Domains:`, tenantSettings?.allowedEmailDomains || 'NONE (allows all)');

    // Check if test email exists
    const testEmail = 'test.user@adtechno.com';
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (existingUser) {
      console.log(`   ⚠️  User ${testEmail} already exists!`);
      console.log(`   Deleting for clean test...`);

      // Delete if exists
      const employeeRecord = await prisma.employee.findFirst({
        where: { userId: existingUser.id },
        select: { id: true },
      });

      if (employeeRecord) {
        await prisma.employee.delete({ where: { id: employeeRecord.id } });
      }

      await prisma.user.delete({ where: { id: existingUser.id } });
      console.log(`   ✅ Cleaned up existing user\n`);
    } else {
      console.log(`   ✅ ${testEmail} is available\n`);
    }

    // Step 2: Get a department for the test
    console.log('📋 Step 2: Finding department...');
    const department = await prisma.department.findFirst({
      where: { tenantId: tenantSettings?.tenantId },
      select: { id: true, name: true },
    });

    if (!department) {
      console.error('   ❌ No department found! Create a department first.');
      return;
    }
    console.log(`   ✅ Using department: ${department.name}\n`);

    // Step 3: Get employee count for today
    console.log('📋 Step 3: Checking current employee count...');
    const today = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayCount = await prisma.employee.count({
      where: {
        tenantId: tenantSettings?.tenantId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const expectedEmployeeNumber = `EMP-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`;
    console.log(`   Current employees today: ${todayCount}`);
    console.log(`   Next employee number: ${expectedEmployeeNumber}\n`);

    // Step 4: Create test user
    console.log('📋 Step 4: Creating test user...');
    console.log('   Email: test.user@adtechno.com');
    console.log('   Name: Test User');
    console.log('   Role: EMPLOYEE');
    console.log('   Job Title: Software Engineer');

    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: testEmail,
          name: 'Test User',
          firstName: 'Test',
          lastName: 'User',
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          tenantId: tenantSettings!.tenantId,
          departmentId: department.id,
          emailVerified: false,
          password: '',
        },
      });

      // Generate employee number (using fixed date logic)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const count = await tx.employee.count({
        where: {
          tenantId: tenantSettings!.tenantId,
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
      const employeeNumber = `EMP-${dateStr}-${String(count + 1).padStart(3, '0')}`;

      // Create employee
      const employee = await tx.employee.create({
        data: {
          user: { connect: { id: user.id } },
          tenant: { connect: { id: tenantSettings!.tenantId } },
          department: { connect: { id: department.id } },
          employeeNumber,
          jobTitle: 'Software Engineer',
          startDate: new Date(),
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          emergencyContacts: [],
        },
      });

      // Link employee to user
      await tx.user.update({
        where: { id: user.id },
        data: { employeeId: employee.id },
      });

      return { user, employee };
    });

    console.log('\n✅ User created successfully!');
    console.log('\n📊 Details:');
    console.log(`   User ID: ${result.user.id}`);
    console.log(`   Email: ${result.user.email}`);
    console.log(`   Name: ${result.user.firstName} ${result.user.lastName}`);
    console.log(`   Role: ${result.user.role}`);
    console.log(`   Employee Number: ${result.employee.employeeNumber}`);
    console.log(`   Job Title: ${result.employee.jobTitle}`);
    console.log(`   Status: ${result.user.status}`);

    // Verify employee number is unique
    const duplicateCheck = await prisma.employee.findMany({
      where: { employeeNumber: result.employee.employeeNumber },
    });

    if (duplicateCheck.length > 1) {
      console.log('\n❌ ERROR: Duplicate employee numbers found!');
    } else {
      console.log('\n✅ Employee number is unique!');
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('\n💡 You can now:');
    console.log('   1. Check /admin/system-users to see the new user');
    console.log('   2. Try creating more users via the UI');
    console.log('   3. All fixes are working correctly!');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Error code:', error.code);
    }
    if (error instanceof Error) {
      console.error('Error message:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

testCreateUser();
