# Leave Balance System - Comprehensive Analysis

**Date:** 2025-12-24
**System:** Zenora Leave Management Module
**Analysis Type:** Statistical Cards, Dynamic Balance Updates, Data Flow

---

## Executive Summary

### ✅ What's Working
- Leave balance **deduction is working correctly** on approval
- API endpoints properly implement **atomic transactions**
- Balance changes are **persistent** in database
- Multiple approval flows (manager/admin/bulk) all update balances

### ⚠️ Critical Issues Found
1. **Dashboard shows HARDCODED leave balance** (not real data)
2. **No API endpoint to fetch aggregate leave stats** for dashboard
3. **Balance updates require page refresh** - not real-time
4. **No "allocated vs used vs remaining" breakdown** in UI

---

## 1. Leave Balance Data Flow Analysis

### 1.1 Initial Allocation

**File:** `/app/api/employee/leave/balance/route.ts` (lines 39-63)

```typescript
// Auto-creates default balances if none exist
if (balances.length === 0) {
  const leaveTypes = ['ANNUAL', 'SICK', 'PERSONAL'];
  const defaultBalances = {
    ANNUAL: 20,
    SICK: 10,
    PERSONAL: 5,
  };

  // Creates balances on-demand
  const createdBalances = await Promise.all(
    leaveTypes.map((leaveType) =>
      prisma.leaveBalance.create({
        data: {
          employeeId: employee.id,
          leaveType: leaveType,
          balance: defaultBalances[leaveType],
          year: parseInt(year),
        },
      })
    )
  );
}
```

**Analysis:**
- ✅ Creates balances automatically when employee first accesses leave page
- ✅ Year-specific balances (supports multi-year tracking)
- ⚠️ **Hardcoded defaults** (ANNUAL: 20, SICK: 10, PERSONAL: 5)
- ⚠️ No prorated allocation for mid-year joiners
- ⚠️ No admin-defined default allocations (uses fixed values)

**Impact:** Every employee gets same default allocation regardless of:
- Join date (no prorating)
- Role/department
- Tenure
- Company policy

---

### 1.2 Balance Deduction on Approval

**Files Analyzed:**
1. `/app/api/manager/leave/[id]/approve/route.ts` (lines 87-109)
2. `/app/api/admin/leave/[id]/approve/route.ts` (lines 90-109)
3. `/app/api/manager/leave/bulk-approve/route.ts` (lines 100-118)
4. `/app/api/admin/leave/bulk-approve/route.ts` (lines 100-118)

**Implementation:**

```typescript
// Update leave request and deduct from balance
const updatedRequest = await prisma.$transaction(async (tx) => {
  // 1. Approve the request
  const updated = await tx.leaveRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedBy: user.id,
      approvedAt: new Date(),
    },
  });

  // 2. Deduct from leave balance using UPSERT
  const leaveYear = new Date(leaveRequest.startDate).getFullYear();
  await tx.leaveBalance.upsert({
    where: {
      employeeId_leaveType_year: {
        employeeId: leaveRequest.employeeId,
        leaveType: leaveRequest.leaveType,
        year: leaveYear,
      },
    },
    create: {
      employeeId: leaveRequest.employeeId,
      leaveType: leaveRequest.leaveType,
      year: leaveYear,
      balance: -leaveRequest.days, // ⚠️ Creates NEGATIVE balance
      tenantId: leaveRequest.tenantId,
    },
    update: {
      balance: {
        decrement: leaveRequest.days, // ✅ Decrements existing balance
      },
    },
  });

  return updated;
});
```

**Analysis:**

✅ **Strengths:**
1. **Atomic transaction** - approval and deduction happen together (rollback on failure)
2. **Year-aware** - uses leave start date year (supports year-end requests)
3. **Upsert pattern** - handles missing balances gracefully
4. **Correct decrement** - uses Prisma's `decrement` operator (atomic at DB level)

⚠️ **Issues:**
1. **Negative balance creation** - If balance doesn't exist, creates negative balance instead of failing
2. **No validation** - Doesn't check if sufficient balance exists before approval
3. **Silent failure** - Manager can approve leave even if balance is insufficient

**Example Scenario:**
```
Employee: John (ANNUAL balance not yet created)
Manager approves: 5 days annual leave
Result: Creates ANNUAL balance = -5 days ⚠️

Expected: Should fail with "Balance not allocated" error
```

---

### 1.3 Balance Validation on Request Submission

**File:** `/app/api/employee/leave/route.ts` (lines 175-195)

```typescript
// Check leave balance for the year of the leave request
const leaveYear = start.getFullYear();
const leaveBalance = await prisma.leaveBalance.findUnique({
  where: {
    employeeId_leaveType_year: {
      employeeId: employee.id,
      leaveType,
      year: leaveYear,
    },
  },
});

if (leaveBalance && leaveBalance.balance < calculatedDays) {
  return NextResponse.json(
    {
      success: false,
      error: `Insufficient leave balance. Available: ${leaveBalance.balance} days, Requested: ${calculatedDays} days`,
    },
    { status: 400 }
  );
}
```

**Analysis:**

✅ **Strengths:**
1. **Validates before submission** - Checks balance at request time
2. **Clear error messages** - Shows available vs requested
3. **Year-specific** - Checks balance for the correct year

⚠️ **Issues:**
1. **Only validates if balance exists** - `if (leaveBalance && ...)` allows submission if no balance
2. **No check for zero/negative balance** - User can submit if balance = 0 or negative
3. **Race condition** - Balance could change between validation and submission

**Logic Gap:**
```typescript
// Current logic:
if (leaveBalance && leaveBalance.balance < calculatedDays) {
  // Reject
}

// Problem: What if leaveBalance is null or undefined?
// Answer: Request goes through! ⚠️
```

**Better Implementation:**
```typescript
if (!leaveBalance) {
  return NextResponse.json({
    success: false,
    error: 'Leave balance not allocated. Contact HR.',
  }, { status: 400 });
}

if (leaveBalance.balance < calculatedDays) {
  return NextResponse.json({
    success: false,
    error: `Insufficient balance. Available: ${leaveBalance.balance}, Requested: ${calculatedDays}`,
  }, { status: 400 });
}
```

---

## 2. Dashboard Statistical Cards Analysis

### 2.1 Employee Dashboard

**File:** `/app/employee/dashboard/page.tsx`

**Current Implementation (Lines 43-50):**
```typescript
const [stats, setStats] = useState<DashboardStats>({
  todayHours: 0,
  weekHours: 0,
  monthHours: 0,
  pendingLeaves: 0,
  approvedLeaves: 0,
  remainingLeaves: 20,  // ⚠️ HARDCODED
  upcomingHolidays: 5,  // ⚠️ HARDCODED
});
```

**Dashboard Card Display (Lines 172-179):**
```typescript
{
  title: 'Leave Balance',
  value: stats.remainingLeaves,  // Shows hardcoded 20
  subtitle: 'days remaining',
  icon: <Calendar className="h-6 w-6" />,
  color: 'from-orange-500 to-amber-500',
  bgColor: 'bg-orange-50',
}
```

**Data Fetching (Lines 57-61):**
```typescript
useEffect(() => {
  fetchUser();
  fetchOnboardingStatus();
  // TODO: Fetch real stats from API ⚠️
}, []);
```

### 🔴 CRITICAL ISSUE: Dashboard Shows Fake Data

**Problem:**
1. Dashboard displays `remainingLeaves: 20` - **HARDCODED** value
2. No API call to fetch actual leave balance
3. User sees "20 days remaining" regardless of:
   - Actual allocated balance
   - Approved leaves
   - Rejected leaves
   - Different leave types

**User Experience Impact:**
```
Scenario 1:
- Employee has 15 ANNUAL + 10 SICK + 5 PERSONAL = 30 total days
- Dashboard shows: 20 days (WRONG ❌)

Scenario 2:
- Employee used 10 days, has 10 remaining
- Dashboard shows: 20 days (WRONG ❌)

Scenario 3:
- Employee has negative balance (-5 days)
- Dashboard shows: 20 days (WRONG ❌)
```

---

### 2.2 Leave Balance Display on Leave Page

**File:** `/app/employee/leave/page.tsx`

**Current Implementation (Lines 246-264):**
```typescript
{/* Leave Balances */}
<div>
  <h2 className="text-lg font-semibold text-slate-900 mb-3">
    Available Leave Balances
  </h2>
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
    {balances.map((balance) => (
      <Card key={balance.id} className="border-2">
        <CardContent className="p-4">
          <div className="text-center">
            <div className="text-2xl mb-1">
              {getLeaveTypeIcon(balance.leaveType)}
            </div>
            <div className="text-xs font-medium text-slate-600 mb-1">
              {balance.leaveType.charAt(0) + balance.leaveType.slice(1).toLowerCase()}
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {balance.balance}  {/* ✅ Shows REAL balance */}
            </div>
            <div className="text-xs text-slate-500">days</div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
</div>
```

**Data Fetching (Lines 89-100):**
```typescript
const fetchBalances = async () => {
  try {
    const response = await fetch('/api/employee/leave/balance');
    const data = await response.json();

    if (data.success) {
      setBalances(data.balances || []); // ✅ Sets REAL data
    }
  } catch (error) {
    console.error('Failed to fetch balances:', error);
  }
};
```

### ✅ This Page Shows REAL Data

**Analysis:**
- Correctly fetches balances from API
- Shows per-type breakdown (ANNUAL, SICK, PERSONAL)
- Updates when component mounts
- **BUT:** Doesn't refresh automatically when leave is approved

**Update Behavior:**
```typescript
// After submitting leave request (Lines 134-142):
if (data.success) {
  toast.success('Leave request submitted!');
  setShowRequestForm(false);
  fetchLeaveRequests();
  fetchBalances(); // ✅ Refreshes balance after submission
}
```

**Issue:** Balance only updates on **submission**, not on **approval**
- Employee submits leave → Balance unchanged (pending approval)
- Manager approves → Balance deducted in DB
- Employee dashboard still shows old balance ⚠️
- Employee must refresh page to see updated balance

---

## 3. Dynamic Balance Update Analysis

### 3.1 When Does Balance Change?

**Trigger Events:**

| Event | Database Updated | UI Updated (Employee) | UI Updated (Dashboard) |
|-------|-----------------|----------------------|------------------------|
| Employee submits leave | ❌ No | ❌ No | ❌ No |
| Manager approves leave | ✅ Yes (decrement) | ❌ No (requires refresh) | ❌ No (shows hardcoded value) |
| Manager rejects leave | ❌ No | ❌ No | ❌ No |
| Admin allocates balance | ✅ Yes (set balance) | ❌ No (requires refresh) | ❌ No (shows hardcoded value) |
| Year-end rollover | ❌ Not implemented | ❌ N/A | ❌ N/A |

### 3.2 Balance Refresh Mechanism

**Leave Page (`/employee/leave`):**
```typescript
// Fetches balance on:
1. Component mount (useEffect on page load)
2. After submitting leave request
3. Manual page refresh
```

**Dashboard (`/employee/dashboard`):**
```typescript
// Never fetches real balance
// Shows hardcoded value: 20
```

### 3.3 Real-Time Update Issues

**Problem 1: No WebSocket/Polling**
- No real-time updates when manager approves
- Employee sees outdated balance until page refresh

**Problem 2: No Optimistic Updates**
- When employee submits, balance should show "pending deduction"
- Currently: Balance unchanged (confusing UX)

**Problem 3: Cache Staleness**
- No cache invalidation strategy
- User can navigate between pages with stale data

---

## 4. Missing Features & Data Issues

### 4.1 Dashboard Statistics - Missing API

**Required API:** `/api/employee/stats`

**Should Return:**
```typescript
{
  success: true,
  stats: {
    // Leave Statistics
    totalAllocated: 35,        // Sum of all leave types allocated
    totalUsed: 10,             // Approved leaves (current year)
    totalPending: 3,           // Days in pending requests
    totalRemaining: 25,        // Allocated - Used

    // Breakdown by Type
    byType: {
      ANNUAL: {
        allocated: 20,
        used: 5,
        pending: 2,
        remaining: 15
      },
      SICK: {
        allocated: 10,
        used: 3,
        pending: 1,
        remaining: 7
      },
      PERSONAL: {
        allocated: 5,
        used: 2,
        pending: 0,
        remaining: 3
      }
    },

    // Request Statistics
    totalRequests: 8,
    approvedRequests: 5,
    rejectedRequests: 1,
    pendingRequests: 2,

    // Timesheet Stats (if needed)
    todayHours: 7.5,
    weekHours: 37.5,
    monthHours: 160,
  }
}
```

**Current Status:** ❌ **Does not exist**

---

### 4.2 Balance Breakdown Not Shown

**Current Display:**
```
Leave Balance
    20
days remaining
```

**Should Show:**
```
Leave Balance
    25 / 35
days remaining

Breakdown:
Annual:  15/20 days
Sick:     7/10 days
Personal: 3/5 days
```

---

### 4.3 No Historical Tracking

**Missing Data:**
- Balance changes over time
- Allocation history
- Deduction audit trail
- Carry-forward tracking

**Database Schema Limitation:**
```prisma
model LeaveBalance {
  id          String   @id @default(uuid())
  employeeId  String
  leaveType   LeaveType
  balance     Float     // ⚠️ Only current balance, no history
  year        Int

  // Missing:
  // initialBalance    Float  // What was allocated
  // used             Float  // How much was used
  // carriedForward   Float  // From previous year
  // expired          Float  // Expired/lost balance
}
```

---

## 5. Data Consistency Analysis

### 5.1 Balance Integrity Checks

**Test Scenarios:**

#### Scenario 1: Concurrent Approvals
```
Employee has 10 days balance
Manager A approves 7 days (concurrent)
Manager B approves 5 days (concurrent)
Expected: One should fail (insufficient balance)
Actual: Both succeed, balance = -2 days ⚠️
```

**Reason:** Upsert doesn't validate, creates negative balance

---

#### Scenario 2: Negative Balance Creation
```
Employee: No ANNUAL balance allocated
Manager approves: 5 days ANNUAL leave
Database: Creates balance = -5 days ⚠️
Employee sees: -5 days (can still request more!)
```

**Fix Needed:**
```typescript
// In approval endpoint:
const balance = await tx.leaveBalance.findUnique({
  where: { employeeId_leaveType_year: {...} }
});

if (!balance) {
  throw new Error('Balance not allocated. Contact HR.');
}

if (balance.balance < leaveRequest.days) {
  throw new Error('Insufficient balance');
}

// Then proceed with decrement
```

---

#### Scenario 3: Cross-Year Requests
```
Today: 2025-12-28
Request: 2025-12-30 to 2026-01-03 (5 days)
Issue: Which year's balance to use? ⚠️
Current: Uses startDate year (2025)
Problem: 3 days should come from 2026 balance
```

**Fix Needed:** Split requests that cross year boundaries

---

### 5.2 Database Constraints

**Current Constraints:**
```prisma
@@unique([employeeId, leaveType, year])
```

✅ **Good:** Prevents duplicate balances for same type/year

❌ **Missing:**
- No check constraint for `balance >= 0`
- No foreign key cascade rules
- No audit trail

**Better Schema:**
```prisma
model LeaveBalance {
  id                String   @id @default(uuid())
  employeeId        String
  leaveType         LeaveType
  balance           Float    @default(0)
  initialBalance    Float    @default(0)  // What was allocated
  used              Float    @default(0)   // Track usage separately
  carriedForward    Float    @default(0)
  year              Int
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([employeeId, leaveType, year])
  @@check(balance >= 0, "balance_non_negative")  // Prevent negative
}

model LeaveBalanceHistory {
  id              String   @id @default(uuid())
  leaveBalanceId  String
  changeType      String   // ALLOCATION, DEDUCTION, CARRY_FORWARD, EXPIRY
  previousBalance Float
  newBalance      Float
  amount          Float
  reason          String?
  leaveRequestId  String?
  createdBy       String
  createdAt       DateTime @default(now())

  leaveBalance    LeaveBalance @relation(...)
}
```

---

## 6. Summary of Issues & Recommendations

### 🔴 Critical Issues

1. **Dashboard shows hardcoded leave balance (20 days)**
   - **Fix:** Create `/api/employee/stats` endpoint
   - **Update:** Dashboard to fetch real data
   - **Priority:** CRITICAL
   - **Effort:** 2-3 hours

2. **Negative balance creation on approval**
   - **Fix:** Add validation before upsert
   - **Prevent:** Creating negative balances
   - **Priority:** CRITICAL
   - **Effort:** 1 hour

3. **Balance validation incomplete on submission**
   - **Fix:** Check for null/undefined balance
   - **Reject:** Requests when balance not allocated
   - **Priority:** HIGH
   - **Effort:** 30 minutes

---

### ⚠️ High Priority Issues

4. **No real-time balance updates**
   - **Fix:** Implement polling or WebSocket
   - **Alternative:** Refresh on navigation
   - **Priority:** HIGH
   - **Effort:** 4-6 hours

5. **No breakdown of allocated vs used vs remaining**
   - **Fix:** Add `initialBalance` and `used` fields
   - **Display:** Show detailed breakdown in UI
   - **Priority:** HIGH
   - **Effort:** 3-4 hours

6. **Cross-year leave requests**
   - **Fix:** Split requests that span year boundaries
   - **Allocate:** Proportionally from each year
   - **Priority:** HIGH
   - **Effort:** 6-8 hours

---

### 🟡 Medium Priority Issues

7. **No historical balance tracking**
   - **Fix:** Create `LeaveBalanceHistory` table
   - **Track:** All balance changes
   - **Priority:** MEDIUM
   - **Effort:** 4-5 hours

8. **Concurrent approval race conditions**
   - **Fix:** Add database-level locking
   - **Use:** Pessimistic locking or optimistic concurrency
   - **Priority:** MEDIUM
   - **Effort:** 3-4 hours

9. **No balance expiry/carry-forward implementation**
   - **Fix:** Implement year-end rollover logic
   - **Add:** Cron job for automation
   - **Priority:** MEDIUM
   - **Effort:** 8-10 hours (part of Phase 1 in plan)

---

## 7. Implementation Roadmap

### Phase 1: Fix Critical Data Issues (1-2 days)

**Tasks:**
1. Create `/api/employee/stats` endpoint
2. Update employee dashboard to use real data
3. Add balance validation in approval endpoints
4. Fix submission validation (check for null balance)
5. Add database constraint: `balance >= 0`

**Files to Modify:**
- `app/api/employee/stats/route.ts` (NEW)
- `app/employee/dashboard/page.tsx`
- `app/api/manager/leave/[id]/approve/route.ts`
- `app/api/admin/leave/[id]/approve/route.ts`
- `app/api/employee/leave/route.ts`
- `prisma/schema.prisma`

---

### Phase 2: Add Balance Breakdown (2-3 days)

**Tasks:**
1. Add `initialBalance` and `used` fields to schema
2. Update allocation API to set `initialBalance`
3. Update approval API to increment `used`
4. Create detailed balance UI component
5. Add balance history table and audit trail

**Files to Modify:**
- `prisma/schema.prisma`
- `app/api/admin/leave/allocate/route.ts`
- `app/api/manager/leave/[id]/approve/route.ts`
- `app/employee/leave/page.tsx`
- Create `components/leave/BalanceBreakdown.tsx` (NEW)

---

### Phase 3: Real-Time Updates (2-3 days)

**Tasks:**
1. Implement polling mechanism (every 30s)
2. Add cache invalidation on navigation
3. Optimistic UI updates on submission
4. Toast notifications for balance changes

**Alternative (WebSocket):**
- More complex but better UX
- Requires WebSocket server setup
- Real-time notifications

---

### Phase 4: Advanced Features (5-7 days)

**Tasks:**
1. Cross-year request splitting
2. Balance history tracking
3. Year-end rollover automation
4. Carry-forward implementation
5. Prorated allocation for new joiners

---

## 8. Code Examples

### 8.1 Employee Stats API (NEW)

**File:** `app/api/employee/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ success: false, error: 'Employee not found' }, { status: 404 });
    }

    const currentYear = new Date().getFullYear();

    // Fetch leave balances
    const balances = await prisma.leaveBalance.findMany({
      where: {
        employeeId: employee.id,
        year: currentYear,
      },
    });

    // Fetch leave requests
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: employee.id,
        startDate: {
          gte: new Date(`${currentYear}-01-01`),
          lte: new Date(`${currentYear}-12-31`),
        },
      },
    });

    // Calculate statistics
    const totalAllocated = balances.reduce((sum, b) => sum + b.balance, 0);

    const approvedLeaves = leaveRequests
      .filter(r => r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.days, 0);

    const pendingLeaves = leaveRequests
      .filter(r => r.status === 'PENDING')
      .reduce((sum, r) => sum + r.days, 0);

    const totalUsed = approvedLeaves;
    const totalRemaining = totalAllocated;  // Balance already deducted on approval

    // Breakdown by type
    const byType: any = {};
    for (const balance of balances) {
      const used = leaveRequests
        .filter(r => r.status === 'APPROVED' && r.leaveType === balance.leaveType)
        .reduce((sum, r) => sum + r.days, 0);

      const pending = leaveRequests
        .filter(r => r.status === 'PENDING' && r.leaveType === balance.leaveType)
        .reduce((sum, r) => sum + r.days, 0);

      byType[balance.leaveType] = {
        allocated: balance.balance + used,  // Current balance + used = original allocation
        used,
        pending,
        remaining: balance.balance,
      };
    }

    // Request statistics
    const stats = {
      // Leave Statistics
      totalAllocated,
      totalUsed,
      totalPending: pendingLeaves,
      totalRemaining,

      byType,

      // Request Statistics
      totalRequests: leaveRequests.length,
      approvedRequests: leaveRequests.filter(r => r.status === 'APPROVED').length,
      rejectedRequests: leaveRequests.filter(r => r.status === 'REJECTED').length,
      pendingRequests: leaveRequests.filter(r => r.status === 'PENDING').length,

      // Placeholder for timesheet stats (implement separately)
      todayHours: 0,
      weekHours: 0,
      monthHours: 0,
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching employee stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
```

---

### 8.2 Updated Dashboard Component

**File:** `app/employee/dashboard/page.tsx`

```typescript
// Add to useEffect:
useEffect(() => {
  fetchUser();
  fetchOnboardingStatus();
  fetchStats();  // ✅ NEW
}, []);

// Add fetch function:
const fetchStats = async () => {
  try {
    const response = await fetch('/api/employee/stats');
    const data = await response.json();

    if (data.success) {
      setStats(data.stats);
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
};
```

---

### 8.3 Improved Approval Validation

**File:** `app/api/manager/leave/[id]/approve/route.ts`

```typescript
// Replace lines 87-109 with:
const updatedRequest = await prisma.$transaction(async (tx) => {
  // 1. Check if balance exists
  const balance = await tx.leaveBalance.findUnique({
    where: {
      employeeId_leaveType_year: {
        employeeId: leaveRequest.employeeId,
        leaveType: leaveRequest.leaveType,
        year: leaveYear,
      },
    },
  });

  // 2. Validate balance exists
  if (!balance) {
    throw new Error('Leave balance not allocated for this employee. Contact HR.');
  }

  // 3. Validate sufficient balance
  if (balance.balance < leaveRequest.days) {
    throw new Error(
      `Insufficient leave balance. Available: ${balance.balance} days, Required: ${leaveRequest.days} days`
    );
  }

  // 4. Approve the request
  const updated = await tx.leaveRequest.update({
    where: { id },
    data: {
      status: 'APPROVED',
      approvedBy: user.id,
      approvedAt: new Date(),
    },
    include: {
      employee: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  // 5. Deduct from balance
  await tx.leaveBalance.update({
    where: {
      employeeId_leaveType_year: {
        employeeId: leaveRequest.employeeId,
        leaveType: leaveRequest.leaveType,
        year: leaveYear,
      },
    },
    data: {
      balance: {
        decrement: leaveRequest.days,
      },
    },
  });

  return updated;
});
```

---

## 9. Testing Checklist

### Test Case 1: Balance Deduction
- [ ] Create employee with 20 ANNUAL days
- [ ] Submit 5 day leave request
- [ ] Approve request
- [ ] Verify balance = 15 in database
- [ ] Verify balance = 15 in UI (after refresh)
- [ ] Verify dashboard shows 15 (not 20)

### Test Case 2: Insufficient Balance
- [ ] Employee has 5 days remaining
- [ ] Try to approve 10 day request
- [ ] Should fail with clear error message
- [ ] Balance should remain 5

### Test Case 3: No Balance Allocated
- [ ] New employee (no balance)
- [ ] Try to submit leave request
- [ ] Should fail with "Balance not allocated"
- [ ] Try to approve request (if submitted)
- [ ] Should fail with validation error

### Test Case 4: Multiple Leave Types
- [ ] Employee has: 20 ANNUAL, 10 SICK, 5 PERSONAL
- [ ] Request 3 ANNUAL days → Approve
- [ ] Request 2 SICK days → Approve
- [ ] Verify: ANNUAL = 17, SICK = 8, PERSONAL = 5
- [ ] Dashboard shows: Total = 30 days

### Test Case 5: Concurrent Approvals
- [ ] Employee has 10 days balance
- [ ] Submit 2 requests: 7 days, 5 days
- [ ] Try to approve both
- [ ] First should succeed, second should fail

---

## 10. Conclusion

### Current System Status

**Working Features:**
- ✅ Balance creation on demand
- ✅ Atomic balance deduction on approval
- ✅ Year-specific balances
- ✅ Leave page shows real balance
- ✅ Policy enforcement (notice period, max days)

**Broken Features:**
- ❌ Dashboard shows hardcoded balance (20 days)
- ❌ No API for dashboard statistics
- ❌ Negative balance creation allowed
- ❌ Weak validation on submission
- ❌ No real-time updates
- ❌ No balance breakdown (allocated vs used)

### Immediate Action Items

**Priority 1 (Today):**
1. Create `/api/employee/stats` endpoint
2. Update dashboard to use real data
3. Add balance validation in approval

**Priority 2 (This Week):**
4. Fix submission validation
5. Add balance breakdown UI
6. Implement balance history

**Priority 3 (Next Sprint):**
7. Real-time updates
8. Cross-year request handling
9. Year-end rollover automation

---

**Analysis Complete**
**Recommendations:** Implement Priority 1 fixes immediately to restore data integrity and user trust.
