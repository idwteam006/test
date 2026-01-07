/**
 * CSV Helper Functions for Bulk Employee Upload
 */

export interface BulkEmployeeRow {
  email: string;
  firstName: string;
  lastName: string;
  departmentName: string; // Department name (will be resolved to ID)
  designation: string;
  joiningDate: string; // DD-MM-YYYY format
  managerEmail: string; // Manager email (will be resolved to ID)
  employmentType?: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';
  workLocation?: string;
}

/**
 * Format date as DD-MM-YYYY
 */
export function formatDateDDMMYYYY(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Parse DD-MM-YYYY to ISO date string
 */
export function parseDateDDMMYYYY(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}. Expected DD-MM-YYYY`);
  }
  const [day, month, year] = parts;
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return date.toISOString();
}

/**
 * Generate CSV template for bulk employee upload
 */
export function generateCSVTemplate(): string {
  const headers = [
    'email',
    'firstName',
    'lastName',
    'departmentName',
    'designation',
    'joiningDate',
    'managerEmail',
    'employmentType',
    'workLocation',
  ];

  // Example with a date 30 days from now
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  const exampleRow = [
    'john.doe@company.com',
    'John',
    'Doe',
    'Engineering',
    'Software Engineer',
    formatDateDDMMYYYY(futureDate),
    'manager@company.com',
    'FULL_TIME',
    'Bangalore',
  ];

  return [headers.join(','), exampleRow.join(',')].join('\n');
}

/**
 * Download CSV template file
 */
export function downloadCSVTemplate(): void {
  const csv = generateCSVTemplate();
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `bulk-employee-invite-template-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Parse CSV file to JSON
 */
export function parseCSV(csvText: string): BulkEmployeeRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows');
  }

  const headers = lines[0].split(',').map(h => h.trim());
  const rows: BulkEmployeeRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length !== headers.length) {
      throw new Error(`Row ${i} has incorrect number of columns`);
    }

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    rows.push(row as BulkEmployeeRow);
  }

  return rows;
}

/**
 * Validate CSV file
 */
export function validateCSVFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (!file.name.endsWith('.csv')) {
    return { valid: false, error: 'File must be a CSV (.csv)' };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 5MB' };
  }

  return { valid: true };
}

/**
 * Format validation errors for display
 */
export function formatBulkInviteErrors(errors: any[]): string {
  if (errors.length === 0) return '';

  return errors
    .map(
      (err) =>
        `Row ${err.row}: ${err.email || 'Unknown'} - ${
          Array.isArray(err.errors) ? err.errors.join(', ') : err.error || err.reason
        }`
    )
    .join('\n');
}
