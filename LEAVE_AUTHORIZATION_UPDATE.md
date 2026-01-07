# Leave Module - Authorization Update: Direct Reports Only

## Summary

Updated the Leave Approval Module authorization to ensure managers and admins can only approve/reject leave requests from their **direct reports**, while HR retains organization-wide access.

**Date:** December 20, 2025
**Status:** ✅ Complete

---

## Authorization Changes

### Before ❌

- **MANAGER** - Direct reports only ✅
- **ADMIN** - Organization-wide ❌ (incorrect)
- **HR** - Organization-wide ✅

### After ✅

- **MANAGER** - Direct reports only ✅
- **ADMIN** - Direct reports only ✅ (fixed)
- **HR** - Organization-wide ✅

---

## Files Modified

### Admin API Endpoints (5 files)

1. **[/api/admin/leave/pending/route.ts](frontend/app/api/admin/leave/pending/route.ts)**
   - Updated query filter to show only direct reports
   - Changed from: `if (user.role === 'MANAGER')`
   - Changed to: `if (user.role === 'MANAGER' || user.role === 'ADMIN')`

2. **[/api/admin/leave/[id]/approve/route.ts](frontend/app/api/admin/leave/[id]/approve/route.ts)**
   - Updated authorization check
   - Admins now verified against direct reports
   - Error message: "You can only approve leave requests for your direct reports"

3. **[/api/admin/leave/[id]/reject/route.ts](frontend/app/api/admin/leave/[id]/reject/route.ts)**
   - Updated authorization check
   - Admins now verified against direct reports
   - Error message: "You can only reject leave requests for your direct reports"

4. **[/api/admin/leave/bulk-approve/route.ts](frontend/app/api/admin/leave/bulk-approve/route.ts)**
   - Updated authorization check for bulk operations
   - Validates all requests belong to direct reports
   - Error message: "You can only approve leave requests for your direct reports"

5. **[/api/admin/leave/bulk-reject/route.ts](frontend/app/api/admin/leave/bulk-reject/route.ts)**
   - Updated authorization check for bulk operations
   - Validates all requests belong to direct reports
   - Error message: "You can only reject leave requests for your direct reports"

### Documentation

6. **[LEAVE_PAGES_CLONED.md](LEAVE_PAGES_CLONED.md)**
   - Added authorization model section at top
   - Updated all references from "organization-wide" to "direct reports only"
   - Updated API endpoint descriptions
   - Updated testing checklist
   - Updated benefits section to clarify HR vs Admin roles

---

## Code Changes Detail

### Pattern Applied to All Admin Endpoints

**Before:**
```typescript
// If manager, verify they manage this employee
if (user.role === 'MANAGER') {
  const manager = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!manager || leaveRequest.employee.managerId !== manager.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
}
// HR and Admin see all requests
```

**After:**
```typescript
// If manager or admin, verify they manage this employee (only HR can approve anyone's leave)
if (user.role === 'MANAGER' || user.role === 'ADMIN') {
  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!employee || leaveRequest.employee.managerId !== employee.id) {
    return NextResponse.json(
      { success: false, error: 'You can only approve leave requests for your direct reports' },
      { status: 403 }
    );
  }
}
// Only HR sees all requests organization-wide
```

### Key Changes

1. **Authorization Condition**: Added `|| user.role === 'ADMIN'` to include admins in the check
2. **Variable Rename**: Changed `manager` to `employee` for clarity (admins are also employees)
3. **Error Messages**: Updated to say "direct reports" instead of "team members"
4. **Comments**: Clarified that only HR has organization-wide access

---

## Database Schema

No changes to database schema required. The authorization is enforced at the API level using existing `managerId` relationships in the `Employee` model.

### Employee Hierarchy

```
Employee {
  id: string
  userId: string
  managerId: string?  // Points to their direct manager's employee ID
  ...
}
```

**Example Hierarchy:**
```
CEO (managerId: null)
├── VP Engineering (managerId: CEO.id)
│   ├── Engineering Manager (managerId: VP.id)
│   │   ├── Dev 1 (managerId: EngManager.id)
│   │   └── Dev 2 (managerId: EngManager.id)
│   └── QA Lead (managerId: VP.id)
└── VP Sales (managerId: CEO.id)
    └── Sales Rep (managerId: VPSales.id)
```

**Authorization Examples:**
- VP Engineering (ADMIN) can approve: Engineering Manager, QA Lead (direct reports)
- VP Engineering (ADMIN) cannot approve: Dev 1, Dev 2 (indirect reports)
- Engineering Manager (MANAGER) can approve: Dev 1, Dev 2 (direct reports)
- HR can approve: Anyone in the organization

---

## Testing Checklist

### Admin Role Testing

- [ ] Admin logs in and navigates to `/admin/leave-approvals`
- [ ] Only sees leave requests from direct reports
- [ ] Cannot see indirect reports' requests
- [ ] Cannot see peers' or other teams' requests
- [ ] Can approve direct report's request
- [ ] Cannot approve non-direct report's request (gets 403 error)
- [ ] Can reject direct report's request with reason
- [ ] Cannot reject non-direct report's request (gets 403 error)
- [ ] Bulk approve works for direct reports only
- [ ] Bulk reject works for direct reports only
- [ ] Receives proper error message when trying to approve outside hierarchy

### Manager Role Testing

- [ ] Manager logs in and navigates to `/manager/leave-approvals`
- [ ] Only sees leave requests from direct reports
- [ ] Can approve/reject direct reports' requests
- [ ] Cannot approve/reject non-direct reports' requests

### HR Role Testing

- [ ] HR logs in and navigates to their leave approvals page
- [ ] Sees ALL leave requests organization-wide
- [ ] Can approve any request
- [ ] Can reject any request
- [ ] No authorization errors

### API Testing

```bash
# Test as Admin with direct report's leave request
curl -X POST /api/admin/leave/{direct-report-leave-id}/approve
# Expected: Success ✅

# Test as Admin with non-direct report's leave request
curl -X POST /api/admin/leave/{other-employee-leave-id}/approve
# Expected: 403 Forbidden with error message ✅

# Test as HR with any leave request
curl -X POST /api/admin/leave/{any-employee-leave-id}/approve
# Expected: Success ✅
```

---

## Benefits of This Change

### Security & Compliance

✅ **Proper Authorization** - Admins can't approve leave outside their reporting structure
✅ **Audit Trail** - Clear accountability for who approves what
✅ **Compliance** - Follows proper organizational hierarchy
✅ **Data Privacy** - Admins only see their team's leave data

### Organizational Structure

✅ **Respects Hierarchy** - Leave approvals follow org chart
✅ **Clear Responsibilities** - Each manager/admin responsible for their team
✅ **HR Oversight** - HR retains organization-wide control for special cases
✅ **Scalability** - Works for any organizational depth

### User Experience

✅ **Reduced Confusion** - Admins only see relevant requests
✅ **Faster Decisions** - Smaller, focused list of requests
✅ **Clear Errors** - Helpful error messages when authorization fails
✅ **Consistent Behavior** - Manager and Admin roles work the same way

---

## Migration Notes

### No Database Migration Required

This is a code-only change. No database schema updates needed.

### Backward Compatibility

- ✅ **Existing data** - No changes to existing leave requests
- ✅ **API contracts** - Same endpoints, same request/response formats
- ✅ **UI** - No UI changes needed (already filters by available data)

### Deployment Steps

1. Deploy updated API endpoints
2. Test with admin users
3. Verify HR still has organization-wide access
4. Monitor for any authorization errors in logs

---

## Role Comparison Table

| Capability | EMPLOYEE | MANAGER | ADMIN | HR |
|------------|----------|---------|-------|-----|
| Request own leave | ✅ | ✅ | ✅ | ✅ |
| View own leave | ✅ | ✅ | ✅ | ✅ |
| Approve direct reports' leave | ❌ | ✅ | ✅ | ✅ |
| Approve organization-wide leave | ❌ | ❌ | ❌ | ✅ |
| View direct reports' leave | ❌ | ✅ | ✅ | ✅ |
| View organization-wide leave | ❌ | ❌ | ❌ | ✅ |
| Bulk operations (direct reports) | ❌ | ✅ | ✅ | ✅ |
| Bulk operations (organization) | ❌ | ❌ | ❌ | ✅ |

---

## Related Documentation

- [LEAVE_MODULE_CRITICAL_FIXES.md](LEAVE_MODULE_CRITICAL_FIXES.md) - Backend enhancements
- [LEAVE_PAGES_CLONED.md](LEAVE_PAGES_CLONED.md) - Page cloning documentation

---

## Conclusion

The Leave Approval Module now enforces proper hierarchical authorization:

- **Managers and Admins** manage their direct reports only
- **HR** retains organization-wide control
- **Clear error messages** guide users
- **Consistent with best practices** for organizational hierarchy

This change improves security, compliance, and user experience without requiring any database migrations or UI changes.

