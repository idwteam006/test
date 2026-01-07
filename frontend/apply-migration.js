const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('🔧 Applying migration: Add medicalCertificateUrl to LeaveRequest...\n');
    
    await prisma.$executeRaw`ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "medicalCertificateUrl" TEXT`;
    
    console.log('✅ Migration applied successfully!');
    console.log('   Added column: medicalCertificateUrl (TEXT, nullable)');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
