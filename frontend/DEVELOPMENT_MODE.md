# Development Mode Guide

## Overview

Development Mode allows you to test the authentication flow without email sending. It uses a static OTP code `123456` for all users, making it perfect for:

- Local development
- Testing environments
- Demo setups
- CI/CD pipelines
- Temporary production URLs (before public domain)

## ⚠️ Security Warning

**NEVER** enable development mode in production environments with public domains. It bypasses email verification and uses a static OTP code.

## Quick Start

### Enable Development Mode

**Option 1: Using Admin UI (Recommended)**
1. Login as admin at `/admin/settings`
2. Click "Switch to Development Mode"
3. Confirm the change

**Option 2: Using Database Script**
```bash
# Local database
npm run db:dev-mode

# Production database (Railway)
DATABASE_URL="your_database_url" node scripts/enable-dev-mode.js
```

### Disable Development Mode (Switch to Production)

**Option 1: Using Admin UI (Recommended)**
1. Login as admin at `/admin/settings`
2. Click "Switch to Production Mode"
3. Confirm the change

**Option 2: Using Database Script**
```bash
# Local database
npm run db:prod-mode

# Production database (Railway)
DATABASE_URL="your_database_url" node scripts/disable-dev-mode.js
```

## How It Works

### Development Mode (isDevelopmentMode = true)

**Authentication Flow:**
1. User enters email on login page
2. System checks `TenantSettings.isDevelopmentMode`
3. If `true`:
   - Generates static OTP: `123456`
   - Skips email sending
   - Shows message: "🚧 Development Mode: Use OTP 123456 to login"
   - User enters `123456` to verify
   - Login successful

**Features:**
- ✅ Static OTP: `123456` (works for all users)
- ✅ Email sending: DISABLED
- ✅ Faster testing workflow
- ✅ No SMTP configuration needed
- ✅ Console logs show dev mode status
- ✅ Works for: Admin, Manager, HR, Employee

**API Response:**
```json
{
  "success": true,
  "message": "🚧 Development Mode: Use OTP 123456 to login",
  "expiresIn": 600,
  "isDevelopmentMode": true
}
```

**Console Output:**
```
[request-code] 🚧 DEVELOPMENT MODE: Skipping email send
[request-code] 🔑 Demo OTP Code: 123456
[request-code] 📧 Email: user@example.com
```

### Production Mode (isDevelopmentMode = false)

**Authentication Flow:**
1. User enters email on login page
2. System checks `TenantSettings.isDevelopmentMode`
3. If `false`:
   - Generates random 6-digit OTP
   - Sends OTP via SMTP email
   - Shows message: "Login code sent to your email. Please check your inbox."
   - User retrieves OTP from email
   - User enters OTP to verify
   - Login successful

**Features:**
- ✅ Random 6-digit OTP codes
- ✅ Email sending: ENABLED via SMTP
- ✅ Secure authentication flow
- ✅ Industry-standard security
- ✅ Email delivery tracking

## Testing Login

### In Development Mode:

1. Go to login page: `/auth/login`
2. Enter any registered email (e.g., `admin@demo.com`)
3. Click "Request Code"
4. Toast will show: "Development Mode: Use OTP 123456"
5. Enter OTP: `123456`
6. Click "Verify Code"
7. ✅ Logged in successfully!

### In Production Mode:

1. Go to login page: `/auth/login`
2. Enter your registered email
3. Click "Request Code"
4. Check your email inbox for OTP code
5. Enter the 6-digit OTP from email
6. Click "Verify Code"
7. ✅ Logged in successfully!

## Admin Settings Page

Access: `/admin/settings` (Admin role required)

**Features:**
- Visual environment mode toggle
- Current mode indicator (🚧 Dev / ✅ Prod)
- Security warnings
- Testing instructions
- Organization information
- Allowed email domains

**UI Colors:**
- Development Mode: Yellow border with warning
- Production Mode: Green border with checkmark

## Database Schema

```prisma
model TenantSettings {
  id                  String   @id @default(uuid())
  tenantId            String   @unique
  isDevelopmentMode   Boolean  @default(false)
  // ... other fields
}
```

## Scripts

### Package.json Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "db:dev-mode": "node scripts/enable-dev-mode.js",
    "db:prod-mode": "node scripts/disable-dev-mode.js"
  }
}
```

### Manual Database Update

**Enable Dev Mode:**
```sql
UPDATE "TenantSettings" SET "isDevelopmentMode" = true;
```

**Disable Dev Mode:**
```sql
UPDATE "TenantSettings" SET "isDevelopmentMode" = false;
```

## Use Cases

### ✅ When to Enable Development Mode

1. **Local Development**: No SMTP configured locally
2. **Testing**: Automated tests without email dependencies
3. **Demo Environments**: Quick demonstrations
4. **Staging**: Testing before production
5. **Temporary URLs**: Vercel preview URLs, temporary domains
6. **CI/CD**: Automated testing pipelines

### ❌ When to Disable Development Mode

1. **Public Production**: Live application with public domain
2. **Real Users**: Actual customers using the system
3. **Sensitive Data**: Production databases with real data
4. **Compliance**: When security compliance is required
5. **Audit Requirements**: When audit trails must be complete

## Vercel Deployment

### Current Setup (Temporary URL)

Development mode is **ENABLED** for temporary Vercel URLs:
- `https://zenora-alpha.vercel.app`

**To test on Vercel:**
1. Visit: `https://zenora-alpha.vercel.app/auth/login`
2. Enter registered email
3. Use OTP: `123456`

### Before Public Domain Launch

**IMPORTANT**: Disable development mode before connecting public domain!

```bash
# Connect to production database
DATABASE_URL="postgresql://..." node scripts/disable-dev-mode.js
```

Or use Admin UI:
1. Login to `https://zenora-alpha.vercel.app/admin/settings`
2. Click "Switch to Production Mode"
3. Confirm the change

## Environment Variables

No additional environment variables needed. The `isDevelopmentMode` setting is stored in the database per tenant.

**Existing Variables** (still required for production mode):
```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@yourdomain.com
```

## Troubleshooting

### "Invalid OTP" Error in Dev Mode

**Issue**: Entered `123456` but getting invalid OTP error

**Solution**:
1. Check dev mode is enabled:
   ```bash
   DATABASE_URL="..." node -e "
   const { PrismaClient } = require('@prisma/client');
   const prisma = new PrismaClient();
   (async () => {
     const s = await prisma.tenantSettings.findFirst();
     console.log('Dev Mode:', s.isDevelopmentMode);
     await prisma.\$disconnect();
   })();
   "
   ```

2. If `false`, enable it:
   ```bash
   DATABASE_URL="..." node scripts/enable-dev-mode.js
   ```

3. Restart your app/server

### Email Still Being Sent in Dev Mode

**Issue**: Emails are being sent even with dev mode enabled

**Solution**:
1. Verify Prisma client is regenerated: `npx prisma generate`
2. Restart your development server
3. Check console logs for: `🚧 DEVELOPMENT MODE: Skipping email send`
4. Verify database setting: `isDevelopmentMode` should be `true`

### Dev Mode Not Working on Vercel

**Issue**: Vercel still using old code

**Solution**:
1. Trigger new deployment: Make any code change and push
2. Check Vercel build logs for Prisma generation
3. Verify environment has correct DATABASE_URL
4. Enable dev mode in production database

## API Documentation

### GET /api/admin/settings

Get current tenant settings (admin only)

**Response:**
```json
{
  "success": true,
  "settings": {
    "id": "uuid",
    "companyName": "Your Company",
    "timezone": "UTC",
    "currency": "USD",
    "allowedEmailDomains": ["domain.com"],
    "isDevelopmentMode": true
  }
}
```

### PATCH /api/admin/settings

Update tenant settings (admin only)

**Request:**
```json
{
  "isDevelopmentMode": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully switched to Development mode",
  "settings": { /* updated settings */ }
}
```

### POST /api/auth/request-code

Request OTP code (affected by dev mode)

**Development Mode Response:**
```json
{
  "success": true,
  "message": "🚧 Development Mode: Use OTP 123456 to login",
  "expiresIn": 600,
  "isDevelopmentMode": true
}
```

**Production Mode Response:**
```json
{
  "success": true,
  "message": "Login code sent to your email. Please check your inbox.",
  "expiresIn": 600,
  "isDevelopmentMode": false
}
```

## Best Practices

1. **Always use Admin UI** for toggling modes (has confirmation dialogs)
2. **Document mode changes** in your deployment notes
3. **Disable before public launch** - set calendar reminder!
4. **Test both modes** before deploying
5. **Monitor console logs** to verify mode is correct
6. **Use scripts for automation** in CI/CD pipelines

## Security Checklist

Before going live with public domain:

- [ ] Disable development mode via Admin UI or script
- [ ] Verify SMTP credentials are configured
- [ ] Test production login flow with real emails
- [ ] Update documentation to reflect production mode
- [ ] Remove temporary admin accounts
- [ ] Enable security headers
- [ ] Configure production domain in CORS
- [ ] Review and rotate API keys
- [ ] Set up monitoring and alerts
- [ ] Document incident response procedures

## Support

If you encounter issues:

1. Check this documentation
2. Review console logs for debug info
3. Verify database `isDevelopmentMode` setting
4. Ensure Prisma client is regenerated
5. Restart application/server

---

**Generated with Claude Code**
