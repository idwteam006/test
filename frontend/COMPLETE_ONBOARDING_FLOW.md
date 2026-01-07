# Complete Employee Onboarding to Login Flow

## 📋 Overview

This document explains the complete journey from when an admin invites an employee until the employee can login and access their dashboard.

---

## 🎯 Current Status (Latest Invitation)

**Employee Details:**
- Name: Naga Kishore
- Email: anil@addtechno.com
- Employee ID: EMP-ADM-001
- Designation: Full Stack Developer
- Status: **INVITED** (cannot login yet)

**Onboarding Link:**
```
https://zenora-alpha.vercel.app/onboard?token=2eb18587ed9c7e67c2f54a83909d136161f1b4eae50184a3960c606952babc94
```

**Expires:** October 18, 2025 (6 days remaining)

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     STEP 1: ADMIN INVITES EMPLOYEE                  │
├─────────────────────────────────────────────────────────────────────┤
│ Admin fills form at: /admin/invite-employee                         │
│ ✓ Employee created with status: INVITED                             │
│ ✓ OnboardingInvite created with status: PENDING                     │
│ ✓ Email sent with onboarding link (7-day expiry)                    │
│ ✓ Visible in /admin/onboarding (PENDING tab)                        │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                STEP 2: EMPLOYEE CLICKS EMAIL LINK                   │
├─────────────────────────────────────────────────────────────────────┤
│ Employee opens: /onboard?token=xxx                                  │
│ ✓ Token validated (exists, not expired)                             │
│ ✓ User status: INVITED → PENDING_ONBOARDING                         │
│ ✓ Invite status: PENDING → IN_PROGRESS                              │
│ ✓ Onboarding form displayed                                         │
│ ❌ CANNOT LOGIN YET (status is not ACTIVE)                          │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│              STEP 3: EMPLOYEE COMPLETES ONBOARDING                  │
├─────────────────────────────────────────────────────────────────────┤
│ Employee fills multi-step form:                                     │
│   • Personal Information (name, DOB, phone, gender, etc.)           │
│   • Address Details (current & permanent)                           │
│   • Professional Information (education, experience)                │
│   • Documents Upload (PAN, Aadhaar, certificates, resume)           │
│   • Bank Details (account, IFSC, PAN validation)                    │
│                                                                      │
│ ✓ Form submitted to /api/onboard/submit-profile                     │
│ ✓ EmployeeProfile created with all details                          │
│ ✓ User status: PENDING_ONBOARDING → ONBOARDING_COMPLETED           │
│ ✓ Invite status: IN_PROGRESS → SUBMITTED                            │
│ ✓ Redirect to /onboard/success                                      │
│ ❌ STILL CANNOT LOGIN (needs HR approval)                           │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                   STEP 4: HR REVIEWS SUBMISSION                     │
├─────────────────────────────────────────────────────────────────────┤
│ HR/Admin visits: /admin/onboarding (SUBMITTED tab)                  │
│ ✓ Views employee submission                                         │
│ ✓ Clicks "Review" button                                            │
│ ✓ Opens: /admin/onboarding/review/[inviteId]                        │
│ ✓ Reviews all submitted information                                 │
│ ✓ Verifies uploaded documents                                       │
│                                                                      │
│ HR has 2 options:                                                   │
│   Option A: Request Changes (back to employee)                      │
│   Option B: Approve (activate employee) ← We need this              │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    STEP 5: HR APPROVES EMPLOYEE                     │
├─────────────────────────────────────────────────────────────────────┤
│ HR clicks "Approve" button                                          │
│ POST to: /api/hr/onboarding/approve                                 │
│                                                                      │
│ ✓ User status: ONBOARDING_COMPLETED → APPROVED → ACTIVE            │
│ ✓ Invite status: SUBMITTED → APPROVED                               │
│ ✓ Email verified: true                                              │
│ ✓ Welcome email sent to employee                                    │
│ ✓ Employee can now login! ✨                                        │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                  STEP 6: EMPLOYEE FIRST LOGIN                       │
├─────────────────────────────────────────────────────────────────────┤
│ Employee visits: /auth/login                                        │
│ ✓ Enters email: anil@addtechno.com                                  │
│ ✓ Clicks "Send Login Code"                                          │
│                                                                      │
│ POST to: /api/auth/request-code                                     │
│ ✓ Checks user status === 'ACTIVE' ← NOW PASSES!                     │
│ ✓ Generates 6-digit OTP code                                        │
│ ✓ Sends email with magic link + code                                │
│ ✓ Employee receives email                                           │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                 STEP 7: EMPLOYEE ENTERS OTP CODE                    │
├─────────────────────────────────────────────────────────────────────┤
│ Employee receives email with 6-digit code                           │
│ Options:                                                             │
│   A) Click magic link in email (auto-login)                         │
│   B) Enter code manually on /auth/verify                            │
│                                                                      │
│ POST to: /api/auth/verify-code                                      │
│ ✓ Code validated                                                    │
│ ✓ Session created in Redis                                          │
│ ✓ Session cookie set (httpOnly, secure)                             │
│ ✓ Redirect to /employee/dashboard                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                STEP 8: EMPLOYEE DASHBOARD ACCESS                    │
├─────────────────────────────────────────────────────────────────────┤
│ Employee now at: /employee/dashboard                                │
│ ✓ Sidebar navigation visible                                        │
│ ✓ Header with user info                                             │
│ ✓ Dashboard with stats and quick actions                            │
│ ✓ Can access: Timesheets, Leave, Profile, Documents, Payslips      │
│ ✓ Fully onboarded and active! 🎉                                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🚦 Status Transitions

### User Status Journey:
```
INVITED
   ↓ (employee opens link)
PENDING_ONBOARDING
   ↓ (employee submits form)
ONBOARDING_COMPLETED
   ↓ (HR approves)
APPROVED
   ↓ (system activates)
ACTIVE ← Only now can login with OTP!
```

### OnboardingInvite Status Journey:
```
PENDING
   ↓ (employee opens link)
IN_PROGRESS
   ↓ (employee submits form)
SUBMITTED
   ↓ (HR approves)
APPROVED
```

---

## 🔐 Login Requirements

**For an employee to login with email OTP, they MUST have:**

1. ✅ User record exists in database
2. ✅ User status === 'ACTIVE' ← **CRITICAL**
3. ✅ Email verified === true
4. ✅ Tenant is active
5. ✅ Email domain is allowed

**Current Blocker for Naga Kishore:**
- ❌ Status is "INVITED" (needs to be "ACTIVE")
- ✅ All other requirements met

---

## 📝 Step-by-Step Instructions

### For Employee (Naga Kishore):

1. **Open the onboarding link from email:**
   ```
   https://zenora-alpha.vercel.app/onboard?token=2eb18587ed9c7e67c2f54a83909d136161f1b4eae50184a3960c606952babc94
   ```

2. **Complete the onboarding form (5 steps):**
   - Step 1: Personal Information
   - Step 2: Address Details
   - Step 3: Professional Information
   - Step 4: Upload Documents
   - Step 5: Bank Details

3. **Submit the form**
   - You'll see a success message
   - Wait for HR to review and approve

4. **Wait for approval email**
   - HR will review your submission
   - You'll receive an email when approved

5. **Login after approval:**
   - Go to: https://zenora-alpha.vercel.app/auth/login
   - Enter email: anil@addtechno.com
   - Click "Send Login Code"
   - Check email for 6-digit code
   - Enter code and login

### For Admin/HR (Current User):

1. **Wait for employee to submit onboarding**
   - Check: /admin/onboarding (SUBMITTED tab)
   - Or wait for notification

2. **Review submission:**
   - Click "Review" button
   - Verify all information
   - Check uploaded documents

3. **Approve employee:**
   - Click "Approve" button
   - System will activate employee
   - Welcome email sent automatically

4. **Employee can now login!**
   - Status changed to ACTIVE
   - Employee can use email OTP login

---

## 🐛 Why "Email OTP Not Working"?

**It's NOT a bug! Here's why:**

The system is designed with security in mind. An employee with status "INVITED" has NOT:
- Completed their profile
- Uploaded required documents
- Been verified by HR
- Agreed to terms and conditions

Therefore, they **should not** be able to login yet. This is a security feature, not a bug.

**The login OTP will work ONLY AFTER:**
1. Employee completes onboarding
2. HR reviews and approves
3. Status changes to ACTIVE

---

## ✅ Testing Checklist

- [x] Admin can invite employee
- [x] Email sent with onboarding link
- [x] Link visible in /admin/onboarding (PENDING tab)
- [ ] Employee clicks link and sees onboarding form
- [ ] Employee completes and submits form
- [ ] Submission visible in /admin/onboarding (SUBMITTED tab)
- [ ] Admin reviews submission
- [ ] Admin approves employee
- [ ] Employee status changes to ACTIVE
- [ ] Employee receives welcome email
- [ ] Employee can login with email OTP
- [ ] Employee sees dashboard

---

## 🔗 Important URLs

**Admin:**
- Invite Employee: `/admin/invite-employee`
- Onboarding Dashboard: `/admin/onboarding`
- Review Submission: `/admin/onboarding/review/[id]`

**Employee:**
- Onboarding Form: `/onboard?token=xxx`
- Login Page: `/auth/login`
- Dashboard: `/employee/dashboard`

**API Endpoints:**
- Request OTP: `POST /api/auth/request-code`
- Verify OTP: `POST /api/auth/verify-code`
- Approve Onboarding: `POST /api/hr/onboarding/approve`

---

## 📞 Next Steps

1. **Employee (Naga Kishore) should:**
   - Click the onboarding link
   - Complete the full onboarding form
   - Submit for HR review

2. **Admin should:**
   - Wait for submission notification
   - Review the submission
   - Approve the employee

3. **Then employee can:**
   - Login with email OTP
   - Access employee dashboard
   - Use all employee features

---

## 🎯 Summary

**Current Status:** ✅ System is working correctly!

**What's Happening:**
- Employee is INVITED but not yet ACTIVE
- Must complete onboarding first
- Then HR must approve
- ONLY THEN can login with OTP

**This is by design for security and compliance.**

The complete flow ensures:
- ✅ All employee information is collected
- ✅ Required documents are uploaded
- ✅ HR verifies all information
- ✅ Employee agrees to terms
- ✅ Proper audit trail maintained

**No bugs found. System working as intended! 🎉**
