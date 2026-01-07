# Manager Team Assignment Guide

**Feature:** Simple Manager-Employee Assignment (Option 1)
**Status:** ✅ READY TO USE
**Date:** 2025-11-16

---

## 🎯 Overview

This guide shows you how to assign employees to managers so they appear in the manager's team dashboard.

**How It Works:**
- Admin assigns employees to a manager via "Reporting Manager" field
- Manager sees all direct reports in `/manager/team` dashboard
- Based on Employee.managerId relationship

---

## 📋 Step-by-Step: Assign Employees to Manager

### **Scenario:** Assign Amy Barnes to Bhupathi HR (Manager)

### **Step 1: Login as Admin**
```
URL: http://localhost:3000/auth/login
Email: Your admin email
```

### **Step 2: Go to Employees Page**
```
Navigate to: /admin/employees
Or click: "Employees" in the left sidebar
```

### **Step 3: Find Amy Barnes**
```
- Scroll through the employee list
- Or use the search box to find "Amy Barnes"
```

### **Step 4: Click "Assign Role" Button**
```
- Purple button with shield icon
- Located on the right side of Amy's card
```

### **Step 5: Fill the Assignment Dialog**

**Dialog will show 5 sections:**

1. **User Role**
   - Keep as: `EMPLOYEE`
   - (This is for system permissions)

2. **Job Designation**
   - Current: "Data Analyst"
   - (This is Amy's job title)

3. **Department**
   - Select: Engineering (or appropriate department)
   - This groups employees by department

4. **Reporting Manager** ⭐ **IMPORTANT!**
   - Select: "Bhupathi HR - Manager"
   - This assigns Amy to report to Bhupathi
   - **This is the key field that makes her appear in Bhupathi's team!**

5. **Team Memberships**
   - Leave empty (we're not using teams for now)

### **Step 6: Click "Update"**
```
- Green "Update" button at bottom
- Wait for success message: "Employee updated successfully"
```

### **Step 7: Repeat for Other Employees**

Assign more employees to Bhupathi:

```
Andrew Campbell
├── Reporting Manager: Bhupathi HR
└── Department: Engineering

Angela Bell
├── Reporting Manager: Bhupathi HR
└── Department: QA

Ashley Howard
├── Reporting Manager: Bhupathi HR
└── Department: Engineering
```

---

## 👀 Manager View: Bhupathi's Dashboard

### **Step 1: Bhupathi Logs In**
```
URL: http://localhost:3000/auth/login
Email: bhupathi's email
Role: MANAGER
```

### **Step 2: Navigate to Team Page**
```
Go to: /manager/team
Or click: "My Team" in the sidebar
```

### **Step 3: See Direct Reports**

**Bhupathi will see:**
```
MY TEAM
├── Amy Barnes - Data Analyst
│   └── amy.barnes@demo.com
│   └── Department: Engineering
│
├── Andrew Campbell - Software Engineer
│   └── andrew.campbell@demo.com
│   └── Department: Engineering
│
├── Angela Bell - QA Engineer
│   └── angela.bell@demo.com
│   └── Department: QA
│
└── Ashley Howard - Senior Developer
    └── ashley.howard@demo.com
    └── Department: Engineering

STATISTICS:
- Total Members: 4
- Active: 4
- On Leave Today: 0
- Pending Tasks: 0
```

---

## 🔍 How It Works Under the Hood

### **Database Structure:**

```sql
-- User Table
User {
  id: "user-amy-123"
  firstName: "Amy"
  lastName: "Barnes"
  role: "EMPLOYEE"  -- System role
}

-- Employee Table (the key table!)
Employee {
  id: "emp-amy-456"
  userId: "user-amy-123"
  managerId: "emp-bhupathi-789"  ← Points to Bhupathi's Employee.id
  jobTitle: "Data Analyst"
  departmentId: "dept-engineering"
}

-- When Bhupathi views /manager/team:
SELECT * FROM Employee
WHERE managerId = 'emp-bhupathi-789'
  AND tenantId = 'current-tenant'
```

### **API Query:**

```typescript
// /api/manager/team/route.ts

// 1. Get current manager's employee record
const manager = await prisma.user.findUnique({
  where: { id: sessionData.userId },
  include: { employee: true }
});

// 2. Find all employees who report to this manager
const directReports = await prisma.employee.findMany({
  where: {
    managerId: manager.employee.id,  // Key filter!
    tenantId: manager.tenantId
  },
  include: {
    user: true  // Get user details (name, email, etc.)
  }
});

// 3. Return list to manager dashboard
```

---

## 📊 Visual Flow Diagram

```
┌─────────────────────────────────────────────┐
│           ADMIN ASSIGNS                      │
│  Amy Barnes → Reporting Manager: Bhupathi   │
└─────────────────────────────────────────────┘
                    ↓
        ┌──────────────────────┐
        │  Database Update     │
        │  Employee.managerId  │
        │  = Bhupathi's ID     │
        └──────────────────────┘
                    ↓
        ┌──────────────────────┐
        │  Bhupathi logs in    │
        │  Goes to /manager    │
        └──────────────────────┘
                    ↓
        ┌──────────────────────┐
        │  API queries:        │
        │  WHERE managerId =   │
        │  Bhupathi's emp.id   │
        └──────────────────────┘
                    ↓
        ┌──────────────────────┐
        │  Dashboard shows:    │
        │  - Amy Barnes        │
        │  - Andrew Campbell   │
        │  - Angela Bell       │
        │  - Ashley Howard     │
        └──────────────────────┘
```

---

## ✅ What Changed in the Fix

### **Before (Broken):**
```typescript
// Old API - showed by department only
const members = await prisma.user.findMany({
  where: {
    departmentId: manager.departmentId  // Only department filter
  }
});
```

### **After (Fixed):**
```typescript
// New API - shows by manager assignment
const employees = await prisma.employee.findMany({
  where: {
    managerId: manager.employee.id  // Direct reports only!
  }
});
```

---

## 🚀 Quick Test

### **1. Assign One Employee**
```
Admin → /admin/employees → Amy Barnes
→ Assign Role
→ Reporting Manager: Bhupathi HR
→ Update
```

### **2. Check Manager View**
```
Bhupathi → Login
→ /manager/team
→ Should see: Amy Barnes in the list!
```

### **3. Verify**
```
✅ Amy appears in Bhupathi's team
✅ Count shows: 1 member
✅ Department shows correctly
✅ Job title displays
```

---

## 🎨 UI Features

### **Manager Dashboard Shows:**

1. **Team Member Cards**
   - Avatar (initials if no photo)
   - Full name
   - Email address
   - Employee ID
   - Job title
   - Department
   - Status badge (Active/Inactive)

2. **Statistics**
   - Total team members
   - Active members
   - On leave today
   - Pending tasks

3. **Filters**
   - Search by name/email
   - Filter by department
   - Filter by status

4. **View Modes**
   - Grid view (cards)
   - List view (table)
   - Tree view (org chart)

---

## ❓ FAQ

### **Q: Can an employee have multiple managers?**
**A:** No, each employee has ONE reporting manager. This is a hierarchical structure.

### **Q: Can a manager see their manager's team?**
**A:** No, managers only see their direct reports (employees where managerId = their ID).

### **Q: What if I don't assign a manager?**
**A:** The employee will have `managerId = null` and won't appear in any manager's team view.

### **Q: Can admins see all employees?**
**A:** Yes, admins can see all employees in their department or all employees if no department is set.

### **Q: How do I unassign an employee from a manager?**
**A:** Go to Assign Role dialog → Reporting Manager → Select "None" → Update

### **Q: What happens when a manager is deleted?**
**A:** Their direct reports will have `managerId = null` and need to be reassigned.

---

## 🔧 Troubleshooting

### **Problem: Manager sees no team members**

**Possible causes:**
1. ✅ Employees not assigned to manager
   - Solution: Assign via "Reporting Manager" field

2. ✅ Manager doesn't have Employee record
   - Solution: Check if manager has employee record in database

3. ✅ Wrong tenant
   - Solution: Verify all users are in same tenant

### **Problem: Employee not appearing in list**

**Checks:**
```sql
-- Check employee's managerId
SELECT * FROM Employee WHERE userId = 'amy-user-id';

-- Check manager's employee ID
SELECT * FROM Employee WHERE userId = 'bhupathi-user-id';

-- Verify they match
-- Employee.managerId should equal Manager.Employee.id
```

---

## 📝 Best Practices

### **1. Organizational Structure**
```
CEO
├── Engineering Manager (Bhupathi)
│   ├── Frontend Dev (Amy)
│   ├── Backend Dev (Andrew)
│   └── QA Engineer (Angela)
├── Sales Manager (Mike)
│   └── Sales Rep (Sarah)
└── HR Manager (Linda)
    └── HR Coordinator (Tom)
```

### **2. Assign in Order**
1. Create departments first
2. Assign managers to departments
3. Assign employees to managers
4. Assign employees to departments

### **3. Keep It Simple**
- One manager per employee
- Clear reporting lines
- Match departments with manager's department

---

## 🎯 Summary

**Simple 3-Step Process:**

1. **Admin** → `/admin/employees` → **Assign Role**
2. **Select** → **Reporting Manager** → **Bhupathi HR**
3. **Manager** → `/manager/team` → **Sees direct reports**

**That's it!** ✅

No teams needed. No complex setup. Just assign and view.

---

**Status:** ✅ WORKING
**Last Updated:** 2025-11-16
**API Fixed:** `/api/manager/team/route.ts`
