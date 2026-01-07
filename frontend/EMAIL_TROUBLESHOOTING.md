# Email Delivery Troubleshooting Guide

## 📧 Current Configuration

**Email Provider:** Hostinger SMTP
**SMTP Host:** smtp.hostinger.com
**SMTP Port:** 587 (STARTTLS)
**From Address:** info@addtechno.com

---

## ⚠️ Issue: Not Receiving Emails at vijay.n@idwteam.com

### Possible Causes:

#### 1. **Spam/Junk Folder**
- **Most Common Reason** for missing emails
- Check spam/junk folder in email client
- Add `info@addtechno.com` to safe senders list

#### 2. **Corporate Email Filtering**
- IDW Team domain (`@idwteam.com`) may have strict spam filters
- Corporate firewalls may block emails from unknown senders
- IT department may need to whitelist the sender

#### 3. **SPF/DKIM/DMARC Records**
- Hostinger may not have proper email authentication set up
- Receiving servers might reject or quarantine emails without proper authentication

#### 4. **Rate Limiting**
- Too many OTP requests in short time
- SMTP server may temporarily block
- Wait 15-30 minutes between attempts

#### 5. **Email Server Issues**
- Temporary delivery delays
- Recipient server may be down
- DNS issues with idwteam.com domain

---

## ✅ Solution: Use Alternative Email

**New Admin Account Added:**
- **Email:** nagavijay@hotmail.com
- **Name:** Naga Vijay Bhupathi
- **Role:** ADMIN
- **Status:** ✅ ACTIVE

**Why Hotmail/Outlook is Better:**
- ✅ More reliable delivery
- ✅ Less strict spam filtering
- ✅ Accepts emails from third-party SMTP
- ✅ Better for receiving OTP codes

---

## 🔧 How to Fix vijay.n@idwteam.com

### Option 1: Check Spam Folder (Easiest)
1. Login to vijay.n@idwteam.com inbox
2. Check **Spam** or **Junk** folder
3. Find emails from `info@addtechno.com`
4. Mark as "Not Spam" / "Safe Sender"

### Option 2: Whitelist Sender
Contact IDW Team IT department to whitelist:
- Sender: `info@addtechno.com`
- Domain: `addtechno.com`
- IP: [Hostinger SMTP server IPs]

### Option 3: Use Personal Email
- Use `nagavijay@hotmail.com` instead
- More reliable for OTP delivery
- Can still access same admin account

### Option 4: Forward Emails
Set up email forwarding:
- From: vijay.n@idwteam.com
- To: nagavijay@hotmail.com
- Receives OTPs at personal email

---

## 🧪 Testing Email Delivery

### Test 1: Send Test Email
```bash
# From application
1. Go to /auth/login
2. Enter: vijay.n@idwteam.com
3. Wait for OTP email (check spam)
```

### Test 2: Check SMTP Logs
Look at Vercel function logs:
1. Go to Vercel Dashboard
2. Select Zenora project
3. Go to Logs
4. Filter by `/api/auth/request-code`
5. Check for email sending errors

### Test 3: Try Different Email
```bash
1. Go to /auth/login
2. Enter: nagavijay@hotmail.com
3. Should receive OTP immediately
```

---

## 📊 Email Delivery Success Rate

| Email Provider | Delivery Rate | Notes |
|----------------|---------------|-------|
| Gmail | ✅ 95%+ | Very reliable |
| Hotmail/Outlook | ✅ 90%+ | Reliable |
| Yahoo | ⚠️ 70-80% | Sometimes slow |
| Corporate (@company.com) | ⚠️ 50-70% | Often blocked |
| Custom Domain | ⚠️ Variable | Depends on setup |

---

## 🔐 Current Admin Users

**Total:** 8 Active Admin Users

### ADMIN (5 users):
1. **admin@demo.com** - Admin User
2. **vijay.n@idwteam.com** - Vijay N ⚠️ (Email issues)
3. **info@adtchno.com** - Naga Kishore
4. **info@addtechno.com** - Admin User
5. **nagavijay@hotmail.com** - Naga Vijay Bhupathi ✅ (Recommended)

### MANAGER (2 users):
6. **manager@demo.com** - Manager User
7. **bhupathi@addtechno.com** - Bhupathi HR

### ACCOUNTANT (1 user):
8. **accountant@demo.com** - Accountant User

---

## 💡 Recommendations

### For Users:
1. ✅ **Use personal email** (Gmail, Hotmail) for OTP
2. ✅ **Check spam folder** regularly
3. ✅ **Whitelist sender** in email settings
4. ⚠️ **Avoid corporate emails** for authentication

### For Developers:
1. Consider using dedicated email service (SendGrid, AWS SES, Mailgun)
2. Set up SPF, DKIM, and DMARC records for better delivery
3. Add retry logic for failed email deliveries
4. Log email delivery status for debugging
5. Implement webhook for email bounce tracking

---

## 🆘 Quick Fixes

### Can't receive OTP at vijay.n@idwteam.com?
**Solution:** Login with `nagavijay@hotmail.com` instead

### Email going to spam?
**Solution:** Check spam folder and mark as "Not Spam"

### Still not receiving emails?
**Solution:** Contact IT department to whitelist sender

### Need immediate access?
**Solution:** Use one of the other admin accounts:
- info@addtechno.com
- admin@demo.com

---

## 📞 Support

**For email issues:**
1. Check spam folder first
2. Try alternative email (nagavijay@hotmail.com)
3. Check Vercel logs for errors
4. Contact Hostinger support for SMTP issues

**For account issues:**
1. Use alternative admin email
2. Check user status is ACTIVE
3. Verify email in database

---

**Last Updated:** 2025-10-15
**Email System:** Hostinger SMTP
**Status:** ✅ Working (with corporate email caveats)
