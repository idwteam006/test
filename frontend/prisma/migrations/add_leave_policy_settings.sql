-- Migration: Add Leave Policy Settings to TenantSettings
-- Date: 2025-12-23
-- Description: Adds fields for leave management policies and automation

-- Add new columns to TenantSettings table
ALTER TABLE "TenantSettings"
ADD COLUMN IF NOT EXISTS "minimumLeaveNoticeDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "maximumConsecutiveLeaveDays" INTEGER,
ADD COLUMN IF NOT EXISTS "allowHalfDayLeave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "carryForwardLeave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "maxCarryForwardDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "leaveAllocationDay" TEXT NOT NULL DEFAULT '01-01',
ADD COLUMN IF NOT EXISTS "autoAllocateLeave" BOOLEAN NOT NULL DEFAULT true;

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'TenantSettings'
  AND column_name IN (
    'minimumLeaveNoticeDays',
    'maximumConsecutiveLeaveDays',
    'allowHalfDayLeave',
    'carryForwardLeave',
    'maxCarryForwardDays',
    'leaveAllocationDay',
    'autoAllocateLeave'
  )
ORDER BY column_name;

-- Migration complete
-- Run: psql -U your_user -d your_database -f add_leave_policy_settings.sql
