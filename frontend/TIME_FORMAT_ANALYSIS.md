# Time Format and Date Format Settings Analysis

## Current Configuration in Database

### Tenant: IDW Team (Vijay's Tenant)
- **Time Format**: `12h` (12-hour with AM/PM)
- **Date Format**: `DD/MM/YYYY` (Day/Month/Year - UK/International format)
- **Timezone**: `America/New_York` (EST/EDT)
- **Week Start Day**: `MONDAY`

### Tenant: ADD Technologies
- **Time Format**: `12h`
- **Date Format**: `MM/DD/YYYY` (Month/Day/Year - US format)
- **Timezone**: `Asia/Kolkata` (IST)
- **Week Start Day**: `MONDAY`

## Key Findings

### 1. Time Format Setting (12h vs 24h)

**Status**: Configured but **NOT actively used** in the application

**Location in Code**:
- Configured in: `/app/admin/settings/page.tsx`
- Stored in: `TenantSettings.timeFormat` field
- Available via: `useTenant()` hook from `TenantContext`

**Current Implementation**:
```typescript
// Time inputs in timesheets use HTML5 native input
<Input
  type="time"
  value={formData.startTime}  // Stored as "HH:MM" (24-hour internally)
/>
```

The browser's native `<input type="time">` displays according to the **user's browser/OS locale**, not the tenant's `timeFormat` setting.

**Impact**:
- User in USA with English locale → sees 12-hour format (2:30 PM)
- User in UK with English locale → sees 24-hour format (14:30)
- **The tenant setting is ignored**

### 2. Date Format Setting (DD/MM/YYYY vs MM/DD/YYYY)

**Status**: Configured but **NOT actively used** in the application

**Location in Code**:
- Configured in: `/app/admin/settings/page.tsx`
- Stored in: `TenantSettings.dateFormat` field
- Available via: `useTenant()` hook

**Current Implementation**:
Dates are formatted using `date-fns` library with hardcoded formats:

```typescript
// From timesheets page
format(day, 'MMMM d, yyyy')  // Always displays as "December 8, 2025"
format(day, 'EEE')            // Always displays as "Mon"
format(day, 'MMM d')          // Always displays as "Dec 8"
```

**Impact**: All users see dates in US format (Month Day, Year), regardless of the tenant's `dateFormat` setting.

### 3. Timezone Setting

**Status**: Configured and **stored**, but NOT actively applied to date/time display

**Location**: `TenantSettings.timezone` field

**Current Value for Vijay's Tenant**: `America/New_York`

**Relationship to Recent Timezone Fix**:
The timezone fix we implemented addresses a **different issue**:
- **Timezone Setting**: Would control which timezone dates/times are DISPLAYED in
- **Timezone Bug Fixed**: Prevented dates from shifting when ISO strings were converted across timezones

The fix ensures dates like "Dec 8, 2025" remain as Dec 8 regardless of where the user is accessing the system from. The timezone setting would (if implemented) control whether times are displayed in EST, IST, UTC, etc.

## Comparison: What's Configured vs What's Used

| Setting | Configured in Admin | Stored in DB | Used in Display | Notes |
|---------|---------------------|--------------|-----------------|-------|
| Time Format | ✅ Yes | ✅ Yes | ❌ No | Browser locale used instead |
| Date Format | ✅ Yes | ✅ Yes | ❌ No | Hardcoded US format used |
| Timezone | ✅ Yes | ✅ Yes | ❌ No | No timezone conversion applied |
| Week Start Day | ✅ Yes | ✅ Yes | ✅ Yes | Actually used in calendar views |

## Why This Matters for the Timesheet Issue

### The Original Problem
When viewing timesheets from Canada, the date showed as **Dec 7** instead of **Dec 8**.

### What We Fixed
We normalized the API responses to return dates as `"2025-12-08"` instead of `"2025-12-08T00:00:00.000Z"`, preventing timezone conversion issues.

### What the Settings Would Do (If Implemented)
1. **Time Format**: Would display times as "2:30 PM" (12h) or "14:30" (24h)
2. **Date Format**: Would display dates as "08/12/2025" (DD/MM/YYYY) or "12/08/2025" (MM/DD/YYYY)
3. **Timezone**: Would convert times from UTC to the tenant's timezone for display

### Current State
- Dates are **timezone-safe** after our fix (always display correctly)
- Time format follows **browser locale** (not tenant setting)
- Date format is **hardcoded** to US format (not tenant setting)
- Week start day **works correctly** (MONDAY is used)

## Recommendations

### Short Term (Already Done ✅)
- ✅ Fixed timezone conversion issues in API responses
- ✅ Dates now display consistently across all timezones

### Medium Term (Future Enhancement)
1. **Implement Date Format Setting**
   - Replace hardcoded `format()` calls with dynamic format based on `settings.dateFormat`
   - Create utility: `formatDateByTenantSetting(date, settings)`

2. **Implement Time Format Setting**
   - Replace native `<input type="time">` with custom time picker that respects `settings.timeFormat`
   - Format displayed times using tenant's preference

3. **Implement Timezone Display**
   - Show times in tenant's configured timezone
   - Display timezone indicator (e.g., "2:30 PM EST")
   - Add timezone conversion for users in different locations

### Example Implementation

```typescript
// Utility function for date formatting
export function formatDateByTenantSetting(date: Date, settings: TenantSettings): string {
  switch (settings.dateFormat) {
    case 'DD/MM/YYYY':
      return format(date, 'dd/MM/yyyy');
    case 'MM/DD/YYYY':
      return format(date, 'MM/dd/yyyy');
    case 'YYYY-MM-DD':
      return format(date, 'yyyy-MM-dd');
    default:
      return format(date, 'MM/dd/yyyy');
  }
}

// Utility function for time formatting
export function formatTimeByTenantSetting(time: string, settings: TenantSettings): string {
  const [hours, minutes] = time.split(':').map(Number);

  if (settings.timeFormat === '12h') {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
```

## Testing Checklist

When implementing tenant settings for display:

- [ ] User in USA with MM/DD/YYYY setting sees dates as "12/08/2025"
- [ ] User in UK with DD/MM/YYYY setting sees dates as "08/12/2025"
- [ ] User with 12h format sees times as "2:30 PM"
- [ ] User with 24h format sees times as "14:30"
- [ ] Timezone conversion works correctly for tenants in different zones
- [ ] Date input fields accept dates in the configured format
- [ ] Dates remain consistent when moving between timezones (no shifting)

## Conclusion

The timezone fix we implemented solves the **critical bug** where dates would shift across timezones. The Time Format and Date Format settings are properly configured and stored, but remain **unimplemented features** waiting for UI integration. These settings would enhance user experience by allowing organizations to customize how dates and times appear according to their regional preferences, but they are not related to the timezone bug that was causing dates to display incorrectly.
