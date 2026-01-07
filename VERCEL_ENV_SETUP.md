# Vercel Environment Variables Setup for Email

## ⚠️ IMPORTANT: Exact Variable Names Required

The code expects these **EXACT** variable names (case-sensitive):

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=info@addtechno.com
SMTP_PASS=Naga_1986@@
EMAIL_FROM=info@addtechno.com
EMAIL_FROM_NAME=Zenora
```

## ❌ Common Mistakes

**DO NOT USE these names:**
- ❌ `SMTP_PASSWORD` (wrong - must be `SMTP_PASS`)
- ❌ `SMTP_FROM` (wrong - must be `EMAIL_FROM`)
- ❌ Missing `EMAIL_FROM_NAME`

## 📝 Step-by-Step Vercel Setup

### 1. Access Environment Variables
Go to: https://vercel.com/[your-username]/zenora-alpha/settings/environment-variables

### 2. Add/Update Each Variable

For **EACH** variable below:
- Click "Add New"
- Enter the exact name (copy-paste to avoid typos)
- Enter the value
- Select all environments: ✅ Production ✅ Preview ✅ Development
- Click "Save"

**Variable 1:**
```
Name:  SMTP_HOST
Value: smtp.hostinger.com
```

**Variable 2:**
```
Name:  SMTP_PORT
Value: 587
```

**Variable 3:**
```
Name:  SMTP_USER
Value: info@addtechno.com
```

**Variable 4:**
```
Name:  SMTP_PASS
Value: Naga_1986@@
```
⚠️ **NOT** `SMTP_PASSWORD` - must be exactly `SMTP_PASS`

**Variable 5:**
```
Name:  EMAIL_FROM
Value: info@addtechno.com
```
⚠️ **NOT** `SMTP_FROM` - must be exactly `EMAIL_FROM`

**Variable 6:**
```
Name:  EMAIL_FROM_NAME
Value: Zenora
```
⚠️ This is a **NEW** variable - make sure to add it

### 3. Delete Old Variables

If you have these old variables, **DELETE** them:
- `SMTP_PASSWORD` (replaced by `SMTP_PASS`)
- `SMTP_FROM` (replaced by `EMAIL_FROM`)

### 4. Verify All Variables Are Set

Your environment variables list should show:
```
✅ SMTP_HOST
✅ SMTP_PORT
✅ SMTP_USER
✅ SMTP_PASS (not SMTP_PASSWORD)
✅ EMAIL_FROM (not SMTP_FROM)
✅ EMAIL_FROM_NAME
```

### 5. Redeploy

**IMPORTANT:** After updating variables, you **MUST** redeploy:

**Option A - Trigger from Vercel Dashboard:**
1. Go to Deployments tab
2. Click "..." menu on latest deployment
3. Click "Redeploy"

**Option B - Push a commit:**
```bash
git commit --allow-empty -m "Trigger Vercel redeploy for env vars"
git push
```

**Option C - Redeploy from CLI:**
```bash
vercel --prod
```

### 6. Test After Redeployment

Wait for deployment to complete, then test:
```
https://zenora-alpha.vercel.app/api/test-email?to=your@email.com
```

Expected response:
```json
{
  "success": true,
  "message": "Test email sent successfully to your@email.com"
}
```

## 🔍 Troubleshooting

### Issue: Still showing "hasPassword: false"

**Cause:** Variable name is wrong or deployment hasn't completed

**Solution:**
1. Double-check variable name is exactly `SMTP_PASS` (not `SMTP_PASSWORD`)
2. Ensure all checkboxes (Prod/Preview/Dev) are selected
3. Wait for deployment to complete (check Deployments tab)
4. Clear browser cache and test again

### Issue: Email sends but not received

**Possible causes:**
1. Email in spam folder - check spam/junk
2. SMTP server rate limiting
3. Invalid recipient email address
4. SMTP credentials expired

### Issue: SMTP timeout

**Possible causes:**
1. Firewall blocking port 587
2. SMTP server down
3. Invalid SMTP credentials
4. Network connectivity issues

## 📧 Code Reference

The code checks for these exact variable names:

```typescript
// From: app/api/test-email/route.ts (lines 25-30)
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;        // ← Not SMTP_PASSWORD
const emailFrom = process.env.EMAIL_FROM;      // ← Not SMTP_FROM
const emailFromName = process.env.EMAIL_FROM_NAME;
```

## ✅ Verification Checklist

- [ ] All 6 environment variables added with exact names
- [ ] Old variables (`SMTP_PASSWORD`, `SMTP_FROM`) deleted
- [ ] All environments selected (Production, Preview, Development)
- [ ] Variables saved successfully
- [ ] Application redeployed
- [ ] Deployment completed successfully
- [ ] Test endpoint returns success
- [ ] Test email received

## 🆘 Need Help?

If still not working after following all steps:
1. Share screenshot of Vercel environment variables page
2. Share the exact error message from test endpoint
3. Check deployment logs for any errors
