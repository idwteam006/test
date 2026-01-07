import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExpenseIssue() {
  // 1. Get info@addtechno.com user
  const infoUser = await prisma.user.findUnique({
    where: { email: 'info@addtechno.com' },
    include: {
      employee: {
        include: {
          manager: {
            include: {
              user: { select: { email: true, name: true, role: true, id: true } }
            }
          }
        }
      },
      tenant: { select: { id: true, name: true, slug: true } }
    }
  });

  console.log('=== INFO@ADDTECHNO.COM USER ===');
  if (!infoUser) {
    console.log('User not found!');
    return;
  }

  console.log('User ID:', infoUser.id);
  console.log('Name:', infoUser.name);
  console.log('Role:', infoUser.role);
  console.log('Status:', infoUser.status);
  console.log('Tenant:', infoUser.tenant.name, '(' + infoUser.tenant.slug + ')');
  console.log('Has Employee Record:', infoUser.employee ? 'Yes' : 'No');
  if (infoUser.employee) {
    console.log('Employee ID:', infoUser.employee.id);
    console.log('Manager ID (Employee):', infoUser.employee.managerId || 'None');
    console.log('Manager Email:', infoUser.employee.manager?.user?.email || 'None');
    console.log('Manager User ID:', infoUser.employee.manager?.user?.id || 'None');
  }

  // 2. Get admin4@addtechno.com user
  const admin4User = await prisma.user.findUnique({
    where: { email: 'admin4@addtechno.com' },
    include: {
      employee: {
        include: {
          subordinates: {
            include: {
              user: { select: { email: true, name: true, id: true } }
            }
          }
        }
      }
    }
  });

  console.log('\n=== ADMIN4@ADDTECHNO.COM USER ===');
  if (!admin4User) {
    console.log('User not found!');
  } else {
    console.log('User ID:', admin4User.id);
    console.log('Name:', admin4User.name);
    console.log('Role:', admin4User.role);
    console.log('Status:', admin4User.status);
    console.log('Has Employee Record:', admin4User.employee ? 'Yes' : 'No');
    if (admin4User.employee) {
      console.log('Employee ID:', admin4User.employee.id);
      console.log('Subordinates:', admin4User.employee.subordinates?.length || 0);
      admin4User.employee.subordinates?.forEach(sub => {
        console.log('  -', sub.user?.email, '(User ID:', sub.user?.id + ')');
      });
    }
  }

  // 3. Check expenses submitted by info@addtechno.com
  const expenses = await prisma.expenseClaim.findMany({
    where: { userId: infoUser.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  console.log('\n=== EXPENSES BY INFO@ADDTECHNO.COM ===');
  console.log('Total expenses found:', expenses.length);
  expenses.forEach(exp => {
    console.log('  -', exp.claimNumber, '|', exp.title, '| Status:', exp.status, '| Amount:', exp.amount, '| Date:', exp.expenseDate.toISOString().split('T')[0]);
  });

  // 4. Check if info@addtechno.com's manager is admin4@addtechno.com
  console.log('\n=== MANAGER RELATIONSHIP CHECK ===');
  if (infoUser.employee?.manager) {
    const managerUserId = infoUser.employee.manager.userId;
    const isAdmin4Manager = managerUserId === admin4User?.id;
    console.log('info@addtechno.com manager (via Employee.manager.userId):', managerUserId);
    console.log('admin4@addtechno.com user ID:', admin4User?.id);
    console.log('Is admin4 the reporting manager?', isAdmin4Manager ? 'YES' : 'NO');
  } else {
    console.log('info@addtechno.com has NO manager assigned in Employee record');
  }

  // 5. Check what the expense-approvals API would return for admin4
  if (admin4User) {
    // Get subordinate user IDs
    const subordinateUserIds = admin4User.employee?.subordinates?.map(s => s.userId) || [];
    console.log('\n=== SUBORDINATE USER IDs FOR ADMIN4 ===');
    console.log('Subordinate User IDs:', subordinateUserIds);

    // Check if info user is in subordinates
    const isInfoInSubordinates = subordinateUserIds.includes(infoUser.id);
    console.log('Is info@addtechno.com in subordinates list?', isInfoInSubordinates ? 'YES' : 'NO');

    // Get pending expenses from subordinates
    if (subordinateUserIds.length > 0) {
      const pendingExpenses = await prisma.expenseClaim.findMany({
        where: {
          userId: { in: subordinateUserIds },
          status: 'SUBMITTED'
        }
      });
      console.log('\nPending (SUBMITTED) expenses from subordinates:', pendingExpenses.length);
      pendingExpenses.forEach(exp => {
        console.log('  -', exp.claimNumber, '| User:', exp.userId);
      });
    }
  }

  await prisma.$disconnect();
}

checkExpenseIssue().catch(console.error);
