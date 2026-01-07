# 🔐 ADMIN ROLE - Complete Features & Flow Analysis

**Generated:** November 16, 2025
**System:** Zenora.ai Employee Management System
**Role:** ADMIN (Super Administrator)

---

## 📊 Table of Contents

1. [Overview](#overview)
2. [Dashboard & Analytics](#dashboard--analytics)
3. [Employee Management](#employee-management)
4. [Client Management](#client-management)
5. [Project Management](#project-management)
6. [Financial Management](#financial-management)
7. [Leave Management](#leave-management)
8. [Performance Management](#performance-management)
9. [Payroll Management](#payroll-management)
10. [Organization Settings](#organization-settings)
11. [Reports & Analytics](#reports--analytics)
12. [User Management](#user-management)
13. [Onboarding Management](#onboarding-management)
14. [System Settings](#system-settings)
15. [Access Control Matrix](#access-control-matrix)
16. [User Flows](#user-flows)

---

## 🎯 Overview

### Admin Role Capabilities
The ADMIN role has **full system access** with the ability to:
- ✅ Manage all employees, clients, and projects
- ✅ Process payroll and generate invoices
- ✅ Configure organization settings and policies
- ✅ Access comprehensive reports and analytics
- ✅ Manage user roles and permissions
- ✅ Control system-wide settings (dev mode, SMTP, etc.)

### Access Level
**Permission Level:** HIGHEST
**Multi-tenant Isolation:** YES (scoped to tenant)
**Can Access:** All modules except employee-specific views

---

## 1️⃣ Dashboard & Analytics

### **Page:** `/admin` (Dashboard)
**File:** `app/admin/page.tsx`

#### Key Metrics Displayed
```typescript
- Total Users: 245 (with weekly growth)
- Active Sessions: 89 (real-time)
- Active Projects: 42 (with completion stats)
- Pending Actions: 23 (requires attention)
```

#### Dashboard Sections

##### **A. Welcome Banner**
- Current date display
- System health indicator (green pulse)
- Personalized greeting

##### **B. Key Metrics Grid (4 Cards)**
1. **Total Users**
   - Count: 245
   - Trend: ↑ 8 this week
   - Color: Blue

2. **Active Sessions**
   - Count: 89
   - Status: Right now
   - Color: Green

3. **Active Projects**
   - Count: 42
   - Completed: 156
   - Color: Purple

4. **Pending Actions**
   - Count: 23
   - Status: Requires attention
   - Color: Orange

##### **C. Critical Alerts Panel**
Shows urgent system issues:
- Database backup failures
- SSL certificate expiration warnings
- Pending user approvals (12)
- Server disk usage alerts (85%)

**Alert Types:**
- 🔴 URGENT (red badge)
- ⚠️ WARNING (yellow badge)

**Actions Available:**
- Retry failed operations
- View details
- Review pending items

##### **D. Organization Overview**
Detailed breakdown by category:

**Employees (245 total)**
- Admin: 5
- Manager: 12
- Employee: 220
- Accountant: 8

**Departments (8 total)**
- Teams: 15
- Average utilization: 82%

**Projects (42 active)**
- On Track: 76%
- At Risk: 17%
- Delayed: 7%

**Revenue ($2.4M)**
- Active clients: 34
- Growth: ↑ 12% this month

##### **E. Top Departments**
Performance ranking with utilization:
1. Engineering - 85 employees (92% util)
2. Sales - 45 employees (88% util)
3. Marketing - 30 employees (76% util)
4. Operations - 35 employees (79% util)

##### **F. Security & Compliance**
**Login Statistics (Last 24h):**
- Failed: 23
- Successful: 487

**Status Indicators:**
- ✅ Backup: Completed (2h ago)
- ✅ Security audit: Passed
- ⚠️ SSL: Expires in 7 days
- ✅ GDPR: Up to date

##### **G. Recent System Activity**
Timeline of recent events:
- Project creation
- Attendance marking (bulk)
- Database backups
- Leave approvals
- System updates

---

## 2️⃣ Employee Management

### **Pages:**
- `/admin/employees` - Employee listing
- `/admin/employees/import` - Bulk import
- `/admin/invite-employee` - Send invites

### **API Endpoints:**
```typescript
GET    /api/admin/employees              // List all employees
POST   /api/admin/employees/create       // Create employee
POST   /api/admin/employees/import       // Bulk import (CSV/Excel)
GET    /api/admin/employees/[id]/details // Get employee details
PATCH  /api/admin/employees/[id]/status  // Activate/deactivate
PATCH  /api/admin/employees/[id]/assign-role // Change role
```

### Features

#### **A. Employee Listing** (`/admin/employees`)
**Display Columns:**
- Employee Number
- Full Name
- Email
- Department
- Role (ADMIN, MANAGER, HR, EMPLOYEE, ACCOUNTANT)
- Employment Type (FULL_TIME, PART_TIME, CONTRACT)
- Status (ACTIVE, INACTIVE, SUSPENDED)
- Join Date

**Actions per Employee:**
- View details
- Edit information
- Assign role
- Change status
- View performance
- Access timesheets

**Bulk Actions:**
- Export to Excel/CSV
- Bulk status change
- Mass email communication

#### **B. Employee Creation** (`POST /api/admin/employees/create`)
**Required Fields:**
```typescript
- firstName: string
- lastName: string
- email: string (unique)
- employeeNumber: string (auto-generated or manual)
- departmentId: string
- role: Role (enum)
- employmentType: EmploymentType
- joiningDate: Date
```

**Optional Fields:**
```typescript
- phoneNumber
- address
- emergencyContact
- salary (encrypted)
- managerId
- position/title
```

**Workflow:**
1. Admin fills employee form
2. System validates unique email/employee number
3. Creates User + Employee records (transaction)
4. Sends welcome email (optional)
5. Creates default leave balances
6. Returns employee ID

#### **C. Bulk Import** (`/admin/employees/import`)
**Supported Formats:**
- CSV
- Excel (.xlsx)

**Import Process:**
1. Upload file
2. Map columns (auto-detection)
3. Validation preview (shows errors)
4. Confirm import
5. Background processing
6. Email report (success/failures)

**Validation Checks:**
- Email uniqueness
- Employee number conflicts
- Department existence
- Valid role values
- Date format validation

#### **D. Employee Status Management**
**Status Types:**
- ACTIVE - Normal working status
- INACTIVE - Temporarily disabled
- SUSPENDED - Disciplinary suspension

**Status Change Flow:**
```
PATCH /api/admin/employees/[id]/status
Body: { status: 'INACTIVE', reason: 'Extended leave' }
```

**Effects:**
- INACTIVE: Login disabled, keeps data
- SUSPENDED: Login disabled, flagged for review
- Reactivation restores all access

#### **E. Role Assignment**
**Available Roles:**
- ADMIN - Full system access
- MANAGER - Department management
- HR - People operations
- ACCOUNTANT - Financial access
- EMPLOYEE - Basic access

**Role Change Endpoint:**
```typescript
PATCH /api/admin/employees/[id]/assign-role
Body: { role: 'MANAGER' }
```

**Permission Cascade:**
- Automatically updates access rights
- Notifies employee via email
- Logs change in audit trail

---

## 3️⃣ Client Management

### **Pages:**
- `/admin/clients` - Client listing
- `/admin/clients/new` - Add client
- `/admin/clients/[id]` - View client
- `/admin/clients/[id]/edit` - Edit client

### **API Endpoints:**
```typescript
GET    /api/clients/list           // List all clients (admin view)
POST   /api/clients/create         // Create new client
GET    /api/clients/[id]           // Get client details
PATCH  /api/clients/[id]           // Update client
DELETE /api/clients/[id]           // Archive client
```

### Features

#### **A. Client Listing** (`/admin/clients`)
**Display Information:**
- Client ID (unique identifier)
- Company Name
- Contact Person
- Email & Phone
- Industry
- Account Manager (assigned employee)
- Status (ACTIVE, INACTIVE, LEAD, CHURNED)
- Priority (HIGH, MEDIUM, LOW)
- Client Type (DIRECT, AGENCY, PARTNER)
- Total Projects
- Revenue (lifetime)

**Filters:**
- Status filter
- Priority filter
- Account manager filter
- Industry filter
- Date range

**Sort Options:**
- Alphabetical (company name)
- Revenue (high to low)
- Recent activity
- Number of projects

#### **B. Client Creation** (`/admin/clients/new`)
**Form Fields:**

**Company Information:**
```typescript
- companyName: string (required)
- industry: string
- website: string (URL validation)
- description: text
```

**Contact Details:**
```typescript
- contactPerson: string
- email: string (validated)
- phone: string
- alternatePhone: string
- address: {
    street: string
    city: string
    state: string
    country: string
    zipCode: string
  }
```

**Business Details:**
```typescript
- clientType: DIRECT | AGENCY | PARTNER
- priority: HIGH | MEDIUM | LOW
- status: ACTIVE | LEAD | INACTIVE
- accountManagerId: string (employee selection)
- billingCycle: MONTHLY | QUARTERLY | ANNUAL
- paymentTerms: NET_30 | NET_60 | UPFRONT
```

**Financial:**
```typescript
- hourlyRate: number (default billing rate)
- contractValue: number (if applicable)
- currency: string (from tenant settings)
```

#### **C. Client Details Page** (`/admin/clients/[id]`)
**Sections:**

1. **Overview Card**
   - Company name and logo
   - Status badge
   - Priority indicator
   - Account manager info
   - Quick actions (Edit, Archive, Email)

2. **Contact Information**
   - Primary contact details
   - Full address
   - Communication preferences

3. **Associated Projects**
   - List of active projects
   - Completed projects count
   - Total hours billed
   - Revenue generated

4. **Financial Summary**
   - Outstanding invoices
   - Paid invoices
   - Total revenue
   - Average project value

5. **Activity Timeline**
   - Recent interactions
   - Project milestones
   - Invoice history
   - Communication log

#### **D. Client Editing**
**Editable Fields:**
- All creation fields
- Status changes (with workflow)
- Account manager reassignment
- Priority updates
- Contact information updates

**Validation:**
- Email uniqueness check
- URL format validation
- Phone number formatting
- Required field enforcement

**Audit Trail:**
- All changes logged
- Previous values stored
- Changed by (admin user)
- Timestamp

---

## 4️⃣ Project Management

### **Pages:**
- `/admin/projects` - Project listing
- `/admin/projects/new` - Create project
- `/admin/projects/[id]` - View project
- `/admin/projects/[id]/edit` - Edit project

### **API Endpoints:**
```typescript
GET    /api/projects/list      // List all projects
POST   /api/projects/create    // Create project
GET    /api/projects/[id]      // Get project details
PATCH  /api/projects/[id]      // Update project
```

### Features

#### **A. Project Listing** (`/admin/projects`)
**Display Columns:**
- Project Code (unique)
- Project Name
- Client Name
- Status (ACTIVE, COMPLETED, ON_HOLD, CANCELLED)
- Start Date
- End Date (or deadline)
- Budget
- Team Size
- Progress (%)

**Visual Indicators:**
- 🟢 On Track (green)
- 🟡 At Risk (yellow)
- 🔴 Delayed (red)
- ⚫ On Hold (gray)

**Filters:**
- Status
- Client
- Date range
- Budget range
- Team member

#### **B. Project Creation** (`/admin/projects/new`)
**Project Details:**
```typescript
- projectName: string
- projectCode: string (auto-generated or manual)
- clientId: string (dropdown)
- description: text (rich text editor)
- startDate: Date
- endDate: Date (optional for ongoing)
- status: ProjectStatus
```

**Financial:**
```typescript
- budget: number
- billingType: FIXED | HOURLY | MILESTONE
- hourlyRate: number (if hourly)
- currency: string
```

**Team Assignment:**
```typescript
- projectManager: employeeId
- teamMembers: employeeId[] (multi-select)
- roles: { employeeId: string, role: string }[]
```

**Settings:**
```typescript
- billable: boolean (track billable hours)
- requireApproval: boolean (timesheet approval)
- allowOvertime: boolean
- notifyClient: boolean (progress updates)
```

#### **C. Project Details View** (`/admin/projects/[id]`)
**Sections:**

1. **Project Header**
   - Project name and code
   - Status badge
   - Client link
   - Quick actions (Edit, Archive, Report)

2. **Overview Tab**
   - Description
   - Timeline (Gantt chart or calendar)
   - Budget vs Actual
   - Progress percentage

3. **Team Tab**
   - Team members list
   - Roles and responsibilities
   - Utilization per member
   - Add/remove members

4. **Tasks Tab** (if task management enabled)
   - Task list (grouped by status)
   - Create new task
   - Assign to team members
   - Track progress

5. **Timesheets Tab**
   - All time entries for project
   - Total hours logged
   - Billable vs non-billable
   - Filter by date/employee

6. **Financial Tab**
   - Budget breakdown
   - Expenses logged
   - Invoices generated
   - Profitability analysis

7. **Documents Tab**
   - Uploaded files
   - Contracts
   - Proposals
   - Deliverables

8. **Activity Tab**
   - Full audit trail
   - Comments and notes
   - Status changes
   - Team changes

---

## 5️⃣ Financial Management

### **A. Invoice Management**

#### **Pages:**
- `/admin/invoices` - Invoice dashboard

#### **API Endpoints:**
```typescript
GET    /api/admin/invoices                          // List all invoices
POST   /api/admin/invoices                          // Create invoice
GET    /api/admin/invoices/[id]                     // Get invoice
PATCH  /api/admin/invoices/[id]                     // Update invoice
POST   /api/admin/invoices/[id]/send                // Send invoice via email
POST   /api/admin/invoices/[id]/pay                 // Mark as paid
POST   /api/admin/invoices/generate-from-timesheets // Auto-generate from billable hours
```

#### **Features:**

##### **Invoice Dashboard**
**Summary Cards:**
- Total Outstanding: $45,230
- Paid This Month: $87,450
- Overdue Invoices: 5
- Draft Invoices: 3

**Invoice List:**
- Invoice Number (auto-generated)
- Client Name
- Issue Date
- Due Date
- Amount
- Status (DRAFT, SENT, PAID, OVERDUE, CANCELLED)
- Actions

**Filters:**
- Status
- Client
- Date range
- Amount range

##### **Invoice Creation**
**Manual Creation:**
```typescript
{
  clientId: string
  issueDate: Date
  dueDate: Date
  lineItems: [
    {
      description: string
      quantity: number
      rate: number
      amount: number
    }
  ]
  subtotal: number
  tax: number (calculated)
  total: number
  notes: string
  terms: string
}
```

**Auto-Generate from Timesheets:**
1. Select date range
2. Select client
3. System fetches approved billable entries
4. Groups by project/task
5. Calculates hours × hourly rate
6. Generates line items
7. Admin reviews and confirms
8. Invoice created in DRAFT status

**Example:**
```
POST /api/admin/invoices/generate-from-timesheets
{
  "clientId": "client_123",
  "startDate": "2024-11-01",
  "endDate": "2024-11-30",
  "hourlyRate": 150
}

Response:
{
  "invoice": {
    "invoiceNumber": "INV-2024-0123",
    "lineItems": [
      {
        "description": "Mobile App - Frontend Development",
        "hours": 40,
        "rate": 150,
        "amount": 6000
      },
      {
        "description": "Mobile App - Backend API",
        "hours": 25,
        "rate": 150,
        "amount": 3750
      }
    ],
    "subtotal": 9750,
    "tax": 975,
    "total": 10725
  }
}
```

##### **Invoice Actions**

**1. Send Invoice** (`POST /api/admin/invoices/[id]/send`)
- Changes status: DRAFT → SENT
- Sends email to client billing contact
- Attaches PDF invoice
- Logs send timestamp

**2. Mark as Paid** (`POST /api/admin/invoices/[id]/pay`)
- Changes status: SENT → PAID
- Records payment date
- Optional: Payment method/transaction ID
- Updates revenue reports

**3. Download PDF**
- Generates professional PDF invoice
- Uses company branding (logo, colors)
- Includes payment terms
- Downloadable by admin or client

**4. Cancel Invoice**
- Changes status: → CANCELLED
- Requires reason
- Cannot cancel PAID invoices
- Creates credit note (if needed)

---

### **B. Revenue Reports**

#### **API Endpoint:**
```typescript
GET /api/admin/reports/revenue
Query params:
  - startDate: Date
  - endDate: Date
  - clientId?: string (optional filter)
  - groupBy: 'month' | 'client' | 'project'
```

#### **Report Data:**
```typescript
{
  totalRevenue: number
  invoicesPaid: number
  outstandingAmount: number
  breakdown: [
    {
      period/client/project: string
      amount: number
      invoiceCount: number
      growth: number (%)
    }
  ]
  chartData: {
    labels: string[]
    values: number[]
  }
}
```

#### **Visualizations:**
- Revenue trend line chart
- Revenue by client (pie chart)
- Revenue by project (bar chart)
- Month-over-month comparison

---

## 6️⃣ Leave Management

### **API Endpoints:**
```typescript
GET    /api/manager/leave/pending         // View pending requests (admin has manager access)
POST   /api/manager/leave/[id]/approve    // Approve leave
POST   /api/manager/leave/[id]/reject     // Reject leave with reason
```

### Features

#### **A. Leave Approval Dashboard**
**Accessible at:** Manager leave approvals page (admin has access)

**Pending Requests Display:**
- Employee Name
- Leave Type (ANNUAL, SICK, UNPAID, MATERNITY, PATERNITY)
- Start Date
- End Date
- Total Days
- Reason/Notes
- Current Balance
- Status

**Approval Workflow:**
1. Admin reviews leave request
2. Checks employee's leave balance
3. Verifies no overlapping approvals
4. Clicks Approve or Reject
5. If reject: Must provide reason (min 10 chars)
6. Email sent to employee automatically
7. Leave balance updated (if approved)

**Email Notifications:**
- **Approved:** Green template with leave details
- **Rejected:** Red template with rejection reason

#### **B. Leave Balance Management**
Admins can view/edit leave balances:
- Annual leave balance per employee
- Sick leave balance
- Leave accrual settings
- Manual adjustments (with reason)

---

## 7️⃣ Performance Management

### **API Endpoints:**
```typescript
GET    /api/manager/performance/reviews              // List all reviews
POST   /api/manager/performance/reviews              // Create review
POST   /api/manager/performance/reviews/[id]/complete // Complete review with ratings
```

### Features

#### **A. Performance Review System**
**Page:** `/manager/performance` (admin has manager access)

**Review Workflow:**

1. **Initiate Review**
   - Admin selects employee
   - Chooses review period (Q1 2024, Annual 2024, etc.)
   - System creates review record
   - Employee notified to complete self-rating

2. **Employee Self-Rating**
   - Employee rates themselves (1-5 scale)
   - Categories:
     - Technical Skills
     - Communication
     - Teamwork
     - Initiative
     - Overall Performance

3. **Manager Completes Review**
   - Admin views employee's self-rating
   - Provides manager rating (same categories)
   - Adds comments/feedback
   - Marks as complete

4. **Review Completion**
   - Email sent to employee
   - Review stored permanently
   - Can be referenced in future

**Review Display:**
- Pending Reviews (awaiting employee or manager)
- Completed Reviews (searchable archive)
- Side-by-side comparison (self vs manager rating)

---

## 8️⃣ Payroll Management

### **Pages:**
- `/admin/payroll` - Payroll dashboard

### **API Endpoints:**
```typescript
GET    /api/admin/payroll                 // List all payroll records
POST   /api/admin/payroll                 // Process individual payroll
POST   /api/admin/payroll/bulk-process    // Process bulk payroll for period
POST   /api/admin/payroll/[id]/pay        // Mark payroll as paid
```

### Features

#### **A. Payroll Dashboard**
**Summary Statistics:**
- Total Employees: Count of active employees
- Pending Payments: Sum of unpaid payroll
- Total Paid: Sum of paid payroll this month

**Payroll Records Table:**
- Employee Name & Email
- Period (e.g., "2024-11")
- Base Salary
- Bonuses
- Deductions
- Net Pay
- Status (Pending/Paid)
- Actions

#### **B. Payroll Processing**

**Individual Payroll:**
```typescript
POST /api/admin/payroll
{
  "employeeId": "emp_123",
  "period": "2024-11",
  "baseSalary": 5000,
  "bonuses": 500,
  "deductions": 200
}

Response:
{
  "success": true,
  "payroll": {
    "id": "payroll_456",
    "employeeId": "emp_123",
    "period": "2024-11",
    "baseSalary": 5000,
    "bonuses": 500,
    "deductions": 200,
    "netPay": 5300,
    "processedAt": "2024-11-15T10:30:00Z",
    "paidAt": null
  }
}
```

**Bulk Processing:**
```typescript
POST /api/admin/payroll/bulk-process
{
  "period": "2024-11",
  "departmentId": "dept_789" // optional
}

Flow:
1. Fetches all ACTIVE employees
2. Filters by department (if specified)
3. Checks for existing payroll in period
4. Skips employees already processed
5. Creates payroll records with default salary
6. Returns count of processed vs skipped

Response:
{
  "success": true,
  "processed": 150,
  "skipped": 10,
  "message": "Payroll processed for 150 employees"
}
```

**Mark as Paid:**
```typescript
POST /api/admin/payroll/[id]/pay

Effect:
- Sets paidAt: current timestamp
- Status changes: Pending → Paid
- Employee receives email notification
- Updates payroll reports
```

#### **C. Payslip Generation**
For employees: `/employee/payroll`
- View all payslips
- Download/print payslip
- Detailed breakdown:
  - Base Salary
  - Bonuses
  - Deductions
  - Net Pay
  - Processed Date
  - Paid Date

---

## 9️⃣ Organization Settings

### **Pages:**
- `/admin/organization` - Comprehensive organization management (NEW)
- `/admin/settings` - Development mode toggle

### **API Endpoints:**
```typescript
GET    /api/admin/settings     // Get all tenant settings
PATCH  /api/admin/settings     // Update development mode
PATCH  /api/admin/tenant       // Update all organization settings
```

### Features

#### **A. Organization Management** (`/admin/organization`)
**NEW - Comprehensive 6-Tab Interface:**

##### **Tab 1: General** 📋
Company Information:
- Company Name (editable)
- Industry (Technology, Finance, Healthcare, etc.)
- Company Size (1-10, 11-50, 51-200, 201-500, 501+)
- Website URL
- Description (textarea)

##### **Tab 2: Regional** 🌍
Localization Settings:
- **Timezone:**
  - UTC, ET, CT, MT, PT
  - London, Paris, Tokyo, Shanghai, India

- **Currency:**
  - USD, EUR, GBP, JPY, INR, AUD, CAD

- **Date Format:**
  - MM/DD/YYYY (US)
  - DD/MM/YYYY (EU)
  - YYYY-MM-DD (ISO)
  - DD MMM YYYY (31 Dec 2024)

- **Time Format:**
  - 12-hour (2:30 PM)
  - 24-hour (14:30)

- **Week Starts On:**
  - Sunday
  - Monday

- **Language:**
  - English, Spanish, French, German, Japanese, Chinese

##### **Tab 3: Branding** 🎨
Visual Customization:
- **Primary Color:**
  - Color picker + hex input
  - Default: #6366F1 (Indigo)

- **Secondary Color:**
  - Color picker + hex input
  - Default: #764BA2 (Purple)

- **Custom Domain:**
  - Input field (e.g., yourcompany.zenora.com)
  - Requires support to configure

##### **Tab 4: Subscription** 👥
Plan & Limits (Read-only for now):
- Current Plan (FREE, STARTER, BUSINESS, ENTERPRISE)
- Subscription Status (TRIAL, ACTIVE, SUSPENDED)
- Max Employees limit
- Max Projects limit
- Upgrade prompt

##### **Tab 5: Billing** 💳
Financial Information:
- Billing Email (for invoices)
- Tax ID / VAT Number

##### **Tab 6: Security** 🔒
Access Control:
- **Session Timeout:**
  - Input in seconds
  - Display in minutes
  - Default: 3600s (60 minutes)

- **Require 2FA:**
  - Toggle switch
  - Force all users to enable 2FA

**Save Functionality:**
- Single "Save Changes" button
- Saves all tabs at once
- Toast notification on success/error

#### **B. System Settings** (`/admin/settings`)
**Development Mode Toggle:**

**Production Mode (Default):**
- ✅ Email OTPs sent via SMTP
- ✅ Random 6-digit codes
- ✅ Secure authentication
- ✅ Production-ready

**Development Mode:**
- ⚠️ Email sending disabled
- ⚠️ Static OTP: 123456
- ⚠️ Faster testing
- ⚠️ **NEVER use in production!**

**Toggle Workflow:**
1. Admin clicks "Switch to Development Mode"
2. Confirmation dialog with warnings
3. If confirmed, updates settings
4. Success toast notification
5. Page refreshes to show current mode

**Use Cases for Dev Mode:**
- Local development
- Testing authentication
- Demo environments
- When SMTP not configured

---

## 🔟 Reports & Analytics

### **Pages:**
- `/admin/reports` - Comprehensive reports dashboard

### **API Endpoints:**
```typescript
GET /api/admin/reports/timesheets    // Timesheet report
GET /api/admin/reports/employees     // Employee report
GET /api/admin/reports/revenue       // Revenue report
GET /api/admin/reports/utilization   // Utilization report
```

### Features

#### **A. Reports Dashboard** (`/admin/reports`)

**Report Types:**

##### **1. Timesheets Report**
**Query Parameters:**
- startDate, endDate
- employeeId (optional)
- status (optional: APPROVED, REJECTED, SUBMITTED)

**Data Returned:**
```typescript
{
  entries: [
    {
      date: Date
      employeeName: string
      hours: number
      billable: boolean
      project: string
      status: string
    }
  ],
  summary: {
    totalHours: number
    billableHours: number
    nonBillableHours: number
    employeeCount: number
  }
}
```

**Export:**
- Excel (.xlsx)
- CSV

##### **2. Employee Report**
**Data Includes:**
- Employee demographics
- Department distribution
- Role breakdown
- Employment type stats
- Active vs inactive
- Recent hires
- Attrition rate

**Visualizations:**
- Employee count by department (bar chart)
- Role distribution (pie chart)
- Growth trend (line chart)

##### **3. Revenue Report**
**Metrics:**
- Total revenue (period)
- Revenue by client
- Revenue by project
- Invoice statistics
- Outstanding amounts
- Payment trends

**Filters:**
- Date range
- Client filter
- Project filter

##### **4. Utilization Report**
**Calculates:**
- Employee utilization %
- Department utilization
- Billable vs non-billable ratio
- Overtime hours
- Capacity planning

**Formula:**
```
Utilization % = (Billable Hours / Total Available Hours) × 100
```

#### **B. Export Functionality**
**All reports support:**
- **Excel Export:**
  - Styled headers (indigo background)
  - Auto-fit columns
  - Formatted data

- **CSV Export:**
  - RFC 4180 compliant
  - Proper escaping
  - UTF-8 encoding

**Export Helpers:**
```typescript
// lib/export-helpers.ts
exportToExcel(data, filename, sheetName)
exportToCSV(data, filename)
downloadExcel(data, filename)
downloadCSV(data, filename)
```

---

## 1️⃣1️⃣ User Management

### **Pages:**
- `/admin/users` - User listing and management

### **API Endpoint:**
```typescript
GET /api/users/list  // List all users with roles
```

### Features

#### **User Listing**
**Display Columns:**
- User ID
- Name (First + Last)
- Email
- Role
- Status (ACTIVE, INACTIVE, PENDING)
- Department
- Last Login
- Created Date

**Actions:**
- View user details
- Edit user
- Change role (via employee management)
- Deactivate/Activate
- Reset password (send magic link)

**Filters:**
- Role filter
- Status filter
- Department filter
- Search by name/email

---

## 1️⃣2️⃣ Onboarding Management

### **Pages:**
- `/admin/onboarding` - Onboarding dashboard
- `/admin/onboarding/review/[id]` - Review submission

### **API Endpoints:**
```typescript
GET  /api/admin/onboarding/stats    // Dashboard statistics
GET  /api/hr/onboarding/pending     // Pending submissions (admin has HR access)
POST /api/hr/onboarding/approve     // Approve onboarding
POST /api/hr/onboarding/request-changes // Request changes
```

### Features

#### **A. Onboarding Dashboard**
**Statistics:**
- Pending Reviews: Count
- Approved This Month: Count
- Total Onboarded: All-time count

**Pending Submissions Table:**
- Employee Name
- Email
- Invited By
- Submitted Date
- Status (PENDING, APPROVED, CHANGES_REQUESTED)
- Actions

#### **B. Review Submission** (`/admin/onboarding/review/[id]`)
**Sections to Review:**

1. **Personal Information**
   - Full name
   - Date of birth
   - Gender
   - Nationality

2. **Contact Information**
   - Phone number
   - Personal email
   - Current address
   - Permanent address

3. **Professional Background**
   - Education history
   - Work experience
   - Skills and certifications

4. **Documents**
   - Resume/CV
   - ID proof
   - Address proof
   - Education certificates
   - Previous employment letters

**Review Actions:**

##### **Approve:**
```typescript
POST /api/hr/onboarding/approve
{
  "inviteId": "invite_123"
}

Flow:
1. Updates invite status: PENDING → APPROVED
2. Creates User account (if not exists)
3. Creates Employee record
4. Sends approval email with login instructions
5. Initializes leave balances
6. Adds to default department/team
```

##### **Request Changes:**
```typescript
POST /api/hr/onboarding/request-changes
{
  "inviteId": "invite_123",
  "feedback": "Please upload a clearer copy of your ID"
}

Flow:
1. Updates status: PENDING → CHANGES_REQUESTED
2. Sends email to candidate with feedback
3. Candidate can re-access form
4. Previous data is preserved
5. Re-submits for review
```

---

## 1️⃣3️⃣ System Settings

### **Tenant Configuration**
All tenant-specific settings are in TenantSettings model:

```typescript
model TenantSettings {
  // Basic
  companyName: string
  logoUrl: string?
  timezone: string
  currency: string

  // Policies (JSON)
  workingHours: {
    start: "09:00"
    end: "17:00"
    days: [1, 2, 3, 4, 5] // Monday-Friday
  }

  leavePolicies: {
    annualLeave: 20 days
    sickLeave: 10 days
    carryOver: 5 days max
    accrual: "monthly" | "yearly"
  }

  // Subscription
  subscriptionPlan: "FREE" | "STARTER" | "BUSINESS" | "ENTERPRISE"
  maxEmployees: number
  maxProjects: number
  maxStorage: number (bytes)

  // Branding
  primaryColor: "#6366F1"
  secondaryColor: "#764BA2"
  customDomain: string?

  // Regional
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | etc
  timeFormat: "12h" | "24h"
  weekStartDay: "SUNDAY" | "MONDAY"
  language: "en" | "es" | "fr" | etc

  // Security
  sessionTimeout: 3600 seconds
  require2FA: boolean
  ipWhitelist: string[]?

  // Features (JSON)
  enabledFeatures: {
    timesheets: true
    leave: true
    performance: true
    payroll: true
    invoicing: true
  }
}
```

---

## 🔐 Access Control Matrix

| Feature | ADMIN | MANAGER | HR | ACCOUNTANT | EMPLOYEE |
|---------|-------|---------|----|-----------| ---------|
| **Dashboard Access** | ✅ Full | ✅ Limited | ✅ Limited | ❌ | ❌ |
| **Employee Management** |
| - Create Employee | ✅ | ❌ | ✅ | ❌ | ❌ |
| - Edit Employee | ✅ | ❌ | ✅ | ❌ | ❌ |
| - Deactivate Employee | ✅ | ❌ | ✅ | ❌ | ❌ |
| - Assign Roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| - Bulk Import | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Client Management** |
| - Create Client | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Edit Client | ✅ | ✅ | ❌ | ❌ | ❌ |
| - View All Clients | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Project Management** |
| - Create Project | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Edit Project | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| - Assign Team | ✅ | ✅ (own) | ❌ | ❌ | ❌ |
| **Financial** |
| - Create Invoice | ✅ | ❌ | ❌ | ✅ | ❌ |
| - Send Invoice | ✅ | ❌ | ❌ | ✅ | ❌ |
| - Mark as Paid | ✅ | ❌ | ❌ | ✅ | ❌ |
| - View Revenue Reports | ✅ | ✅ (dept) | ❌ | ✅ | ❌ |
| **Payroll** |
| - Process Payroll | ✅ | ❌ | ❌ | ✅ | ❌ |
| - Bulk Process | ✅ | ❌ | ❌ | ✅ | ❌ |
| - Mark as Paid | ✅ | ❌ | ❌ | ✅ | ❌ |
| - View Payroll | ✅ | ❌ | ❌ | ✅ | ✅ (own) |
| **Leave Management** |
| - Approve Leave | ✅ | ✅ (team) | ✅ | ❌ | ❌ |
| - Reject Leave | ✅ | ✅ (team) | ✅ | ❌ | ❌ |
| - Edit Balances | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Performance** |
| - Create Review | ✅ | ✅ (team) | ❌ | ❌ | ❌ |
| - Complete Review | ✅ | ✅ (team) | ❌ | ❌ | ❌ |
| - View Reviews | ✅ | ✅ (team) | ✅ | ❌ | ✅ (own) |
| **Onboarding** |
| - Invite Employee | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Review Submission | ✅ | ❌ | ✅ | ❌ | ❌ |
| - Approve/Reject | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Reports** |
| - Timesheet Report | ✅ | ✅ (dept) | ✅ | ❌ | ❌ |
| - Employee Report | ✅ | ✅ (dept) | ✅ | ❌ | ❌ |
| - Revenue Report | ✅ | ✅ (dept) | ❌ | ✅ | ❌ |
| - Utilization Report | ✅ | ✅ (dept) | ❌ | ❌ | ❌ |
| - Export to Excel/CSV | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Settings** |
| - Organization Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| - Dev Mode Toggle | ✅ | ❌ | ❌ | ❌ | ❌ |
| - Leave Policies | ✅ | ❌ | ✅ | ❌ | ❌ |
| - Working Hours | ✅ | ❌ | ❌ | ❌ | ❌ |
| - Branding | ✅ | ❌ | ❌ | ❌ | ❌ |
| - Subscription | ✅ (view) | ❌ | ❌ | ❌ | ❌ |

---

## 📋 User Flows

### **Flow 1: Onboard New Employee (Complete)**

```mermaid
Admin → Navigate to /admin/invite-employee
     → Fill form (name, email, department, role)
     → Submit invite

System → Creates OnboardingInvite record
       → Generates unique token
       → Sends email to candidate

Candidate → Clicks link in email
          → Fills onboarding form (4 steps)
          → Uploads documents
          → Submits for review

System → Notifies admin/HR
       → Status: PENDING

Admin → Navigate to /admin/onboarding
      → Click "Review" on pending submission
      → Reviews all information
      → Choice:
         a) Approve → Creates User + Employee → Sends welcome email
         b) Request Changes → Sends feedback email → Candidate re-submits

Employee → Receives approval email
         → Accesses login page
         → Requests OTP
         → Logs in
         → Accesses employee dashboard
```

### **Flow 2: Process Monthly Payroll**

```mermaid
Admin → Navigate to /admin/payroll
      → Click "Process Bulk Payroll"
      → Enter period (e.g., "2024-11")
      → Optionally select department
      → Click "Process Payroll"

System → Fetches all ACTIVE employees
       → Checks for existing payroll in period
       → Skips already processed
       → Creates payroll records with:
          - Base salary (from employee record or default)
          - Bonuses: 0 (admin can edit later)
          - Deductions: 0 (admin can edit later)
          - Net Pay = Base + Bonuses - Deductions
       → Returns summary (150 processed, 10 skipped)

Admin → Reviews payroll list
      → Can edit individual records if needed
      → Marks records as paid when processed:
         - Click "Mark as Paid" for each employee
         - System records payment timestamp
         - Sends payslip email to employee

Employee → Receives email notification
         → Logs into /employee/payroll
         → Views/downloads payslip
```

### **Flow 3: Generate Invoice from Timesheets**

```mermaid
Admin → Navigate to /admin/invoices
      → Click "Generate from Timesheets"
      → Select client
      → Select date range (e.g., Nov 1-30)
      → Enter hourly rate (or use client default)
      → Click "Generate"

System → Fetches all timesheet entries WHERE:
         - clientId matches
         - date in range
         - status = APPROVED
         - isBillable = true
       → Groups entries by project + task
       → Calculates per line item:
         - Hours: sum of hoursWorked
         - Rate: hourlyRate
         - Amount: hours × rate
       → Creates invoice with line items
       → Calculates subtotal, tax, total
       → Status: DRAFT

Admin → Reviews generated invoice
      → Edits if needed (add notes, adjust amounts)
      → Clicks "Send Invoice"

System → Changes status: DRAFT → SENT
       → Generates PDF invoice
       → Sends email to client billing contact
       → Attaches PDF
       → Records send timestamp

Client → Receives invoice
       → Makes payment

Admin → Clicks "Mark as Paid"
      → Enters payment date
      → Optional: payment method/transaction ID

System → Updates status: SENT → PAID
       → Updates revenue reports
```

### **Flow 4: Approve Leave Request**

```mermaid
Employee → Navigate to /employee/leave
         → Click "Request Leave"
         → Fill form:
            - Leave type
            - Start date
            - End date
            - Reason
         → Submit

System → Validates:
         - No overlapping approved leaves
         - Sufficient leave balance
         - Working days calculation
       → Creates LeaveRequest (status: PENDING)
       → Notifies manager/admin

Admin/Manager → Navigate to /manager/leave-approvals
              → Views pending request
              → Reviews:
                 - Employee name
                 - Leave type
                 - Dates (3 days)
                 - Current balance (18 days)
                 - Reason
              → Clicks "Approve" or "Reject"

If Approve:
  System → Uses Prisma transaction:
           - Update LeaveRequest status: PENDING → APPROVED
           - Deduct from LeaveBalance (18 → 15 days)
           - Record approver + timestamp
         → Send approval email to employee
         → Returns success

If Reject:
  Admin → Must enter rejection reason (min 10 chars)

  System → Update LeaveRequest status: PENDING → REJECTED
         → Store rejection reason
         → Send rejection email with reason
         → Leave balance unchanged
```

### **Flow 5: Complete Performance Review**

```mermaid
Admin → Navigate to /manager/performance
      → Click "Create Review"
      → Select employee
      → Enter review period (e.g., "Q4 2024")
      → Submit

System → Creates PerformanceReview record
       → Status: awaiting self-rating
       → Notifies employee

Employee → Receives email
         → Navigate to /employee/performance
         → Click "Complete Self-Rating"
         → Rates self (1-5 scale):
            - Technical Skills: 4
            - Communication: 5
            - Teamwork: 4
            - Initiative: 3
            - Overall: 4
         → Submits

System → Updates review with selfRating
       → Notifies admin/manager

Admin → Navigate to /manager/performance
      → Click "Complete Review" on pending
      → Views side-by-side:
         - Employee Self-Rating (left)
         - Manager Rating (right - empty)
      → Fills manager rating (1-5 scale)
      → Adds comments/feedback (optional)
      → Clicks "Complete Review"

System → Updates review:
         - managerRating: saved
         - comments: saved
         - completedAt: timestamp
       → Sends completion email to employee
       → Review archived

Employee → Receives email
         → Logs in to view complete review
```

---

## 🎯 Summary Statistics

### **Total Admin Features:**
- **21 Pages** (admin-specific)
- **22 API Endpoints** (admin-accessible)
- **14 Major Modules**
- **60+ Actions/Workflows**

### **Core Capabilities:**
1. ✅ Complete employee lifecycle management
2. ✅ Client and project management
3. ✅ Financial operations (invoicing, payroll)
4. ✅ Leave and performance management
5. ✅ Comprehensive reporting and analytics
6. ✅ Organization-wide settings control
7. ✅ Onboarding workflow management
8. ✅ Multi-format data export (Excel, CSV, PDF)

### **Key Strengths:**
- **Multi-tenant Architecture:** Complete data isolation per tenant
- **Role-based Access Control:** Granular permissions
- **Audit Trail:** All actions logged
- **Email Notifications:** Automated for all workflows
- **Data Export:** Excel/CSV for all reports
- **PDF Generation:** Invoices and payslips
- **Responsive Design:** Works on desktop and mobile
- **Real-time Updates:** Dashboard refreshes automatically

### **Integration Points:**
- **Email:** Nodemailer with SMTP (Hostinger configured)
- **Database:** PostgreSQL via Prisma ORM
- **Session:** Redis for session management
- **File Storage:** AWS S3 compatible
- **Authentication:** Magic link (OTP via email)
- **PDF:** jsPDF for document generation
- **Excel:** ExcelJS for spreadsheet export

---

## 🚀 Quick Reference

### **Most Used Admin Routes:**
```
/admin                        → Dashboard
/admin/employees              → Employee list
/admin/clients                → Client list
/admin/projects               → Project list
/admin/invoices               → Invoice management
/admin/payroll                → Payroll processing
/admin/reports                → Reports dashboard
/admin/organization           → Organization settings
/admin/settings               → Dev mode toggle
/admin/onboarding             → Review onboarding
```

### **Critical API Endpoints:**
```
POST /api/admin/employees/create         → Add employee
POST /api/admin/payroll/bulk-process     → Process payroll
POST /api/admin/invoices/generate-from-timesheets → Auto-invoice
PATCH /api/admin/tenant                  → Update org settings
GET /api/admin/reports/*                 → All reports
```

### **Common Workflows:**
1. **Hire Employee:** Invite → Onboard → Review → Approve
2. **Bill Client:** Timesheets → Generate Invoice → Send → Mark Paid
3. **Pay Employees:** Bulk Process → Review → Mark as Paid
4. **Manage Leave:** Review Request → Approve/Reject → Email Sent
5. **Review Performance:** Create → Employee Rates → Manager Rates → Complete

---

**Document Version:** 1.0
**Last Updated:** November 16, 2025
**Prepared for:** Zenora.ai System Documentation
