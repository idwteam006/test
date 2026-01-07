# Client Management Module

## Status Overview
- Overall Completion: 0%
- Backend: 📋 Planned
- Frontend: 📋 Planned
- Tests: 📋 Planned

## Module Purpose
Manage client relationships, billing information, and contract terms

## Implemented Features

_No features implemented yet_

## Database Schema

**Prisma Model**: `Client` (see `/frontend/prisma/schema.prisma`)

## Pending Features

### 1. Client Profiles
- [ ] Company name and details
- [ ] Primary contact information
- [ ] Billing address
- [ ] Contract terms
- [ ] Tax information

### 2. Rate Management
- [ ] Hourly rates by project
- [ ] Currency settings
- [ ] Payment terms (Net 30, Net 60, etc.)
- [ ] Discount agreements
- [ ] Rate cards

### 3. Client Operations
- [ ] Add new clients
- [ ] Edit client details
- [ ] View client list
- [ ] Search and filter clients
- [ ] Project association
- [ ] Active/inactive status
- [ ] Client history

## API Endpoints (Planned)
- `GET /api/clients` - List all clients
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Deactivate client
- `GET /api/clients/:id/projects` - Get client's projects
- `GET /api/clients/:id/invoices` - Get client's invoices

## Frontend Components (Planned)
- ClientList: `/app/features/clients/components/ClientList.tsx`
- ClientForm: `/app/features/clients/components/ClientForm.tsx`
- ClientProfile: `/app/features/clients/components/ClientProfile.tsx`
- ClientSelector: `/app/features/clients/components/ClientSelector.tsx`

## Dependencies
- None (standalone module)

## Integration Points
- Used by: Project Management, Invoice/Billing
- Integrates with: Projects, Invoices

## Notes
- Clients can have multiple projects
- Billing address stored as JSON for flexibility
- Currency conversion may be needed in future
- Payment terms affect invoice due dates
