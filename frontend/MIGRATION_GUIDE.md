# Database Migration Guide - Leave Policy Settings

## Overview
This migration adds 7 new fields to the `TenantSettings` table for leave management automation and policy enforcement.

---

## Option 1: Using Prisma CLI (Recommended)

If you have Node.js and npm/yarn/pnpm installed:

### Method A: Using npm scripts
```bash
cd /Volumes/E/zenora/frontend

# Generate Prisma client and push schema changes
npm run db:push

# OR if you want to create a formal migration
npm run db:migrate
```

### Method B: Direct Prisma commands
```bash
cd /Volumes/E/zenora/frontend

# Push schema changes directly (faster for development)
npx prisma db push

# OR create a proper migration (recommended for production)
npx prisma migrate dev --name add_leave_policy_settings

# Generate Prisma client
npx prisma generate
```

---

## Option 2: Direct SQL Execution

If Prisma CLI is not available, run the SQL directly on your PostgreSQL database:

### Step 1: Connect to your database
```bash
# Using psql
psql -U your_username -d your_database_name

# OR using connection string
psql "postgresql://user:password@host:port/database"
```

### Step 2: Run the migration SQL
```sql
-- Add new columns to TenantSettings table
ALTER TABLE "TenantSettings"
ADD COLUMN IF NOT EXISTS "minimumLeaveNoticeDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "maximumConsecutiveLeaveDays" INTEGER,
ADD COLUMN IF NOT EXISTS "allowHalfDayLeave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "carryForwardLeave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "maxCarryForwardDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "leaveAllocationDay" TEXT NOT NULL DEFAULT '01-01',
ADD COLUMN IF NOT EXISTS "autoAllocateLeave" BOOLEAN NOT NULL DEFAULT true;
```

### Step 3: Verify the migration
```sql
-- Check that columns were added
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
```

Expected output:
```
        column_name         |     data_type      | column_default
----------------------------+--------------------+----------------
 allowHalfDayLeave          | boolean            | false
 autoAllocateLeave          | boolean            | true
 carryForwardLeave          | boolean            | false
 leaveAllocationDay         | text               | '01-01'
 maxCarryForwardDays        | integer            | 0
 maximumConsecutiveLeaveDays| integer            | NULL
 minimumLeaveNoticeDays     | integer            | 1
```

### Step 4: Execute from SQL file
```bash
# Run the pre-created SQL file
psql -U your_username -d your_database_name -f /Volumes/E/zenora/frontend/prisma/migrations/add_leave_policy_settings.sql
```

---

## Option 3: Using GUI Tools

### Using pgAdmin, DBeaver, or TablePlus:

1. Connect to your database
2. Open SQL query window
3. Copy and paste the following SQL:

```sql
ALTER TABLE "TenantSettings"
ADD COLUMN IF NOT EXISTS "minimumLeaveNoticeDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "maximumConsecutiveLeaveDays" INTEGER,
ADD COLUMN IF NOT EXISTS "allowHalfDayLeave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "carryForwardLeave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "maxCarryForwardDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "leaveAllocationDay" TEXT NOT NULL DEFAULT '01-01',
ADD COLUMN IF NOT EXISTS "autoAllocateLeave" BOOLEAN NOT NULL DEFAULT true;
```

4. Execute the query
5. Verify columns were added

---

## Option 4: Using Vercel/Neon/Supabase Dashboard

If you're using a cloud database provider:

### Vercel Postgres:
1. Go to your Vercel project
2. Navigate to Storage tab
3. Click on your database
4. Open "Query" tab
5. Paste the SQL above and execute

### Neon:
1. Go to Neon console
2. Select your database
3. Open SQL Editor
4. Paste the SQL above and execute

### Supabase:
1. Go to Supabase dashboard
2. Select your project
3. Navigate to SQL Editor
4. Create new query
5. Paste the SQL above and execute

---

## What Gets Added

| Column Name | Type | Default | Description |
|------------|------|---------|-------------|
| `minimumLeaveNoticeDays` | INTEGER | 1 | Minimum days advance notice required |
| `maximumConsecutiveLeaveDays` | INTEGER | NULL | Maximum consecutive days allowed |
| `allowHalfDayLeave` | BOOLEAN | false | Enable half-day leave requests |
| `carryForwardLeave` | BOOLEAN | false | Allow carry-forward to next year |
| `maxCarryForwardDays` | INTEGER | 0 | Maximum days that can carry forward |
| `leaveAllocationDay` | TEXT | '01-01' | Annual allocation date (MM-DD) |
| `autoAllocateLeave` | BOOLEAN | true | Auto-allocate on allocation day |

---

## Post-Migration Steps

### 1. Verify Schema Matches Prisma
```bash
cd /Volumes/E/zenora/frontend
npx prisma db pull  # Pull actual database schema
npx prisma generate  # Regenerate Prisma client
```

### 2. Configure Tenant Settings (Optional)

Update your tenant settings to customize policies:

```sql
-- Example: Configure leave policies for your tenant
UPDATE "TenantSettings"
SET
  "minimumLeaveNoticeDays" = 3,  -- Require 3 days advance notice
  "maximumConsecutiveLeaveDays" = 15,  -- Max 15 consecutive days
  "carryForwardLeave" = true,  -- Enable carry-forward
  "maxCarryForwardDays" = 10,  -- Max 10 days can carry forward
  "autoAllocateLeave" = true  -- Auto-allocate annually
WHERE "tenantId" = 'your-tenant-id';
```

### 3. Initialize Leave Balances

After migration, allocate balances for existing employees:

**Option A: Via UI (Recommended)**
1. Navigate to `/admin/leave/balance-management`
2. Select current year (2025)
3. Click "Select All" or "Without Allocation"
4. Enable "Prorated Allocation for New Joiners"
5. Click "Allocate Now"

**Option B: Via API**
```bash
curl -X POST https://your-domain.com/api/admin/leave/allocate \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "year": 2025,
    "prorated": true
  }'
```

---

## Troubleshooting

### Error: "column already exists"
This is safe to ignore - it means the migration has already been run.

### Error: "permission denied"
Ensure your database user has ALTER TABLE permissions:
```sql
GRANT ALTER ON TABLE "TenantSettings" TO your_user;
```

### Error: "relation TenantSettings does not exist"
The table name might be lowercase. Try:
```sql
ALTER TABLE "tenant_settings" ...
-- OR
ALTER TABLE tenantSettings ...
```

### Prisma Client out of sync
After running SQL manually, regenerate Prisma client:
```bash
npx prisma generate
```

---

## Rollback (If Needed)

If you need to undo this migration:

```sql
-- Remove added columns
ALTER TABLE "TenantSettings"
DROP COLUMN IF EXISTS "minimumLeaveNoticeDays",
DROP COLUMN IF EXISTS "maximumConsecutiveLeaveDays",
DROP COLUMN IF EXISTS "allowHalfDayLeave",
DROP COLUMN IF EXISTS "carryForwardLeave",
DROP COLUMN IF EXISTS "maxCarryForwardDays",
DROP COLUMN IF EXISTS "leaveAllocationDay",
DROP COLUMN IF EXISTS "autoAllocateLeave";
```

---

## Verification Checklist

After running the migration, verify:

- [ ] All 7 columns added to TenantSettings table
- [ ] Default values set correctly
- [ ] Prisma client regenerated (`npx prisma generate`)
- [ ] Application starts without errors
- [ ] Can access `/admin/leave/balance-management`
- [ ] Can access `/manager/leave-calendar`
- [ ] Can access `/admin/leave/reports`
- [ ] Leave request validation works with new policies

---

## Need Help?

1. **Check database logs** for detailed error messages
2. **Verify database connection** string in `.env` file
3. **Ensure table name casing** matches your database (PostgreSQL is case-sensitive)
4. **Run Prisma introspection** to sync schema: `npx prisma db pull`

---

## Quick Commands Reference

```bash
# Check if migration is needed
npx prisma migrate status

# Push schema without creating migration
npx prisma db push

# Create formal migration
npx prisma migrate dev --name add_leave_policy_settings

# Generate Prisma client
npx prisma generate

# View database in GUI
npx prisma studio

# Pull current database schema
npx prisma db pull
```

---

**Migration File Location:** `/Volumes/E/zenora/frontend/prisma/migrations/add_leave_policy_settings.sql`

**Prisma Schema:** `/Volumes/E/zenora/frontend/prisma/schema.prisma` (lines 658-664)
