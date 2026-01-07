# CSV Import Templates - Download Guide

This directory contains templates and reference files for bulk importing system users.

---

## 📥 Files Available for Download

### 1. **system-users-import-template.csv** ⭐ (START HERE)
**Purpose:** Ready-to-use template for bulk importing users

**What's inside:**
- Pre-formatted CSV with correct column headers
- 5 sample rows showing different user roles
- Empty template ready for your data

**How to use:**
1. Download this file
2. Open in Excel/Google Sheets
3. Replace sample data with your employees
4. Get department IDs (see instructions below)
5. Upload via `/admin/system-users` → "Import CSV"

**Direct download:** `/templates/system-users-import-template.csv`

---

### 2. **departments-and-job-titles-reference.csv** 📚 (REFERENCE)
**Purpose:** Complete reference of all 12 departments and 110+ job titles

**What's inside:**
- Department names
- Job titles organized by department
- Typical role assignments (ADMIN, MANAGER, EMPLOYEE, HR, ACCOUNTANT)
- Seniority levels (Executive, Senior, Mid-Level, Junior)

**How to use:**
1. Download this file
2. Browse job titles for your organization
3. Copy relevant job titles to your import CSV
4. Use as reference when creating employee records

**Direct download:** `/templates/departments-and-job-titles-reference.csv`

**Columns:**
- `Department` - Department name
- `Job Title` - Position title
- `Typical Role` - Suggested system role
- `Seniority Level` - Career level

---

### 3. **addtechno-sample-import.csv** 🎯 (EXAMPLE)
**Purpose:** Real-world example with 20 employees for AddTechno.com

**What's inside:**
- Complete organizational hierarchy
- CEO, managers, and employees
- Realistic job titles and structure
- Shows proper CSV formatting

**How to use:**
- Study the structure
- See how managers are linked to employees
- Understand the CSV format
- Use as inspiration for your own import

**Direct download:** `/templates/addtechno-sample-import.csv`

---

### 4. **README.md** 📖 (INSTRUCTIONS)
**Purpose:** Detailed instructions for CSV import process

**What's inside:**
- How to get Department IDs
- How to get Manager IDs
- Field explanations
- Common mistakes
- Troubleshooting guide

**Direct download:** `/templates/README.md`

---

## 🚀 Quick Start Guide

### Step 1: Download the Template
Download **system-users-import-template.csv**

### Step 2: Get Your Department IDs

**Option A - Browser Console (Easiest):**
1. Login to your admin account
2. Open browser console (F12)
3. Run this code:

```javascript
fetch('/api/admin/departments')
  .then(r => r.json())
  .then(data => {
    console.log('=== DEPARTMENTS ===');
    data.data.forEach(d => {
      console.log(`${d.name}: ${d.id}`);
    });
  });
```

**Option B - API Call:**
```bash
curl http://localhost:3000/api/admin/departments \
  -H "Cookie: session=YOUR_SESSION"
```

### Step 3: Choose Job Titles
Open **departments-and-job-titles-reference.csv** to see all available job titles organized by department.

### Step 4: Fill Your CSV

Example structure:
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
ceo@company.com,John,Smith,ADMIN,Chief Executive Officer,,
jane@company.com,Jane,Doe,EMPLOYEE,Software Engineer,DEPT_UUID,MANAGER_UUID
```

**Important:**
- Use actual UUID for `departmentId` (from Step 2)
- Use User UUID for `managerId` (NOT employee number)
- Leave empty fields as blank (e.g., `,,`)

### Step 5: Upload
1. Go to `/admin/system-users`
2. Click "Import CSV" or "Bulk Import"
3. Select your filled CSV file
4. Review import results

---

## 📋 12 Default Departments

Your system includes these departments by default:

1. **Engineering** - Development, Architecture, Technical
2. **Product** - Product Management, Design, UX/UI
3. **Sales** - Sales, Business Development, Accounts
4. **Marketing** - Marketing, SEO, Social Media, Growth
5. **Human Resources** - HR, Recruitment, Payroll
6. **Finance** - Accounting, Financial Planning
7. **Operations** - Business Operations, Processes
8. **Customer Support** - Support, Customer Success
9. **Data & Analytics** - Data Science, Analytics, BI
10. **DevOps** - Infrastructure, Cloud, SRE
11. **QA & Testing** - Quality Assurance, Testing
12. **Administration** - Executive, Administrative

---

## 🎓 Job Title Examples by Department

### Engineering (28 titles)
Software Engineer, Senior Software Engineer, Engineering Manager, CTO, Full Stack Developer, Frontend Developer, Backend Developer, DevOps Engineer, etc.

### Sales (15 titles)
Sales Executive, Account Manager, Sales Manager, Business Development Manager, etc.

### Marketing (14 titles)
Marketing Manager, Digital Marketing Specialist, SEO Specialist, Social Media Manager, etc.

### Human Resources (12 titles)
HR Manager, HR Executive, Recruiter, Payroll Specialist, etc.

### Finance (11 titles)
Accountant, Finance Manager, CFO, Financial Analyst, etc.

**[Download departments-and-job-titles-reference.csv for complete list]**

---

## 🔧 CSV Format Requirements

### Required Fields
- `email` - Valid email address
- `firstName` - 1-100 characters
- `lastName` - 1-100 characters
- `role` - Must be: ADMIN, MANAGER, EMPLOYEE, HR, or ACCOUNTANT

### Optional Fields
- `jobTitle` - Max 200 characters (creates Employee record if provided with departmentId)
- `departmentId` - UUID format (required for Employee record)
- `managerId` - User UUID (not Employee Number)

### Role Descriptions
- **ADMIN** - Full system access, executives, department heads
- **MANAGER** - Team management, approvals, reports
- **EMPLOYEE** - Standard employee access
- **HR** - Human resources functions, recruitment
- **ACCOUNTANT** - Financial access, accounting

---

## 📌 Important Notes

### ✅ DO:
- Use uppercase for roles (ADMIN, not admin)
- Use User UUID for managerId
- Leave empty fields blank (,,)
- Include both jobTitle AND departmentId to create Employee record
- Download reference file for job title ideas

### ❌ DON'T:
- Use Employee Number as managerId
- Use lowercase roles
- Mix up departmentId and managerId
- Exceed 100 users per upload
- Include duplicate emails

---

## 🆘 Need Help?

1. **Getting Department IDs:** See Step 2 above
2. **Getting Manager IDs:** Run the browser console script in README.md
3. **Job Title Ideas:** Open departments-and-job-titles-reference.csv
4. **Format Questions:** Check system-users-import-template.csv
5. **Real Example:** See addtechno-sample-import.csv

---

## 📞 Support

For additional help:
1. Check the full [BULK_IMPORT_GUIDE.md](../../BULK_IMPORT_GUIDE.md)
2. Review [README.md](./README.md) in this directory
3. Contact your system administrator
4. Test with 1-2 users first

---

**Ready to import?** Download **system-users-import-template.csv** and get started! 🚀
