/**
 * Utility functions for timesheet data normalization
 */

/**
 * Normalize workDate to YYYY-MM-DD format to prevent timezone conversion issues
 *
 * When dates are stored as Date objects and serialized to JSON, they become ISO strings
 * like "2025-12-08T00:00:00.000Z". When parsed on the client in different timezones,
 * this can cause the date to shift (e.g., Dec 8 in UTC becomes Dec 7 in Canada EST).
 *
 * By normalizing to just the date part (YYYY-MM-DD), we ensure consistent date display
 * across all timezones.
 */
export function normalizeDateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a Date object to YYYY-MM-DD using UTC components
 * This prevents timezone shifts that occur with date-fns format()
 *
 * IMPORTANT: Use this for API query parameters instead of format(date, 'yyyy-MM-dd')
 *
 * Example issue:
 * - Date: Mon Dec 08 2025 (in PST timezone)
 * - format(date, 'yyyy-MM-dd') → "2025-12-07" (WRONG - shifted to previous day!)
 * - formatDateUTC(date) → "2025-12-08" (CORRECT - uses UTC)
 */
export function formatDateUTC(date: Date): string {
  // Use UTC methods to get components without timezone conversion
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalize a single timesheet entry's workDate field
 */
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

/**
 * Normalize an array of timesheet entries' workDate fields
 */
export function normalizeTimesheetEntries<T extends { workDate: Date | string }>(
  entries: T[]
): Array<T & { workDate: string }> {
  return entries.map(normalizeTimesheetEntry);
}
