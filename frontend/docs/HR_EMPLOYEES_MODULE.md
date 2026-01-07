# HR Employees Module Documentation

## Overview
Complete employee management module for HR users, cloned from Admin employees module with all functionality preserved. This module allows HR personnel to view, manage, and update employee information.

## Features
- **Employee Directory**: View all employees with search and filter capabilities
- **Status Management**: Activate, deactivate, or suspend employees
- **Role Assignment**: Assign roles, departments, managers, and teams to employees
- **Employee Details**: View comprehensive employee information including personal and employment details
- **Email Notifications**: Automatic notifications for status changes and role assignments
- **Caching**: Redis caching for performance optimization
- **Audit Logging**: All changes are logged for compliance

## Files Created

### Frontend Page
- **File**: `app/hr/employees/page.tsx`
- **Purpose**: Main employee directory page for HR users
- **Features**:
  - Search by name, email, or employee number
  - Filter by status (Active, Inactive, Suspended)
  - View employee details modal
  - Assign roles and update employee information
  - Change employee status (activate, deactivate, suspend)
  - Bulk import link (for future implementation)
  - Add new employee link

### API Endpoints

#### 1. Get Employees List
- **File**: `app/api/hr/employees/route.ts`
- **Method**: GET
- **Endpoint**: `/api/hr/employees`
- **Query Params**:
  - `role`: Filter by roles (e.g., "MANAGER,ADMIN")
  - `status`: Filter by status (ACTIVE, INACTIVE, SUSPENDED)
- **Permissions**: ADMIN, HR, MANAGER
- **Caching**: 5-minute Redis cache for manager queries
- **Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "email": "employee@example.com",
      "name": "John Doe",
      "role": "EMPLOYEE",
      "status": "ACTIVE",
      "employeeNumber": "EMP-20231211-001",
      "jobTitle": "Software Engineer",
      "department": "Engineering",
      "manager": {
        "id": "manager-employee-id",
        "name": "Jane Smith",
        "email": "jane@example.com"
      },
      "startDate": "2023-01-01T00:00:00Z",
      "employmentType": "FULL_TIME"
    }
  ],
  "total": 25
}
```

#### 2. Update Employee Status
- **File**: `app/api/hr/employees/[id]/status/route.ts`
- **Method**: PATCH
- **Endpoint**: `/api/hr/employees/:id/status`
- **Permissions**: ADMIN, HR, MANAGER
- **Body**:
```json
{
  "status": "ACTIVE" | "INACTIVE" | "SUSPENDED"
}
```
- **Features**:
  - Updates both User.status and Employee.status
  - Sends email notification to employee
  - Creates audit log entry
  - Maps UserStatus to EmploymentStatus appropriately
- **Response**:
```json
{
  "success": true,
  "message": "Employee status updated to ACTIVE",
  "data": {
    "id": "user-id",
    "status": "ACTIVE"
  }
}
```

#### 3. Get Employee Details
- **File**: `app/api/hr/employees/[id]/details/route.ts`
- **Method**: GET
- **Endpoint**: `/api/hr/employees/:id/details`
- **Permissions**: ADMIN, HR, MANAGER
- **Response**:
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "employee@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "name": "John Doe",
    "role": "EMPLOYEE",
    "status": "ACTIVE",
    "employeeNumber": "EMP-20231211-001",
    "jobTitle": "Software Engineer",
    "department": "Engineering",
    "startDate": "2023-01-01T00:00:00Z",
    "employmentType": "FULL_TIME",
    "lastLoginAt": "2025-12-10T10:30:00Z",
    "createdAt": "2023-01-01T00:00:00Z",
    "profile": {
      "personalEmail": "john@personal.com",
      "personalPhone": "+1234567890",
      "dateOfBirth": "1990-01-01T00:00:00Z",
      "gender": "Male",
      "currentAddress": "123 Main St",
      "emergencyContactName": "Jane Doe",
      "emergencyPhone": "+0987654321"
    }
  }
}
```

## Email Notifications

### Status Change Notifications
When an employee's status is changed, they receive an email with:
- Status change details (from → to)
- Who made the change
- Reason (if provided)
- Organization name
- Visual styling based on new status:
  - **ACTIVE**: Green theme with ✅
  - **SUSPENDED**: Orange theme with ⏸️
  - **INACTIVE**: Red theme with 🔒

### Role Assignment Notifications
Handled by existing `/api/admin/employees/[id]/assign-role` endpoint:
- **Employee Email**: Notifies employee of new role, department, manager
- **Manager Email**: Notifies manager of new employee assigned to them

## Security & Permissions

### Role-Based Access Control
- **ADMIN**: Full access to all employee management features
- **HR**: Full access to all employee management features
- **MANAGER**: Full access to all employee management features
- **EMPLOYEE**: No access (403 Forbidden)
- **ACCOUNTANT**: No access (403 Forbidden)

### Tenant Isolation
- All queries filter by `tenantId`
- Users can only view/manage employees in their own organization
- Attempting to access employees from another tenant returns 403 Forbidden

### Session Validation
- All endpoints validate session existence
- Session must be active (not expired)
- User must be authenticated before accessing any endpoint

## Performance Optimization

### Redis Caching
- **Manager Queries**: 5-minute cache for frequently accessed manager lists
- **Cache Key Format**: `employees:managers:{tenantId}:{roles}`
- **Cache TTL**: 300 seconds (5 minutes)
- **Cache Invalidation**: Automatically invalidated on employee updates

### Database Queries
- Optimized with selective field selection
- Proper indexing on `tenantId`, `status`, `role`
- Includes relations only when needed

## Audit Logging
All employee status changes are logged with:
- User who made the change
- Timestamp of change
- Previous and new values
- IP address and user agent
- Action type: `employee.status_updated`

## Components Used

### Shared Components
- **RoleAssignmentDialog** (`components/admin/RoleAssignmentDialog.tsx`)
  - Reused from admin module
  - Allows assigning role, job title, department, manager, and teams
  - Works seamlessly with HR API endpoints

- **EmployeeDetailsModal** (`components/admin/EmployeeDetailsModal.tsx`)
  - Reused from admin module
  - Displays comprehensive employee information
  - Shows personal, employment, and profile details

### UI Components (shadcn/ui)
- Button
- Input
- Label
- Card (CardContent, CardHeader, CardTitle, CardDescription)
- Badge
- Toast notifications (sonner)

### Icons (lucide-react)
- Users, UserPlus, Upload
- Search, Filter, MoreVertical
- Mail, Shield, Ban, CheckCircle
- Loader2, Eye

## Navigation

### HR Module Links
- **Employees Directory**: `/hr/employees`
- **Bulk Import**: `/hr/employees/import` (future feature)
- **Add Employee**: `/hr/invite-employee` (existing)

### Integration Points
The HR employees page is linked in the HR navigation sidebar:
```typescript
{ name: 'Employees', href: '/hr/employees', icon: Users }
```

## Differences from Admin Module

### API Endpoint Paths
- Admin: `/api/admin/employees/*`
- HR: `/api/hr/employees/*`

### Page Titles
- Admin: "Employee Management"
- HR: "Employee Directory"

### Page Descriptions
- Admin: "Manage your organization's employees"
- HR: "Manage and view employee information"

### Permissions Check
HR endpoints explicitly check for `['ADMIN', 'HR', 'MANAGER']` roles with error message:
```
"Insufficient permissions. HR, Admin, or Manager access required."
```

## Testing

### Manual Testing Checklist
1. **Access Control**
   - ✅ HR user can access `/hr/employees`
   - ✅ Employee user gets 403 error
   - ✅ Accountant user gets 403 error

2. **Employee List**
   - ✅ Displays all employees in tenant
   - ✅ Search by name, email, employee number works
   - ✅ Filter by status works
   - ✅ Manager information displayed correctly

3. **Status Management**
   - ✅ Can activate inactive employees
   - ✅ Can deactivate active employees
   - ✅ Can suspend active employees
   - ✅ Email notification sent on status change

4. **Employee Details**
   - ✅ View button opens details modal
   - ✅ All employee information displayed
   - ✅ Profile information shown (if exists)

5. **Role Assignment**
   - ✅ Assign Role button opens dialog
   - ✅ Can update role, department, manager, teams
   - ✅ Email notifications sent (employee + manager)

## Error Handling

### Common Error Responses
```json
// Not authenticated
{ "success": false, "error": "Not authenticated" }

// Session expired
{ "success": false, "error": "Session expired" }

// Insufficient permissions
{ "success": false, "error": "Insufficient permissions. HR, Admin, or Manager access required." }

// Employee not found
{ "success": false, "error": "Employee not found" }

// Invalid status
{ "success": false, "error": "Invalid status. Must be ACTIVE, INACTIVE, or SUSPENDED" }

// Cross-tenant access attempt
{ "success": false, "error": "Employee not found or does not belong to your organization" }
```

## Future Enhancements

### Planned Features
1. **Bulk Import**: Import multiple employees from CSV/Excel
2. **Export**: Export employee list to CSV/Excel/PDF
3. **Advanced Filters**: Filter by department, role, join date range
4. **Employee Groups**: Create and manage employee groups
5. **Batch Operations**: Bulk status updates, role assignments
6. **Employee Analytics**: View employee statistics and charts

### Performance Improvements
1. **Pagination**: Implement pagination for large employee lists
2. **Virtual Scrolling**: Use virtual scrolling for better performance
3. **Lazy Loading**: Load employee details on demand
4. **Optimistic Updates**: Update UI immediately before API response

## Troubleshooting

### Common Issues

#### 1. Page Returns 404
**Problem**: `/hr/employees` returns 404 error
**Solution**: Ensure the file exists at `app/hr/employees/page.tsx` and restart the dev server

#### 2. 403 Forbidden Error
**Problem**: HR user gets 403 when accessing the page
**Solution**: Verify the user's role in the database is set to 'HR', 'ADMIN', or 'MANAGER'

#### 3. Empty Employee List
**Problem**: No employees displayed even though they exist
**Solution**:
- Check if employees belong to the correct tenant
- Verify the API endpoint is returning data
- Check browser console for JavaScript errors

#### 4. Email Notifications Not Sent
**Problem**: Status change emails not received
**Solution**:
- Verify Resend API key is configured correctly
- Check email logs in Resend dashboard
- Ensure employee has valid email address
- Check spam/junk folder

#### 5. Role Assignment Dialog Not Opening
**Problem**: Clicking "Assign Role" doesn't open dialog
**Solution**:
- Check browser console for errors
- Verify RoleAssignmentDialog component is imported correctly
- Ensure the component is working in admin module first

## Related Documentation
- [Admin Employees Module](./ADMIN_EMPLOYEES_MODULE.md)
- [Email Notifications System](./EMAIL_NOTIFICATIONS.md)
- [Role-Based Access Control](./RBAC.md)
- [Redis Caching Strategy](./CACHING.md)
- [Audit Logging](./AUDIT_LOGGING.md)

## API Endpoint Summary

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/hr/employees` | GET | HR, ADMIN, MANAGER | Get employee list with filters |
| `/api/hr/employees/:id/status` | PATCH | HR, ADMIN, MANAGER | Update employee status |
| `/api/hr/employees/:id/details` | GET | HR, ADMIN, MANAGER | Get full employee details |
| `/api/admin/employees/:id/assign-role` | PATCH | ADMIN, HR | Assign role (shared with admin) |

## Support
For issues or questions, please contact:
- Development Team: dev@zenora.ai
- Documentation: https://docs.zenora.ai
- GitHub Issues: https://github.com/zenora/frontend/issues
