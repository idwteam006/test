# 🔐 Centralized Authentication & Role-Based Access Control System

**Created**: 2025-10-09
**Status**: ✅ Complete
**Roles**: ADMIN, MANAGER, EMPLOYEE, ACCOUNTANT

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication Flow](#authentication-flow)
5. [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
6. [API Routes](#api-routes)
7. [Frontend Components](#frontend-components)
8. [Usage Guide](#usage-guide)
9. [Security Features](#security-features)

---

## Overview

Zenora.ai features a centralized authentication system with JWT-based tokens and comprehensive role-based access control (RBAC) supporting four user roles:

- **ADMIN**: Full system access and management
- **MANAGER**: Team management and approvals
- **EMPLOYEE**: Personal workspace and basic features
- **ACCOUNTANT**: Financial management and payroll

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Flow                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Login                                                  │
│     │                                                        │
│     ▼                                                        │
│  Verify Credentials                                          │
│     │                                                        │
│     ▼                                                        │
│  Generate Tokens                                             │
│     ├─ Access Token (15 min)                                │
│     └─ Refresh Token (7 days)                               │
│     │                                                        │
│     ▼                                                        │
│  Store in httpOnly Cookies                                   │
│     │                                                        │
│     ▼                                                        │
│  Create Session (DB)                                         │
│     │                                                        │
│     ▼                                                        │
│  Redirect to Role-based Dashboard                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### User Model (Updated)

```prisma
model User {
  id                   String    @id @default(uuid())
  tenantId             String
  email                String    @unique
  password             String    // Hashed with bcrypt (12 rounds)
  name                 String
  role                 Role      @default(EMPLOYEE)
  departmentId         String?
  avatarUrl            String?
  isActive             Boolean   @default(true)
  emailVerified        Boolean   @default(false)
  lastLoginAt          DateTime?
  passwordResetToken   String?
  passwordResetExpires DateTime?
  refreshToken         String?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  // Relations
  tenant               Tenant    @relation(...)
  sessions             Session[]
  employee             Employee?
  notifications        Notification[]
  fileUploads          FileUpload[]

  @@index([tenantId])
  @@index([email])
  @@index([passwordResetToken])
}
```

### Session Model (New)

```prisma
model Session {
  id         String   @id @default(uuid())
  userId     String
  token      String   @unique  // Refresh token
  ipAddress  String?
  userAgent  String?
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  user       User     @relation(...)

  @@index([userId])
  @@index([token])
  @@index([expiresAt])
}
```

### Role Enum (Updated)

```prisma
enum Role {
  ADMIN
  MANAGER
  EMPLOYEE
  ACCOUNTANT
}
```

---

## Authentication Flow

### 1. Login Process

**Endpoint**: `POST /api/auth/login`

```typescript
// Request
{
  "email": "user@company.com",
  "password": "SecurePassword123!"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@company.com",
      "name": "John Doe",
      "role": "ADMIN",
      "tenantId": "uuid",
      "tenantName": "Acme Corp"
    },
    "accessToken": "jwt-token"
  }
}
```

**Process**:
1. Validate email and password
2. Check if user exists and is active
3. Verify password with bcrypt
4. Generate access token (15 min) and refresh token (7 days)
5. Create session in database
6. Set httpOnly cookies
7. Update lastLoginAt
8. Return user data and tokens

### 2. Signup Process

**Endpoint**: `POST /api/auth/signup`

```typescript
// Request
{
  "email": "admin@newcompany.com",
  "password": "SecurePassword123!",
  "name": "Admin User",
  "organizationName": "New Company Inc"
}

// Response
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "jwt-token"
  }
}
```

**Process**:
1. Validate input data
2. Check password strength (8+ chars, uppercase, lowercase, number, special)
3. Check if email already exists
4. Hash password with bcrypt (12 salt rounds)
5. Create tenant (organization) with unique slug
6. Create user with ADMIN role (first user)
7. Generate tokens and create session
8. Return data with cookies

### 3. Token Refresh

**Endpoint**: `POST /api/auth/refresh`

```typescript
// Automatic refresh when access token expires
// Uses refresh token from httpOnly cookie
```

**Process**:
1. Get refresh token from cookie
2. Verify refresh token
3. Check session exists and is valid
4. Check session not expired
5. Check user still active
6. Generate new access token
7. Generate new refresh token
8. Update session in database
9. Set new cookies

### 4. Logout

**Endpoint**: `POST /api/auth/logout`

```typescript
// Response
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Process**:
1. Get refresh token from cookie
2. Delete session from database
3. Clear access and refresh token cookies

---

## Role-Based Access Control (RBAC)

### Permission System

**File**: `lib/rbac.ts`

```typescript
enum Permission {
  // User Management
  VIEW_USERS,
  CREATE_USERS,
  EDIT_USERS,
  DELETE_USERS,

  // Employee Management
  VIEW_EMPLOYEES,
  CREATE_EMPLOYEES,
  EDIT_EMPLOYEES,
  DELETE_EMPLOYEES,
  VIEW_ALL_EMPLOYEES,

  // ... (50+ permissions)
}
```

### Role Permissions

#### ADMIN (Full Access)
- ✅ All user management
- ✅ All employee management
- ✅ All department management
- ✅ All timesheet/leave approvals
- ✅ All performance management
- ✅ All project management
- ✅ All client management
- ✅ All invoice management
- ✅ All payroll management
- ✅ All reports
- ✅ System settings
- ✅ Tenant management

#### MANAGER (Team Management)
- ✅ View all employees
- ✅ Edit team members
- ✅ View and approve timesheets (team)
- ✅ View and approve leave (team)
- ✅ Manage team performance
- ✅ Create and edit projects
- ✅ Generate reports

#### ACCOUNTANT (Financial Management)
- ✅ View all employees (for payroll)
- ✅ Full invoice management
- ✅ Full payroll management
- ✅ Manage clients
- ✅ Generate financial reports
- ✅ Export reports

#### EMPLOYEE (Personal Access)
- ✅ View own profile
- ✅ Submit timesheets
- ✅ Request leave
- ✅ View own performance
- ✅ View assigned projects

### Permission Check Functions

```typescript
// Check single permission
hasPermission(role: Role, permission: Permission): boolean

// Check any of multiple permissions
hasAnyPermission(role: Role, permissions: Permission[]): boolean

// Check all permissions
hasAllPermissions(role: Role, permissions: Permission[]): boolean

// Get all role permissions
getRolePermissions(role: Role): Permission[]

// Check role seniority
isSeniorRole(role: Role, comparedTo: Role): boolean
```

### Role Hierarchy

```typescript
const ROLE_HIERARCHY = {
  ADMIN: 4,
  MANAGER: 3,
  ACCOUNTANT: 2,
  EMPLOYEE: 1,
};
```

### Default Routes by Role

```typescript
getDefaultRoute(role: Role): string

// Returns:
// ADMIN      → /dashboard
// MANAGER    → /dashboard
// ACCOUNTANT → /invoices
// EMPLOYEE   → /timesheets
```

---

## API Routes

### Authentication Endpoints

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/auth/login` | POST | User login | No |
| `/api/auth/signup` | POST | Create account | No |
| `/api/auth/logout` | POST | User logout | Yes |
| `/api/auth/refresh` | POST | Refresh tokens | Yes |
| `/api/auth/me` | GET | Get current user | Yes |

### Request/Response Examples

**Login**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@demo.com",
    "password": "Demo@123"
  }'
```

**Get Current User**:
```bash
curl http://localhost:3000/api/auth/me \
  -H "Cookie: accessToken=your-token"
```

---

## Frontend Components

### Pages

1. **Login Page** - `app/(auth)/login/page.tsx`
   - Email/password form
   - Validation
   - Error handling
   - Demo account info
   - Redirect to dashboard on success

2. **Signup Page** - `app/(auth)/signup/page.tsx`
   - Organization creation
   - User registration
   - Password strength validation
   - Multi-step UI
   - Auto-login after signup

3. **Dashboard Page** - `app/dashboard/page.tsx`
   - Role-based dashboards
   - Different views for each role
   - Quick stats
   - Quick actions
   - Logout button

### Components

1. **ProtectedRoute** - `components/auth/ProtectedRoute.tsx`
   - Authenticate user
   - Check permissions
   - Check role
   - Redirect if unauthorized
   - Loading state

### Usage Example

```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/rbac';

export default function EmployeesPage() {
  return (
    <ProtectedRoute requiredPermission={Permission.VIEW_EMPLOYEES}>
      <EmployeeList />
    </ProtectedRoute>
  );
}
```

---

## Usage Guide

### 1. Start Development Server

```bash
cd frontend
npm run dev
```

### 2. Access Pages

- **Login**: http://localhost:3000/login
- **Signup**: http://localhost:3000/signup
- **Dashboard**: http://localhost:3000/dashboard (after login)

### 3. Demo Accounts

Create demo accounts or use these credentials after creating them:

```
Email: admin@demo.com
Password: Demo@123
Role: ADMIN

Email: manager@demo.com
Password: Demo@123
Role: MANAGER

Email: employee@demo.com
Password: Demo@123
Role: EMPLOYEE

Email: accountant@demo.com
Password: Demo@123
Role: ACCOUNTANT
```

### 4. Test Authentication

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

// Get current user
const user = await fetch('/api/auth/me');

// Logout
await fetch('/api/auth/logout', { method: 'POST' });
```

### 5. Protect Routes

```tsx
// In any page
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Permission } from '@/lib/rbac';
import { Role } from '@prisma/client';

// By permission
<ProtectedRoute requiredPermission={Permission.VIEW_USERS}>
  <UsersList />
</ProtectedRoute>

// By role
<ProtectedRoute requiredRole={Role.ADMIN}>
  <AdminPanel />
</ProtectedRoute>
```

---

## Security Features

### 1. Password Security
- **Hashing**: bcrypt with 12 salt rounds
- **Strength**: Minimum 8 characters, uppercase, lowercase, number, special character
- **Storage**: Never stored in plain text

### 2. Token Security
- **Access Token**: 15 minutes expiry (short-lived)
- **Refresh Token**: 7 days expiry
- **Algorithm**: HS256 (HMAC with SHA-256)
- **Storage**: httpOnly cookies (not accessible via JavaScript)
- **SameSite**: Lax (CSRF protection)
- **Secure**: True in production (HTTPS only)

### 3. Session Management
- **Database-backed**: All sessions stored in database
- **IP Tracking**: Record IP address for audit
- **User Agent**: Record device/browser info
- **Expiry**: Automatic cleanup of expired sessions
- **Revocation**: Logout deletes session

### 4. Middleware Protection
- **Global**: All routes except public ones
- **Token Verification**: Every request verified
- **User Context**: Injected into request headers
- **Automatic Redirect**: Unauthenticated users to login

### 5. Multi-tenancy
- **Tenant Isolation**: Users can only access their tenant data
- **Tenant Check**: Verified on every request
- **Cascade Delete**: All user data deleted with tenant

### 6. Audit Trail
- **Last Login**: Tracked for each user
- **Session History**: IP and User Agent logged
- **Activity Log**: (Future) All user actions logged

---

## Files Created

```
frontend/
├── lib/
│   ├── auth.ts                     # Auth utilities
│   └── rbac.ts                     # RBAC system
├── middleware.ts                   # Global auth middleware
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx         # Login page
│   │   └── signup/page.tsx        # Signup page
│   ├── dashboard/page.tsx         # Role-based dashboard
│   └── api/auth/
│       ├── login/route.ts         # Login API
│       ├── signup/route.ts        # Signup API
│       ├── logout/route.ts        # Logout API
│       ├── refresh/route.ts       # Token refresh API
│       └── me/route.ts            # Get user API
├── components/auth/
│   └── ProtectedRoute.tsx         # Protected route HOC
└── prisma/schema.prisma            # Updated with User & Session models
```

---

## Next Steps

1. ✅ **Create Demo Users**: Run seed script to create demo accounts
2. ✅ **Test Login Flow**: Test all 4 roles
3. ✅ **Implement Password Reset**: Add forgot/reset password functionality
4. ✅ **Add Email Verification**: Send verification emails
5. ✅ **Two-Factor Authentication (2FA)**: Add optional 2FA
6. ✅ **Activity Logging**: Track all user actions
7. ✅ **Session Management UI**: Allow users to view/revoke sessions

---

## Testing

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"Demo@123"}' \
  -c cookies.txt
```

### Test Protected Route
```bash
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

### Test Logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

---

## Troubleshooting

**Issue**: "Invalid token" error
- **Solution**: Token expired, use refresh endpoint or login again

**Issue**: "Unauthorized" error
- **Solution**: Not logged in, redirect to /login

**Issue**: Permission denied
- **Solution**: User role doesn't have required permission

**Issue**: Can't access dashboard
- **Solution**: Check cookies are enabled, check middleware is working

---

**Status**: ✅ Authentication System Complete
**Created**: 2025-10-09
**Ready for Production**: Yes (after security audit)
