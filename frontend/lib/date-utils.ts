/**
 * Date Utility Functions
 * Provides timezone-safe date handling to prevent date shifts across timezones
 */

/**
 * Extracts the date string (YYYY-MM-DD) from an ISO date string without timezone conversion
 * This prevents dates from shifting when users are in different timezones
 *
 * @param isoDateString - ISO date string (e.g., "2025-12-07T00:00:00.000Z" or "2025-12-07")
 * @returns Date string in YYYY-MM-DD format
 */
export function extractDateString(isoDateString: string): string {
  if (!isoDateString) return '';
  return isoDateString.includes('T')
    ? isoDateString.split('T')[0]
    : isoDateString;
}

/**
 * Compares an ISO date string with a date to check if they represent the same day
 * Uses string comparison to avoid timezone conversion issues
 *
 * @param isoDateString - ISO date string from API
 * @param dateStr - Date string in YYYY-MM-DD format to compare against
 * @returns boolean indicating if the dates match
 */
export function isSameDateString(isoDateString: string, dateStr: string): boolean {
  return extractDateString(isoDateString) === dateStr;
}

/**
 * Formats a Date object to YYYY-MM-DD string using local timezone
 * This prevents timezone shifts when converting dates to strings
 *
 * @param date - The date to format
 * @returns Date string in YYYY-MM-DD format (local timezone)
 *
 * @example
 * // In PST timezone (UTC-8):
 * const date = new Date('2025-12-08T00:00:00'); // Dec 8 midnight local time
 * formatLocalDate(date); // Returns "2025-12-08" (not "2025-12-07")
 */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD date string to a Date object at local midnight
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object at midnight local time
 *
 * @example
 * parseLocalDate('2025-12-08'); // Returns Date object for Dec 8, 2025 00:00:00 local time
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Checks if two dates are the same day (ignoring time)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns true if both dates are on the same day in local timezone
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return formatLocalDate(date1) === formatLocalDate(date2);
}

/**
 * Checks if a given date is a weekend (Saturday or Sunday)
 *
 * @param date - The date to check
 * @returns true if the date is Saturday (6) or Sunday (0)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Calculates the number of business days (excluding weekends) between two dates
 * Both start and end dates are inclusive
 *
 * @param startDate - Start date (string YYYY-MM-DD or Date object)
 * @param endDate - End date (string YYYY-MM-DD or Date object)
 * @returns Number of business days (Monday-Friday) between the dates
 *
 * @example
 * // Friday Dec 27, 2024 to Tuesday Dec 31, 2024
 * // Fri(27), Sat(28-skip), Sun(29-skip), Mon(30), Tue(31) = 3 business days
 * calculateBusinessDays('2024-12-27', '2024-12-31'); // Returns 3
 */
export function calculateBusinessDays(
  startDate: string | Date,
  endDate: string | Date
): number {
  const start = typeof startDate === 'string' ? parseLocalDate(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? parseLocalDate(endDate) : new Date(endDate);

  // Ensure end is after or equal to start
  if (end < start) return 0;

  let businessDays = 0;
  const current = new Date(start);

  while (current <= end) {
    if (!isWeekend(current)) {
      businessDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return businessDays;
}

/**
 * Calculates the number of working days (excluding weekends AND holidays) between two dates
 * Both start and end dates are inclusive
 *
 * @param startDate - Start date (string YYYY-MM-DD or Date object)
 * @param endDate - End date (string YYYY-MM-DD or Date object)
 * @param holidayDates - Array of holiday date strings in YYYY-MM-DD format to exclude
 * @returns Number of working days (Monday-Friday, excluding holidays) between the dates
 *
 * @example
 * // Friday Dec 27, 2024 to Tuesday Dec 31, 2024, with Dec 30 as a holiday
 * // Fri(27), Sat(28-skip), Sun(29-skip), Mon(30-holiday), Tue(31) = 2 working days
 * calculateWorkingDays('2024-12-27', '2024-12-31', ['2024-12-30']); // Returns 2
 */
export function calculateWorkingDays(
  startDate: string | Date,
  endDate: string | Date,
  holidayDates: string[] = []
): number {
  const start = typeof startDate === 'string' ? parseLocalDate(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? parseLocalDate(endDate) : new Date(endDate);

  // Ensure end is after or equal to start
  if (end < start) return 0;

  // Create a Set for O(1) holiday lookup
  const holidaySet = new Set(holidayDates);

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dateStr = formatLocalDate(current);

    // Only count if not a weekend AND not a holiday
    if (!isWeekend(current) && !holidaySet.has(dateStr)) {
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}

/**
 * Gets all dates between start and end date (inclusive) with their status
 *
 * @param startDate - Start date (string YYYY-MM-DD)
 * @param endDate - End date (string YYYY-MM-DD)
 * @param holidayDates - Array of holiday date strings in YYYY-MM-DD format
 * @returns Array of objects with date and status (working, weekend, holiday)
 */
export function getDateRangeWithStatus(
  startDate: string,
  endDate: string,
  holidayDates: string[] = []
): { date: string; status: 'working' | 'weekend' | 'holiday'; dayOfWeek: string }[] {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);

  if (end < start) return [];

  const holidaySet = new Set(holidayDates);
  const result: { date: string; status: 'working' | 'weekend' | 'holiday'; dayOfWeek: string }[] = [];
  const current = new Date(start);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  while (current <= end) {
    const dateStr = formatLocalDate(current);
    const dayOfWeek = dayNames[current.getDay()];

    let status: 'working' | 'weekend' | 'holiday' = 'working';
    if (isWeekend(current)) {
      status = 'weekend';
    } else if (holidaySet.has(dateStr)) {
      status = 'holiday';
    }

    result.push({ date: dateStr, status, dayOfWeek });
    current.setDate(current.getDate() + 1);
  }

  return result;
}
