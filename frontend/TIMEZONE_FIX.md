# Timezone Fix for Timesheet Dates

## Problem

When timesheet entries were fetched from the API, the `workDate` field was being returned as a full ISO timestamp string (e.g., `"2025-12-08T00:00:00.000Z"`). When this timestamp was parsed by JavaScript's Date object in different timezones, it could cause the date to shift by one day.

### Example of the Issue:

- **Database**: Stores `2025-12-08T00:00:00.000Z` (UTC midnight on Dec 8)
- **India (IST, UTC+5:30)**: Parses as Dec 8, 5:30 AM → **Displays as Dec 8** ✅
- **Canada (EST, UTC-5)**: Parses as Dec 7, 7:00 PM → **Displays as Dec 7** ❌

## Solution

The fix normalizes all `workDate` fields in API responses to `YYYY-MM-DD` format before sending to the client. This eliminates timezone conversion issues entirely.

### Implementation

Modified all timesheet API endpoints to normalize the `workDate` field:

```typescript
// Before
return NextResponse.json({
  entries: entries,  // workDate is a Date object
});

// After
return NextResponse.json({
  entries: entries.map(entry => ({
    ...entry,
    workDate: entry.workDate.toISOString().split('T')[0],  // "2025-12-08"
  })),
});
```

## Files Modified

### Employee Timesheet APIs
- `/app/api/employee/timesheets/route.ts` (GET, POST)
- `/app/api/employee/timesheets/[id]/route.ts` (GET, PATCH)
- `/app/api/employee/timesheets/bulk/route.ts` (POST)

### Manager Timesheet APIs
- `/app/api/manager/timesheets/pending/route.ts` (GET)
- `/app/api/manager/timesheets/approved/route.ts` (GET)

### Admin Timesheet APIs
- `/app/api/admin/timesheets/pending/route.ts` (GET)
- `/app/api/admin/timesheets/approved/route.ts` (GET)

## Frontend Compatibility

The frontend code was already designed to handle this correctly by extracting the date part from ISO strings:

```typescript
// From frontend/app/employee/timesheets/page.tsx
const getEntriesForDate = (date: Date) => {
  const dateStr = format(date, 'yyyy-MM-dd');
  return entries.filter((e) => {
    // Extract just the date part (YYYY-MM-DD) from the ISO string
    const workDateStr = e.workDate as string;
    const entryDateStr = workDateStr.includes('T')
      ? workDateStr.split('T')[0]
      : workDateStr;
    return entryDateStr === dateStr;
  });
};
```

With the API fix, the frontend code will receive `workDate` in the correct format directly, making the timezone-safe parsing even more reliable.

## Testing

To verify the fix works across timezones:

1. Create a timesheet entry for a specific date (e.g., Dec 8, 2025)
2. Fetch the entry via the API from different timezones
3. Verify the `workDate` field is always `"2025-12-08"` regardless of timezone

## Related Utilities

Created `/lib/timesheet-utils.ts` with helper functions for date normalization:

```typescript
export function normalizeDateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function normalizeTimesheetEntry<T extends { workDate: Date | string }>(
  entry: T
): T & { workDate: string } {
  return {
    ...entry,
    workDate: typeof entry.workDate === 'string' 
      ? entry.workDate 
      : normalizeDateToString(entry.workDate),
  };
}
```

## Best Practices

When adding new timesheet-related API endpoints:

1. Always normalize `workDate` fields in responses using `.toISOString().split('T')[0]`
2. Use the utility functions from `/lib/timesheet-utils.ts` for consistency
3. Test the endpoint in different timezones to ensure dates display correctly

## Impact

This fix ensures that timesheet dates are displayed consistently across all timezones, preventing confusion and data integrity issues for users accessing the system from different geographical locations.
