# 🔐 Authentication System - Quick Reference

**Last Updated**: 2025-10-09

---

## 🎯 Roles

| Role | Access Level | Default Route |
|------|--------------|---------------|
| **ADMIN** | Full system access | `/dashboard` |
| **MANAGER** | Team management | `/dashboard` |
| **ACCOUNTANT** | Financial management | `/invoices` |
| **EMPLOYEE** | Personal workspace | `/timesheets` |

---

## 🔗 API Endpoints

```bash
# Login
POST /api/auth/login
Body: { email, password }

# Signup
POST /api/auth/signup
Body: { email, password, name, organizationName }

# Logout
POST /api/auth/logout

# Refresh Token
POST /api/auth/refresh

# Get Current User
GET /api/auth/me
```

---

## 💻 Frontend Pages

```
/login          - Login page
/signup         - Signup page
/dashboard      - Role-based dashboard
/unauthorized   - Access denied page
```

---

## 🛡️ Protect Routes

```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/rbac';
import { Role } from '@prisma/client';

// By Permission
<ProtectedRoute requiredPermission={Permission.VIEW_USERS}>
  <UsersList />
</ProtectedRoute>

// By Role
<ProtectedRoute requiredRole={Role.ADMIN}>
  <AdminPanel />
</ProtectedRoute>
```

---

## 🔐 Check Permissions

```typescript
import { hasPermission, Permission } from '@/lib/rbac';
import { Role } from '@prisma/client';

// Check permission
if (hasPermission(Role.ADMIN, Permission.VIEW_USERS)) {
  // User has permission
}

// Check any permission
if (hasAnyPermission(role, [Permission.VIEW_USERS, Permission.EDIT_USERS])) {
  // User has at least one permission
}

// Check all permissions
if (hasAllPermissions(role, [Permission.VIEW_USERS, Permission.EDIT_USERS])) {
  // User has all permissions
}
```

---

## 📊 Role Permissions Summary

### ADMIN
- ✅ Everything

### MANAGER
- ✅ View all employees
- ✅ Approve timesheets/leave
- ✅ Manage team performance
- ✅ Create/edit projects
- ✅ Generate reports

### ACCOUNTANT
- ✅ Manage invoices
- ✅ Process payroll
- ✅ View all employees
- ✅ Financial reports

### EMPLOYEE
- ✅ Own timesheets
- ✅ Request leave
- ✅ View own data
- ✅ View assigned projects

---

## 🔑 Tokens

| Token | Expiry | Storage | Purpose |
|-------|--------|---------|---------|
| Access Token | 15 min | httpOnly cookie | API authentication |
| Refresh Token | 7 days | httpOnly cookie | Renew access token |

---

## 🧪 Test Authentication

```typescript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@demo.com',
    password: 'Demo@123',
  }),
});

// Get user
const user = await fetch('/api/auth/me');
const data = await user.json();
console.log(data.data.role); // ADMIN, MANAGER, EMPLOYEE, ACCOUNTANT

// Logout
await fetch('/api/auth/logout', { method: 'POST' });
```

---

## 📁 Files Structure

```
frontend/
├── lib/
│   ├── auth.ts          # Auth utilities
│   └── rbac.ts          # RBAC system (50+ permissions)
├── middleware.ts        # Global auth middleware
├── app/
│   ├── (auth)/
│   │   ├── login/       # Login page
│   │   └── signup/      # Signup page
│   ├── dashboard/       # Role-based dashboard
│   └── api/auth/        # Auth APIs (5 endpoints)
└── components/auth/
    └── ProtectedRoute.tsx
```

---

## 🔒 Security Features

- ✅ bcrypt password hashing (12 rounds)
- ✅ JWT tokens (HS256)
- ✅ httpOnly cookies
- ✅ SameSite cookies (CSRF protection)
- ✅ Session management
- ✅ IP & User Agent tracking
- ✅ Multi-tenancy isolation
- ✅ Password strength validation
- ✅ Token expiry & refresh

---

## 🆘 Common Issues

**"Invalid token"**
→ Token expired, login again

**"Unauthorized"**
→ Not logged in, redirect to /login

**"Permission denied"**
→ User role lacks permission

**Can't access page**
→ Check cookies enabled

---

## 📚 Full Documentation

See: `docs/AUTHENTICATION_SYSTEM.md`

---

**Quick Start**: `npm run dev` → Visit `/login`
