/**
 * Script to create ADD Technologies organization with 20 employees
 * Run with: npx tsx scripts/create-add-technologies.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Employee data with specified emails and demo users
const employees = [
  // Specified employees
  { email: 'info@addtechno.com', firstName: 'Admin', lastName: 'Addtech', role: 'ADMIN', jobTitle: 'System Administrator', department: 'Administration', isManager: false },
  { email: 'bhupathi@addtechno.com', firstName: 'Bhupathi', lastName: 'Kumar', role: 'HR', jobTitle: 'HR Manager', department: 'Human Resources', isManager: true },
  { email: 'anil@addtechno.com', firstName: 'Anil', lastName: 'Kumar', role: 'EMPLOYEE', jobTitle: 'Senior Software Engineer', department: 'Engineering', isManager: false },
  { email: 'tech@addtechno.com', firstName: 'Tech', lastName: 'Lead', role: 'MANAGER', jobTitle: 'Technical Lead', department: 'Engineering', isManager: true },
  { email: 'developer@addtechno.com', firstName: 'Dev', lastName: 'Sharma', role: 'EMPLOYEE', jobTitle: 'Full Stack Developer', department: 'Engineering', isManager: false },

  // Additional demo employees - Engineering
  { email: 'rahul.dev@addtechno.com', firstName: 'Rahul', lastName: 'Verma', role: 'EMPLOYEE', jobTitle: 'Backend Developer', department: 'Engineering', isManager: false },
  { email: 'priya.frontend@addtechno.com', firstName: 'Priya', lastName: 'Singh', role: 'EMPLOYEE', jobTitle: 'Frontend Developer', department: 'Engineering', isManager: false },
  { email: 'amit.devops@addtechno.com', firstName: 'Amit', lastName: 'Patel', role: 'EMPLOYEE', jobTitle: 'DevOps Engineer', department: 'Engineering', isManager: false },
  { email: 'neha.qa@addtechno.com', firstName: 'Neha', lastName: 'Gupta', role: 'EMPLOYEE', jobTitle: 'QA Engineer', department: 'Engineering', isManager: false },
  { email: 'vijay.arch@addtechno.com', firstName: 'Vijay', lastName: 'Reddy', role: 'MANAGER', jobTitle: 'Solution Architect', department: 'Engineering', isManager: true },

  // Product & Design
  { email: 'sneha.pm@addtechno.com', firstName: 'Sneha', lastName: 'Iyer', role: 'MANAGER', jobTitle: 'Product Manager', department: 'Product', isManager: true },
  { email: 'arjun.design@addtechno.com', firstName: 'Arjun', lastName: 'Nair', role: 'EMPLOYEE', jobTitle: 'UI/UX Designer', department: 'Product', isManager: false },

  // Sales & Marketing
  { email: 'ravi.sales@addtechno.com', firstName: 'Ravi', lastName: 'Krishnan', role: 'MANAGER', jobTitle: 'Sales Manager', department: 'Sales', isManager: true },
  { email: 'divya.marketing@addtechno.com', firstName: 'Divya', lastName: 'Menon', role: 'EMPLOYEE', jobTitle: 'Marketing Executive', department: 'Marketing', isManager: false },

  // Finance & Accounts
  { email: 'suresh.finance@addtechno.com', firstName: 'Suresh', lastName: 'Rao', role: 'ACCOUNTANT', jobTitle: 'Senior Accountant', department: 'Finance', isManager: false },
  { email: 'lakshmi.accounts@addtechno.com', firstName: 'Lakshmi', lastName: 'Devi', role: 'EMPLOYEE', jobTitle: 'Accounts Executive', department: 'Finance', isManager: false },

  // Operations & Support
  { email: 'kiran.ops@addtechno.com', firstName: 'Kiran', lastName: 'Sharma', role: 'MANAGER', jobTitle: 'Operations Manager', department: 'Operations', isManager: true },
  { email: 'meera.support@addtechno.com', firstName: 'Meera', lastName: 'Joshi', role: 'EMPLOYEE', jobTitle: 'Customer Support Lead', department: 'Customer Support', isManager: false },

  // Data & Analytics
  { email: 'sanjay.data@addtechno.com', firstName: 'Sanjay', lastName: 'Mishra', role: 'EMPLOYEE', jobTitle: 'Data Analyst', department: 'Data & Analytics', isManager: false },
  { email: 'pooja.bi@addtechno.com', firstName: 'Pooja', lastName: 'Agarwal', role: 'EMPLOYEE', jobTitle: 'BI Developer', department: 'Data & Analytics', isManager: false },
];

// Department list
const departments = [
  'Administration',
  'Engineering',
  'Human Resources',
  'Finance',
  'Marketing',
  'Sales',
  'Operations',
  'Customer Support',
  'Product',
  'Data & Analytics',
];

async function createAddTechnologies() {
  console.log('\n🏢 Creating ADD Technologies Organization\n');
  console.log('─'.repeat(60));

  try {
    // 1. Create Tenant
    console.log('\n1️⃣  Creating tenant...');
    const tenant = await prisma.tenant.create({
      data: {
        name: 'ADD Technologies',
        slug: 'add-technologies',
        isActive: true,
      },
    });
    console.log('   ✓ Tenant created:', tenant.id);

    // 2. Create Tenant Settings
    console.log('\n2️⃣  Creating tenant settings...');
    await prisma.tenantSettings.create({
      data: {
        tenantId: tenant.id,
        companyName: 'ADD Technologies',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        workingHours: {
          start: '09:00',
          end: '18:00',
          daysPerWeek: 5,
        },
        leavePolicies: {
          annual: 20,
          sick: 12,
          casual: 6,
        },
      },
    });
    console.log('   ✓ Tenant settings created');

    // 3. Create Departments
    console.log('\n3️⃣  Creating departments...');
    const deptMap: Record<string, string> = {};
    for (const deptName of departments) {
      const dept = await prisma.department.create({
        data: {
          tenantId: tenant.id,
          name: deptName,
        },
      });
      deptMap[deptName] = dept.id;
      console.log('   ✓', deptName);
    }

    // 4. Create Users and Employees
    console.log('\n4️⃣  Creating employees...');
    const hashedPassword = await bcrypt.hash('Password@123', 10);
    const employeeMap: Record<string, string> = {};
    const userMap: Record<string, string> = {};

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const empNumber = `EMP-ADD-${String(i + 1).padStart(3, '0')}`;

      // Create User
      const user = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: emp.email,
          name: `${emp.firstName} ${emp.lastName}`,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role as any,
          password: hashedPassword,
          emailVerified: true,
          status: 'ACTIVE',
          isActive: true,
          departmentId: deptMap[emp.department],
          employeeId: empNumber,
        },
      });
      userMap[emp.email] = user.id;

      // Create Employee record
      const employee = await prisma.employee.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          employeeNumber: empNumber,
          departmentId: deptMap[emp.department],
          jobTitle: emp.jobTitle,
          startDate: new Date('2024-01-15'),
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          emergencyContacts: [],
        },
      });
      employeeMap[emp.email] = employee.id;

      console.log(`   ✓ ${emp.firstName} ${emp.lastName} (${emp.email}) - ${emp.jobTitle}`);
    }

    // 5. Set up reporting structure
    console.log('\n5️⃣  Setting up reporting structure...');

    // Tech Lead manages Engineering team
    const engineeringTeam = ['anil@addtechno.com', 'developer@addtechno.com', 'rahul.dev@addtechno.com',
                            'priya.frontend@addtechno.com', 'amit.devops@addtechno.com', 'neha.qa@addtechno.com'];
    for (const email of engineeringTeam) {
      await prisma.employee.update({
        where: { id: employeeMap[email] },
        data: { managerId: employeeMap['tech@addtechno.com'] },
      });
    }
    console.log('   ✓ Tech Lead manages Engineering team');

    // Solution Architect reports to Tech Lead
    await prisma.employee.update({
      where: { id: employeeMap['vijay.arch@addtechno.com'] },
      data: { managerId: employeeMap['tech@addtechno.com'] },
    });
    console.log('   ✓ Solution Architect reports to Tech Lead');

    // Product Manager manages Product team
    await prisma.employee.update({
      where: { id: employeeMap['arjun.design@addtechno.com'] },
      data: { managerId: employeeMap['sneha.pm@addtechno.com'] },
    });
    console.log('   ✓ Product Manager manages Design');

    // Sales Manager manages Marketing
    await prisma.employee.update({
      where: { id: employeeMap['divya.marketing@addtechno.com'] },
      data: { managerId: employeeMap['ravi.sales@addtechno.com'] },
    });
    console.log('   ✓ Sales Manager manages Marketing');

    // HR Manager manages Finance team
    const financeTeam = ['suresh.finance@addtechno.com', 'lakshmi.accounts@addtechno.com'];
    for (const email of financeTeam) {
      await prisma.employee.update({
        where: { id: employeeMap[email] },
        data: { managerId: employeeMap['bhupathi@addtechno.com'] },
      });
    }
    console.log('   ✓ HR Manager manages Finance team');

    // Operations Manager manages Support and Data teams
    const opsTeam = ['meera.support@addtechno.com', 'sanjay.data@addtechno.com', 'pooja.bi@addtechno.com'];
    for (const email of opsTeam) {
      await prisma.employee.update({
        where: { id: employeeMap[email] },
        data: { managerId: employeeMap['kiran.ops@addtechno.com'] },
      });
    }
    console.log('   ✓ Operations Manager manages Support & Data teams');

    // 6. Link Super Admin to ADD Technologies
    console.log('\n6️⃣  Linking Super Admin to ADD Technologies...');
    const superAdmin = await prisma.user.findFirst({
      where: { email: 'nbhupathi@gmail.com' },
    });

    if (superAdmin) {
      await prisma.user.update({
        where: { id: superAdmin.id },
        data: { tenantId: tenant.id },
      });
      console.log('   ✓ Super Admin linked to ADD Technologies');
    } else {
      console.log('   ⚠️ Super Admin not found, creating new...');
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: 'nbhupathi@gmail.com',
          name: 'Naga Vijay Bhupathi',
          firstName: 'Naga Vijay',
          lastName: 'Bhupathi',
          role: 'SUPER_ADMIN',
          password: hashedPassword,
          emailVerified: true,
          status: 'ACTIVE',
          isActive: true,
        },
      });
      console.log('   ✓ Super Admin created and linked');
    }

    console.log('\n' + '─'.repeat(60));
    console.log('✅ ADD Technologies organization created successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Tenant: ADD Technologies (${tenant.slug})`);
    console.log(`   • Departments: ${departments.length}`);
    console.log(`   • Employees: ${employees.length}`);
    console.log(`   • Super Admin: nbhupathi@gmail.com`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAddTechnologies();
