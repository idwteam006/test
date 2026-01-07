# Leave Management Module Migration Instructions

## Schema Changes Added

The following fields have been added to `TenantSettings` model:

```prisma
minimumLeaveNoticeDays      Int     @default(1)
maximumConsecutiveLeaveDays Int?
allowHalfDayLeave           Boolean @default(false)
carryForwardLeave           Boolean @default(false)
maxCarryForwardDays         Int     @default(0)
leaveAllocationDay          String  @default("01-01")
autoAllocateLeave           Boolean @default(true)
```

## To Run Migration

Execute one of the following commands in the `/Volumes/E/zenora/frontend` directory:

### Option 1: Using npx (if available)
```bash
npx prisma migrate dev --name add_leave_policy_settings
```

### Option 2: Using node directly
```bash
node node_modules/.bin/prisma migrate dev --name add_leave_policy_settings
```

### Option 3: Push directly to database (for development)
```bash
npx prisma db push
```

## New API Endpoints Created

1. **Balance Allocation**
   - POST `/api/admin/leave/allocate` - Allocate leave balances for employees
   - GET `/api/admin/leave/allocate` - Get allocation status

2. **Team Calendar**
   - GET `/api/manager/leave/calendar?month=YYYY-MM` - Get team leave calendar

3. **Reports & Analytics**
   - GET `/api/admin/leave/reports?year=YYYY&type=summary` - Summary report
   - GET `/api/admin/leave/reports?year=YYYY&type=employee-detail` - Employee details
   - GET `/api/admin/leave/reports?year=YYYY&type=utilization` - Utilization report

## New Pages Created

1. `/admin/leave/balance-management` - Balance allocation UI
2. `/manager/leave-calendar` - Team calendar view
3. `/admin/leave/reports` - Reports and analytics dashboard

## Features Implemented

### 1. Automated Balance Allocation ✅
- Prorated allocation for mid-year joiners
- Carry-forward logic with configurable limits
- Admin UI for bulk allocation
- Year-end rollover support

### 2. Policy Enforcement ✅
- Minimum notice period validation
- Maximum consecutive days enforcement
- Settings from database applied to leave requests

### 3. Team Calendar ✅
- Monthly calendar view with color-coded coverage
- Team availability tracking
- Peak leave days identification
- Coverage warnings (critical/warning/good)

### 4. Reports & Analytics ✅
- Summary report with approval rates and turnaround time
- Employee-level detailed reports
- Leave utilization analysis
- Export to CSV functionality
- Department-wise breakdown
- Monthly trends
- Rejection analysis

### 5. Existing Features Enhanced ✅
- Leave request validation enhanced
- Balance management improved
- Single-level manager approval maintained
- Email notifications preserved

## Testing Checklist

- [ ] Run migration successfully
- [ ] Test balance allocation API
- [ ] Access balance management UI at `/admin/leave/balance-management`
- [ ] Test leave request with notice period validation
- [ ] Test maximum consecutive days validation
- [ ] Access team calendar at `/manager/leave-calendar`
- [ ] Generate all three report types
- [ ] Test CSV export functionality
- [ ] Verify carry-forward logic works correctly
- [ ] Test prorated allocation for new employees

## Database Seed (Optional)

After migration, you can optionally allocate balances for existing employees:

1. Navigate to `/admin/leave/balance-management`
2. Select current year
3. Click "Select All" or "Without Allocation"
4. Enable "Prorated Allocation for New Joiners"
5. Click "Allocate Now"

This will initialize balances for all active employees.
