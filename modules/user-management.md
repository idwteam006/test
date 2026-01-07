# User Management Module

## Status Overview
- Overall Completion: 0%
- Backend: 📋 Planned
- Frontend: 📋 Planned
- Tests: 📋 Planned

## Module Purpose
Manage user accounts, roles, and permissions

## Implemented Features

_No features implemented yet_

## Database Schema

**Prisma Model**: `User` (see `/frontend/prisma/schema.prisma`)

```prisma
model User {
  id           String    @id @default(uuid())
  tenantId     String
  email        String    @unique
  name         String
  role         Role      @default(EMPLOYEE)
  departmentId String?
  avatarUrl    String?
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}
```

## Pending Features

### 1. User Profiles
- [ ] View personal information
- [ ] Edit profile details
- [ ] Profile photo upload
- [ ] Contact information management

### 2. Role & Permission Management (RBAC)
- [ ] Admin role assignment
- [ ] Manager role assignment
- [ ] Employee role (default)
- [ ] Department-based access control
- [ ] Custom permission rules

### 3. User Operations
- [ ] List all users (paginated)
- [ ] Search and filter users
- [ ] Bulk user import via CSV
- [ ] Auto-generate login invitations
- [ ] Account activation/deactivation
- [ ] User deletion (soft delete)

## API Endpoints (Planned)
- `GET /api/users` - List all users (paginated, filterable)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Soft delete user
- `POST /api/users/bulk-import` - Bulk import from CSV
- `POST /api/users/:id/activate` - Activate user account
- `POST /api/users/:id/deactivate` - Deactivate user account
- `PUT /api/users/:id/role` - Update user role

## Frontend Components (Planned)
- UserList: `/app/features/users/components/UserList.tsx`
- UserForm: `/app/features/users/components/UserForm.tsx`
- UserProfile: `/app/features/users/components/UserProfile.tsx`
- UserRoleSelector: `/app/features/users/components/UserRoleSelector.tsx`
- BulkImport: `/app/features/users/components/BulkImport.tsx`

## Dependencies
- Authentication Module (required)
- Department Module (optional, for department assignment)

## Integration Points
- Used by: Employee Management, Dashboard, All modules requiring user context
- Integrates with: Authentication, Employee Management

## Notes
- Users and Employees are separate entities (User = account, Employee = HR record)
- RBAC permissions must be enforced at both API and UI layers
- Implement audit logging for user management actions
