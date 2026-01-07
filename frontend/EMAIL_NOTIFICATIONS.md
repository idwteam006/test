# Email Notifications System - Zenora.ai

Complete email notification system using **Resend** with verified **zenora.ai** domain.

## ✅ Configured Services

### Email Provider
- **Service**: Resend
- **Domain**: zenora.ai (verified)
- **From Address**: `Zenora <noreply@zenora.ai>`
- **API Key**: Configured in `.env`

## 📧 Available Notifications

### Manager Notifications

#### 1. Timesheet Submitted
**Function**: `notifyManagerTimesheetSubmitted()`
**Triggered**: When employee submits timesheet for approval
**Includes**:
- Employee name
- Week period
- Total hours
- Review URL link

#### 2. Leave Requested
**Function**: `notifyManagerLeaveRequested()`
**Triggered**: When employee requests leave
**Includes**:
- Employee name
- Leave type (Annual, Sick, etc.)
- Date range and duration
- Reason (optional)
- Review URL link

#### 3. Expense Submitted
**Function**: `notifyManagerExpenseSubmitted()`
**Triggered**: When employee submits expense claim
**Includes**:
- Employee name
- Expense title and category
- Amount (formatted with currency)
- Expense date
- Review URL link

---

### Employee Notifications

#### 4. Timesheet Approved
**Function**: `notifyEmployeeTimesheetApproved()`
**Triggered**: When manager approves timesheet
**Includes**:
- Week period
- Total hours
- Approver name

**Status**: ✅ **Integrated** in `/api/manager/timesheets/[id]/approve`

#### 5. Timesheet Rejected
**Function**: `notifyEmployeeTimesheetRejected()`
**Triggered**: When manager rejects timesheet
**Includes**:
- Week period
- Total hours
- Rejection reason
- Link to update timesheet

#### 6. Leave Approved
**Function**: `notifyEmployeeLeaveApproved()`
**Triggered**: When manager approves leave
**Includes**:
- Leave type and dates
- Duration
- Approver name

#### 7. Leave Rejected
**Function**: `notifyEmployeeLeaveRejected()`
**Triggered**: When manager rejects leave
**Includes**:
- Leave type and dates
- Rejection reason
- Rejector name

#### 8. Expense Approved
**Function**: `notifyEmployeeExpenseApproved()`
**Triggered**: When manager/accountant approves expense
**Includes**:
- Expense title
- Amount (formatted)
- Approver name
- Reimbursement timeline

#### 9. Expense Rejected
**Function**: `notifyEmployeeExpenseRejected()`
**Triggered**: When manager/accountant rejects expense
**Includes**:
- Expense title
- Amount
- Rejection reason

#### 10. Task Assigned
**Function**: `notifyEmployeeTaskAssigned()`
**Triggered**: When manager assigns a task
**Includes**:
- Task name
- Description
- Due date (optional)
- Project name (optional)
- Assigner name
- Link to view task

---

### HR Notifications

#### 11. Onboarding Submitted
**Function**: `notifyHROnboardingSubmitted()`
**Triggered**: When employee completes onboarding form
**Includes**:
- Employee name and email
- Status: Pending Review
- Review URL link

---

### Accountant Notifications

#### 12. Invoice Generated
**Function**: `notifyAccountantInvoiceGenerated()`
**Triggered**: When system generates invoice
**Includes**:
- Invoice number
- Client name
- Amount (formatted with currency)
- Due date
- View URL link

---

### Admin Notifications

#### 13. System Events
**Function**: `notifyAdminSystemEvent()`
**Triggered**: System-level events (errors, warnings, info)
**Includes**:
- Event type
- Severity (info/warning/error)
- Description
- Timestamp

## 🚀 Usage

### Import the notifications:
```typescript
import {
  notifyManagerTimesheetSubmitted,
  notifyEmployeeTimesheetApproved,
  notifyEmployeeTaskAssigned,
  // ... other functions
} from '@/lib/email-notifications';
```

### Example - Notify employee of task assignment:
```typescript
await notifyEmployeeTaskAssigned({
  employeeEmail: 'employee@example.com',
  employeeName: 'John Doe',
  taskName: 'Fix login bug',
  description: 'Users unable to login with Google',
  dueDate: '2025-12-01',
  projectName: 'Auth System',
  assignedBy: 'Jane Manager',
});
```

### Example - Notify manager of timesheet submission:
```typescript
await notifyManagerTimesheetSubmitted({
  managerEmail: 'manager@example.com',
  managerName: 'Jane Manager',
  employeeName: 'John Doe',
  weekStart: 'Nov 18, 2025',
  weekEnd: 'Nov 24, 2025',
  totalHours: 40,
  reviewUrl: 'https://zenora.ai/manager/timesheets/pending',
});
```

## 🧪 Testing

### Test Script
```bash
cd /Volumes/E/zenora/frontend
npx tsx scripts/send-test-email.ts
```

### Test API Endpoint
```
GET http://localhost:3008/api/test-resend?email=your@email.com
```

## 📋 Integration Status

| Module | API Route | Status |
|--------|-----------|--------|
| Timesheet Approval | `/api/manager/timesheets/[id]/approve` | ✅ Integrated |
| Timesheet Rejection | `/api/manager/timesheets/[id]/reject` | 🔄 Pending |
| Leave Approval | `/api/manager/leave/[id]/approve` | 🔄 Pending |
| Leave Rejection | `/api/manager/leave/[id]/reject` | 🔄 Pending |
| Expense Approval | `/api/manager/expenses/[id]/approve` | 🔄 Pending |
| Expense Rejection | `/api/manager/expenses/[id]/reject` | 🔄 Pending |
| Task Assignment | `/api/manager/tasks` (POST) | 🔄 Pending |
| Timesheet Submit | `/api/employee/timesheets/submit` | 🔄 Pending |
| Expense Submit | `/api/employee/expenses/[id]/submit` | 🔄 Pending |
| Onboarding Submit | `/api/hr/onboarding/submit` | 🔄 Pending |

## 🎨 Email Design

All emails feature:
- ✅ Professional gradient styling (purple/green/red/orange based on context)
- ✅ Mobile-responsive design
- ✅ Clear call-to-action buttons
- ✅ Consistent branding with Zenora.ai
- ✅ Both HTML and plain text versions
- ✅ Security notices where applicable

## 🔐 Configuration

### Environment Variables
```bash
RESEND_API_KEY="re_gqjJuEKZ_Aw4GLi6P5f5wSHL69JxxzdU4"
RESEND_FROM_EMAIL="Zenora <noreply@zenora.ai>"
NEXT_PUBLIC_APP_URL="https://zenora.ai"  # For links in emails
```

### Recommended Email Addresses
- `noreply@zenora.ai` - Automated notifications (current)
- `hello@zenora.ai` - Customer support
- `hr@zenora.ai` - HR communications
- `support@zenora.ai` - Support tickets

## 📝 Next Steps

1. **Integrate remaining notifications** into their respective API routes
2. **Add email preferences** for users to control notification settings
3. **Implement digest emails** for daily/weekly summaries
4. **Add email analytics** tracking (opens, clicks)
5. **Create email templates** for invoices, reports, etc.

## 🐛 Troubleshooting

### Emails not sending?
1. Check `RESEND_API_KEY` is set in `.env`
2. Verify domain is verified in Resend dashboard
3. Check server logs for error messages
4. Test with `/api/test-resend` endpoint

### Wrong sender address?
1. Update `RESEND_FROM_EMAIL` in `.env`
2. Ensure email address uses verified domain
3. Restart dev server after changes

---

**Generated**: November 2025
**Version**: 1.0
**Status**: Active Development
