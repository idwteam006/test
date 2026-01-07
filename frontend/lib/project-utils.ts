/**
 * Shared utility functions for project management
 */

/**
 * Get the CSS class for a project status badge
 */
export function getProjectStatusColor(status: string): string {
  switch (status) {
    case 'PLANNING':
      return 'bg-purple-100 text-purple-700 border-purple-300';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'ON_HOLD':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    case 'COMPLETED':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'CANCELLED':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

/**
 * Format currency value with proper locale formatting
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a date string for display
 */
export function formatProjectDate(dateString?: string | null): string {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get color class for progress percentage
 */
export function getProgressColor(progress: number): string {
  if (progress >= 80) return 'text-green-600';
  if (progress >= 50) return 'text-blue-600';
  if (progress >= 30) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Calculate days between two dates
 */
export function calculateDaysBetween(startDate: Date, endDate: Date): number {
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate project progress as percentage
 */
export function calculateProjectProgress(startDate: string, endDate?: string | null): number {
  if (!endDate) return 0;

  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();

  const totalDuration = calculateDaysBetween(start, end);
  if (totalDuration === 0) return 0;

  const elapsed = calculateDaysBetween(start, today);
  return Math.min(100, Math.round((elapsed / totalDuration) * 100));
}

/**
 * Check if a project is at risk (past due date or over budget threshold)
 */
export function isProjectAtRisk(
  status: string,
  endDate?: string | null,
  budgetUsedPercent?: number
): boolean {
  // Completed or cancelled projects are not at risk
  if (['COMPLETED', 'CANCELLED'].includes(status)) return false;

  // Past due date
  if (endDate) {
    const end = new Date(endDate);
    const today = new Date();
    if (today > end) return true;
  }

  // Over 80% budget used
  if (budgetUsedPercent && budgetUsedPercent >= 80) return true;

  return false;
}

/**
 * Project status options for select dropdowns
 */
export const PROJECT_STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
] as const;

/**
 * Project priority options
 */
export const PROJECT_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low', color: 'text-gray-600' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-blue-600' },
  { value: 'HIGH', label: 'High', color: 'text-orange-600' },
  { value: 'URGENT', label: 'Urgent', color: 'text-red-600' },
] as const;

/**
 * Billing type options
 */
export const BILLING_TYPE_OPTIONS = [
  { value: 'FIXED_PRICE', label: 'Fixed Price' },
  { value: 'HOURLY_RATE', label: 'Hourly Rate' },
  { value: 'MILESTONE_BASED', label: 'Milestone-based' },
  { value: 'RETAINER', label: 'Retainer (Monthly)' },
  { value: 'TIME_MATERIALS', label: 'Time & Materials' },
] as const;

/**
 * Currency options
 */
export const CURRENCY_OPTIONS = [
  { value: 'INR', label: '₹ INR', symbol: '₹' },
  { value: 'USD', label: '$ USD', symbol: '$' },
  { value: 'EUR', label: '€ EUR', symbol: '€' },
  { value: 'GBP', label: '£ GBP', symbol: '£' },
] as const;
