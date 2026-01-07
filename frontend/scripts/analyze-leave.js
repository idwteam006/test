const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  const user = await prisma.user.findFirst({
    where: { email: 'info@addtechno.com' },
    include: { employee: true }
  });

  if (!user) {
    console.log('User not found');
    await prisma.$disconnect();
    return;
  }

  console.log('=== USER INFO ===');
  console.log('User ID:', user.id);
  console.log('Email:', user.email);
  console.log('Name:', user.firstName, user.lastName);
  console.log('Tenant ID:', user.tenantId);
  console.log('Employee ID:', user.employee?.id);

  if (!user.employee) {
    console.log('No employee record');
    await prisma.$disconnect();
    return;
  }

  const balances = await prisma.leaveBalance.findMany({
    where: { employeeId: user.employee.id },
    orderBy: [{ year: 'desc' }, { leaveType: 'asc' }]
  });

  console.log('\n=== LEAVE BALANCES ===');
  balances.forEach(b => console.log('Year:', b.year, 'Type:', b.leaveType, 'Balance:', b.balance));

  const requests = await prisma.leaveRequest.findMany({
    where: { employeeId: user.employee.id },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  console.log('\n=== RECENT LEAVE REQUESTS ===');
  requests.forEach(r => console.log('ID:', r.id.slice(0,8), 'Type:', r.leaveType, 'Days:', r.days, 'Status:', r.status, 'Start:', r.startDate.toISOString().slice(0,10)));

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: user.tenantId },
    select: { leavePolicies: true }
  });

  console.log('\n=== TENANT LEAVE POLICIES ===');
  console.log(settings?.leavePolicies || 'Not configured (using defaults)');

  await prisma.$disconnect();
}

analyze().catch(e => {
  console.error(e);
  prisma.$disconnect();
});
