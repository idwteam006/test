# Zenora.ai Employee Management System

## Project Overview
A comprehensive, enterprise-grade employee management platform built with a modern, scalable tech stack designed for multi-tenant SaaS deployment.

---

## Tech Stack

### Frontend
- **Framework**: Next.js (App Router) with TypeScript
  - Server-Side Rendering (SSR) / Incremental Static Regeneration (ISR)
  - Edge caching for performance
  - Streaming responses
- **UI Library**: Ant Design (Enterprise-grade components)
- **Data Fetching**: TanStack Query (React Query) for server state
- **State Management**: Zustand for local/UI state
- **Forms & Validation**: React Hook Form + Zod
- **Component Docs**: Storybook
- **Deployment**: Vercel (Global edge network, ISR, image optimization)

### Backend
- **Phase 1 (MVP)**: Next.js Route Handlers (API routes)
- **Phase 2 (Scale)**: NestJS microservice
  - HTTP Engine: Express initially, Fastify for high throughput
  - TypeScript end-to-end
- **API Style**: REST with OpenAPI documentation
  - GraphQL consideration for complex analytical queries post-MVP
- **Deployment**: AWS ECS on Fargate (containerized)

### Database & Caching
- **Primary Database**: PostgreSQL (Amazon RDS Multi-AZ)
  - ORM: Prisma (type-safe models and migrations)
- **Caching & Jobs**: Redis (Amazon ElastiCache)
  - Caching layer
  - Rate limiting
  - BullMQ for background jobs (invoicing, exports, reminders)
- **Tenancy Model**: 
  - Shared schema with `tenant_id` on all tables
  - PostgreSQL Row-Level Security (RLS) with FORCE RLS
  - Session-scoped tenant context
  - Table partitioning on heavy tables (time_entries, invoice_lines)

### Authentication & Authorization
- **Identity Provider**: Auth0 / Clerk / SuperTokens
  - Tenant-aware SSO
  - JWT sessions
  - SAML/OIDC for enterprise SSO
- **Authorization**: Role-based access control (RBAC)
  - NestJS guards
  - Immutable audit logs for compliance

### Observability & Security
- **Telemetry**: OpenTelemetry with tenant/request IDs
  - SLO dashboards for latency and error budgets
- **Error Tracking**: Sentry
- **Logging**: Structured logs with correlation IDs
- **Secrets Management**: AWS Secrets Manager
- **IAM**: Least-privilege principles, per-environment isolation

### CI/CD & Infrastructure
- **Pipeline**: GitHub Actions
  - Unit/integration/e2e tests
  - SAST/DAST security scanning
  - Per-PR preview deployments
  - Protected main branch
  - Blue/green or canary deployments
- **Database Migrations**: Controlled migrations with backfills and feature flags
- **Infrastructure as Code**: Terraform
  - VPC, ECS, RDS, ElastiCache, IAM, Secrets Manager, networking

---

## Application Modules

### 1. Authentication Module
**Purpose**: Secure user access and session management

**Features**:
- User Registration & Login
  - Email/password authentication
  - Single Sign-On (SSO) - SAML/OIDC
  - Passwordless login (magic links)
- Session Management
  - JWT token handling
  - Session timeout controls
  - Force logout on security events
- Security Features
  - Password policy enforcement
  - Account lockout protection
  - Login attempt monitoring

**Tech Implementation**:
- Auth0/Clerk for identity management
- JWT stored in httpOnly cookies
- Next.js middleware for route protection
- Redis for session storage and blacklisting

---

### 2. User Management Module
**Purpose**: Manage user accounts, roles, and permissions

**Features**:
- User Profiles
  - Personal information
  - Profile photo upload
  - Contact information
- Role & Permission Management
  - RBAC (Admin, Manager, Employee)
  - Department-based access control
- User Operations
  - Bulk user import via CSV
  - Auto-generate login invitations
  - User search and filtering
  - Account activation/deactivation

**Database Schema**:
```prisma
model User {
  id          String   @id @default(uuid())
  tenantId    String
  email       String   @unique
  name        String
  role        Role
  departmentId String?
  avatarUrl   String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

### 3. Employee Management Module
**Purpose**: Comprehensive employee records and organizational structure

**Features**:
- Employee Profiles
  - Personal details
  - Job titles and departments
  - Reporting manager
  - Employment start date
- Basic Records
  - Contact information
  - Emergency contacts
  - Employment status
- Organizational Structure
  - Org chart visualization
  - Team assignments
  - Manager-subordinate relationships

**Database Schema**:
```prisma
model Employee {
  id              String    @id @default(uuid())
  tenantId        String
  userId          String    @unique
  employeeNumber  String    @unique
  departmentId    String
  jobTitle        String
  managerId       String?
  startDate       DateTime
  employmentType  EmploymentType
  status          EmploymentStatus
  emergencyContacts Json
}
```

---

### 4. Client Management Module
**Purpose**: Manage client relationships and billing information

**Features**:
- Client Profiles
  - Company name and details
  - Primary contact
  - Billing address
  - Contract terms
- Rate Management
  - Hourly rates by project
  - Currency settings
  - Payment terms
- Client Operations
  - Add/edit clients
  - Project association
  - Active/inactive status

**Database Schema**:
```prisma
model Client {
  id            String   @id @default(uuid())
  tenantId      String
  companyName   String
  contactName   String
  contactEmail  String
  billingAddress Json
  currency      String   @default("USD")
  paymentTerms  Int      @default(30)
  isActive      Boolean  @default(true)
  projects      Project[]
}
```

---

### 5. Project Management Module
**Purpose**: Project tracking, team allocation, and budget management

**Features**:
- Project Setup
  - Project name and description
  - Client association
  - Budget (hours/cost)
  - Start/end dates
- Task Management
  - Task creation and assignment
  - Progress tracking
- Team Assignment
  - Assign employees to projects
  - Define billable rates per employee
  - Project access permissions

**Database Schema**:
```prisma
model Project {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  clientId    String
  budgetHours Float?
  budgetCost  Float?
  startDate   DateTime
  endDate     DateTime?
  status      ProjectStatus
  tasks       Task[]
  assignments ProjectAssignment[]
}

model Task {
  id          String   @id @default(uuid())
  tenantId    String
  projectId   String
  name        String
  assigneeId  String?
  status      TaskStatus
  dueDate     DateTime?
}
```

---

### 6. Timesheet Module
**Purpose**: Time tracking, approval workflows, and utilization reporting

**Features**:
- Time Entry
  - Weekly timesheet view
  - Project and task selection
  - Billable/non-billable hours
  - Notes/descriptions
- Approval Workflow
  - Submit for manager approval
  - Approve/reject with notifications
  - Lock approved timesheets
- Basic Reporting
  - Weekly/monthly summaries
  - CSV export
  - Employee utilization

**Database Schema**:
```prisma
model TimeEntry {
  id          String   @id @default(uuid())
  tenantId    String
  employeeId  String
  projectId   String
  taskId      String?
  date        DateTime
  hours       Float
  isBillable  Boolean  @default(true)
  description String?
  status      TimesheetStatus
  approvedBy  String?
  approvedAt  DateTime?
}
```

**Background Jobs (BullMQ)**:
- Weekly timesheet reminders
- Auto-submit notifications
- Approval reminders to managers

---

### 7. Leave Management Module
**Purpose**: Leave requests, approvals, and balance tracking

**Features**:
- Leave Types
  - Annual, Sick, Personal leave
  - Accrual rules
- Leave Requests
  - Submit leave requests
  - Calendar view
  - Conflict detection
- Approval Process
  - Manager approval workflow
  - Email notifications
  - Balance tracking
- Leave Analytics
  - Employee balances
  - Team availability calendar

**Database Schema**:
```prisma
model LeaveRequest {
  id          String      @id @default(uuid())
  tenantId    String
  employeeId  String
  leaveType   LeaveType
  startDate   DateTime
  endDate     DateTime
  days        Float
  reason      String?
  status      ApprovalStatus
  approvedBy  String?
  approvedAt  DateTime?
}

model LeaveBalance {
  id          String   @id @default(uuid())
  tenantId    String
  employeeId  String
  leaveType   LeaveType
  balance     Float
  year        Int
}
```

---

### 8. Performance Management Module
**Purpose**: Goal tracking, performance reviews, and skills development

**Features**:
- Goal Management
  - Set individual goals
  - Progress tracking
  - Completion status
- Performance Reviews
  - Review cycles (quarterly/annual)
  - Self-assessment forms
  - Manager evaluations
- 1-on-1 Meetings
  - Schedule meetings
  - Meeting notes
  - Action items
- Skills Tracking
  - Skill assessments
  - Development areas

**Database Schema**:
```prisma
model Goal {
  id          String   @id @default(uuid())
  tenantId    String
  employeeId  String
  title       String
  description String
  dueDate     DateTime?
  progress    Int      @default(0)
  status      GoalStatus
}

model PerformanceReview {
  id          String   @id @default(uuid())
  tenantId    String
  employeeId  String
  reviewerId  String
  period      String
  selfRating  Json?
  managerRating Json?
  comments    String?
  completedAt DateTime?
}
```

---

### 9. Invoice/Billing Module
**Purpose**: Automated invoicing from timesheets and payment tracking

**Features**:
- Invoice Generation
  - Auto-generate from approved timesheets
  - Invoice templates
  - Tax calculations
- Invoice Management
  - Send invoices via email
  - Track payment status
  - Overdue notifications
- Billing Reports
  - Revenue by client
  - Outstanding invoices
  - Payment tracking

**Database Schema**:
```prisma
model Invoice {
  id          String   @id @default(uuid())
  tenantId    String
  clientId    String
  invoiceNumber String @unique
  issueDate   DateTime
  dueDate     DateTime
  subtotal    Float
  tax         Float
  total       Float
  status      InvoiceStatus
  paidAt      DateTime?
  lineItems   InvoiceLineItem[]
}

model InvoiceLineItem {
  id          String   @id @default(uuid())
  tenantId    String
  invoiceId   String
  description String
  hours       Float?
  rate        Float
  amount      Float
}
```

**Background Jobs (BullMQ)**:
- Monthly invoice generation
- Payment reminder emails
- Overdue invoice alerts

---

### 10. Payroll Module
**Purpose**: Salary calculations and payroll processing

**Features**:
- Basic Payroll
  - Salary calculations
  - Hourly rate calculations
  - Deductions
- Payroll Reports
  - Monthly payroll summary
  - Employee pay stubs
  - Export payroll data

**Database Schema**:
```prisma
model PayrollRecord {
  id          String   @id @default(uuid())
  tenantId    String
  employeeId  String
  period      String
  baseSalary  Float
  deductions  Float
  netPay      Float
  processedAt DateTime
  paidAt      DateTime?
}
```

---

### 11. Reports & Analytics Module
**Purpose**: Business intelligence and data exports

**Features**:
- Standard Reports
  - Employee list
  - Attendance summary
  - Leave reports
  - Project utilization
- Financial Reports
  - Revenue by project
  - Billable hours summary
  - Client profitability
- Export Features
  - CSV/Excel exports
  - Charts and graphs (using Recharts/Chart.js)

**Tech Implementation**:
- TanStack Query for data fetching
- Server-side aggregations in PostgreSQL
- Redis caching for expensive queries
- Export jobs handled by BullMQ

---

### 12. Notification Module
**Purpose**: Real-time and email notifications

**Features**:
- Email Notifications
  - Timesheet reminders
  - Approval notifications
  - Leave request alerts
- In-App Notifications
  - Pending approvals
  - Important updates
  - System messages
- Settings
  - Enable/disable notification types
  - Email preferences

**Database Schema**:
```prisma
model Notification {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String
  type        NotificationType
  title       String
  message     String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

**Tech Implementation**:
- Server-Sent Events (SSE) or WebSockets for real-time updates
- BullMQ for scheduled email notifications
- Redis pub/sub for notification distribution

---

### 13. Settings/Configuration Module
**Purpose**: System configuration and tenant settings

**Features**:
- Company Settings
  - Company information
  - Logo upload
  - Timezone settings
  - Currency settings
- User Management
  - Bulk import templates
  - Role assignments
  - Department setup
- System Settings
  - Leave policies
  - Working hours
  - Holiday calendar

**Database Schema**:
```prisma
model TenantSettings {
  id          String   @id @default(uuid())
  tenantId    String   @unique
  companyName String
  logoUrl     String?
  timezone    String   @default("UTC")
  currency    String   @default("USD")
  workingHours Json
  leavePolicies Json
}
```

---

### 14. Dashboard Module
**Purpose**: Role-based dashboards with key metrics and quick actions

**Features**:
- Manager Dashboard
  - Pending approvals
  - Team utilization
  - Project status
  - Quick actions
- Employee Dashboard
  - Time tracking summary
  - Leave balances
  - Personal goals
  - Recent activities
- Admin Dashboard
  - Company metrics
  - User activity
  - System health
  - Quick management tasks

**Tech Implementation**:
- Real-time data with TanStack Query
- Chart visualizations with Recharts
- Cached metrics in Redis
- OpenTelemetry for performance monitoring

---

## Database Multi-Tenancy Strategy

### Row-Level Security (RLS) Implementation
```sql
-- Enable RLS on all tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant')::text);

-- Set tenant context in session
SET app.current_tenant = 'tenant-uuid';
```

### Table Partitioning for Scale
```sql
-- Partition time_entries by tenant and date
CREATE TABLE time_entries (
  id UUID,
  tenant_id UUID,
  date DATE,
  ...
) PARTITION BY LIST (tenant_id);

-- Create partitions per tenant
CREATE TABLE time_entries_tenant_1 
  PARTITION OF time_entries 
  FOR VALUES IN ('tenant-1-uuid');
```

---

## API Architecture

### Phase 1: Next.js Route Handlers
```
/app/api/
  /auth/
    /login/route.ts
    /logout/route.ts
  /employees/
    /route.ts
    /[id]/route.ts
  /timesheets/
    /route.ts
    /approve/route.ts
  ...
```

### Phase 2: NestJS Microservice Structure
```
src/
  /modules/
    /auth/
    /employees/
    /timesheets/
    /projects/
    ...
  /common/
    /guards/
    /decorators/
    /interceptors/
  /config/
  /database/
```

---

## Deployment Architecture

### Vercel (Frontend)
- Next.js application deployed to Vercel edge network
- Environment variables for API endpoints
- Preview deployments for each PR
- ISR for static pages with revalidation

### AWS Infrastructure (Backend & Data)

#### Compute
- **ECS on Fargate**: NestJS API containers
- **Application Load Balancer**: Traffic distribution
- **Auto Scaling**: CPU/memory-based scaling

#### Database
- **RDS PostgreSQL Multi-AZ**: High availability
- **Read Replicas**: Read-heavy query distribution
- **Automated Backups**: Point-in-time recovery

#### Caching & Jobs
- **ElastiCache Redis Cluster**: Caching and rate limiting
- **BullMQ**: Background job processing

#### Networking
- **VPC**: Isolated network with public/private subnets
- **Security Groups**: Firewall rules
- **NAT Gateway**: Outbound internet for private subnets

#### Infrastructure as Code (Terraform)
```hcl
# Example structure
modules/
  /vpc/
  /ecs/
  /rds/
  /elasticache/
  /iam/
  /secrets-manager/
environments/
  /dev/
  /staging/
  /production/
```

---

## Development Workflow

### Local Development
```bash
# Frontend (Next.js)
npm run dev          # Port 3000
npm run storybook    # Port 6006

# Backend (NestJS - when separated)
npm run start:dev    # Port 3001

# Database
docker-compose up postgres redis
```

### Git Workflow
1. Feature branches from `main`
2. PR with automated checks:
   - TypeScript compilation
   - ESLint/Prettier
   - Unit tests
   - Integration tests
   - E2E tests (Playwright)
   - SAST security scanning
3. Preview deployment (Vercel)
4. Code review and approval
5. Merge to `main` triggers production deployment

### Database Migrations
```bash
# Create migration
npx prisma migrate dev --name add_employee_table

# Apply to production with feature flag
npx prisma migrate deploy
```

---

## Security Considerations

### Authentication & Authorization
- JWT tokens with short expiry (15 min access, 7 day refresh)
- httpOnly cookies for token storage
- CSRF protection with SameSite cookies
- Rate limiting on auth endpoints

### Data Protection
- Encryption at rest (RDS, S3)
- Encryption in transit (TLS 1.3)
- Sensitive data encrypted in DB (PII fields)
- Audit logs for all data modifications

### API Security
- CORS configuration per environment
- Request validation with Zod
- SQL injection prevention (Prisma parameterization)
- XSS protection with Content Security Policy

### Compliance
- GDPR compliance (data export, deletion)
- SOC 2 audit trail
- Immutable audit logs in separate table/service

---

## Performance Optimization

### Frontend
- Next.js ISR for dashboard pages
- Code splitting with dynamic imports
- Image optimization with Next.js Image
- Lazy loading for Ant Design components

### Backend
- Database query optimization (indexes, N+1 prevention)
- Redis caching strategy:
  - Cache-aside pattern
  - TTL based on data volatility
- Connection pooling (Prisma)
- Background jobs for expensive operations

### Monitoring
- OpenTelemetry traces with tenant/request ID
- Custom metrics for business KPIs
- SLO dashboards (99.9% uptime, <500ms p95 latency)
- Error tracking with Sentry

---

## Scalability Roadmap

### Phase 1: MVP (0-1000 employees)
- Shared schema multi-tenancy
- Single RDS instance
- Basic caching
- Vercel + AWS ECS

### Phase 2: Growth (1000-10,000 employees)
- Row-Level Security enabled
- Read replicas for RDS
- Enhanced caching strategy
- Horizontal scaling of ECS tasks

### Phase 3: Enterprise (10,000+ employees)
- Table partitioning by tenant
- Dedicated database instances for large tenants
- CDN for static assets
- Advanced observability and alerting

---

## Testing Strategy

### Unit Tests
- Jest for business logic
- React Testing Library for components
- Target: 80% code coverage

### Integration Tests
- API endpoint testing with Supertest
- Database integration with test containers
- Mock external services (Auth0, email)

### E2E Tests
- Playwright for critical user flows
- Run on PR and pre-deployment
- Test across browsers (Chrome, Firefox, Safari)

### Performance Tests
- Load testing with k6
- Stress test key endpoints (timesheets, reports)
- Database query performance monitoring

---

## Documentation

### Code Documentation
- TSDoc for all public APIs
- Storybook for UI components
- Architecture Decision Records (ADRs)

### API Documentation
- OpenAPI/Swagger for REST endpoints
- Auto-generated from NestJS decorators
- Example requests and responses

### Runbooks
- Deployment procedures
- Rollback procedures
- Incident response playbooks
- Database migration guides

---

## Project Timeline (Estimated)

### Phase 1: Foundation (Weeks 1-4)
- Project setup and infrastructure
- Authentication module
- User and Employee management
- Basic dashboard

### Phase 2: Core Operations (Weeks 5-8)
- Timesheet module
- Leave management
- Project management
- Client management

### Phase 3: Advanced Features (Weeks 9-12)
- Performance management
- Invoice/billing
- Payroll
- Reports and analytics

### Phase 4: Polish & Launch (Weeks 13-16)
- Notification system
- Settings and configuration
- Security audit
- Performance optimization
- User acceptance testing
- Production launch

---

## Team Roles & Responsibilities

### Frontend Team
- Next.js application development
- Ant Design component customization
- TanStack Query data fetching
- Storybook documentation

### Backend Team
- API development (Route Handlers → NestJS)
- Database schema design
- Background jobs (BullMQ)
- Authentication integration

### DevOps Team
- Terraform infrastructure
- CI/CD pipelines
- Monitoring and observability
- Database operations

### QA Team
- Test plan creation
- Automated test development
- Security testing
- Performance testing

---

## Success Metrics

### Technical KPIs
- API response time: p95 < 500ms
- Uptime: 99.9%
- Error rate: < 0.1%
- Test coverage: > 80%

### Business KPIs
- Time to onboard new tenant: < 5 minutes
- Employee time entry completion rate: > 95%
- Invoice generation accuracy: > 99%
- User satisfaction score: > 4.5/5

---

## Future Enhancements (Post-MVP)

- Mobile applications (React Native)
- Advanced analytics with ML (predictive utilization)
- Integration marketplace (Slack, Teams, JIRA)
- White-label capabilities
- Multi-currency and multi-language support
- Advanced reporting with custom report builder
- Workflow automation engine
- Document management system
- Learning management system (LMS)

---

## Support & Maintenance

### Support Channels
- In-app chat support
- Email support with SLA
- Knowledge base and documentation
- Video tutorials

### Maintenance Windows
- Scheduled maintenance: Saturday 2-4 AM UTC
- Emergency patches: As needed with notifications
- Database backups: Continuous with point-in-time recovery

### Monitoring & Alerts
- 24/7 system monitoring
- PagerDuty for critical alerts
- Weekly health reports
- Monthly performance reviews

---

**Project Repository**: `zenora-employee-management`  
**Documentation**: `/docs`  
**API Docs**: `/api-docs`  
**Storybook**: `https://storybook.zenora.ai`

---

*This document is maintained by the engineering team and updated as the architecture evolves.*