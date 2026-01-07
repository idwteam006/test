# Leave Management Module

## Status Overview
- Overall Completion: 0%
- Backend: 📋 Planned
- Frontend: 📋 Planned
- Tests: 📋 Planned

## Module Purpose
Leave requests, approvals, balance tracking, and team availability management

## Implemented Features

_No features implemented yet_

## Database Schema

**Prisma Models**: `LeaveRequest`, `LeaveBalance` (see `/frontend/prisma/schema.prisma`)

## Pending Features

### 1. Leave Types
- [ ] Annual leave
- [ ] Sick leave
- [ ] Personal leave
- [ ] Maternity/Paternity leave
- [ ] Unpaid leave
- [ ] Accrual rules configuration
- [ ] Carryover policies

### 2. Leave Requests
- [ ] Submit leave requests
- [ ] Calendar view of leaves
- [ ] Half-day/Full-day options
- [ ] Conflict detection
- [ ] Attachment support (medical certificates, etc.)
- [ ] Request history

### 3. Approval Process
- [ ] Manager approval workflow
- [ ] Approve/reject with comments
- [ ] Email notifications
- [ ] Delegation of approval rights
- [ ] Auto-approval rules

### 4. Leave Balances
- [ ] Track remaining balances
- [ ] Balance accrual over time
- [ ] Year-end rollovers
- [ ] Balance adjustments
- [ ] Balance history

### 5. Leave Analytics
- [ ] Employee leave balances
- [ ] Team availability calendar
- [ ] Leave trends and patterns
- [ ] Absence reports

## API Endpoints (Planned)
- `GET /api/leave-requests` - List leave requests
- `GET /api/leave-requests/:id` - Get leave request details
- `POST /api/leave-requests` - Create leave request
- `PUT /api/leave-requests/:id` - Update leave request
- `DELETE /api/leave-requests/:id` - Cancel leave request
- `POST /api/leave-requests/:id/approve` - Approve leave
- `POST /api/leave-requests/:id/reject` - Reject leave
- `GET /api/leave-balances/:employeeId` - Get employee balances
- `GET /api/leave-calendar` - Get team leave calendar

## Frontend Components (Planned)
- LeaveRequestForm: `/app/features/leave/components/LeaveRequestForm.tsx`
- LeaveRequestList: `/app/features/leave/components/LeaveRequestList.tsx`
- LeaveCalendar: `/app/features/leave/components/LeaveCalendar.tsx`
- LeaveBalanceCard: `/app/features/leave/components/LeaveBalanceCard.tsx`
- LeaveApprovalQueue: `/app/features/leave/components/LeaveApprovalQueue.tsx`

## Dependencies
- Employee Management Module (required)

## Integration Points
- Used by: Dashboard, Reports
- Integrates with: Employees, Notifications

## Notes
- Leave conflicts should check team availability
- Email notifications for requests, approvals, rejections
- Public holidays should be configurable per tenant
- Consider integration with external calendar (Google Calendar, Outlook)
