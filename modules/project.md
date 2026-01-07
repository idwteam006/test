# Project Management Module

## Status Overview
- Overall Completion: 0%
- Backend: 📋 Planned
- Frontend: 📋 Planned
- Tests: 📋 Planned

## Module Purpose
Project tracking, team allocation, task management, and budget monitoring

## Implemented Features

_No features implemented yet_

## Database Schema

**Prisma Models**: `Project`, `Task`, `ProjectAssignment` (see `/frontend/prisma/schema.prisma`)

## Pending Features

### 1. Project Setup
- [ ] Create new projects
- [ ] Project name and description
- [ ] Client association
- [ ] Budget allocation (hours/cost)
- [ ] Start/end dates
- [ ] Project status tracking

### 2. Task Management
- [ ] Create tasks
- [ ] Assign tasks to team members
- [ ] Task status updates
- [ ] Progress tracking
- [ ] Due dates
- [ ] Task dependencies

### 3. Team Assignment
- [ ] Assign employees to projects
- [ ] Define billable rates per employee
- [ ] Set project roles
- [ ] Project access permissions
- [ ] Team capacity planning

### 4. Budget Tracking
- [ ] Budget vs. actual hours
- [ ] Budget vs. actual cost
- [ ] Budget alerts
- [ ] Burn rate calculation

## API Endpoints (Planned)
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project by ID
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Archive project
- `GET /api/projects/:id/tasks` - Get project tasks
- `POST /api/projects/:id/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `POST /api/projects/:id/assignments` - Assign employee to project
- `GET /api/projects/:id/budget` - Get budget summary

## Frontend Components (Planned)
- ProjectList: `/app/features/projects/components/ProjectList.tsx`
- ProjectForm: `/app/features/projects/components/ProjectForm.tsx`
- ProjectDetail: `/app/features/projects/components/ProjectDetail.tsx`
- TaskBoard: `/app/features/projects/components/TaskBoard.tsx`
- TaskForm: `/app/features/projects/components/TaskForm.tsx`
- TeamAssignment: `/app/features/projects/components/TeamAssignment.tsx`
- BudgetTracker: `/app/features/projects/components/BudgetTracker.tsx`

## Dependencies
- Client Management Module (required)
- Employee Management Module (required)

## Integration Points
- Used by: Timesheet, Invoice/Billing, Reports
- Integrates with: Clients, Employees, Time Entries

## Notes
- Project budgets should trigger alerts at 75%, 90%, 100%
- Task board should support drag-and-drop
- Consider Gantt chart view for timeline visualization
- Project templates may be useful for recurring project types
