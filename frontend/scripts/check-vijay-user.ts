import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  const user = await prisma.user.findUnique({
    where: { email: 'vijay.n@idwteam.com' },
    include: {
      tenant: true,
      employee: {
        include: {
          manager: {
            include: { user: true }
          },
          subordinates: {
            include: { user: true }
          }
        }
      }
    }
  });

  if (!user) {
    console.log('User vijay.n@idwteam.com not found');
    await prisma.$disconnect();
    return;
  }

  console.log('=== User Details ===');
  console.log('ID:', user.id);
  console.log('Name:', user.name);
  console.log('Email:', user.email);
  console.log('Role:', user.role);
  console.log('Tenant:', user.tenant?.name, `(${user.tenant?.slug})`);

  if (user.employee) {
    const emp = user.employee;
    console.log('\n=== Employee Hierarchy ===');
    console.log('Employee ID:', emp.id);
    console.log('Manager:', emp.manager ? `${emp.manager.user?.name} (${emp.manager.user?.email})` : 'None (ROOT LEVEL)');
    console.log('Direct Reports:', emp.subordinates?.length || 0);

    if (emp.subordinates && emp.subordinates.length > 0) {
      console.log('\n=== Direct Reports ===');
      emp.subordinates.forEach(s => console.log(` - ${s.user?.name} (${s.user?.role})`));
    }
  } else {
    console.log('\nNo employee record linked to this user');
  }

  // Check for pending timesheets
  const pendingTimesheets = await prisma.timesheetEntry.count({
    where: {
      userId: user.id,
      status: 'SUBMITTED'
    }
  });

  // Check for pending expenses
  const pendingExpenses = await prisma.expenseClaim.count({
    where: {
      userId: user.id,
      status: 'SUBMITTED'
    }
  });

  console.log('\n=== Pending Items ===');
  console.log('Pending Timesheets:', pendingTimesheets);
  console.log('Pending Expenses:', pendingExpenses);

  await prisma.$disconnect();
}

checkUser().catch(console.error);
