# Zenora.ai Employee Management System

A comprehensive, enterprise-grade employee management platform built with Next.js, NestJS, and PostgreSQL for multi-tenant SaaS deployment.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Installation

1. **Clone and install dependencies**
```bash
cd frontend
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. **Start development database**
```bash
docker-compose up -d
```

4. **Run database migrations**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **Start development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
zenora/
├── frontend/              # Next.js application
│   ├── app/              # Next.js App Router
│   ├── components/       # Shared React components
│   ├── lib/              # Utilities and helpers
│   ├── prisma/           # Database schema
│   └── public/           # Static assets
├── modules/              # Module documentation (14 modules)
├── .orchestrator/        # Orchestrator state and decisions
├── .agents/              # Agent configurations
├── docker-compose.yml    # Local dev environment
└── scripts/              # Utility scripts

```

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router, TypeScript)
- **UI Library**: Ant Design
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **Auth**: Custom JWT-based

### Backend
- **Phase 1**: Next.js API Routes
- **Phase 2**: NestJS microservice
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Redis
- **Jobs**: BullMQ

### DevOps
- **Deployment**: Vercel (Frontend) + AWS ECS (Backend)
- **CI/CD**: GitHub Actions
- **Infrastructure**: Terraform
- **Monitoring**: Sentry, OpenTelemetry

## 📦 Modules

1. **Authentication** - User login, SSO, session management
2. **User Management** - User accounts, roles, permissions
3. **Employee Management** - Employee records, org chart
4. **Client Management** - Client relationships, billing info
5. **Project Management** - Projects, tasks, team allocation
6. **Timesheet** - Time tracking, approvals, utilization
7. **Leave Management** - Leave requests, balances, approvals
8. **Performance** - Goals, reviews, 1-on-1s
9. **Invoice/Billing** - Automated invoicing, payment tracking
10. **Payroll** - Salary calculations, pay stubs
11. **Reports & Analytics** - BI, data visualization, exports
12. **Notifications** - Email and in-app notifications
13. **Settings** - System configuration, tenant settings
14. **Dashboard** - Role-based dashboards with KPIs

See `/modules/*.md` for detailed module documentation.

## 🛠️ Development Commands

```bash
# Frontend development
npm run dev              # Start Next.js dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking

# Database
npx prisma studio        # Open Prisma Studio (DB GUI)
npx prisma migrate dev   # Create and apply migration
npx prisma generate      # Generate Prisma Client

# Testing
npm run test             # Run unit tests
npm run test:e2e         # Run Playwright E2E tests
npm run test:coverage    # Generate coverage report

# Storybook
npm run storybook        # Start Storybook dev server
npm run build-storybook  # Build Storybook static site
```

## 🗄️ Database

### Local Development
PostgreSQL and Redis run in Docker containers:
```bash
docker-compose up -d         # Start services
docker-compose down          # Stop services
docker-compose logs -f       # View logs
```

Access tools:
- **PgAdmin**: [http://localhost:5050](http://localhost:5050) (admin@zenora.ai / admin)
- **Redis Commander**: [http://localhost:8081](http://localhost:8081)
- **Prisma Studio**: `npx prisma studio`

### Multi-Tenancy
- Shared schema with `tenantId` on all tables
- Row-Level Security (RLS) with PostgreSQL
- Session-scoped tenant context
- Table partitioning for heavy tables

## 🔐 Authentication

Using custom JWT-based authentication:
- JWT tokens stored in httpOnly cookies
- Access tokens (15 min expiry) + Refresh tokens (7 days)
- Password hashing with bcrypt
- Redis for token blacklisting and session management
- Rate limiting on auth endpoints

**Setup**: Configure `JWT_SECRET` and `JWT_REFRESH_SECRET` in `.env.local`

## 🚀 Deployment

### Frontend (Vercel)
```bash
vercel deploy
```

### Backend (AWS ECS - Phase 2)
```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

## 📊 Monitoring & Observability

- **Error Tracking**: Sentry
- **Performance**: OpenTelemetry
- **Logging**: Structured logs with correlation IDs
- **Metrics**: Custom business KPIs

## 🧪 Testing Strategy

- **Unit Tests**: Jest + React Testing Library
- **Integration Tests**: Supertest
- **E2E Tests**: Playwright
- **Coverage Target**: 80%

## 📖 Documentation

- **API Docs**: `/api-docs` (Swagger/OpenAPI)
- **Storybook**: Component documentation
- **Module Docs**: `/modules/*.md`
- **Architecture Decisions**: `.orchestrator/decisions.md`

## 🤝 Contributing

1. Create feature branch from `main`
2. Make changes following existing patterns
3. Write tests
4. Submit PR with description
5. Pass CI/CD checks
6. Get code review approval

## 📝 License

Proprietary - Zenora.ai

## 👥 Support

- **Documentation**: `/docs`
- **Issues**: GitHub Issues
- **Email**: support@zenora.ai

---

**Built with ❤️ by the Zenora.ai Team**
