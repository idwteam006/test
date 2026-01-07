# Employee Invitation Flow - Complete Details

## When Admin/Manager Sends an Invitation

### 📋 Input Data from Form:
```json
{
  "email": "newemployee@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "departmentId": "uuid-of-department",
  "designation": "Software Engineer",
  "joiningDate": "2025-11-01",
  "managerId": "uuid-of-manager",
  "employeeId": "EMP-ENG-001" (or auto-generated),
  "workLocation": "Bangalore",
  "employmentType": "FULL_TIME"
}
```

### 🗄️ Database Records Created:

#### 1. User Record (in `users` table)
```json
{
  "id": "generated-uuid",
  "email": "newemployee@company.com",
  "name": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "tenantId": "current-tenant-id",
  "role": "EMPLOYEE",
  "status": "INVITED",
  "employeeId": "EMP-ENG-001",
  "departmentId": "uuid-of-department",
  "password": "",
  "emailVerified": false,
  "createdAt": "2025-10-11T11:17:24.000Z",
  "updatedAt": "2025-10-11T11:17:24.000Z"
}
```

#### 2. OnboardingInvite Record (in `onboarding_invites` table)
```json
{
  "id": "generated-uuid",
  "tenantId": "current-tenant-id",
  "userId": "user-id-from-above",
  "token": "64-character-hex-token",
  "email": "newemployee@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "departmentId": "uuid-of-department",
  "designation": "Software Engineer",
  "joiningDate": "2025-11-01T00:00:00.000Z",
  "managerId": "uuid-of-manager",
  "employeeId": "EMP-ENG-001",
  "workLocation": "Bangalore",
  "employmentType": "FULL_TIME",
  "status": "PENDING",
  "expiresAt": "2025-10-18T11:17:24.000Z",
  "createdBy": "admin-user-id",
  "createdAt": "2025-10-11T11:17:24.000Z",
  "updatedAt": "2025-10-11T11:17:24.000Z"
}
```

### 📧 Email Sent to Employee:

**Subject:** Complete Your Onboarding - Zenora.ai

**To:** newemployee@company.com

**Content:**
```
🎉 Welcome to Zenora.ai!

Hi John,

You've been invited to join our team! admin@company.com has initiated your onboarding process.

📋 Next Steps:
1. Complete Your Profile - Fill in your personal details
2. Add Your Address - Current and permanent address
3. Professional Information - Education and experience
4. Upload Documents - Required documents for verification
5. Bank Details - For salary processing

[Complete Your Onboarding] (Button)
→ Links to: https://zenora-alpha.vercel.app/onboard?token=<64-char-token>

⏰ Important:
This link expires in 7 days
If you need more time, contact your HR team

📧 Having trouble? Reply to this email for assistance.

Zenora.ai Team
```

### 🔐 Security Features:

1. **Secure Token:**
   - 64-character hexadecimal token (256 bits of entropy)
   - Cryptographically random using `crypto.randomBytes(32)`
   - Single-use token

2. **Expiration:**
   - Link expires in 7 days
   - Checked on every onboarding page load

3. **Status Journey:**
   ```
   INVITED → PENDING_ONBOARDING → ONBOARDING_COMPLETED → APPROVED → ACTIVE
   ```

### 📊 What Admin/Manager Sees After Sending:

**Success Response:**
```json
{
  "success": true,
  "message": "Employee invite sent successfully",
  "data": {
    "userId": "generated-user-uuid",
    "email": "newemployee@company.com",
    "employeeId": "EMP-ENG-001",
    "inviteToken": "64-char-hex-token",
    "expiresAt": "2025-10-18T11:17:24.000Z"
  }
}
```

**UI Toast:**
- ✅ "Employee invited successfully!"
- ℹ️ "Invitation sent to newemployee@company.com"
- Redirects to: `/admin/onboarding` or `/hr/onboarding`

### 🔄 Onboarding Dashboard View:

The invitation will appear in the HR/Admin onboarding dashboard with:

- **Status:** Pending (yellow badge)
- **Employee:** John Doe (newemployee@company.com)
- **Employee ID:** EMP-ENG-001
- **Department:** Engineering
- **Designation:** Software Engineer
- **Joining Date:** Nov 1, 2025
- **Employment Type:** Full Time
- **Actions:**
  - 👁️ Review
  - 📧 Resend (if not opened yet)
  - ❌ Cancel

### 🔗 Onboarding Link:

**URL Format:**
```
https://zenora-alpha.vercel.app/onboard?token=<64-character-token>
```

**When Employee Clicks Link:**
1. Token is validated (exists, not expired, not used)
2. User status changes: `INVITED` → `PENDING_ONBOARDING`
3. Invite status changes: `PENDING` → `IN_PROGRESS`
4. Employee sees multi-step onboarding form:
   - Step 1: Personal Information
   - Step 2: Address Details
   - Step 3: Professional Information
   - Step 4: Documents Upload
   - Step 5: Bank Details

### 📝 Auto-Generated Fields:

1. **Employee ID Format:**
   - `EMP-[DEPT_CODE]-[NUMBER]`
   - Examples: `EMP-ENG-001`, `EMP-SAL-042`, `EMP-MAR-013`
   - Department code: First 3 letters of department name (uppercase)
   - Number: Sequential 3-digit number with leading zeros

2. **Invite Token:**
   - 64 hexadecimal characters
   - Example: `a7f3c9d8e2b1f4a6c5d8e9f1b2a3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1`

3. **Expiration Date:**
   - Automatically set to 7 days from creation
   - Format: ISO 8601 datetime

## Complete Flow Diagram:

```
Admin/Manager                    System                           Employee
     |                             |                                  |
     |--[1] Fill Invite Form------>|                                  |
     |                             |                                  |
     |<--[2] Success Response------|                                  |
     |                             |                                  |
     |                             |--[3] Create User (INVITED)------>|
     |                             |                                  |
     |                             |--[4] Create Invite (PENDING)---->|
     |                             |                                  |
     |                             |--[5] Send Email----------------->|
     |                             |                                  |
     |                             |                                  |--[6] Opens Email
     |                             |                                  |
     |                             |<-[7] Clicks Link-----------------|
     |                             |                                  |
     |                             |--[8] Validate Token------------->|
     |                             |                                  |
     |                             |--[9] Update Status-------------->|
     |                             |    (INVITED → PENDING_ONBOARDING)|
     |                             |                                  |
     |                             |<-[10] Completes Form-------------|
     |                             |                                  |
     |                             |--[11] Create Profile------------>|
     |                             |--[12] Update Status------------->|
     |                             |    (PENDING_ONBOARDING →         |
     |                             |     ONBOARDING_COMPLETED)        |
     |                             |                                  |
     |<--[13] Notification---------|                                  |
     |    "New submission          |                                  |
     |     awaiting review"        |                                  |
     |                             |                                  |
     |--[14] Review & Approve----->|                                  |
     |                             |                                  |
     |                             |--[15] Update Status------------->|
     |                             |    (ONBOARDING_COMPLETED →       |
     |                             |     APPROVED → ACTIVE)           |
     |                             |                                  |
     |                             |--[16] Send Welcome Email-------->|
     |                             |                                  |
```

## Database Tables Involved:

1. **users** - Employee user account
2. **onboarding_invites** - Invitation details and tracking
3. **employee_profiles** - Detailed employee info (created when form submitted)
4. **departments** - Department reference
5. **tenants** - Organization/company

## API Endpoints Used:

1. `POST /api/hr/invite-employee` - Create invitation
2. `GET /api/onboard/validate-token?token=xxx` - Validate token
3. `POST /api/onboard/submit-profile` - Submit onboarding form
4. `POST /api/hr/onboarding/approve` - Approve onboarding
5. `POST /api/hr/resend-invite` - Resend invitation email
6. `POST /api/hr/cancel-invite` - Cancel invitation
