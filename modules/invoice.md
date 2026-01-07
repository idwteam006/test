# Invoice/Billing Module

## Status Overview
- Overall Completion: 0%
- Backend: 📋 Planned
- Frontend: 📋 Planned
- Tests: 📋 Planned

## Module Purpose
Automated invoicing from timesheets, payment tracking, and billing reports

## Implemented Features

_No features implemented yet_

## Database Schema

**Prisma Models**: `Invoice`, `InvoiceLineItem` (see `/frontend/prisma/schema.prisma`)

## Pending Features

### 1. Invoice Generation
- [ ] Auto-generate from approved timesheets
- [ ] Manual invoice creation
- [ ] Invoice templates (customizable)
- [ ] Tax calculations
- [ ] Discount application
- [ ] Multiple currencies
- [ ] Invoice numbering (auto-increment)
- [ ] PDF generation

### 2. Invoice Management
- [ ] Send invoices via email
- [ ] Invoice preview
- [ ] Track payment status (Draft, Sent, Paid, Overdue)
- [ ] Payment recording
- [ ] Overdue notifications
- [ ] Invoice history
- [ ] Credit notes/refunds

### 3. Billing Reports
- [ ] Revenue by client
- [ ] Revenue by project
- [ ] Outstanding invoices
- [ ] Payment tracking
- [ ] Aging reports (30/60/90 days)
- [ ] Cash flow forecasting

### 4. Background Jobs (BullMQ)
- [ ] Monthly invoice generation
- [ ] Payment reminder emails
- [ ] Overdue invoice alerts
- [ ] Recurring invoice automation

## API Endpoints (Planned)
- `GET /api/invoices` - List invoices
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice (Draft only)
- `POST /api/invoices/:id/send` - Send invoice to client
- `POST /api/invoices/:id/pay` - Record payment
- `GET /api/invoices/:id/pdf` - Download PDF
- `POST /api/invoices/generate-from-timesheets` - Auto-generate

## Frontend Components (Planned)
- InvoiceList: `/app/features/invoices/components/InvoiceList.tsx`
- InvoiceForm: `/app/features/invoices/components/InvoiceForm.tsx`
- InvoiceDetail: `/app/features/invoices/components/InvoiceDetail.tsx`
- InvoicePreview: `/app/features/invoices/components/InvoicePreview.tsx`
- InvoiceReports: `/app/features/invoices/components/InvoiceReports.tsx`

## Dependencies
- Client Management Module (required)
- Project Management Module (required)
- Timesheet Module (required for auto-generation)

## Integration Points
- Used by: Reports, Dashboard
- Integrates with: Clients, Projects, Timesheets

## Notes
- Invoice templates should support company branding
- PDF generation library needed (e.g., puppeteer, jsPDF)
- Integration with payment gateways (Stripe, PayPal) in future
- Tax calculation rules vary by jurisdiction
- Consider multi-currency support
