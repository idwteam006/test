import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    // Find Anil's user
    const anilUser = await prisma.user.findFirst({
      where: { email: 'anil@addtechno.com' },
      select: { id: true, email: true, tenantId: true }
    });
    
    console.log('=== ANIL USER ===');
    console.log(JSON.stringify(anilUser, null, 2));
    
    if (anilUser) {
      // Find Anil's employee record
      const anilEmployee = await prisma.employee.findFirst({
        where: { 
          userId: anilUser.id,
          tenantId: anilUser.tenantId 
        },
        select: { 
          id: true, 
          userId: true, 
          managerId: true,
          user: {
            select: { email: true, firstName: true, lastName: true }
          }
        }
      });
      
      console.log('\n=== ANIL EMPLOYEE ===');
      console.log(JSON.stringify(anilEmployee, null, 2));
      
      // Find Anil's courses
      const anilCourses = await prisma.courseCompletion.findMany({
        where: { 
          employeeId: anilEmployee?.id,
          tenantId: anilUser.tenantId
        },
        select: {
          id: true,
          courseTitle: true,
          status: true,
          category: true,
          employeeId: true,
          createdAt: true
        }
      });
      
      console.log('\n=== ANIL COURSES ===');
      console.log(JSON.stringify(anilCourses, null, 2));
      
      if (anilEmployee?.managerId) {
        // Find manager employee record
        const managerEmployee = await prisma.employee.findFirst({
          where: { id: anilEmployee.managerId },
          include: {
            user: {
              select: { email: true, firstName: true, lastName: true }
            }
          }
        });
        
        console.log('\n=== ANIL\'S MANAGER ===');
        console.log(JSON.stringify(managerEmployee, null, 2));
      }
    }
    
    // Find Tech Lead user
    const techUser = await prisma.user.findFirst({
      where: { email: 'tech@addtechno.com' },
      select: { id: true, email: true, tenantId: true }
    });
    
    console.log('\n\n=== TECH LEAD USER ===');
    console.log(JSON.stringify(techUser, null, 2));
    
    if (techUser) {
      const techEmployee = await prisma.employee.findFirst({
        where: { 
          userId: techUser.id,
          tenantId: techUser.tenantId 
        },
        select: { 
          id: true, 
          userId: true, 
          managerId: true 
        }
      });
      
      console.log('\n=== TECH LEAD EMPLOYEE ===');
      console.log(JSON.stringify(techEmployee, null, 2));
      
      // Check direct reports
      const directReports = await prisma.employee.findMany({
        where: {
          managerId: techEmployee?.id,
          tenantId: techUser.tenantId
        },
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true }
          }
        }
      });
      
      console.log('\n=== TECH LEAD DIRECT REPORTS ===');
      console.log(JSON.stringify(directReports, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
