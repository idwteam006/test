# System Users CSV Import - Template & Instructions

## Quick Start

1. Download [system-users-import-template.csv](./system-users-import-template.csv)
2. Fill in user details
3. Get Department IDs and Manager IDs (see below)
4. Upload via `/admin/system-users` → "Import CSV"

---

## How to Get Department IDs

### Method 1: API Call (Recommended)
```bash
GET /api/admin/departments
```

This returns all departments with their UUIDs:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Engineering",
      "tenantId": "...",
      "_count": { "employees": 5 }
    },
    ...
  ]
}
```

### Method 2: Via Browser
1. Login to your admin account
2. Go to `/admin/organization`
3. View departments list - IDs are displayed there
4. Copy the UUID for the department you need

### Method 3: Browser Console
Open browser console on any admin page and run:
```javascript
fetch('/api/admin/departments')
  .then(r => r.json())
  .then(data => {
    console.table(data.data.map(d => ({
      Name: d.name,
      ID: d.id,
      Employees: d._count.employees
    })));
  });
```

---

## How to Get Manager IDs

### Method 1: API Call
```bash
GET /api/admin/system-users
```

Look for users with role `ADMIN` or `MANAGER` and copy their `id` (not `employeeId`).

### Method 2: Via Browser
1. Go to `/admin/system-users`
2. Find the manager you want
3. Copy their User ID (UUID format)
4. **Important:** Use User ID, NOT Employee Number

### Method 3: Browser Console
```javascript
fetch('/api/admin/system-users')
  .then(r => r.json())
  .then(data => {
    const managers = data.data.users.filter(u =>
      u.role === 'ADMIN' || u.role === 'MANAGER'
    );
    console.table(managers.map(m => ({
      Name: `${m.firstName} ${m.lastName}`,
      Email: m.email,
      Role: m.role,
      ID: m.id
    })));
  });
```

---

## Available Departments (Default Seed Data)

If you've run the database seed, these departments should exist:

- Engineering
- Product
- Sales
- Marketing
- Human Resources
- Finance
- Operations
- Customer Support
- Data & Analytics
- DevOps
- QA & Testing
- Administration

---

## CSV Examples

### Example 1: Simple User (No Department/Manager)
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
admin@company.com,John,Doe,ADMIN,,,
```

### Example 2: User with Department (Creates Employee Record)
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
emp@company.com,Jane,Smith,EMPLOYEE,Software Engineer,550e8400-e29b-41d4-a716-446655440000,
```

### Example 3: User with Department and Manager
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
emp@company.com,Bob,Johnson,EMPLOYEE,Junior Dev,550e8400-e29b-41d4-a716-446655440000,650e8400-e29b-41d4-a716-446655440001
```

### Example 4: Complete CSV
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
admin@company.com,John,Doe,ADMIN,Chief Administrator,,
hr@company.com,Jane,Smith,HR,HR Manager,550e8400-e29b-41d4-a716-446655440000,
manager@company.com,Bob,Johnson,MANAGER,Eng Manager,550e8400-e29b-41d4-a716-446655440000,650e8400-e29b-41d4-a716-446655440001
employee@company.com,Alice,Brown,EMPLOYEE,Developer,550e8400-e29b-41d4-a716-446655440000,750e8400-e29b-41d4-a716-446655440002
```

---

## Field Details

| Field | Required | Type | Example |
|-------|----------|------|---------|
| email | ✅ Yes | Email | `user@company.com` |
| firstName | ✅ Yes | String | `John` |
| lastName | ✅ Yes | String | `Doe` |
| role | ✅ Yes | Enum | `ADMIN`, `MANAGER`, `EMPLOYEE`, `HR`, `ACCOUNTANT` |
| jobTitle | ❌ No | String | `Software Engineer` |
| departmentId | ❌ No | UUID | `550e8400-e29b-41d4-a716-446655440000` |
| managerId | ❌ No | UUID | `650e8400-e29b-41d4-a716-446655440001` |

### Important Notes

1. **Email Domain**: Must be whitelisted for your organization
2. **Employee Record**: Created automatically if BOTH `jobTitle` AND `departmentId` are provided
3. **Employee Number**: Auto-generated (e.g., `EMP-20251220-001`) when employee record is created
4. **Manager ID**: Use User ID (UUID), not Employee Number (EMP-XXX-XXX)
5. **Empty Fields**: Leave blank (double comma `,,`) if not needed
6. **Role Values**: Must be UPPERCASE
7. **Maximum**: 100 users per upload

---

## Common Mistakes

### ❌ Wrong: Using Employee Number as Manager ID
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
user@co.com,John,Doe,EMPLOYEE,Dev,dept-uuid,EMP-20251220-001
```

### ✅ Correct: Using User UUID as Manager ID
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
user@co.com,John,Doe,EMPLOYEE,Dev,dept-uuid,550e8400-e29b-41d4-a716-446655440000
```

### ❌ Wrong: Lowercase Role
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
user@co.com,John,Doe,admin,CTO,,
```

### ✅ Correct: Uppercase Role
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
user@co.com,John,Doe,ADMIN,CTO,,
```

---

## Validation Errors

| Error | Solution |
|-------|----------|
| "Email domain is not allowed" | Contact admin to whitelist domain |
| "Department ID not found" | Get correct UUID from `/api/admin/departments` |
| "Manager ID not found" | Verify manager exists and has ADMIN/MANAGER role |
| "Email already exists" | Row will be skipped (not an error) |
| "Duplicate emails in CSV" | Remove duplicate rows |
| "Invalid email" | Check email format |
| "Role must be..." | Use exact uppercase values |

---

## Need Help?

1. Check the [full documentation](../../BULK_IMPORT_GUIDE.md)
2. Test with 1-2 users first
3. Review error messages in import report
4. Contact your system administrator

---

## Quick Reference: Get IDs via Browser Console

Copy-paste this into your browser console (F12) on any admin page:

```javascript
// Get Department IDs
fetch('/api/admin/departments').then(r => r.json()).then(d => {
  console.log('=== DEPARTMENTS ===');
  d.data.forEach(dept => console.log(`${dept.name}: ${dept.id}`));
});

// Get Manager IDs
fetch('/api/admin/system-users').then(r => r.json()).then(d => {
  console.log('\n=== MANAGERS ===');
  d.data.users
    .filter(u => u.role === 'ADMIN' || u.role === 'MANAGER')
    .forEach(m => console.log(`${m.firstName} ${m.lastName} (${m.role}): ${m.id}`));
});
```

This will print all department and manager IDs you need for your CSV!
