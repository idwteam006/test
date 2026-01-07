# Department IDs and Job Titles Reference

## How to Get Your Department IDs

### Method 1: Database Query (Most Accurate)
Run this SQL query in your database:

```sql
SELECT id, name, "tenantId" 
FROM "Department" 
WHERE "tenantId" = 'YOUR_TENANT_ID'
ORDER BY name;
```

### Method 2: API Call
```bash
curl http://localhost:3000/api/admin/departments \
  -H "Cookie: session=YOUR_SESSION_ID"
```

### Method 3: Browser Console (Easiest)
Open browser console on any admin page and run:

```javascript
fetch('/api/admin/departments')
  .then(r => r.json())
  .then(data => {
    console.log('=== DEPARTMENTS ===');
    console.table(data.data.map(d => ({
      Name: d.name,
      ID: d.id
    })));
  });
```

---

## Default Departments (from seed.ts)

Based on your seed file, these departments should exist:

1. Engineering
2. Product
3. Sales
4. Marketing
5. Human Resources
6. Finance
7. Operations
8. Customer Support
9. Data & Analytics
10. DevOps
11. QA & Testing
12. Administration

---

## Common Job Titles by Department

### Engineering Department
- Chief Technology Officer (CTO)
- VP of Engineering
- Engineering Manager
- Senior Software Engineer
- Software Engineer
- Junior Software Engineer
- Full Stack Developer
- Frontend Developer
- Backend Developer
- Mobile Developer
- Staff Engineer
- Principal Engineer
- Lead Engineer
- Software Architect
- Solutions Architect

### Product Department
- Chief Product Officer (CPO)
- VP of Product
- Product Manager
- Senior Product Manager
- Associate Product Manager
- Product Owner
- Product Designer
- UX Designer
- UI Designer
- Product Analyst

### Sales Department
- Chief Sales Officer (CSO)
- VP of Sales
- Sales Manager
- Senior Sales Executive
- Sales Executive
- Account Executive
- Business Development Manager
- Sales Representative
- Account Manager
- Inside Sales Representative

### Marketing Department
- Chief Marketing Officer (CMO)
- VP of Marketing
- Marketing Manager
- Digital Marketing Manager
- Content Marketing Manager
- SEO Specialist
- Digital Marketing Specialist
- Marketing Executive
- Social Media Manager
- Brand Manager
- Growth Marketing Manager

### Human Resources Department
- Chief Human Resources Officer (CHRO)
- VP of Human Resources
- HR Manager
- Head of Human Resources
- Senior HR Manager
- HR Executive
- HR Business Partner
- Talent Acquisition Manager
- Recruiter
- HR Generalist
- Payroll Specialist

### Finance Department
- Chief Financial Officer (CFO)
- VP of Finance
- Finance Manager
- Senior Accountant
- Accountant
- Junior Accountant
- Financial Analyst
- Controller
- Finance Executive
- Accounts Payable Specialist
- Accounts Receivable Specialist

### Operations Department
- Chief Operating Officer (COO)
- VP of Operations
- Operations Manager
- Operations Executive
- Business Operations Manager
- Process Manager
- Project Manager

### Customer Support Department
- VP of Customer Success
- Customer Support Manager
- Customer Support Lead
- Senior Customer Support Executive
- Customer Support Executive
- Customer Success Manager
- Technical Support Engineer
- Support Specialist

### Data & Analytics Department
- Chief Data Officer (CDO)
- VP of Data
- Data Science Manager
- Senior Data Scientist
- Data Scientist
- Data Analyst
- Business Intelligence Analyst
- Analytics Manager

### DevOps Department
- VP of DevOps
- DevOps Manager
- Senior DevOps Engineer
- DevOps Engineer
- Site Reliability Engineer (SRE)
- Infrastructure Engineer
- Cloud Engineer

### QA & Testing Department
- QA Manager
- QA Lead
- Senior QA Engineer
- QA Engineer
- Test Automation Engineer
- Quality Assurance Analyst
- Test Engineer

### Administration Department
- Chief Executive Officer (CEO)
- Chief Administrator
- Office Manager
- Administrative Manager
- Executive Assistant
- Administrative Assistant
- Receptionist

---

## CSV Format Example

```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
john.doe@company.com,John,Doe,EMPLOYEE,Senior Software Engineer,DEPT_UUID_HERE,MANAGER_UUID_HERE
```

### Important Notes:

1. **Department ID Format:** UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)
2. **Manager ID Format:** User UUID (NOT Employee Number)
3. **Role Values:** ADMIN, MANAGER, EMPLOYEE, HR, ACCOUNTANT
4. **Job Title:** Free text (max 200 characters)

---

## Quick Reference: Get Your Actual IDs

Run this in your browser console while logged in as admin:

```javascript
// Get both departments and managers in one go
Promise.all([
  fetch('/api/admin/departments').then(r => r.json()),
  fetch('/api/admin/system-users').then(r => r.json())
]).then(([depts, users]) => {
  console.log('\n=== COPY THIS FOR YOUR CSV ===\n');
  
  console.log('DEPARTMENTS:');
  depts.data.forEach(d => {
    console.log(`${d.name}: ${d.id}`);
  });
  
  console.log('\nMANAGERS:');
  users.data.users
    .filter(u => u.role === 'ADMIN' || u.role === 'MANAGER')
    .forEach(m => {
      console.log(`${m.firstName} ${m.lastName} (${m.role}): ${m.id}`);
    });
});
```

---

## Example CSV with Real Structure

```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
ceo@company.com,John,Smith,ADMIN,Chief Executive Officer,,
cto@company.com,Jane,Doe,ADMIN,Chief Technology Officer,ENGINEERING_DEPT_ID,
eng.manager@company.com,Bob,Johnson,MANAGER,Engineering Manager,ENGINEERING_DEPT_ID,CTO_USER_ID
dev1@company.com,Alice,Brown,EMPLOYEE,Senior Software Engineer,ENGINEERING_DEPT_ID,ENG_MANAGER_USER_ID
dev2@company.com,Charlie,Wilson,EMPLOYEE,Frontend Developer,ENGINEERING_DEPT_ID,ENG_MANAGER_USER_ID
```

Replace:
- `ENGINEERING_DEPT_ID` → Actual Engineering department UUID
- `CTO_USER_ID` → Actual CTO user UUID
- `ENG_MANAGER_USER_ID` → Actual Engineering Manager user UUID
