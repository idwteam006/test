-- Fix status column enum conversion
-- Step 1: Drop default
ALTER TABLE "User" ALTER COLUMN "status" DROP DEFAULT;

-- Step 2: Convert to enum type
ALTER TABLE "User" ALTER COLUMN "status" TYPE "UserStatus" USING (status::text::"UserStatus");

-- Step 3: Add back default
ALTER TABLE "User" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"UserStatus";

-- Step 4: Make firstName and lastName NOT NULL
ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "firstName" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "lastName" DROP DEFAULT;

-- Step 5: Add indexes
CREATE INDEX IF NOT EXISTS "User_status_idx" ON "User"("status");
CREATE INDEX IF NOT EXISTS "User_employeeId_idx" ON "User"("employeeId");

-- Step 6: Update Session table - add new columns
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "sessionId" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "deviceFingerprint" TEXT;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Generate sessionId for existing sessions
UPDATE "Session" SET "sessionId" = CONCAT('session_', id) WHERE "sessionId" IS NULL;

-- Make sessionId unique and required
ALTER TABLE "Session" ALTER COLUMN "sessionId" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Session_sessionId_key" ON "Session"("sessionId");
CREATE INDEX IF NOT EXISTS "Session_sessionId_idx" ON "Session"("sessionId");
CREATE INDEX IF NOT EXISTS "Session_lastActivityAt_idx" ON "Session"("lastActivityAt");

-- Step 7: Update AuditLog table
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "eventType" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "deviceFingerprint" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "success" BOOLEAN DEFAULT true;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

-- Set eventType for existing logs
UPDATE "AuditLog" SET "eventType" = 'unknown' WHERE "eventType" IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS "AuditLog_eventType_idx" ON "AuditLog"("eventType");
CREATE INDEX IF NOT EXISTS "AuditLog_success_idx" ON "AuditLog"("success");

-- Step 8: Update TenantSettings
ALTER TABLE "TenantSettings" ADD COLUMN IF NOT EXISTS "allowedEmailDomains" JSONB DEFAULT '["*"]'::jsonb;

-- Step 9: Create MagicLink table
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

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MagicLink_userId_fkey'
  ) THEN
    ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 10: Remove Session token column (replaced by sessionId in Redis)
ALTER TABLE "Session" DROP COLUMN IF EXISTS "token";
