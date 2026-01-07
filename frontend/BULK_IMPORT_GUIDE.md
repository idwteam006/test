# System Users Bulk Import Guide

This guide explains how to bulk import system users using CSV files for both HR and Admin roles.

## Overview

The bulk import feature allows ADMIN and HR users to quickly create multiple system users by uploading a CSV file. This is useful for:
- Onboarding new teams
- Migrating from another system
- Setting up a new organization

---

## Access & Permissions

**Who can use bulk import:**
- ✅ ADMIN users
- ✅ HR users
- ❌ Other roles (MANAGER, EMPLOYEE, ACCOUNTANT)

**Endpoint:** `POST /api/admin/system-users/bulk-import`

---

## CSV Format

### Required Columns (in order)

| Column | Required | Type | Description | Example |
|--------|----------|------|-------------|---------|
| `email` | ✅ Yes | Email | User's email address | `john@company.com` |
| `firstName` | ✅ Yes | String (1-100 chars) | User's first name | `John` |
| `lastName` | ✅ Yes | String (1-100 chars) | User's last name | `Doe` |
| `role` | ✅ Yes | Enum | User role | `ADMIN`, `MANAGER`, `EMPLOYEE`, `HR`, `ACCOUNTANT` |
| `jobTitle` | ❌ No | String (max 200 chars) | Job title/designation | `Software Engineer` |
| `departmentId` | ❌ No | UUID | Department UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `managerId` | ❌ No | UUID | Manager's User UUID | `650e8400-e29b-41d4-a716-446655440001` |

### CSV Example

```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
admin@company.com,John,Doe,ADMIN,Chief Administrator,dept-uuid-123,
hr@company.com,Jane,Smith,HR,HR Manager,dept-uuid-456,
manager@company.com,Bob,Johnson,MANAGER,Engineering Manager,dept-uuid-789,user-uuid-001
accountant@company.com,Alice,Williams,ACCOUNTANT,Senior Accountant,dept-uuid-456,
employee@company.com,Mike,Brown,EMPLOYEE,Software Engineer,dept-uuid-789,user-uuid-002
```

---

## Field Details

### 1. Email (`email`)
- **Required:** Yes
- **Format:** Valid email address (e.g., `user@domain.com`)
- **Validation:**
  - Must be unique (no duplicates in CSV or existing users)
  - Email domain must be whitelisted for your organization
  - Case-insensitive

### 2. First Name (`firstName`)
- **Required:** Yes
- **Length:** 1-100 characters
- **Sanitization:** Automatically sanitized for security

### 3. Last Name (`lastName`)
- **Required:** Yes
- **Length:** 1-100 characters
- **Sanitization:** Automatically sanitized for security

### 4. Role (`role`)
- **Required:** Yes
- **Allowed Values:**
  - `ADMIN` - Full system access
  - `HR` - Human resources access
  - `MANAGER` - Team management access
  - `ACCOUNTANT` - Financial access
  - `EMPLOYEE` - Standard employee access
- **Default:** `EMPLOYEE` (if not specified)
- **Case-sensitive:** Must be uppercase

### 5. Job Title (`jobTitle`)
- **Required:** No (optional)
- **Length:** Maximum 200 characters
- **Note:** If provided along with `departmentId`, an Employee record will be created with auto-generated employee number

### 6. Department ID (`departmentId`)
- **Required:** No (optional)
- **Format:** UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
- **Validation:** Must exist in your organization's departments
- **How to get:** Go to `/admin/organization` to see department IDs
- **Employee Creation:** If provided with `jobTitle`, creates Employee record

### 7. Manager ID (`managerId`)
- **Required:** No (optional)
- **Format:** UUID (User ID, not Employee ID)
- **Validation:**
  - Must be an existing user in your organization
  - User must have ADMIN or MANAGER role
- **How to get:** Go to `/admin/system-users` to see user IDs
- **Auto-creation:** If manager doesn't have an Employee record, one will be created automatically

---

## Important Rules

### Limits
- **Maximum:** 100 users per upload
- **Minimum:** 1 user

### Validations
1. **Email Uniqueness:**
   - No duplicate emails within the CSV
   - Email must not exist in the system already
   - Duplicate emails will be skipped

2. **Email Domain:**
   - Email domain must be whitelisted for your organization
   - Invalid domains will be rejected

3. **Department Validation:**
   - If `departmentId` is provided, it must exist in your organization
   - Invalid department IDs will cause row to fail

4. **Manager Validation:**
   - If `managerId` is provided, user must exist and be ADMIN/MANAGER
   - Invalid manager IDs will cause row to fail

5. **Employee Record Creation:**
   - Employee record is created ONLY if BOTH `jobTitle` AND `departmentId` are provided
   - Auto-generates employee number (e.g., `EMP-20251220-001`)
   - Sets default employment type to `FULL_TIME`
   - Sets status to `ACTIVE`
   - Sets start date to current date

### Auto-Generated Data
- **Employee Number:** `EMP-YYYYMMDD-XXX` (e.g., `EMP-20251220-001`)
  - Format: EMP-[Date]-[Sequential Number]
  - Only generated if `jobTitle` and `departmentId` are provided
- **User Status:** Always set to `ACTIVE`
- **Email Verified:** Set to `false` (user will verify on first login)
- **Password:** Empty (passwordless authentication)

---

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Bulk import completed: 4 created, 1 skipped, 0 failed",
  "summary": {
    "total": 5,
    "successful": 4,
    "skipped": 1,
    "failed": 0
  },
  "details": {
    "successful": [
      {
        "row": 1,
        "email": "admin@company.com",
        "name": "John Doe",
        "role": "ADMIN",
        "employeeNumber": "EMP-20251220-001"
      }
    ],
    "skipped": [
      {
        "row": 2,
        "email": "existing@company.com",
        "reason": "Email already exists"
      }
    ],
    "failed": []
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Validation failed for some rows",
  "invalidRows": [
    {
      "row": 3,
      "data": {...},
      "valid": false,
      "errors": ["Invalid email", "Role must be ADMIN, MANAGER, EMPLOYEE, HR, or ACCOUNTANT"]
    }
  ]
}
```

---

## Step-by-Step Instructions

### Step 1: Prepare Your CSV File

1. Download the template: `/templates/system-users-import-template.csv`
2. Open in Excel, Google Sheets, or any text editor
3. Fill in the user data following the format above
4. **Important:** Keep the header row exactly as shown

### Step 2: Get Required IDs

**Department IDs:**
1. Go to `/admin/organization`
2. View your departments
3. Copy the department UUID

**Manager IDs:**
1. Go to `/admin/system-users`
2. Find the manager user
3. Copy their User ID (not Employee Number)

### Step 3: Validate Your CSV

Before uploading, check:
- ✅ No duplicate emails
- ✅ All required fields are filled
- ✅ Role values are uppercase and valid
- ✅ Department IDs exist in your organization
- ✅ Manager IDs are valid ADMIN/MANAGER users
- ✅ Email domains are whitelisted
- ✅ Maximum 100 rows

### Step 4: Upload

1. Go to `/admin/system-users`
2. Click "Bulk Import" or "Import CSV"
3. Select your CSV file
4. Review the preview (if available)
5. Click "Import"

### Step 5: Review Results

After import:
- Check the summary: successful, skipped, failed counts
- Review any failed rows and fix issues
- Re-import failed rows if needed
- Skipped rows (duplicates) don't need action

---

## Common Errors & Solutions

### Error: "Email domain is not allowed"
**Solution:** Contact your admin to whitelist the email domain

### Error: "Department ID not found"
**Solution:** Verify the department exists in `/admin/organization`

### Error: "Manager ID not found or is not an ADMIN/MANAGER"
**Solution:**
- Verify the user exists
- Check they have ADMIN or MANAGER role
- Use User ID, not Employee Number

### Error: "Email already exists"
**Result:** Row is skipped (not an error)
**Solution:** Remove from CSV or update existing user manually

### Error: "Duplicate emails found in CSV"
**Solution:** Remove duplicate rows from your CSV

### Error: "Maximum 100 users per bulk upload"
**Solution:** Split your CSV into multiple files of 100 or fewer users

### Error: "Invalid email"
**Solution:** Check email format is correct (e.g., `user@domain.com`)

### Error: "Role must be ADMIN, MANAGER, EMPLOYEE, HR, or ACCOUNTANT"
**Solution:** Use exact uppercase values from allowed list

---

## Best Practices

1. **Start Small:** Test with 5-10 users first before bulk uploading
2. **Backup First:** Export existing users before bulk import
3. **Use Template:** Always start from the provided CSV template
4. **Validate IDs:** Verify all department and manager IDs exist before upload
5. **Check Domains:** Ensure email domains are whitelisted
6. **Review Results:** Always check the import report for failures
7. **Save CSV:** Keep your CSV file for reference and re-imports
8. **Incremental Imports:** Import in batches of 50-100 for better control

---

## What Happens After Import

For each successfully imported user:

1. ✅ User account created with status `ACTIVE`
2. ✅ Welcome email sent to user
3. ✅ Employee record created (if jobTitle + departmentId provided)
4. ✅ Employee number auto-generated
5. ✅ Manager relationship established (if managerId provided)
6. ✅ Audit log created for tracking
7. ✅ Admin notification sent
8. ✅ Caches invalidated for fresh data

Users can then:
- Login using passwordless authentication (email link)
- Access features based on their role
- View their profile and employee information

---

## API Usage (for developers)

### Request

```bash
POST /api/admin/system-users/bulk-import
Content-Type: application/json
Cookie: session=<session-id>

{
  "users": [
    {
      "email": "user@company.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "EMPLOYEE",
      "jobTitle": "Software Engineer",
      "departmentId": "dept-uuid",
      "managerId": "manager-uuid"
    }
  ]
}
```

### Response

```json
{
  "success": true,
  "message": "Bulk import completed: 1 created, 0 skipped, 0 failed",
  "summary": {
    "total": 1,
    "successful": 1,
    "skipped": 0,
    "failed": 0
  },
  "details": {
    "successful": [...],
    "skipped": [],
    "failed": []
  }
}
```

---

## Security Features

- ✅ Email domain validation (whitelist)
- ✅ Input sanitization (XSS prevention)
- ✅ Role-based access control (ADMIN/HR only)
- ✅ Audit logging (who imported what)
- ✅ Session validation
- ✅ Tenant isolation (can't import to other organizations)
- ✅ Duplicate prevention
- ✅ Rate limiting (max 100 per upload)

---

## Support

For issues or questions:
1. Check this guide first
2. Review the error message in the import report
3. Contact your system administrator
4. File a support ticket with the import report attached

---

## Changelog

### Version 1.0 (2024-12-20)
- Initial release
- Support for ADMIN and HR roles
- Auto-generates employee numbers
- Validates email domains
- Maximum 100 users per upload
