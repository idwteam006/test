# Leave Management Improvements - Timesheet Patterns Implementation

## Summary

Implementing advanced features from Timesheet Management into Leave Management system to create a unified, sophisticated approval workflow across both modules.

**Date:** December 21, 2025
**Status:** 🚧 In Progress

---

## 🎯 Goals

Adopt the best practices from Timesheet Management to improve Leave Management:

1. **Draft State** - Save incomplete leave requests before submission
2. **Rejection Editing** - Edit and resubmit rejected requests
3. **Auto-Approval** - Root-level employees can self-approve
4. **Calendar Grid View** - Visual team leave management
5. **Reminder System** - Proactive notifications for pending approvals
6. **Optimistic UI** - Better perceived performance
7. **Keyboard Shortcuts** - Faster approval workflows
8. **Enhanced UX** - Modern, efficient interface

---

## 📊 Database Schema Changes

### Updated LeaveRequest Model

```prisma
model LeaveRequest {
  id                String                    @id @default(uuid())
  tenantId          String
  employeeId        String
  leaveType         LeaveType
  startDate         DateTime
  endDate           DateTime
  days              Float
  reason            String?
  status            ApprovalStatus            @default(DRAFT)  // Changed from PENDING
  submittedAt       DateTime?                                  // NEW
  approvedBy        String?
  approvedAt        DateTime?
  rejectedReason    String?
  rejectionCategory LeaveRejectionCategory?
  isAutoApproved    Boolean                   @default(false)  // NEW
  createdAt         DateTime                  @default(now())
  updatedAt         DateTime                  @updatedAt
  employee          Employee                  @relation(...)
  tenant            Tenant                    @relation(...)
  rejectionHistory  LeaveRejectionHistory[]

  @@index([tenantId])
  @@index([employeeId])
  @@index([status])
  @@index([startDate])
  @@index([submittedAt])  // NEW
}
```

### Updated ApprovalStatus Enum

```prisma
enum ApprovalStatus {
  DRAFT      // NEW - Work in progress
  PENDING    // Submitted for approval
  APPROVED   // Approved by manager/admin
  REJECTED   // Rejected (returns to DRAFT for editing)
}
```

### New Fields

| Field | Type | Purpose |
|-------|------|---------|
| `submittedAt` | DateTime? | Timestamp when DRAFT → PENDING transition occurs |
| `isAutoApproved` | Boolean | Flag for root-level employee self-approvals |
| `status` default | DRAFT | Start in draft state instead of PENDING |

---

## 🔄 State Machine

### Old Flow (Before)
```
PENDING → APPROVED
        → REJECTED (stays rejected, create new request)
```

### New Flow (After)
```
DRAFT → PENDING → APPROVED
               → REJECTED → DRAFT (returns for editing)
```

**Key Changes:**
- Start in `DRAFT` state (can save partial requests)
- `REJECTED` returns to `DRAFT` for correction (like timesheets)
- Track submission timestamp with `submittedAt`

---

## 🚀 Feature Implementation

### 1. Draft State ✅

**Database:** DONE - Schema updated with DRAFT status

**API Changes Needed:**
- `POST /api/employee/leave` - Create draft
- `POST /api/employee/leave/submit` - Submit draft → PENDING
- `PATCH /api/employee/leave/[id]` - Update draft
- `GET /api/employee/leave` - Include drafts in response

**UI Changes Needed:**
- Draft indicator badge
- "Save as Draft" button
- "Submit" button (for DRAFT → PENDING)
- Editable draft entries in list

---

### 2. Rejection Editing ✅

**Database:** DONE - Status enum supports DRAFT

**API Changes Needed:**
- `POST /api/manager/leave/[id]/reject` - Set status to DRAFT (not REJECTED)
- `POST /api/admin/leave/[id]/reject` - Set status to DRAFT (not REJECTED)
- Clear `submittedAt` when returning to DRAFT

**Logic:**
```typescript
// On rejection
await tx.leaveRequest.update({
  where: { id },
  data: {
    status: 'DRAFT',  // Changed from REJECTED
    submittedAt: null,  // Clear submission timestamp
    rejectedReason: reason,
    rejectionCategory: category,
  },
});
```

**UI Changes:**
- Show rejection reason in draft
- "Edit & Resubmit" button
- Rejection history preserved in LeaveRejectionHistory

---

### 3. Auto-Approval for Root-Level Employees ✅

**Database:** DONE - `isAutoApproved` field added

**Identification:**
```typescript
const employee = await prisma.employee.findUnique({
  where: { userId: user.id },
  select: { managerId: true },
});

const isRootLevel = !employee?.managerId;
```

**API Endpoint:**
```typescript
// POST /api/employee/leave/auto-approve
export async function POST(request: NextRequest) {
  // Check if employee has no manager
  if (!isRootLevel) {
    return 403;
  }

  // Get all PENDING requests
  const pendingRequests = await prisma.leaveRequest.findMany({
    where: {
      employeeId: employee.id,
      status: 'PENDING',
    },
  });

  // Auto-approve with transaction
  for (const request of pendingRequests) {
    await prisma.$transaction(async (tx) => {
      await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: 'APPROVED',
          approvedBy: user.id,
          approvedAt: new Date(),
          isAutoApproved: true,
        },
      });

      // Deduct from balance
      await tx.leaveBalance.update({
        where: {
          employeeId_leaveType_year: {...},
        },
        data: {
          balance: { decrement: request.days },
        },
      });
    });
  }
}
```

**UI Banner:**
```tsx
{isRootLevel && pendingLeaveCount > 0 && (
  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <Info className="w-5 h-5 text-blue-400 mr-3" />
        <div>
          <p className="text-sm font-medium text-blue-900">
            No Manager Assigned - Auto-Approval Available
          </p>
          <p className="text-sm text-blue-700">
            You have {pendingLeaveCount} pending leave request(s).
            You can auto-approve them since you don't have a manager assigned.
          </p>
        </div>
      </div>
      <Button
        onClick={handleAutoApprove}
        className="bg-blue-600 hover:bg-blue-700"
      >
        Auto-Approve All
      </Button>
    </div>
  </div>
)}
```

---

### 4. Weekly Calendar Grid View 📅

**Component:** `LeaveCalendarGrid`

```tsx
interface LeaveCalendarGridProps {
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  weekStart: Date;
}

export function LeaveCalendarGrid({ employees, leaveRequests, weekStart }: LeaveCalendarGridProps) {
  const weekDays = getWeekDays(weekStart);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Employee</th>
            {weekDays.map(day => (
              <th key={day.toString()} className="border px-4 py-2">
                {format(day, 'EEE, MMM d')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map(employee => (
            <tr key={employee.id}>
              <td className="border px-4 py-2">{employee.name}</td>
              {weekDays.map(day => {
                const leave = findLeaveForDay(employee.id, day, leaveRequests);
                return (
                  <td key={day.toString()} className="border px-2 py-2">
                    {leave && (
                      <LeaveDayCell leave={leave} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaveDayCell({ leave }: { leave: LeaveRequest }) {
  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
  };

  return (
    <div className={`text-xs px-2 py-1 rounded ${statusColors[leave.status]}`}>
      <div className="font-medium">{leave.leaveType}</div>
      <div className="text-[10px]">{leave.status}</div>
    </div>
  );
}
```

---

### 5. Reminder System 📧

**API Endpoint:**
```typescript
// POST /api/manager/leave/send-reminder
export async function POST(request: NextRequest) {
  const user = await getUserFromSession(request);

  // Get manager's employee record
  const manager = await prisma.employee.findUnique({
    where: { userId: user.id },
    include: {
      directReports: {
        include: {
          user: true,
        },
      },
    },
  });

  // Find employees with no pending leave this month
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const employeesWithNoLeave = [];

  for (const report of manager.directReports) {
    const hasPendingLeave = await prisma.leaveRequest.findFirst({
      where: {
        employeeId: report.id,
        status: 'PENDING',
        startDate: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    if (!hasPendingLeave) {
      employeesWithNoLeave.push(report);
    }
  }

  // Send reminders
  for (const employee of employeesWithNoLeave) {
    await sendEmail({
      to: employee.user.email,
      subject: 'Leave Management Reminder',
      html: getLeaveReminderEmail({
        employeeName: `${employee.user.firstName} ${employee.user.lastName}`,
        managerName: `${user.firstName} ${user.lastName}`,
      }),
    });
  }

  return NextResponse.json({
    success: true,
    remindersSent: employeesWithNoLeave.length,
  });
}
```

---

### 6. Optimistic UI Updates ⚡

**Pattern:**
```tsx
async function handleApprove(requestId: string) {
  // Optimistic update
  setLeaveRequests(prev => prev.map(req =>
    req.id === requestId
      ? { ...req, status: 'APPROVED', approvedAt: new Date() }
      : req
  ));

  try {
    const response = await fetch(`/api/manager/leave/${requestId}/approve`, {
      method: 'POST',
    });

    if (!response.ok) {
      // Rollback on error
      setLeaveRequests(prev => prev.map(req =>
        req.id === requestId
          ? { ...req, status: 'PENDING', approvedAt: null }
          : req
      ));
      toast.error('Failed to approve leave request');
    } else {
      toast.success('Leave request approved');
      // Optionally refetch to ensure consistency
      mutate();
    }
  } catch (error) {
    // Rollback on error
    setLeaveRequests(prev => prev.map(req =>
      req.id === requestId
        ? { ...req, status: 'PENDING', approvedAt: null }
        : req
    ));
    toast.error('Network error');
  }
}
```

---

### 7. Keyboard Shortcuts ⌨️

**Implementation:**
```tsx
useEffect(() => {
  function handleKeyPress(event: KeyboardEvent) {
    // Only when no input is focused
    if (document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }

    if (selectedRequest) {
      if (event.key === 'a') {
        handleApprove(selectedRequest.id);
      } else if (event.key === 'r') {
        setShowRejectModal(true);
      } else if (event.key === 'Escape') {
        setSelectedRequest(null);
      }
    }

    // Navigation
    if (event.key === 'ArrowDown') {
      selectNextRequest();
    } else if (event.key === 'ArrowUp') {
      selectPreviousRequest();
    }
  }

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [selectedRequest]);

// Keyboard shortcuts legend
<div className="text-xs text-gray-500 mt-4">
  <kbd>↑↓</kbd> Navigate | <kbd>a</kbd> Approve | <kbd>r</kbd> Reject | <kbd>Esc</kbd> Deselect
</div>
```

---

### 8. Enhanced Rejection Modal

**With History Display:**
```tsx
<Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Reject Leave Request</DialogTitle>
    </DialogHeader>

    {/* Previous rejections */}
    {selectedRequest?.rejectionHistory?.length > 0 && (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
        <p className="text-sm font-medium text-yellow-900 mb-2">
          Previous Rejections
        </p>
        {selectedRequest.rejectionHistory.map((history, idx) => (
          <div key={history.id} className="text-sm text-yellow-800 mb-2">
            <div className="font-medium">
              #{idx + 1} - {format(history.rejectedAt, 'MMM d, yyyy')}
            </div>
            <div className="text-xs">{history.rejectionReason}</div>
          </div>
        ))}
      </div>
    )}

    {/* Rejection form */}
    <div className="space-y-4">
      <div>
        <Label>Rejection Reason*</Label>
        <Textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Provide a clear reason for rejection..."
          rows={4}
          required
        />
      </div>

      <div>
        <Label>Category (Optional)</Label>
        <Select value={rejectionCategory} onValueChange={setRejectionCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INSUFFICIENT_BALANCE">Insufficient Balance</SelectItem>
            <SelectItem value="OVERLAPPING_DATES">Overlapping Dates</SelectItem>
            <SelectItem value="INSUFFICIENT_NOTICE">Insufficient Notice</SelectItem>
            <SelectItem value="BUSINESS_CRITICAL_PERIOD">Business Critical Period</SelectItem>
            <SelectItem value="INCOMPLETE_INFORMATION">Incomplete Information</SelectItem>
            <SelectItem value="TEAM_ALREADY_ON_LEAVE">Team Already on Leave</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <DialogFooter>
      <Button variant="outline" onClick={() => setShowRejectModal(false)}>
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={handleReject}
        disabled={!rejectionReason.trim()}
      >
        Reject & Return to Draft
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 📁 Files to Modify

### Database
- [x] `frontend/prisma/schema.prisma` - Updated

### API Routes - Employee
- [ ] `frontend/app/api/employee/leave/route.ts` - Support DRAFT status
- [ ] `frontend/app/api/employee/leave/submit/route.ts` - NEW - Submit drafts
- [ ] `frontend/app/api/employee/leave/auto-approve/route.ts` - NEW - Root-level auto-approval
- [ ] `frontend/app/api/employee/leave/[id]/route.ts` - PATCH for updating drafts

### API Routes - Manager
- [ ] `frontend/app/api/manager/leave/pending/route.ts` - Filter PENDING only
- [ ] `frontend/app/api/manager/leave/[id]/reject/route.ts` - Return to DRAFT
- [ ] `frontend/app/api/manager/leave/bulk-reject/route.ts` - Return to DRAFT
- [ ] `frontend/app/api/manager/leave/send-reminder/route.ts` - NEW

### API Routes - Admin
- [ ] `frontend/app/api/admin/leave/pending/route.ts` - Filter PENDING only
- [ ] `frontend/app/api/admin/leave/[id]/reject/route.ts` - Return to DRAFT
- [ ] `frontend/app/api/admin/leave/bulk-reject/route.ts` - Return to DRAFT
- [ ] `frontend/app/api/admin/leave/send-reminder/route.ts` - NEW

### UI Components
- [ ] `frontend/app/employee/leave/page.tsx` - Draft support, auto-approval banner
- [ ] `frontend/app/manager/leave-approvals/page.tsx` - Calendar grid, keyboard shortcuts
- [ ] `frontend/app/admin/leave-approvals/page.tsx` - Calendar grid, keyboard shortcuts
- [ ] `frontend/components/leave/LeaveCalendarGrid.tsx` - NEW
- [ ] `frontend/components/leave/LeaveStatusBadge.tsx` - Update for DRAFT

---

## 🧪 Testing Checklist

### Draft State
- [ ] Create new leave request saves as DRAFT
- [ ] Can edit draft requests
- [ ] Can delete draft requests
- [ ] Submit button changes DRAFT → PENDING
- [ ] Draft requests not visible to managers

### Rejection Editing
- [ ] Rejected requests return to DRAFT (not REJECTED)
- [ ] `submittedAt` is cleared on rejection
- [ ] Employee can edit and resubmit rejected request
- [ ] Rejection history is preserved
- [ ] Previous rejection reasons visible in UI

### Auto-Approval
- [ ] Root-level employees see auto-approval banner
- [ ] Auto-approval button works
- [ ] Balance is deducted correctly
- [ ] `isAutoApproved` flag is set
- [ ] Email notification sent (optional)

### Calendar Grid
- [ ] Weekly calendar displays correctly
- [ ] Leave requests show in correct cells
- [ ] Color coding matches status
- [ ] Responsive on mobile
- [ ] Week navigation works

### Reminders
- [ ] Manager can send reminders
- [ ] Only employees without pending leave get reminders
- [ ] Email content is correct
- [ ] Reminder count displayed

### Keyboard Shortcuts
- [ ] 'a' key approves selected request
- [ ] 'r' key opens reject modal
- [ ] Arrow keys navigate requests
- [ ] Escape key deselects
- [ ] Shortcuts don't fire in input fields

### Optimistic Updates
- [ ] UI updates immediately on approve
- [ ] UI updates immediately on reject
- [ ] Rollback works on error
- [ ] Toast notifications appear

---

## 📊 Migration Guide

### Database Migration

```bash
cd frontend
npx prisma migrate dev --name add_leave_draft_status_and_improvements
npx prisma generate
```

### Backward Compatibility

**Existing PENDING requests:**
- Will remain PENDING (valid status)
- Can be approved/rejected normally
- New requests start as DRAFT

**Existing REJECTED requests:**
- Can be manually updated to DRAFT for editing
- Or delete and create new draft

**Migration Script (Optional):**
```sql
-- Update all existing REJECTED requests to DRAFT for editing
UPDATE "LeaveRequest"
SET status = 'DRAFT', "submittedAt" = NULL
WHERE status = 'REJECTED';

-- Add submission timestamp to existing PENDING/APPROVED requests
UPDATE "LeaveRequest"
SET "submittedAt" = "createdAt"
WHERE status IN ('PENDING', 'APPROVED') AND "submittedAt" IS NULL;
```

---

## 🎯 Benefits

### For Employees
✅ Save partial leave requests (draft state)
✅ Edit rejected requests instead of creating new ones
✅ Root-level employees can self-approve
✅ Clear rejection history visible
✅ Better feedback with optimistic updates

### For Managers
✅ Visual calendar grid for team planning
✅ Keyboard shortcuts for faster approvals
✅ Send reminders to team
✅ Better UX with instant feedback
✅ See rejection history before re-approving

### For Organization
✅ Consistent UX across Leave and Timesheet modules
✅ Reduced support burden (self-service for root-level)
✅ Better audit trail with draft/submit tracking
✅ Improved team visibility with calendar view
✅ Modern, efficient approval workflows

---

## 📝 Next Steps

1. **Run migration** - Apply schema changes
2. **Update APIs** - Implement draft state and rejection editing
3. **Update UIs** - Add calendar grid and optimistic updates
4. **Test thoroughly** - All scenarios and edge cases
5. **Document** - Update user guides and API docs
6. **Deploy** - Staged rollout with monitoring

---

## 🔗 Related Documentation

- [LEAVE_MODULE_CRITICAL_FIXES.md](LEAVE_MODULE_CRITICAL_FIXES.md)
- [LEAVE_PAGES_CLONED.md](LEAVE_PAGES_CLONED.md)
- [LEAVE_AUTHORIZATION_UPDATE.md](LEAVE_AUTHORIZATION_UPDATE.md)
- [LEAVE_NAVIGATION_ADDED.md](LEAVE_NAVIGATION_ADDED.md)

---

**Status**: Schema changes complete, API and UI implementation in progress.
