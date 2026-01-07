/**
 * Data Migration: Password-Based to Passwordless Authentication
 *
 * This script migrates existing User and Session data to the new passwordless schema:
 * 1. Splits User.name into firstName and lastName
 * 2. Sets default status for all users
 * 3. Adds sessionId to existing sessions
 * 4. Removes password-related fields
 * 5. Creates initial TenantSettings with email domain whitelist
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting migration to passwordless authentication...\n');

  try {
    // Step 1: Update User schema - Add new fields with defaults temporarily
    console.log('Step 1: Updating User schema...');
    await prisma.$executeRaw`
      -- Add new columns with defaults (we'll update them properly below)
      ALTER TABLE "User"
      ADD COLUMN IF NOT EXISTS "firstName" TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS "lastName" TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS "employeeId" TEXT,
      ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'ACTIVE',
      ADD COLUMN IF NOT EXISTS "lastLoginIp" TEXT,
      ADD COLUMN IF NOT EXISTS "lastLoginDevice" TEXT;
    `;
    console.log('✅ User schema updated\n');

    // Step 2: Migrate User.name to firstName/lastName
    console.log('Step 2: Splitting names into firstName and lastName...');
    const users = await prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT id, name FROM "User" WHERE name IS NOT NULL
    `;

    for (const user of users) {
      const nameParts = user.name.trim().split(' ');
      const firstName = nameParts[0] || 'User';
      const lastName = nameParts.slice(1).join(' ') || 'Account';

      await prisma.$executeRaw`
        UPDATE "User"
        SET
          "firstName" = ${firstName},
          "lastName" = ${lastName}
        WHERE id = ${user.id}
      `;
    }
    console.log(`✅ Migrated ${users.length} user names\n`);

    // Step 3: Create UserStatus enum
    console.log('Step 3: Creating UserStatus enum...');
    await prisma.$executeRaw`
      DO $$ BEGIN
        CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
   console.log('✅ UserStatus enum created\n');

    // Step 4: Update status column to use enum
    console.log('Step 4: Converting status column to enum...');
    await prisma.$executeRaw`
      -- Drop default first
      ALTER TABLE "User"
      ALTER COLUMN "status" DROP DEFAULT;

      -- Convert to enum
      ALTER TABLE "User"
      ALTER COLUMN "status" TYPE "UserStatus" USING (status::text::"UserStatus");

      -- Add back default
      ALTER TABLE "User"
      ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"UserStatus";
    `;
    console.log('✅ Status column converted\n');

    // Step 5: Make firstName and lastName required
    console.log('Step 5: Making firstName and lastName required...');
    await prisma.$executeRaw`
      ALTER TABLE "User"
      ALTER COLUMN "firstName" SET NOT NULL,
      ALTER COLUMN "lastName" SET NOT NULL,
      ALTER COLUMN "firstName" DROP DEFAULT,
      ALTER COLUMN "lastName" DROP DEFAULT;
    `;
    console.log('✅ firstName and lastName are now required\n');

    // Step 6: Create MagicLink table
    console.log('Step 6: Creating MagicLink table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "MagicLink" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "codeHash" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "isUsed" BOOLEAN NOT NULL DEFAULT false,
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "deviceFingerprint" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "MagicLink_token_key" ON "MagicLink"("token");
      CREATE INDEX IF NOT EXISTS "MagicLink_userId_idx" ON "MagicLink"("userId");
      CREATE INDEX IF NOT EXISTS "MagicLink_token_idx" ON "MagicLink"("token");
      CREATE INDEX IF NOT EXISTS "MagicLink_email_idx" ON "MagicLink"("email");
      CREATE INDEX IF NOT EXISTS "MagicLink_expiresAt_idx" ON "MagicLink"("expiresAt");
      CREATE INDEX IF NOT EXISTS "MagicLink_isUsed_idx" ON "MagicLink"("isUsed");

      ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    console.log('✅ MagicLink table created\n');

    // Step 7: Update Session table
    console.log('Step 7: Updating Session table...');
    await prisma.$executeRaw`
      -- Add new columns
      ALTER TABLE "Session"
      ADD COLUMN IF NOT EXISTS "sessionId" TEXT,
      ADD COLUMN IF NOT EXISTS "deviceFingerprint" TEXT,
      ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

      -- Generate sessionId for existing sessions
      UPDATE "Session"
      SET "sessionId" = CONCAT('session_', id)
      WHERE "sessionId" IS NULL;

      -- Make sessionId unique and required
      CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionId_key" ON "Session"("sessionId");

      ALTER TABLE "Session"
      ALTER COLUMN "sessionId" SET NOT NULL;

      -- Add indexes
      CREATE INDEX IF NOT EXISTS "Session_sessionId_idx" ON "Session"("sessionId");
      CREATE INDEX IF NOT EXISTS "Session_lastActivityAt_idx" ON "Session"("lastActivityAt");

      -- Remove old token column (replaced by sessionId in Redis)
      ALTER TABLE "Session" DROP COLUMN IF EXISTS "token";
    `;
    console.log('✅ Session table updated\n');

    // Step 8: Update AuditLog table
    console.log('Step 8: Updating AuditLog table...');
    await prisma.$executeRaw`
      ALTER TABLE "AuditLog"
      ADD COLUMN IF NOT EXISTS "eventType" TEXT,
      ADD COLUMN IF NOT EXISTS "deviceFingerprint" TEXT,
      ADD COLUMN IF NOT EXISTS "success" BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

      -- Set eventType for existing logs (if any)
      UPDATE "AuditLog"
      SET "eventType" = 'unknown'
      WHERE "eventType" IS NULL;

      -- Add indexes
      CREATE INDEX IF NOT EXISTS "AuditLog_eventType_idx" ON "AuditLog"("eventType");
      CREATE INDEX IF NOT EXISTS "AuditLog_success_idx" ON "AuditLog"("success");
    `;
    console.log('✅ AuditLog table updated\n');

    // Step 9: Update TenantSettings table
    console.log('Step 9: Adding email domain whitelist to TenantSettings...');
    await prisma.$executeRaw`
      ALTER TABLE "TenantSettings"
      ADD COLUMN IF NOT EXISTS "allowedEmailDomains" JSONB DEFAULT '[]'::jsonb;
    `;

    // Create default TenantSettings for tenants without settings
    const tenants = await prisma.tenant.findMany({
      include: { settings: true }
    });

    for (const tenant of tenants) {
      if (!tenant.settings) {
        await prisma.tenantSettings.create({
          data: {
            tenantId: tenant.id,
            companyName: tenant.name,
            timezone: 'UTC',
            currency: 'USD',
            workingHours: {},
            leavePolicies: {},
            allowedEmailDomains: ['*'], // Allow all domains initially
          },
        });
        console.log(`  Created settings for tenant: ${tenant.name}`);
      } else {
        // Update existing settings
        await prisma.tenantSettings.update({
          where: { tenantId: tenant.id },
          data: {
            allowedEmailDomains: ['*'], // Allow all domains initially
          },
        });
        console.log(`  Updated settings for tenant: ${tenant.name}`);
      }
    }
    console.log('✅ TenantSettings updated\n');

    // Step 10: Add indexes to User table
    console.log('Step 10: Adding indexes to User table...');
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");
      CREATE INDEX IF NOT EXISTS "User_employeeId_idx" ON "User"("employeeId");
    `;
    console.log('✅ Indexes added\n');

    // Step 11: Remove password-related columns (DESTRUCTIVE)
    console.log('Step 11: Removing password-related columns...');
    console.log('⚠️  WARNING: This will remove password, passwordResetToken, and refreshToken columns');
    console.log('⚠️  Make sure you have a database backup before proceeding!');

    // Uncomment these lines when ready to remove passwords
    // await prisma.$executeRaw`
    //   ALTER TABLE "User"
    //   DROP COLUMN IF EXISTS "password",
    //   DROP COLUMN IF EXISTS "passwordResetToken",
    //   DROP COLUMN IF EXISTS "passwordResetExpires",
    //   DROP COLUMN IF EXISTS "refreshToken",
    //   DROP COLUMN IF EXISTS "isActive"; -- Replaced by status
    // `;
    console.log('⚠️  Password columns NOT removed (commented out for safety)\n');

    console.log('✨ Migration completed successfully!\n');
    console.log('📋 Summary:');
    console.log(`   - Migrated ${users.length} users`);
    console.log(`   - Updated ${tenants.length} tenant settings`);
    console.log('   - Created MagicLink table');
    console.log('   - Updated Session table for Redis');
    console.log('   - Enhanced AuditLog table');
    console.log('   - Added email domain whitelisting\n');
    console.log('⚠️  Next steps:');
    console.log('   1. Verify all data looks correct');
    console.log('   2. Test login with magic links');
    console.log('   3. Uncomment Step 11 to remove password columns');
    console.log('   4. Run: npx prisma generate');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
