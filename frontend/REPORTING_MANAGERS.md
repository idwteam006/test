# Reporting Managers - ADD Technologies

**Generated:** 2025-12-04

---

## Organization Hierarchy

```
⭐ Rajesh Kapoor (ADMIN) - Root
└── ⭐ Prakash Rao (ADMIN)
    └── ⭐ Admin Addtech (ADMIN)
        ├── 👔 Tech Lead (MANAGER)
        │   ├── 👤 Anil Kumar (EMPLOYEE)
        │   ├── 👤 Dev Sharma (EMPLOYEE)
        │   ├── 👤 Rahul Verma (EMPLOYEE)
        │   ├── 👤 Priya Singh (EMPLOYEE)
        │   ├── 👤 Amit Patel (EMPLOYEE)
        │   ├── 👤 Neha Gupta (EMPLOYEE)
        │   └── 👔 Vijay Reddy (MANAGER)
        ├── 💼 Bhupathi Kumar (HR)
        │   ├── 📊 Suresh Rao (ACCOUNTANT)
        │   └── 👤 Lakshmi Devi (EMPLOYEE)
        └── 👔 Sneha Iyer (MANAGER)
            ├── 👤 Arjun Nair (EMPLOYEE)
            ├── 👔 Ravi Krishnan (MANAGER)
            │   └── 👤 Divya Menon (EMPLOYEE)
            └── 👔 Kiran Sharma (MANAGER)
                ├── 👤 Meera Joshi (EMPLOYEE)
                ├── 👤 Sanjay Mishra (EMPLOYEE)
                └── 👤 Pooja Agarwal (EMPLOYEE)
```

---

## Reporting Managers List

| # | Manager | Role | Email | Department | Reports To | Direct Reports |
|---|---------|------|-------|------------|------------|----------------|
| 1 | Rajesh Kapoor | ADMIN | admin1@addtechno.com | Administration | None (Root) | 1 |
| 2 | Prakash Rao | ADMIN | admin4@addtechno.com | Administration | Rajesh Kapoor | 1 |
| 3 | Admin Addtech | ADMIN | info@addtechno.com | Administration | Prakash Rao | 3 |
| 4 | Tech Lead | MANAGER | tech@addtechno.com | Engineering | Admin Addtech | 7 |
| 5 | Bhupathi Kumar | HR | bhupathi@addtechno.com | Human Resources | Admin Addtech | 2 |
| 6 | Sneha Iyer | MANAGER | sneha.pm@addtechno.com | Product | Admin Addtech | 3 |
| 7 | Ravi Krishnan | MANAGER | ravi.sales@addtechno.com | Sales | Sneha Iyer | 1 |
| 8 | Kiran Sharma | MANAGER | kiran.ops@addtechno.com | Operations | Sneha Iyer | 3 |

**Total Reporting Managers:** 8

---

## Unassigned Employees (Not in Org Chart)

These employees have no manager AND no subordinates:

| # | Name | Role | Email | Department |
|---|------|------|-------|------------|
| 1 | Sunita Sharma | ADMIN | admin2@addtechno.com | Administration |
| 2 | Vinod Mehta | ADMIN | admin3@addtechno.com | Administration |
| 3 | Anjali Verma | ADMIN | admin5@addtechno.com | Administration |

**Total Unassigned:** 3

---

## Summary Statistics

- **Total Employees:** 25
- **Reporting Managers:** 8
- **Unassigned (not in org chart):** 3
- **In Hierarchy (have manager):** 21

### By Role
- ADMIN: 6
- MANAGER: 5
- HR: 1
- ACCOUNTANT: 1
- EMPLOYEE: 12

### By Department
- Administration: 6
- Engineering: 8
- Human Resources: 1
- Finance: 2
- Product: 2
- Sales: 2
- Marketing: 1
- Operations: 1
- Customer Support: 1
- Data & Analytics: 2

---

## Scripts Reference

### Check Organization Tree
```bash
cd frontend && npx tsx scripts/check-org-tree.ts
```

### Update Hierarchy
```bash
cd frontend && npx tsx scripts/update-hierarchy.ts
```

### Generate Organization Report
```bash
cd frontend && npx tsx scripts/generate-org-tree.ts
```

---

## Role Icons Legend

| Icon | Role |
|------|------|
| ⭐ | ADMIN |
| 👔 | MANAGER |
| 💼 | HR |
| 📊 | ACCOUNTANT |
| 👤 | EMPLOYEE |

EWd7SFYNDA5jlXaa