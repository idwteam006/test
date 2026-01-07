const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createDemoUsers() {
  console.log('🚀 CREATING DEMO USERS\n');
  console.log('='.repeat(80));

  try {
    // Get Demo Organization tenant
    const tenant = await prisma.tenant.findFirst({
      where: { name: 'Demo Organization' }
    });

    if (!tenant) {
      console.log('❌ Demo Organization tenant not found!');
      return;
    }

    console.log('✅ Found tenant:', tenant.name, '\n');

    // Get Administration department
    let department = await prisma.department.findFirst({
      where: { tenantId: tenant.id, name: 'Administration' }
    });

    if (!department) {
      console.log('📝 Creating Administration department...');
      department = await prisma.department.create({
        data: {
          tenantId: tenant.id,
          name: 'Administration',
          description: 'Administrative department for demo users'
        }
      });
      console.log('✅ Created Administration department\n');
    }

    // Demo users to create
    const demoUsers = [
      {
        email: 'admin@demo.com',
        firstName: 'Admin',
        lastName: 'Demo',
        role: 'ADMIN',
        employeeId: 'EMP-ADMIN-DEMO',
        jobTitle: 'System Administrator'
      },
      {
        email: 'manager@demo.com',
        firstName: 'Manager',
        lastName: 'Demo',
        role: 'MANAGER',
        employeeId: 'EMP-MANAGER-DEMO',
        jobTitle: 'Department Manager'
      },
      {
        email: 'hr@demo.com',
        firstName: 'HR',
        lastName: 'Demo',
        role: 'HR',
        employeeId: 'EMP-HR-DEMO',
        jobTitle: 'HR Manager'
      },
      {
        email: 'accountant@demo.com',
        firstName: 'Accountant',
        lastName: 'Demo',
        role: 'ACCOUNTANT',
        employeeId: 'EMP-ACCOUNTANT-DEMO',
        jobTitle: 'Senior Accountant'
      }
    ];

    console.log('👥 Creating demo users...\n');

    for (const userData of demoUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⚠️  User already exists: ${userData.email}`);

        // Update to ensure correct role
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            role: userData.role,
            status: 'ACTIVE',
            employeeId: userData.employeeId
          }
        });
        console.log(`   ✅ Updated role to: ${userData.role}\n`);
        continue;
      }

      // Create User
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          name: `${userData.firstName} ${userData.lastName}`,
          role: userData.role,
          status: 'ACTIVE',
          tenantId: tenant.id,
          departmentId: department.id,
          employeeId: userData.employeeId,
          password: 'dummy-password-not-used',
          emailVerified: true,
        }
      });

      console.log(`✅ Created user: ${user.email} (${user.role})`);

      // Create Employee record
      const employee = await prisma.employee.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          employeeNumber: userData.employeeId,
          jobTitle: userData.jobTitle,
          departmentId: department.id,
          startDate: new Date('2024-01-01'),
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          emergencyContacts: {
            name: 'Emergency Contact',
            relationship: 'Family',
            phone: '+1-555-0000',
            email: 'emergency@demo.com'
          }
        }
      });

      console.log(`   ✅ Created employee record: ${employee.employeeNumber}`);

      // Create EmployeeProfile
      const profile = await prisma.employeeProfile.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          dateOfBirth: new Date('1990-01-01'),
          personalEmail: `${userData.firstName.toLowerCase()}.personal@demo.com`,
          personalPhone: '+1-555-0100',
          currentAddress: {
            street: '123 Demo Street',
            city: 'Demo City',
            state: 'CA',
            zipCode: '90001',
            country: 'United States'
          },
          permanentAddress: {
            street: '123 Demo Street',
            city: 'Demo City',
            state: 'CA',
            zipCode: '90001',
            country: 'United States'
          },
          highestQualification: 'Bachelor\'s Degree',
          university: 'Demo University',
          fieldOfStudy: 'Business Administration',
          yearOfPassing: 2015,
          yearsOfExperience: 5,
          skills: {
            technical: ['Leadership', 'Management', 'Administration'],
            soft: ['Communication', 'Problem Solving', 'Team Work'],
            languages: ['English']
          },
          emergencyRelationship: 'Family',
          emergencyPhone: '+1-555-0000',
          accountHolderName: `${userData.firstName} ${userData.lastName}`,
          bankName: 'Demo Bank',
          accountNumber: 'DEMO' + Math.random().toString().substr(2, 10),
          ifscCode: 'DEMO0001234',
          informationAccurate: true,
          agreeToPolocies: true,
          consentVerification: true,
          codeOfConductAgreement: true,
          dataPrivacyConsent: true,
        }
      });

      console.log(`   ✅ Created employee profile\n`);
    }

    // Update amy.barnes@demo.com if exists
    const amyUser = await prisma.user.findUnique({
      where: { email: 'amy.barnes@demo.com' }
    });

    if (amyUser) {
      console.log('✅ amy.barnes@demo.com already exists (from seeded employees)\n');
    } else {
      console.log('⚠️  amy.barnes@demo.com not found (should exist from seed)\n');
    }

    console.log('='.repeat(80));
    console.log('\n✅ DEMO USERS CREATED!\n');
    console.log('📧 Login Emails:');
    console.log('   • admin@demo.com (ADMIN)');
    console.log('   • manager@demo.com (MANAGER)');
    console.log('   • hr@demo.com (HR)');
    console.log('   • accountant@demo.com (ACCOUNTANT)');
    console.log('   • amy.barnes@demo.com (EMPLOYEE)\n');
    console.log('🔑 OTP for all users: 123456 (Development Mode)\n');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error creating demo users:', error);
    throw error;
  }
}

createDemoUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
