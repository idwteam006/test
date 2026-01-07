# Payroll Module

## Status Overview
- Overall Completion: 0%
- Backend: 📋 Planned
- Frontend: 📋 Planned
- Tests: 📋 Planned

## Module Purpose
Salary calculations, payroll processing, and pay stub generation

## Implemented Features

_No features implemented yet_

## Database Schema

**Prisma Model**: `PayrollRecord` (see `/frontend/prisma/schema.prisma`)

## Pending Features

### 1. Basic Payroll
- [ ] Salary calculations
- [ ] Hourly rate calculations
- [ ] Overtime calculations
- [ ] Bonus payments
- [ ] Deductions (tax, insurance, etc.)
- [ ] Net pay calculation
- [ ] Payroll processing workflow

### 2. Payroll Configuration
- [ ] Salary components setup
- [ ] Tax brackets
- [ ] Deduction rules
- [ ] Pay frequencies (weekly, bi-weekly, monthly)
- [ ] Bank account management

### 3. Payroll Reports
- [ ] Monthly payroll summary
- [ ] Employee pay stubs
- [ ] Tax reports
- [ ] Year-end statements
- [ ] Export payroll data (CSV, PDF)

### 4. Compliance
- [ ] Tax compliance reports
- [ ] Payroll audit trail
- [ ] Government reporting
- [ ] W-2/1099 generation (US)

## API Endpoints (Planned)
- `GET /api/payroll` - List payroll records
- `GET /api/payroll/:id` - Get payroll details
- `POST /api/payroll/process` - Process payroll for period
- `GET /api/payroll/employee/:id` - Get employee pay history
- `GET /api/payroll/:id/paystub` - Download pay stub PDF
- `GET /api/payroll/reports/summary` - Payroll summary report

## Frontend Components (Planned)
- PayrollDashboard: `/app/features/payroll/components/PayrollDashboard.tsx`
- PayrollProcessor: `/app/features/payroll/components/PayrollProcessor.tsx`
- PayStub: `/app/features/payroll/components/PayStub.tsx`
- PayrollReports: `/app/features/payroll/components/PayrollReports.tsx`
- SalaryConfiguration: `/app/features/payroll/components/SalaryConfiguration.tsx`

## Dependencies
- Employee Management Module (required)
- Timesheet Module (for hourly calculations)

## Integration Points
- Used by: Reports, Dashboard
- Integrates with: Employees, Timesheets

## Notes
- Payroll is highly regulated - consult legal/tax experts
- Consider integration with payroll service providers (ADP, Gusto)
- Sensitive data - requires strong encryption and access controls
- Audit trail is critical for compliance
- May need third-party tax calculation service
- Start with basic calculations, expand with professional services
