/**
 * Expense Management Constants
 * Centralized configuration for expense-related features
 */

// Receipt requirement threshold in USD (set to Infinity to make receipts optional)
export const RECEIPT_REQUIRED_THRESHOLD = Infinity;

// Description validation
export const DESCRIPTION_MIN_LENGTH = 10;

// File upload constraints
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

// Expense categories
export const EXPENSE_CATEGORIES = [
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'FOOD', label: 'Food & Dining' },
  { value: 'ACCOMMODATION', label: 'Accommodation' },
  { value: 'TRANSPORT', label: 'Transportation' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'OTHER', label: 'Other' },
] as const;

// Category colors for UI
export const CATEGORY_COLORS: Record<string, string> = {
  TRAVEL: 'bg-blue-500',
  FOOD: 'bg-orange-500',
  ACCOMMODATION: 'bg-purple-500',
  TRANSPORT: 'bg-green-500',
  OFFICE_SUPPLIES: 'bg-indigo-500',
  EQUIPMENT: 'bg-cyan-500',
  SOFTWARE: 'bg-pink-500',
  ENTERTAINMENT: 'bg-yellow-500',
  OTHER: 'bg-slate-500',
};

// Status configuration for UI
export const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; icon: string }> = {
  DRAFT: { label: 'Draft', bgColor: 'bg-slate-100', textColor: 'text-slate-800', icon: 'D' },
  SUBMITTED: { label: 'Pending', bgColor: 'bg-amber-100', textColor: 'text-amber-800', icon: 'P' },
  APPROVED: { label: 'Approved', bgColor: 'bg-green-100', textColor: 'text-green-800', icon: 'A' },
  REJECTED: { label: 'Rejected', bgColor: 'bg-red-100', textColor: 'text-red-800', icon: 'R' },
  PAID: { label: 'Paid', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800', icon: '$' },
};

// Expense status enum values
export type ExpenseStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value'];

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

// Duplicate detection window (in milliseconds)
export const DUPLICATE_CHECK_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
