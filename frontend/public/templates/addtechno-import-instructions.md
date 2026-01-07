# AddTechno.com Sample Import - Instructions

## File: `addtechno-sample-import.csv`

This file contains 20 sample employees ready for import into your AddTechno.com organization.

## Employee Breakdown

### By Role:
- **ADMIN**: 2 employees (CEO, CTO)
- **HR**: 1 employee (HR Head)
- **ACCOUNTANT**: 1 employee (Finance Manager)
- **MANAGER**: 3 employees (Engineering, Sales, Marketing Managers)
- **EMPLOYEE**: 13 employees (Developers, QA, Sales, Support, etc.)

### By Department (you need to assign):
- **Engineering**: 4 employees (Arjun, Kavya, Rahul, Deepak)
- **QA & Testing**: 2 employees (Neha, Sanjay)
- **Product/Design**: 1 employee (Pooja)
- **Sales**: 2 employees (Anil, Ritu)
- **Marketing**: 1 employee (Manish)
- **Human Resources**: 2 employees (HR Head + Swati)
- **Finance**: 1 employee (Finance Head)
- **Customer Support**: 2 employees (Karan, Divya)
- **Administration**: 2 employees (CEO, CTO)

---

## Before Importing: Get Your Department & Manager IDs

### Step 1: Get Department IDs

Open browser console (F12) on your admin page and run:

```javascript
fetch('/api/admin/departments')
  .then(r => r.json())
  .then(d => {
    console.log('\n=== DEPARTMENT IDs ===\n');
    d.data.forEach(dept => {
      console.log(`${dept.name}: ${dept.id}`);
    });

    // Create a mapping object for easy copy-paste
    const mapping = {};
    d.data.forEach(dept => {
      mapping[dept.name] = dept.id;
    });
    console.log('\n=== Copy this mapping ===');
    console.log(JSON.stringify(mapping, null, 2));
  });
```

### Step 2: Update CSV with Department IDs

Once you have the department IDs, update the CSV:

**Example:**
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
arjun.dev@addtechno.com,Arjun,Nair,EMPLOYEE,Senior Full Stack Developer,<ENGINEERING-DEPT-UUID>,<ENGINEERING-MANAGER-UUID>
```

### Step 3: Suggested Department Assignments

Here's a mapping guide:

| Employee Email | Department | Manager |
|----------------|------------|---------|
| ceo@addtechno.com | Administration | (none) |
| cto@addtechno.com | Engineering | (none) |
| hr.head@addtechno.com | Human Resources | CEO |
| finance.head@addtechno.com | Finance | CEO |
| eng.manager@addtechno.com | Engineering | CTO |
| sales.manager@addtechno.com | Sales | CEO |
| marketing.manager@addtechno.com | Marketing | CEO |
| arjun.dev@addtechno.com | Engineering | Engineering Manager |
| kavya.dev@addtechno.com | Engineering | Engineering Manager |
| rahul.dev@addtechno.com | Engineering | Engineering Manager |
| deepak.devops@addtechno.com | DevOps | Engineering Manager |
| neha.qa@addtechno.com | QA & Testing | Engineering Manager |
| sanjay.qa@addtechno.com | QA & Testing | Engineering Manager |
| pooja.designer@addtechno.com | Product | Engineering Manager |
| anil.sales@addtechno.com | Sales | Sales Manager |
| ritu.sales@addtechno.com | Sales | Sales Manager |
| manish.marketing@addtechno.com | Marketing | Marketing Manager |
| swati.hr@addtechno.com | Human Resources | HR Head |
| karan.support@addtechno.com | Customer Support | Sales Manager |
| divya.support@addtechno.com | Customer Support | Sales Manager |

---

## Quick Update Script

Use this script to help update the CSV with IDs:

```javascript
// 1. First, get department IDs
const depts = await fetch('/api/admin/departments').then(r => r.json());
const deptMap = {};
depts.data.forEach(d => { deptMap[d.name] = d.id; });

// 2. Get manager IDs (after importing managers first)
const users = await fetch('/api/admin/system-users').then(r => r.json());
const managerMap = {};
users.data.users.forEach(u => {
  const key = `${u.firstName.toLowerCase()}.${u.role.toLowerCase()}@addtechno.com`;
  managerMap[key] = u.id;
});

// 3. Print the mappings
console.log('Department IDs:', deptMap);
console.log('Manager IDs:', managerMap);
```

---

## Import Strategy (Recommended)

To avoid manager ID issues, import in phases:

### Phase 1: Import Leadership (No Department/Manager Required)
```csv
ceo@addtechno.com,Rajesh,Kumar,ADMIN,Chief Executive Officer,,
cto@addtechno.com,Priya,Sharma,ADMIN,Chief Technology Officer,,
hr.head@addtechno.com,Amit,Patel,HR,Head of Human Resources,,
finance.head@addtechno.com,Sneha,Reddy,ACCOUNTANT,Finance Manager,,
```

### Phase 2: Import Managers (With Department, Manager = CEO/CTO)
After Phase 1, get the CEO's user ID and update:
```csv
eng.manager@addtechno.com,Vikram,Singh,MANAGER,Engineering Manager,<ENG-DEPT-ID>,<CTO-USER-ID>
sales.manager@addtechno.com,Ananya,Iyer,MANAGER,Sales Manager,<SALES-DEPT-ID>,<CEO-USER-ID>
marketing.manager@addtechno.com,Rohan,Desai,MANAGER,Marketing Manager,<MARKETING-DEPT-ID>,<CEO-USER-ID>
```

### Phase 3: Import All Employees (With Department & Manager IDs)
After Phase 2, get all manager IDs and update:
```csv
arjun.dev@addtechno.com,Arjun,Nair,EMPLOYEE,Senior Full Stack Developer,<ENG-DEPT-ID>,<ENG-MANAGER-USER-ID>
kavya.dev@addtechno.com,Kavya,Menon,EMPLOYEE,Frontend Developer,<ENG-DEPT-ID>,<ENG-MANAGER-USER-ID>
...
```

---

## Alternative: Import Without Department IDs

If you want to import quickly without setting up departments:

1. Remove `departmentId` and `managerId` columns (leave empty)
2. Import all users
3. Assign departments and managers later through the UI

**Simple CSV:**
```csv
email,firstName,lastName,role,jobTitle,departmentId,managerId
ceo@addtechno.com,Rajesh,Kumar,ADMIN,Chief Executive Officer,,
cto@addtechno.com,Priya,Sharma,ADMIN,Chief Technology Officer,,
arjun.dev@addtechno.com,Arjun,Nair,EMPLOYEE,Senior Full Stack Developer,,
```

---

## Testing the Import

1. **Start small**: Import 2-3 users first to test
2. **Check results**: Review the import report for any errors
3. **Verify in UI**: Check `/admin/system-users` to see imported users
4. **Import remaining**: Once confident, import the rest

---

## After Import

All users will:
- ✅ Receive welcome emails
- ✅ Have status set to `ACTIVE`
- ✅ Have auto-generated employee numbers (if jobTitle + departmentId provided)
- ✅ Be able to login via passwordless authentication

---

## Need Help?

If you encounter issues:
1. Check the import report for specific error messages
2. Verify email domain `addtechno.com` is whitelisted
3. Ensure department IDs are correct UUIDs
4. Ensure manager IDs are User IDs (not Employee Numbers)

Happy importing! 🚀
