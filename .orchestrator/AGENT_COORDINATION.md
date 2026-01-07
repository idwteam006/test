# Agent Coordination Workflow

This document describes how the Master Orchestrator coordinates with specialized agents to build the Zenora.ai Employee Management System.

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Master Orchestrator                       │
│  - Project state management                                  │
│  - Agent coordination                                        │
│  - Task assignment                                           │
│  - Conflict resolution                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │ 12 Specialized Agents│
        └──────────┬──────────┘
                   │
    ┌──────────────┼──────────────┬──────────────┬──────────────┬──────────┐
    │              │              │              │              │          │
┌───▼───┐    ┌────▼────┐    ┌───▼────┐    ┌───▼────┐    ┌───▼────┐  ┌──▼───┐
│System │    │Database │    │  API   │    │ Auth   │    │  Code  │  │ UI/UX│
│Archit.│    │Designer │    │Designer│    │Special.│    │Reviewer│  │Spec. │
└───────┘    └─────────┘    └────────┘    └────────┘    └────────┘  └──────┘
    │              │              │              │              │          │
┌───▼───────┐ ┌──▼─────────┐ ┌──▼──────┐  ┌───▼─────┐  ┌───▼────────┐  │
│ Frontend  │ │  Backend   │ │ Module  │  │ Testing │  │  Security  │  │
│ Designer  │ │    Core    │ │ Builder │  │Specialist│  │ Specialist │  │
└───────────┘ └────────────┘ └─────────┘  └─────────┘  └────────────┘  │
                                                                         │
                           All coordinated by Master Orchestrator ──────┘
```

## Available Agents

### 1. Master Orchestrator
**File**: `.agents/master-orchestrator.md`

**Role**: Project coordinator and state manager

**Responsibilities**:
- Track module completion
- Assign tasks to specialized agents
- Resolve conflicts
- Update documentation
- Maintain project consistency

**When Active**: Always (main coordination agent)

---

### 2. System Architect
**File**: `.agents/system-architect.md`

**Role**: High-level system design and architecture

**Responsibilities**:
- Design scalable system architecture
- Make technology choices
- Define architectural patterns
- Create design documents
- Document trade-offs

**When to Use**:
- Starting new modules
- Major architectural decisions
- Technology evaluation
- System redesign
- Performance planning

**Example Task**:
```
TO: system-architect
TASK: Design authentication system architecture

CONTEXT:
- Custom JWT-based authentication
- Multi-tenant system
- Redis for sessions
- bcrypt for passwords

DELIVERABLES:
- Architecture document
- Authentication flow diagram
- Security considerations
- Technology recommendations
```

---

### 3. Database Designer
**File**: `.agents/database-designer.md`

**Role**: Database schema design and optimization

**Responsibilities**:
- Design Prisma schemas
- Create database migrations
- Optimize queries
- Plan indexes
- Ensure multi-tenancy

**When to Use**:
- Adding/modifying database models
- Schema migrations
- Query optimization
- Index design
- Data modeling

**Example Task**:
```
TO: database-designer
TASK: Create timesheet database schema

CONTEXT:
- Module: timesheet
- Features: Time entries, approval workflow, weekly view
- Dependencies: Employee, Project models

DELIVERABLES:
- Prisma schema updates
- Migration file
- Index design
- Performance analysis
```

---

### 4. API Designer
**File**: `.agents/api-designer.md`

**Role**: RESTful API design and implementation

**Responsibilities**:
- Design API endpoints
- Create Zod validation schemas
- Implement API routes
- Design error handling
- Create API documentation

**When to Use**:
- Creating new API endpoints
- Designing request/response formats
- API validation
- Error handling
- Rate limiting

**Example Task**:
```
TO: api-designer
TASK: Implement timesheet CRUD API

CONTEXT:
- Database schema: TimeEntry model ready
- Features: CRUD operations, approval endpoints
- Security: JWT auth, tenant filtering

DELIVERABLES:
- API route files
- Zod validation schemas
- Error handling
- API documentation
```

---

### 5. Auth Specialist
**File**: `.agents/auth-specialist.md`

**Role**: Authentication and security specialist

**Responsibilities**:
- Design auth flows
- Implement JWT strategies
- Security audits
- Vulnerability scanning
- Security best practices

**When to Use**:
- Authentication implementation
- Security reviews
- Authorization design
- Vulnerability audits
- Security incidents

**Example Task**:
```
TO: auth-specialist
TASK: Security audit of timesheet API

CONTEXT:
- New timesheet endpoints implemented
- Multi-tenant system
- JWT authentication

DELIVERABLES:
- Security audit report
- Vulnerability assessment
- Recommendations
- Risk analysis
```

---

### 6. Code Reviewer
**File**: `.agents/code-reviewer.md`

**Role**: Code quality and standards compliance

**Responsibilities**:
- Review code quality
- Check standards compliance
- Security review
- Performance review
- Architecture compliance

**When to Use**:
- Before merging features
- After implementation
- Quality assurance
- Standards enforcement
- Pre-deployment review

**Example Task**:
```
TO: code-reviewer
TASK: Review timesheet API implementation

CONTEXT:
- Files: app/api/timesheets/**/*.ts
- Implementation: Complete CRUD + approval
- Standards: REST, Zod validation, tenant filtering

DELIVERABLES:
- Code review report
- Approval/rejection decision
- Required changes list
- Quality metrics
```

---

### 7. Frontend Designer
**File**: `.agents/frontend-designer.md`

**Role**: React/Next.js component implementation

**Responsibilities**:
- Implement React components
- Create TanStack Query hooks
- Implement Zustand stores
- Build forms with React Hook Form + Zod
- Integrate with Ant Design
- Component testing

**When to Use**:
- Implementing UI components
- Creating data fetching hooks
- Building forms
- Client state management
- Component testing

**Example Task**:
```
TO: frontend-designer
TASK: Implement timesheet entry form

CONTEXT:
- API endpoint: POST /api/timesheets
- Fields: date, hours, project, description
- Validation: Zod schema
- UI framework: Ant Design

DELIVERABLES:
- TimesheetEntryForm component
- useCreateTimesheet hook
- Form validation
- Component tests
```

---

### 8. Backend Core Developer
**File**: `.agents/backend-core-developer.md`

**Role**: Business logic and background processing

**Responsibilities**:
- Implement service layer
- Create BullMQ workers
- Design Redis caching strategies
- Business logic implementation
- Background job processing
- Data validation utilities

**When to Use**:
- Complex business logic
- Background job creation
- Caching implementation
- Service layer design
- Data processing

**Example Task**:
```
TO: backend-core-developer
TASK: Implement payroll calculation service

CONTEXT:
- Calculate monthly payroll
- Process timesheet data
- Handle deductions
- Queue email notifications

DELIVERABLES:
- PayrollService class
- BullMQ worker for processing
- Redis caching for calculations
- Validation utilities
```

---

### 9. UI/UX Specialist
**File**: `.agents/ui-ux-specialist.md`

**Role**: Design consistency and accessibility

**Responsibilities**:
- Ensure design system compliance
- Accessibility audits (WCAG 2.1)
- User experience optimization
- Mobile responsiveness
- Design pattern enforcement

**When to Use**:
- Design system reviews
- Accessibility audits
- User flow optimization
- Mobile design
- Visual consistency checks

**Example Task**:
```
TO: ui-ux-specialist
TASK: Accessibility audit of employee dashboard

CONTEXT:
- Component: EmployeeDashboard
- Requirements: WCAG 2.1 AA
- Screen readers support
- Keyboard navigation

DELIVERABLES:
- Accessibility audit report
- Required fixes
- Design improvements
- ARIA attributes checklist
```

---

### 10. Module Builder
**File**: `.agents/module-builder.md`

**Role**: End-to-end feature coordination

**Responsibilities**:
- Coordinate full-stack features
- Database → API → Frontend flow
- Integration testing
- Feature documentation
- Cross-layer consistency

**When to Use**:
- Complete module implementation
- Complex features spanning all layers
- New module creation
- Feature integration

**Example Task**:
```
TO: module-builder
TASK: Implement complete Leave Management module

CONTEXT:
- Module spec: modules/leave.md
- Dependencies: Employee module
- Scope: Database, API, UI, tests

DELIVERABLES:
- Complete leave management feature
- Database schema
- API endpoints
- React components
- Integration tests
```

---

### 11. Testing Specialist
**File**: `.agents/testing-specialist.md`

**Role**: Test implementation and coverage

**Responsibilities**:
- Write unit tests (Jest)
- Write integration tests (API)
- Write E2E tests (Playwright)
- Monitor test coverage (80%+)
- Create test utilities
- CI/CD test integration

**When to Use**:
- Test creation
- Coverage monitoring
- Test infrastructure
- Test utility creation
- CI/CD setup

**Example Task**:
```
TO: testing-specialist
TASK: Create test suite for timesheet API

CONTEXT:
- API routes: /api/timesheets/*
- Coverage target: 80%+
- Test types: Unit + Integration

DELIVERABLES:
- Unit tests for endpoints
- Integration tests for workflows
- Test utilities
- Coverage report
```

---

### 12. Security Specialist
**File**: `.agents/security-specialist.md`

**Role**: Security audits and compliance

**Responsibilities**:
- Security audits (comprehensive)
- Vulnerability scanning (OWASP Top 10)
- Penetration testing
- Security best practices enforcement
- Compliance verification (GDPR, SOC 2)
- Security incident response

**When to Use**:
- Security audits
- Vulnerability assessments
- Compliance reviews
- Penetration testing
- Security incident investigation

**Example Task**:
```
TO: security-specialist
TASK: Comprehensive security audit of authentication system

CONTEXT:
- Custom JWT authentication
- Redis session management
- Multi-tenant system
- Compliance: GDPR, SOC 2

DELIVERABLES:
- Security audit report
- Vulnerability assessment
- Penetration test results
- Remediation recommendations
```

---

## Typical Development Workflows

### Workflow 1: New Feature Implementation

**Example**: Add "Employee Bulk Import" feature

```
1. Master Orchestrator:
   - Read modules/employee.md
   - Check for existing implementation
   - Create execution plan

2. System Architect:
   - Design bulk import approach
   - CSV parsing strategy
   - Error handling design
   - Validation strategy

3. Database Designer:
   - Review Employee schema
   - Check constraints
   - Plan for validation

4. API Designer:
   - Create POST /api/employees/bulk-import
   - Zod schema for CSV data
   - Validation error responses
   - Progress tracking endpoint

5. Auth Specialist:
   - Security review
   - Authorization check (admin only)
   - Rate limiting (prevent abuse)
   - Audit logging

6. Code Reviewer:
   - Review implementation
   - Check error handling
   - Verify tenant filtering
   - Approve/request changes

7. Master Orchestrator:
   - Update modules/employee.md
   - Update project-state.json
   - Document in decisions.md
```

---

### Workflow 2: Security Audit

**Example**: Audit authentication system

```
1. Master Orchestrator:
   - Identify security-critical components
   - Assign to Auth Specialist

2. Auth Specialist:
   - Review JWT implementation
   - Check password hashing
   - Review token storage
   - Scan for vulnerabilities
   - Test rate limiting
   - Check OWASP Top 10

3. Auth Specialist → Master Orchestrator:
   - Security audit report
   - Vulnerability findings
   - Recommendations
   - Risk assessment

4. Master Orchestrator:
   - Prioritize fixes
   - Assign fixes to API Designer
   - Track remediation

5. Code Reviewer:
   - Verify fixes
   - Approve changes

6. Auth Specialist:
   - Re-audit after fixes
   - Final approval
```

---

### Workflow 3: Performance Optimization

**Example**: Optimize slow timesheet queries

```
1. Master Orchestrator:
   - Identify performance issue
   - Gather metrics
   - Assign to appropriate agents

2. Database Designer:
   - Analyze query patterns
   - Review indexes
   - Identify N+1 queries
   - Design optimization strategy

3. API Designer:
   - Implement optimizations
   - Add caching where appropriate
   - Update queries

4. Code Reviewer:
   - Review changes
   - Verify optimizations
   - Check for side effects

5. Master Orchestrator:
   - Verify performance improvement
   - Document optimization
   - Update benchmarks
```

---

### Workflow 4: Module Development (Complete Feature)

**Example**: Implement Leave Management Module

```
1. Master Orchestrator:
   - Read modules/leave.md
   - Check dependencies (Employee module)
   - Create execution plan
   - Assign tasks to agents

2. System Architect:
   - Design leave management architecture
   - Leave types, accruals, balances
   - Approval workflow
   - Calendar integration

3. Database Designer:
   - Create LeaveRequest model
   - Create LeaveBalance model
   - Define LeaveType enum
   - Plan indexes

4. API Designer:
   - Implement leave request endpoints
   - Implement balance endpoints
   - Approval workflow endpoints
   - Validation schemas

5. Auth Specialist:
   - Review authorization (employees vs managers)
   - Check data privacy
   - Audit logging

6. Code Reviewer:
   - Review database schema
   - Review API implementation
   - Check error handling
   - Verify tenant filtering
   - Approve implementation

7. Master Orchestrator:
   - Update modules/leave.md (mark completed)
   - Update project-state.json
   - Document decisions
   - Update completion percentage
```

---

## Agent Communication Protocol

### Request Format
```
FROM: [source-agent]
TO: [target-agent]
TASK: [Brief task description]

CONTEXT:
- Module: [module-name]
- Current State: [summary]
- Dependencies: [list]
- Constraints: [list]

DELIVERABLES:
- [Deliverable 1]
- [Deliverable 2]

EXPECTED OUTPUT FORMAT:
[Description of expected format]

DEADLINE: [If time-critical]
```

### Response Format
```
FROM: [agent-name]
TO: master-orchestrator
STATUS: [Completed | In Progress | Blocked | Failed]

DELIVERABLES:
1. [Deliverable 1]: [Location/Description]
2. [Deliverable 2]: [Location/Description]

KEY DECISIONS:
- [Decision 1]
- [Decision 2]

ISSUES FOUND:
- [Issue 1]
- [Issue 2]

RECOMMENDATIONS:
- [Recommendation 1]
- [Recommendation 2]

NEXT STEPS:
- [Next step 1]
- [Next step 2]
```

---

## Agent Coordination Rules

### 1. Sequential Dependencies
When agents depend on each other's output:
```
Database Designer → API Designer → Code Reviewer
```
Master Orchestrator waits for each agent to complete before launching next.

### 2. Parallel Execution
When agents work independently:
```
┌─ System Architect (design)
│
├─ Database Designer (schema)
│
└─ Auth Specialist (security review)
```
Master Orchestrator can launch all in parallel.

### 3. Review Loops
When code reviewer requests changes:
```
API Designer → Code Reviewer
       ↑            ↓
       └────(fixes)─┘
```
Master Orchestrator manages the feedback loop.

### 4. Conflict Resolution
When agents disagree:
```
Database Designer: "Use separate table"
        ↓
System Architect: "Use JSON field"
        ↓
Master Orchestrator: Evaluates trade-offs, makes decision
        ↓
Documents decision in .orchestrator/decisions.md
```

---

## State Management

### Project State File
**Location**: `.orchestrator/project-state.json`

Updated by Master Orchestrator after each significant action.

### Agent Task Tracking
**Location**: `.orchestrator/agent-tasks.json`

Tracks active and completed agent tasks.

### Architecture Decisions
**Location**: `.orchestrator/decisions.md`

Documents all major decisions with rationale.

### Module Documentation
**Location**: `modules/*.md`

Updated by agents as features are implemented.

---

## Best Practices

### For Master Orchestrator
1. Always check module.md before assigning tasks
2. Verify dependencies are satisfied
3. Provide complete context to agents
4. Track agent progress
5. Update documentation after completion
6. Resolve conflicts promptly

### For Specialized Agents
1. Always read context before starting
2. Follow project conventions
3. Document decisions
4. Report back with clear status
5. Recommend improvements
6. Escalate blockers to Master Orchestrator

### For All Agents
1. Communicate clearly and concisely
2. Document all work
3. Think about security
4. Consider performance
5. Maintain consistency
6. Test thoroughly

---

## Troubleshooting

### Agent Not Responding
1. Check agent configuration file
2. Verify task format
3. Check dependencies
4. Escalate to Master Orchestrator

### Conflicting Recommendations
1. Master Orchestrator mediates
2. Review project requirements
3. Consider trade-offs
4. Document decision
5. Inform all agents

### Quality Issues
1. Code Reviewer identifies issues
2. Master Orchestrator assigns fixes
3. Original agent makes corrections
4. Code Reviewer re-reviews
5. Approved only when passing

---

## Success Metrics

### Agent Efficiency
- Task completion time
- Number of review iterations
- Quality of deliverables

### Coordination Effectiveness
- Communication clarity
- Conflict resolution time
- Documentation quality

### Project Progress
- Module completion rate
- Feature velocity
- Code quality metrics

---

## Complete Agent Roster

**Total Agents: 12**

**Core Development (5 agents)**:
1. Master Orchestrator - Project coordination
2. System Architect - High-level design
3. Database Designer - Schema and queries
4. API Designer - RESTful endpoints
5. Auth Specialist - Security and authentication

**Code Quality (1 agent)**:
6. Code Reviewer - Standards and quality

**Frontend (2 agents)**:
7. Frontend Designer - React/Next.js components
8. UI/UX Specialist - Design system and accessibility

**Backend (1 agent)**:
9. Backend Core Developer - Business logic and jobs

**Integration (3 agents)**:
10. Module Builder - End-to-end features
11. Testing Specialist - Test creation and coverage
12. Security Specialist - Security audits and compliance

---

## Future Agent Additions

As the project grows, consider adding:

- **Performance Optimizer**: Performance analysis and tuning
- **Documentation Agent**: Technical documentation
- **DevOps Agent**: CI/CD and infrastructure
- **Migration Agent**: Database migration management
- **Analytics Agent**: Usage analytics and monitoring

---

*This coordination system ensures high-quality, consistent development across the Zenora.ai platform while maintaining security, performance, and scalability.*
