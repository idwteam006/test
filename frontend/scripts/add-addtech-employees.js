const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function addEmployeesToAddTech() {
  try {
    console.log('🔍 Finding ADD Technologies tenant...\n');

    // Find ADD Technologies tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        name: 'ADD Technologies',
      },
      include: {
        departments: true,
      }
    });

    if (!tenant) {
      console.log('❌ ADD Technologies tenant not found!');
      return;
    }

    console.log('✅ Found tenant:', tenant.name);
    console.log('   Tenant ID:', tenant.id);
    console.log('   Departments:', tenant.departments.map(d => d.name).join(', '));
    console.log('');

    // Get Engineering department (or create it if doesn't exist)
    let engDept = tenant.departments.find(d => d.name === 'Engineering');
    if (!engDept) {
      console.log('📁 Creating Engineering department...');
      engDept = await prisma.department.create({
        data: {
          name: 'Engineering',
          tenantId: tenant.id,
        }
      });
      console.log('✅ Created Engineering department\n');
    }

    // Get manager user (manager@addtechno.com)
    const manager = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: 'MANAGER',
      },
      include: {
        employee: true,
      }
    });

    if (!manager || !manager.employee) {
      console.log('❌ No manager with employee record found in ADD Technologies tenant!');
      return;
    }

    console.log('✅ Found manager:', manager.email);
    console.log('   Manager Employee ID:', manager.employee.id);
    console.log('');

    // Sample employees to create
    const employeesToCreate = [
      {
        email: 'alice.smith@addtechno.com',
        firstName: 'Alice',
        lastName: 'Smith',
        jobTitle: 'Senior Software Engineer',
      },
      {
        email: 'bob.johnson@addtechno.com',
        firstName: 'Bob',
        lastName: 'Johnson',
        jobTitle: 'Frontend Developer',
      },
      {
        email: 'carol.williams@addtechno.com',
        firstName: 'Carol',
        lastName: 'Williams',
        jobTitle: 'Backend Developer',
      },
      {
        email: 'david.brown@addtechno.com',
        firstName: 'David',
        lastName: 'Brown',
        jobTitle: 'DevOps Engineer',
      },
      {
        email: 'emma.davis@addtechno.com',
        firstName: 'Emma',
        lastName: 'Davis',
        jobTitle: 'QA Engineer',
      },
    ];

    console.log('👥 Creating', employeesToCreate.length, 'employees...\n');

    for (const emp of employeesToCreate) {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: emp.email },
      });

      if (existing) {
        console.log('⚠️  ', emp.email, 'already exists, skipping...');
        continue;
      }

      // Generate employee ID
      const employeeId = `EMP${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

      // Hash a default password (demo password: "password123")
      const hashedPassword = await bcrypt.hash('password123', 12);

      // Create User
      const user = await prisma.user.create({
        data: {
          email: emp.email,
          password: hashedPassword,
          firstName: emp.firstName,
          lastName: emp.lastName,
          name: `${emp.firstName} ${emp.lastName}`,
          employeeId: employeeId,
          role: 'EMPLOYEE',
          status: 'ACTIVE',
          tenantId: tenant.id,
          departmentId: engDept.id,
        }
      });

      // Create Employee record
      const employee = await prisma.employee.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          employeeNumber: employeeId,
          jobTitle: emp.jobTitle,
          departmentId: engDept.id,
          managerId: manager.employee.id, // Use manager's Employee ID, not User ID
          startDate: new Date(),
          employmentType: 'FULL_TIME',
          status: 'ACTIVE',
          emergencyContacts: [],
        }
      });

      // Create EmployeeProfile
      await prisma.employeeProfile.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          personalEmail: emp.email.replace('@addtechno.com', '@gmail.com'),
          personalPhone: `+1-555-${Math.floor(Math.random() * 9000 + 1000)}`,
          currentAddress: {
            street: `${Math.floor(Math.random() * 999 + 1)} Main Street`,
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            country: 'USA',
          },
          permanentAddress: {
            street: `${Math.floor(Math.random() * 999 + 1)} Main Street`,
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            country: 'USA',
          },
          sameAsCurrentAddress: true,
          highestQualification: 'Bachelor',
          university: 'University of California',
          yearOfPassing: 2018,
          yearsOfExperience: 5,
          skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
        }
      });

      console.log('✅ Created:', emp.email, '-', emp.jobTitle, '(' + employeeId + ')');
    }

    console.log('\n📊 Summary:');
    const totalUsers = await prisma.user.count({
      where: { tenantId: tenant.id }
    });
    const totalEmployees = await prisma.user.count({
      where: { tenantId: tenant.id, role: 'EMPLOYEE' }
    });

    console.log('   Total users in ADD Technologies:', totalUsers);
    console.log('   Total employees (EMPLOYEE role):', totalEmployees);
    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addEmployeesToAddTech();
