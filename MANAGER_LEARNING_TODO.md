# Manager/Admin Learning Page Update Requirements

## Current Status
✅ **Backend is FULLY READY** - All APIs support managers/admins submitting and reviewing courses
✅ Root-level auto-approval is working  
⚠️ Frontend needs UI update to expose course submission form

## What Works Now
1. Managers/Admins CAN submit courses via `/api/employee/courses` POST
2. Root-level users get auto-approved courses
3. Non-root users' courses go to manager for review
4. Team review functionality exists at `/manager/learning`

## What Needs to be Added

### Pages to Update
1. `/frontend/app/manager/learning/page.tsx`
2. `/frontend/app/admin/learning/page.tsx`

### Required Changes
Both pages need a **tabbed interface** with two tabs:

#### Tab 1: "My Learning"
- Copy the submission form from `/frontend/app/employee/learning/page.tsx`
- Uses `/api/employee/courses` POST for submission
- Uses `/api/employee/courses` GET to fetch own courses
- Shows: Submit Course button, My Courses list with status

#### Tab 2: "Team Review"  
- Keep existing team review functionality
- Uses `/api/manager/courses` GET to fetch team submissions
- Uses `/api/manager/courses` PUT to review submissions
- Shows: Team submissions pending review

### Implementation Pattern
```typescript
<Tabs defaultValue="my-learning">
  <TabsList>
    <TabsTrigger value="my-learning">My Learning</TabsTrigger>
    <TabsTrigger value="team-review">Team Review</TabsTrigger>
  </TabsList>
  
  <TabsContent value="my-learning">
    {/* Course submission form + My courses list */}
  </TabsContent>
  
  <TabsContent value="team-review">
    {/* Existing team review interface */}
  </TabsContent>
</Tabs>
```

## Testing the Backend (Works Now!)

You can test that managers CAN already submit courses:

1. Login as a manager
2. Use browser console or Postman:
```javascript
fetch('/api/employee/courses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    courseTitle: 'Test Course',
    category: 'TECHNICAL',
    completionDate: '2025-12-10'
  })
})
```

3. Check response - should succeed!
4. For root-level managers, course will be auto-approved
5. For non-root managers, course goes to their manager for review

## Files Reference
- Employee page (has form): `frontend/app/employee/learning/page.tsx`
- Manager page (needs update): `frontend/app/manager/learning/page.tsx`
- Admin page (needs update): `frontend/app/admin/learning/page.tsx`
- Tabs component: `@/components/ui/tabs` (already installed)

