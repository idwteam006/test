import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeUsers() {
  const emails = ['chetan.s@idwteam.com', 'nilesh.s@idwteam.com'];

  for (const email of emails) {
    console.log('\n' + '='.repeat(70));
    console.log('📧 Analyzing user:', email);
    console.log('='.repeat(70));

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            isActive: true,
          }
        },
        department: {
          select: {
            id: true,
            name: true,
          }
        },
        employee: {
          include: {
            department: true,
            manager: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    role: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log('❌ User not found');
      continue;
    }

    console.log('\n👤 USER INFO:');
    console.log('  ID:', user.id);
    console.log('  Name:', user.name);
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('  Status:', user.status);
    console.log('  Email Verified:', user.emailVerified);
    console.log('  Created:', user.createdAt.toISOString());

    console.log('\n🏢 TENANT INFO:');
    console.log('  Tenant:', user.tenant.name);
    console.log('  Tenant ID:', user.tenant.id);
    console.log('  Tenant Active:', user.tenant.isActive);

    console.log('\n📁 DEPARTMENT:');
    if (user.department) {
      console.log('  Department:', user.department.name);
      console.log('  Department ID:', user.department.id);
    } else {
      console.log('  ⚠️  No department assigned (user.departmentId is null)');
    }

    console.log('\n👷 EMPLOYEE RECORD:');
    if (user.employee) {
      console.log('  ✅ Employee record exists');
      console.log('  Employee ID:', user.employee.id);
      console.log('  Employee Number:', user.employee.employeeNumber);
      console.log('  Job Title:', user.employee.jobTitle || 'N/A');
      console.log('  Employment Type:', user.employee.employmentType);
      console.log('  Status:', user.employee.status);
      console.log('  Start Date:', user.employee.startDate?.toISOString().split('T')[0]);
      console.log('  Department:', user.employee.department?.name || 'N/A');

      if (user.employee.manager) {
        console.log('  Manager:', user.employee.manager.user?.name);
        console.log('  Manager Email:', user.employee.manager.user?.email);
        console.log('  Manager Role:', user.employee.manager.user?.role);
      } else {
        console.log('  Manager: None');
      }
    } else {
      console.log('  ❌ No employee record (this is the issue!)');
      console.log('  Note: Employee record is needed to show Employee ID');
    }

    console.log('\n🔗 RELATIONSHIPS:');
    console.log('  user.employeeId:', user.employeeId || 'null');
    console.log('  user.departmentId:', user.departmentId || 'null');
  }

  await prisma.$disconnect();
}

analyzeUsers().catch(console.error);
