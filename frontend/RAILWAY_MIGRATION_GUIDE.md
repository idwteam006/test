# Railway Migration Guide - Leave Policy Settings

## Quick Migration for Railway

### **Option 1: Railway CLI (Fastest)**

#### Step 1: Install Railway CLI (if not installed)
```bash
# macOS
brew install railway

# OR using npm
npm install -g @railway/cli

# OR using curl
sh -c "$(curl -sSL https://raw.githubusercontent.com/railwayapp/cli/master/install.sh)"
```

#### Step 2: Login to Railway
```bash
railway login
```

#### Step 3: Link to your project
```bash
cd /Volumes/E/zenora/frontend
railway link
```

#### Step 4: Run migration using Railway
```bash
# Option A: Push schema directly
railway run npx prisma db push

# Option B: Create formal migration
railway run npx prisma migrate deploy

# Option C: Run in development mode
railway run npx prisma migrate dev --name add_leave_policy_settings
```

---

### **Option 2: Railway Dashboard SQL Query**

#### Step 1: Access Railway Dashboard
1. Go to https://railway.app
2. Login to your account
3. Select your Zenora project
4. Click on your PostgreSQL database service

#### Step 2: Open Query Tab
1. Click on "Query" tab in the database service
2. You'll see a SQL query interface

#### Step 3: Execute Migration
Copy and paste this SQL:

```sql
-- Add Leave Policy Settings to TenantSettings
ALTER TABLE "TenantSettings"
ADD COLUMN IF NOT EXISTS "minimumLeaveNoticeDays" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "maximumConsecutiveLeaveDays" INTEGER,
ADD COLUMN IF NOT EXISTS "allowHalfDayLeave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "carryForwardLeave" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "maxCarryForwardDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "leaveAllocationDay" TEXT NOT NULL DEFAULT '01-01',
ADD COLUMN IF NOT EXISTS "autoAllocateLeave" BOOLEAN NOT NULL DEFAULT true;

-- Verify columns were added
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

#### Step 4: Click "Execute Query"

---

### **Option 3: Connect via psql**

#### Step 1: Get Database Connection String
1. Go to Railway dashboard
2. Select your PostgreSQL service
3. Click "Connect" tab
4. Copy the "Postgres Connection URL"

It looks like:
```
postgresql://postgres:PASSWORD@HOST:PORT/railway
```

#### Step 2: Connect using psql
```bash
psql "postgresql://postgres:PASSWORD@HOST:PORT/railway"
```

#### Step 3: Run migration SQL
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

---

### **Option 4: Railway Plugin/Extension**

#### Step 1: Add Database Extension (if available)
1. In Railway dashboard, go to your database service
2. Look for "Plugins" or "Extensions" tab
3. Some Railway projects have pgAdmin or similar tools

#### Step 2: Use GUI to run SQL
Follow GUI tool instructions to execute the SQL above.

---

### **Option 5: Deploy with Migration Script**

#### Step 1: Create migration script
File already created at: `/Volumes/E/zenora/frontend/prisma/migrations/add_leave_policy_settings.sql`

#### Step 2: Add to package.json
```json
{
  "scripts": {
    "migrate:railway": "prisma migrate deploy",
    "postdeploy": "prisma migrate deploy && prisma generate"
  }
}
```

#### Step 3: Update Railway settings
In Railway dashboard:
1. Go to your frontend service
2. Click "Settings"
3. Under "Build & Deploy" section
4. Add build command: `npm run build`
5. Add start command: `npm run migrate:railway && npm start`

This will auto-migrate on every deployment.

---

## 🎯 Recommended Approach for Railway

### **Fastest: Railway Dashboard Query**

1. **Go to:** https://railway.app/dashboard
2. **Navigate to:** Your Project → PostgreSQL Service → Query Tab
3. **Paste SQL:**
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
4. **Click:** Execute Query
5. **Done!** ✅

---

## 🔍 Verify Migration on Railway

### Method 1: Railway Query Tab
```sql
-- Check columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'TenantSettings'
ORDER BY column_name;
```

### Method 2: Railway Logs
```bash
railway logs
# Look for any migration errors
```

### Method 3: Check Application
1. Deploy your frontend: `railway up`
2. Navigate to `/admin/leave/balance-management`
3. If page loads, migration succeeded!

---

## 🚀 Post-Migration on Railway

### Step 1: Redeploy Frontend (if needed)
```bash
cd /Volumes/E/zenora/frontend

# Commit changes
git add .
git commit -m "feat: add leave management automation features"
git push

# Railway will auto-deploy
# OR manually trigger:
railway up
```

### Step 2: Regenerate Prisma Client
The Prisma client will auto-regenerate on Railway deployment due to the `postinstall` script in package.json:
```json
"postinstall": "prisma generate"
```

### Step 3: Initialize Employee Balances
1. Wait for deployment to complete
2. Navigate to your Railway app URL
3. Go to `/admin/leave/balance-management`
4. Allocate balances for employees

---

## 🐛 Troubleshooting Railway

### Issue: "Column already exists"
✅ **Safe to ignore** - migration already ran

### Issue: "Permission denied"
```sql
-- Grant permissions (run in Railway Query tab)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

### Issue: "Table not found"
Check table name casing:
```sql
-- List all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- If it shows different casing, adjust SQL accordingly
```

### Issue: Cannot access Query tab
**Alternative:** Use Railway CLI:
```bash
railway connect postgres
# Then run SQL commands
```

### Issue: Deployment fails after migration
Check Railway logs:
```bash
railway logs --deployment
```

Look for Prisma errors and ensure:
- `DATABASE_URL` environment variable is set
- Prisma client regenerated (`postinstall` script)

---

## 📊 Railway-Specific Tips

### Auto-Migration on Deploy
Add to `package.json`:
```json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build",
    "start": "next start"
  }
}
```

Railway will run migrations automatically on every deploy.

### Environment Variables
Ensure these are set in Railway:
- `DATABASE_URL` - Auto-set by Railway
- `DIRECT_URL` - For migrations (same as DATABASE_URL)

### Database Backups
Before major migrations:
1. Railway dashboard → Database service
2. Click "Backups" tab
3. Create manual backup

---

## ✅ Quick Checklist

- [ ] Access Railway dashboard
- [ ] Open PostgreSQL service
- [ ] Go to Query tab
- [ ] Execute migration SQL
- [ ] Verify columns added
- [ ] Redeploy frontend (if needed)
- [ ] Test `/admin/leave/balance-management`
- [ ] Allocate employee balances

---

## 🎉 Success Indicators

After successful migration on Railway:

1. ✅ No errors in Railway logs
2. ✅ Can access balance management page
3. ✅ Can access team calendar page
4. ✅ Can access reports page
5. ✅ Leave requests validate policies
6. ✅ Balance allocation works

---

## 📞 Need Help?

Railway-specific resources:
- Docs: https://docs.railway.app/
- Discord: https://discord.gg/railway
- Support: help@railway.app

**Common Railway Commands:**
```bash
railway login          # Login
railway link           # Link project
railway status         # Check deployment
railway logs           # View logs
railway connect        # Connect to DB
railway up             # Deploy
railway open           # Open app
```

---

**Migration File:** `/Volumes/E/zenora/frontend/prisma/migrations/add_leave_policy_settings.sql`
**Railway Dashboard:** https://railway.app/dashboard
