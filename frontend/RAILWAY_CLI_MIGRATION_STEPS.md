# Railway CLI Migration - Step by Step Instructions

## 🚂 Method 1: Interactive Script (Recommended)

I've created an automated script for you. Simply run:

```bash
cd /Volumes/E/zenora/frontend
./run-railway-migration.sh
```

This script will:
1. ✅ Check/install Railway CLI
2. ✅ Login to Railway (opens browser)
3. ✅ Link to your project
4. ✅ Run the migration
5. ✅ Generate Prisma client
6. ✅ Show success message

---

## 🚂 Method 2: Manual Step-by-Step

If you prefer to run commands manually:

### Step 1: Add Railway CLI to PATH

```bash
# Add to your ~/.zshrc or ~/.bashrc
echo 'export PATH="$HOME/.railway/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Or use the full path
alias railway='/Users/addtech/.nvm/versions/node/v20.18.3/lib/node_modules/@railway/cli/bin/railway'
```

### Step 2: Login to Railway

```bash
railway login
```

This will:
- Open a browser window
- Ask you to authorize the CLI
- Save your credentials locally

### Step 3: Navigate to your project

```bash
cd /Volumes/E/zenora/frontend
```

### Step 4: Link to Railway project

```bash
railway link
```

Select your Zenora project from the list.

### Step 5: Run the migration

Choose ONE of these options:

**Option A: Direct schema push (fastest)**
```bash
railway run npx prisma db push
```

**Option B: Create formal migration**
```bash
railway run npx prisma migrate deploy
```

**Option C: Development migration**
```bash
railway run npx prisma migrate dev --name add_leave_policy_settings
```

### Step 6: Generate Prisma client

```bash
railway run npx prisma generate
```

### Step 7: Verify migration

```bash
railway run npx prisma db pull
```

This will sync your schema with the actual database.

---

## 🚂 Method 3: Using Railway Environment Variable

If you have a Railway API token:

### Step 1: Get your Railway token

1. Go to https://railway.app/account/tokens
2. Create a new token
3. Copy the token

### Step 2: Set environment variable

```bash
export RAILWAY_TOKEN=your_token_here
```

### Step 3: Run migration without interactive login

```bash
cd /Volumes/E/zenora/frontend
railway run npx prisma db push
```

---

## 🚂 Method 4: Direct Database Connection

If Railway CLI doesn't work, connect directly to the database:

### Step 1: Get database connection string from Railway

1. Go to Railway dashboard: https://railway.app
2. Select your project
3. Click on PostgreSQL service
4. Go to "Connect" tab
5. Copy "Postgres Connection URL"

It looks like:
```
postgresql://postgres:PASSWORD@HOST:PORT/railway
```

### Step 2: Set environment variable

```bash
export DATABASE_URL="postgresql://postgres:PASSWORD@HOST:PORT/railway"
```

### Step 3: Run Prisma locally against Railway database

```bash
cd /Volumes/E/zenora/frontend
npx prisma db push
```

---

## ✅ Verify Migration Success

After running any of the above methods, verify:

### Check 1: Railway Logs
```bash
railway logs
```

Look for any errors related to database or Prisma.

### Check 2: Query the database
```bash
railway connect postgres
```

Then run:
```sql
\d "TenantSettings"
```

You should see the 7 new columns.

### Check 3: Test the application
```bash
# Redeploy frontend
railway up

# Or if auto-deploy is enabled
git add .
git commit -m "feat: add leave management features"
git push
```

Visit your app and navigate to:
- `/admin/leave/balance-management`
- `/manager/leave-calendar`
- `/admin/leave/reports`

---

## 🐛 Troubleshooting

### Error: "railway: command not found"

**Solution 1:** Use full path
```bash
/Users/addtech/.nvm/versions/node/v20.18.3/lib/node_modules/@railway/cli/bin/railway login
```

**Solution 2:** Add to PATH
```bash
export PATH="/Users/addtech/.nvm/versions/node/v20.18.3/lib/node_modules/@railway/cli/bin:$PATH"
```

**Solution 3:** Create alias
```bash
alias railway='/Users/addtech/.nvm/versions/node/v20.18.3/lib/node_modules/@railway/cli/bin/railway'
```

### Error: "Cannot login in non-interactive mode"

This happens when running from scripts. Use interactive terminal:
```bash
# Open a new terminal window and run:
railway login
```

### Error: "No project linked"

```bash
cd /Volumes/E/zenora/frontend
railway link
```

Select your project from the list.

### Error: "Database connection failed"

Check if DATABASE_URL is set in Railway:
```bash
railway variables
```

If not set, Railway auto-sets it when you add PostgreSQL service.

### Error: "Prisma schema not in sync"

```bash
# Pull actual database schema
railway run npx prisma db pull

# Then regenerate client
railway run npx prisma generate
```

---

## 🎯 Quick Commands Reference

```bash
# Login
railway login

# Link project
railway link

# Check status
railway status

# View logs
railway logs

# Connect to database
railway connect postgres

# Run command in Railway context
railway run <command>

# Deploy
railway up

# Open app in browser
railway open

# List environment variables
railway variables

# Execute SQL
railway connect postgres -c "SELECT version();"
```

---

## 📝 Post-Migration Checklist

After successful migration:

- [ ] Migration completed without errors
- [ ] Prisma client regenerated
- [ ] Application redeployed on Railway
- [ ] Can access `/admin/leave/balance-management`
- [ ] Can access `/manager/leave-calendar`
- [ ] Can access `/admin/leave/reports`
- [ ] Leave request validation works (notice period, max days)
- [ ] Balance allocation UI works
- [ ] Team calendar displays correctly
- [ ] Reports generate successfully

---

## 🚀 Next Steps After Migration

1. **Allocate Employee Balances**
   - Navigate to `/admin/leave/balance-management`
   - Select current year (2025)
   - Click "Select All"
   - Enable "Prorated Allocation"
   - Click "Allocate Now"

2. **Configure Tenant Settings**
   - Set minimum notice days (recommended: 3)
   - Set maximum consecutive days (recommended: 15)
   - Enable carry-forward if needed
   - Set max carry-forward days (recommended: 10)

3. **Test Features**
   - Submit a test leave request
   - View team calendar
   - Generate all report types
   - Export reports to CSV

4. **Train Your Team**
   - HR: Show balance management interface
   - Managers: Demonstrate team calendar
   - Employees: Explain new validation rules

---

## 📞 Support

If you encounter issues:

1. **Railway Logs:** `railway logs`
2. **Railway Status:** `railway status`
3. **Railway Discord:** https://discord.gg/railway
4. **Railway Docs:** https://docs.railway.app/

---

**Migration Script Location:** `/Volumes/E/zenora/frontend/run-railway-migration.sh`

**Quick Start:**
```bash
cd /Volumes/E/zenora/frontend
./run-railway-migration.sh
```
