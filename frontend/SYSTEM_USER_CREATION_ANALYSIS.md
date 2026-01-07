# System User Creation - Bug Analysis & Fixes

**Endpoint:** `POST /api/admin/system-users`
**File:** `app/api/admin/system-users/route.ts`
**Date:** 2025-12-26

---

## Issues Found

### 🔴 Issue 1: Employee Count Race Condition (Lines 181-191 & 222-232)

**Problem:**
The employee number generation has a race condition when creating both the new user's employee record and the manager's employee record.

```typescript
// Line 181: Gets count for new employee
const todayCount = await prisma.employee.count({
  where: {
    tenantId: sessionData.tenantId,
    createdAt: { gte: todayStart, lte: todayEnd },
  },
});
const employeeNumber = `EMP-${dateStr}-${String(todayCount + 1).padStart(3, '0')}`;

// Line 222: Gets count AGAIN for manager (same day)
const mgrTodayCount = await prisma.employee.count({
  where: {
    tenantId: sessionData.tenantId,
    createdAt: { gte: todayStart, lte: todayEnd },
  },
});
const mgrEmployeeNumber = `EMP-${dateStr}-${String(mgrTodayCount + 1).padStart(3, '0')}`;
```

**Bug Scenario:**
```
1. Get count for new employee: count = 5
2. Create manager employee number: EMP-20251226-006
3. Create manager employee record (count is now 6)
4. Get count for new employee manager: count = 6
5. Generate new employee number: EMP-20251226-007 ❌ (Should be 006)
6. OR WORSE: Both get same number if checked simultaneously
```

**Impact:**
- Duplicate employee numbers possible
- Inconsistent numbering sequence
- Database unique constraint violation potential

---

### 🟡 Issue 2: No Transaction Wrapper for Employee Creation

**Problem:**
Creating user, employee, and manager employee records are not in a transaction. If any step fails, partial data is created.

**Current Flow:**
```typescript
// Line 148: Create user (committed to DB)
const user = await prisma.user.create({...});

// Line 279: Create employee (separate operation)
const employee = await prisma.employee.create({...});

// Line 284: Update user (separate operation)
await prisma.user.update({...});
```

**Bug Scenario:**
```
1. User created ✅
2. Employee creation fails ❌ (e.g., department deleted)
3. Result: User exists without employee record
4. User can login but has incomplete data
5. System in inconsistent state
```

**Impact:**
- Orphaned user records
- Incomplete data in system
- Hard to debug state issues

---

### 🟡 Issue 3: Manager Employee Creation Without Department Validation

**Problem:**
Lines 206-254 create a manager employee record, but don't validate if the manager's department exists or is valid.

```typescript
// Line 220: Uses department without validation
const deptIdForManager = managerUser.departmentId || data.departmentId;

// No check if deptIdForManager exists or is valid
const managerEmployee = await prisma.employee.create({
  data: {
    department: { connect: { id: deptIdForManager } },
    // ...
  }
});
```

**Bug Scenario:**
```
1. Manager has departmentId: "deleted-dept-id"
2. New employee has departmentId: "valid-dept-id"
3. Code tries: managerUser.departmentId (deleted department)
4. Create manager employee fails with foreign key constraint
5. Entire request fails
```

---

### 🟡 Issue 4: No Validation for Manager User Existence

**Problem:**
Line 207 fetches manager user, but doesn't validate if it exists or belongs to same tenant.

```typescript
const managerUser = await prisma.user.findUnique({
  where: { id: data.managerId },
  // ...
});

if (managerUser) {  // ⚠️ What if managerUser is null?
  // Create manager employee
}
```

**Missing Checks:**
1. Manager user exists
2. Manager belongs to same tenant
3. Manager is actually a manager/admin role

**Bug Scenario:**
```
1. User provides managerId: "user-from-different-tenant"
2. Code fetches user
3. User exists but wrong tenant
4. Creates manager employee in wrong context
5. Data integrity violation
```

---

### 🟡 Issue 5: Email Sending Blocks Response

**Problem:**
Lines 291-295 send welcome email synchronously, blocking the response.

```typescript
// Line 291: Blocks until email sent
await sendWelcomeEmail(
  email,
  firstName,
  user.tenant.name
);
```

**Impact:**
- Slow API response (waits for email provider)
- Request timeout if email service slow
- Poor user experience
- Email failures block user creation success response

**Better Approach:**
Send emails in background or use fire-and-forget pattern.

---

### 🟢 Issue 6: Inconsistent Error Handling

**Problem:**
Some errors return detailed messages, others are generic.

**Examples:**
```typescript
// Line 88: Detailed error ✅
error: 'Email domain is not allowed for this organization',
details: 'Please use an email address with an approved domain...'

// Line 406: Generic error ❌
error: 'An error occurred while creating user',
details: error instanceof Error ? error.message : 'Unknown error'
```

**Impact:**
- Hard to debug production issues
- Inconsistent API responses
- Users don't know what went wrong

---

## Recommended Fixes

### Fix 1: Use Transaction for All DB Operations

```typescript
const result = await prisma.$transaction(async (tx) => {
  // 1. Create user
  const user = await tx.user.create({...});

  // 2. Create employee if needed
  let employee = null;
  if (data.jobTitle && data.departmentId) {
    // Get employee number (atomic within transaction)
    const employeeNumber = await generateEmployeeNumber(tx, sessionData.tenantId);

    // Handle manager
    let managerEmployeeId = null;
    if (data.managerId) {
      managerEmployeeId = await ensureManagerEmployee(
        tx,
        data.managerId,
        sessionData.tenantId,
        data.departmentId
      );
    }

    // Create employee
    employee = await tx.employee.create({
      data: {
        user: { connect: { id: user.id } },
        tenant: { connect: { id: sessionData.tenantId } },
        department: { connect: { id: data.departmentId } },
        employeeNumber,
        jobTitle: data.jobTitle,
        startDate: new Date(),
        employmentType: 'FULL_TIME',
        status: 'ACTIVE',
        emergencyContacts: [],
        ...(managerEmployeeId && { manager: { connect: { id: managerEmployeeId } } }),
      },
    });

    // Link employee to user
    await tx.user.update({
      where: { id: user.id },
      data: { employeeId: employee.id },
    });
  }

  return { user, employee };
});
```

---

### Fix 2: Generate Employee Number Atomically

```typescript
async function generateEmployeeNumber(
  tx: any,
  tenantId: string
): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  // Use database-level locking or unique constraint
  // Option 1: Use sequence table
  const sequence = await tx.employeeSequence.upsert({
    where: {
      tenantId_date: {
        tenantId,
        date: dateStr,
      },
    },
    create: {
      tenantId,
      date: dateStr,
      lastNumber: 1,
    },
    update: {
      lastNumber: { increment: 1 },
    },
  });

  return `EMP-${dateStr}-${String(sequence.lastNumber).padStart(3, '0')}`;
}
```

---

### Fix 3: Validate Manager Before Creating Employee

```typescript
async function ensureManagerEmployee(
  tx: any,
  managerId: string,
  tenantId: string,
  fallbackDepartmentId: string
): Promise<string | null> {
  // 1. Validate manager exists and belongs to tenant
  const managerUser = await tx.user.findUnique({
    where: { id: managerId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
      departmentId: true,
      tenantId: true,
      employeeId: true,
    },
  });

  if (!managerUser) {
    throw new Error('Manager user not found');
  }

  if (managerUser.tenantId !== tenantId) {
    throw new Error('Manager does not belong to the same organization');
  }

  // Validate role
  if (!['ADMIN', 'MANAGER', 'HR'].includes(managerUser.role)) {
    throw new Error('Selected user is not a manager');
  }

  // 2. Return existing employee ID if available
  if (managerUser.employeeId) {
    return managerUser.employeeId;
  }

  // 3. Validate department
  const departmentId = managerUser.departmentId || fallbackDepartmentId;
  const department = await tx.department.findFirst({
    where: {
      id: departmentId,
      tenantId,
    },
  });

  if (!department) {
    throw new Error('Valid department required for manager employee record');
  }

  // 4. Create manager employee
  const employeeNumber = await generateEmployeeNumber(tx, tenantId);

  const managerEmployee = await tx.employee.create({
    data: {
      user: { connect: { id: managerId } },
      tenant: { connect: { id: tenantId } },
      department: { connect: { id: departmentId } },
      employeeNumber,
      jobTitle: managerUser.role === 'ADMIN' ? 'Administrator' :
                managerUser.role === 'HR' ? 'HR Manager' : 'Manager',
      startDate: new Date(),
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      emergencyContacts: [],
    },
  });

  // 5. Link to user
  await tx.user.update({
    where: { id: managerId },
    data: { employeeId: managerEmployee.id },
  });

  return managerEmployee.id;
}
```

---

### Fix 4: Move Email Sending to Background

```typescript
// After successful user creation
const result = await prisma.$transaction(...);

// Send emails asynchronously (fire-and-forget)
sendWelcomeEmail(email, firstName, result.user.tenant.name)
  .catch(err => console.error('[System User] Welcome email failed:', err));

// Send admin notifications
notifyAdmins(result.user, sessionData)
  .catch(err => console.error('[System User] Admin notifications failed:', err));

// Return immediately
return NextResponse.json({ success: true, ... });
```

---

### Fix 5: Add Employee Number Sequence Table

**Migration:**
```sql
CREATE TABLE "EmployeeSequence" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "lastNumber" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmployeeSequence_tenantId_date_key" UNIQUE("tenantId", "date")
);

CREATE INDEX "EmployeeSequence_tenantId_idx" ON "EmployeeSequence"("tenantId");
```

**Prisma Schema:**
```prisma
model EmployeeSequence {
  id         String   @id @default(uuid())
  tenantId   String
  date       String   // YYYYMMDD format
  lastNumber Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  tenant     Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, date])
  @@index([tenantId])
}
```

---

## Summary of Issues

| Issue | Severity | Impact | Fixed |
|-------|----------|--------|-------|
| Employee number race condition | 🔴 CRITICAL | Duplicate numbers, DB errors | ❌ |
| No transaction wrapper | 🟡 HIGH | Orphaned records, inconsistent state | ❌ |
| Manager department validation | 🟡 HIGH | Foreign key errors | ❌ |
| Manager tenant validation | 🟡 HIGH | Cross-tenant data leaks | ❌ |
| Blocking email sends | 🟡 MEDIUM | Slow API, timeouts | ❌ |
| Inconsistent errors | 🟢 LOW | Poor debugging experience | ❌ |

---

## Implementation Plan

### Phase 1: Critical Fixes (Today)
1. Add transaction wrapper for all DB operations
2. Fix manager validation (tenant check, role check)
3. Move email sending to background

### Phase 2: Employee Number Fix (Tomorrow)
1. Create EmployeeSequence table
2. Implement atomic sequence generation
3. Migrate existing system

### Phase 3: Testing (Tomorrow)
1. Test concurrent user creation
2. Test manager employee creation
3. Test error scenarios
4. Load testing

---

## Testing Checklist

### Test Case 1: Basic User Creation
- [ ] Create user without employee record (admin/HR)
- [ ] Verify user created successfully
- [ ] Verify welcome email sent
- [ ] Verify audit log created

### Test Case 2: User with Employee Record
- [ ] Create user with jobTitle and departmentId
- [ ] Verify employee record created
- [ ] Verify employee number generated
- [ ] Verify user.employeeId linked

### Test Case 3: User with Manager
- [ ] Create user with manager (manager has employee)
- [ ] Verify manager relationship created
- [ ] Create user with manager (manager NO employee)
- [ ] Verify manager employee auto-created
- [ ] Verify manager employee number unique

### Test Case 4: Concurrent Creation
- [ ] Create 10 users simultaneously
- [ ] Verify all employee numbers unique
- [ ] Verify no race conditions
- [ ] Verify no duplicate errors

### Test Case 5: Error Scenarios
- [ ] Invalid department ID → should fail gracefully
- [ ] Manager from different tenant → should fail
- [ ] Duplicate email → should return 409
- [ ] Missing required fields → should return 400

### Test Case 6: Email Sending
- [ ] User created successfully even if email fails
- [ ] Email errors logged but not blocking
- [ ] Response returns immediately (< 500ms)

---

## Current Bugs Summary

**The main issues are:**

1. **Race condition in employee number generation** - Two employees created at same time can get same number
2. **No transaction** - Partial data created on errors
3. **Missing validation** - Manager from different tenant can be linked
4. **Blocking emails** - API slow waiting for email provider

**Immediate Fix Required:**
Wrap all DB operations in a transaction and add proper manager validation.