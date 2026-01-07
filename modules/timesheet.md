# Timesheet Module

## Status Overview
- Overall Completion: 0%
- Backend: 📋 Planned
- Frontend: 📋 Planned
- Tests: 📋 Planned

## Module Purpose
Time tracking, approval workflows, and utilization reporting

## Implemented Features

_No features implemented yet_

## Database Schema

**Prisma Model**: `TimeEntry` (see `/frontend/prisma/schema.prisma`)

## Pending Features

### 1. Time Entry
- [ ] Weekly timesheet view
- [ ] Daily time entry
- [ ] Project and task selection
- [ ] Billable/non-billable hours toggle
- [ ] Time entry notes/descriptions
- [ ] Bulk time entry
- [ ] Copy previous week
- [ ] Timer functionality (start/stop)

### 2. Approval Workflow
- [ ] Submit timesheet for approval
- [ ] Manager approval interface
- [ ] Approve/reject with comments
- [ ] Batch approval
- [ ] Lock approved timesheets
- [ ] Email notifications for approvals
- [ ] Approval history

### 3. Reporting
- [ ] Weekly/monthly summaries
- [ ] Employee utilization report
- [ ] Project time breakdown
- [ ] Billable vs. non-billable hours
- [ ] CSV/Excel export
- [ ] Time trends analysis

### 4. Background Jobs (BullMQ)
- [ ] Weekly timesheet reminders
- [ ] Auto-submit notifications
- [ ] Approval reminders to managers
- [ ] Overdue timesheet alerts

## API Endpoints (Planned)
- `GET /api/timesheets` - List time entries (filtered)
- `GET /api/timesheets/week/:date` - Get weekly timesheet
- `POST /api/timesheets` - Create time entry
- `PUT /api/timesheets/:id` - Update time entry
- `DELETE /api/timesheets/:id` - Delete time entry
- `POST /api/timesheets/submit` - Submit for approval
- `POST /api/timesheets/:id/approve` - Approve timesheet
- `POST /api/timesheets/:id/reject` - Reject timesheet
- `GET /api/timesheets/reports/utilization` - Utilization report

## Frontend Components (Planned)
- WeeklyTimesheet: `/app/features/timesheets/components/WeeklyTimesheet.tsx`
- TimeEntryForm: `/app/features/timesheets/components/TimeEntryForm.tsx`
- ApprovalQueue: `/app/features/timesheets/components/ApprovalQueue.tsx`
- TimesheetSummary: `/app/features/timesheets/components/TimesheetSummary.tsx`
- TimesheetReports: `/app/features/timesheets/components/TimesheetReports.tsx`

## Dependencies
- Employee Management Module (required)
- Project Management Module (required)

## Integration Points
- Used by: Invoice/Billing, Reports, Payroll
- Integrates with: Projects, Tasks, Employees

## Notes
- Timesheets should auto-save to prevent data loss
- Weekly view is standard, but daily view should be available
- Approved timesheets should be immutable
- Consider mobile app for easy time tracking
- Integration with calendar for meetings/appointments
