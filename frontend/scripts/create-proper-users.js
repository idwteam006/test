const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createProperUsers() {
  try {
    console.log('🔧 Creating Proper Admin and Manager Users\n');

    // Get tenant and department
    const tenant = await prisma.tenant.findFirst({
      where: { name: 'ADD Technologies' }
    });

    if (!tenant) {
      console.error('❌ Tenant not found');
      return;
    }

    let department = await prisma.department.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'Administration'
      }
    });

    if (!department) {
      console.log('📝 Creating Administration department...');
      department = await prisma.department.create({
        data: {
          tenantId: tenant.id,
          name: 'Administration'
        }
      });
      console.log('✅ Department created\n');
    }

    console.log('🏢 Tenant:', tenant.name);
    console.log('🏭 Department:', department.name);
    console.log('');

    // 1. Delete the typo email
    console.log('🗑️  Removing typo email: info@adtchno.com');
    await prisma.user.deleteMany({
      where: { email: 'info@adtchno.com' }
    });
    console.log('✅ Removed\n');

    // 2. Create Admin User
    console.log('👤 Creating Admin User...');
    const adminPassword = await bcrypt.hash('temp123', 12);

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@addtechno.com',
        firstName: 'System',
        lastName: 'Admin',
        name: 'System Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        tenantId: tenant.id,
        departmentId: department.id,
        password: adminPassword,
        emailVerified: true,
        employeeId: 'EMP-ADM-001',
      }
    });

    console.log('✅ Admin Created:', adminUser.email);
    console.log('');

    // 3. Create Manager User with complete Employee record
    console.log('👤 Creating Manager User with Employee Profile...');
    const managerPassword = await bcrypt.hash('temp123', 12);

    const managerUser = await prisma.user.create({
      data: {
        email: 'manager@addtechno.com',
        firstName: 'John',
        lastName: 'Manager',
        name: 'John Manager',
        role: 'MANAGER',
        status: 'ACTIVE',
        tenantId: tenant.id,
        departmentId: department.id,
        password: managerPassword,
        emailVerified: true,
        employeeId: 'EMP-MGR-001',
      }
    });

    console.log('✅ Manager User Created:', managerUser.email);

    // 4. Create Employee record for Manager
    const managerEmployee = await prisma.employee.create({
      data: {
        tenantId: tenant.id,
        userId: managerUser.id,
        employeeNumber: 'EMP-MGR-001',
        departmentId: department.id,
        jobTitle: 'Department Manager',
        managerId: null, // Manager has no manager
        startDate: new Date('2024-01-01'),
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        emergencyContacts: {
          primary: {
            name: 'Emergency Contact',
            relationship: 'Spouse',
            phone: '+1234567890'
          }
        }
      }
    });

    console.log('✅ Manager Employee Record Created');

    // 5. Create Employee Profile for Manager
    const managerProfile = await prisma.employeeProfile.create({
      data: {
        userId: managerUser.id,
        tenantId: tenant.id,
        middleName: 'M',
        preferredName: 'John',
        dateOfBirth: new Date('1985-05-15'),
        gender: 'Male',
        personalEmail: 'john.personal@gmail.com',
        personalPhone: '+1234567890',
        bloodGroup: 'O+',
        currentAddress: {
          street: '123 Manager Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        permanentAddress: {
          street: '123 Manager Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        sameAsCurrentAddress: true,
        highestQualification: 'MBA',
        university: 'Harvard Business School',
        yearOfPassing: 2010,
        fieldOfStudy: 'Business Administration',
        previousCompany: 'Tech Corp Inc',
        previousDesignation: 'Senior Manager',
        yearsOfExperience: 12,
        skills: {
          technical: ['Leadership', 'Project Management', 'Strategy'],
          soft: ['Communication', 'Team Building', 'Decision Making']
        },
        linkedinUrl: 'https://linkedin.com/in/johnmanager',
        portfolioUrl: 'https://johnmanager.com',
        emergencyContactName: 'Jane Manager',
        emergencyRelationship: 'Spouse',
        emergencyPhone: '+1234567890',
        emergencyEmail: 'jane@example.com',
        accountHolderName: 'John M Manager',
        accountNumber: '1234567890',
        bankName: 'Chase Bank',
        ifscCode: 'CHAS0001234',
        branchName: 'New York Main',
        accountType: 'Savings',
        maritalStatus: 'Married',
        informationAccurate: true,
        agreeToPolocies: true,
        consentVerification: true,
        codeOfConductAgreement: true,
        dataPrivacyConsent: true,
      }
    });

    console.log('✅ Manager Employee Profile Created');
    console.log('');

    // Summary
    console.log('=' .repeat(80));
    console.log('\n✅ USERS CREATED SUCCESSFULLY\n');
    console.log('=' .repeat(80));

    console.log('\n🔹 ADMIN:');
    console.log('   Email: admin@addtechno.com');
    console.log('   Name: System Admin');
    console.log('   Role: ADMIN');
    console.log('   Employee ID: EMP-ADM-001');
    console.log('   Status: ACTIVE');

    console.log('\n🔹 MANAGER:');
    console.log('   Email: manager@addtechno.com');
    console.log('   Name: John Manager');
    console.log('   Role: MANAGER');
    console.log('   Employee ID: EMP-MGR-001');
    console.log('   Job Title: Department Manager');
    console.log('   Department: Administration');
    console.log('   Status: ACTIVE');
    console.log('   ✅ Employee Record: Created');
    console.log('   ✅ Employee Profile: Complete with all details');

    console.log('\n🔑 LOGIN (Development Mode):');
    console.log('   OTP: 123456');
    console.log('   Emails:');
    console.log('     • admin@addtechno.com');
    console.log('     • manager@addtechno.com');

    console.log('\n' + '=' .repeat(80) + '\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createProperUsers();
