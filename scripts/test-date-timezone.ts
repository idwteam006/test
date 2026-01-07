// Test to demonstrate the timezone issue

const testDate = "2025-12-08T00:00:00.000Z";

console.log("Original ISO string from API:", testDate);
console.log("");

// Method 1: Direct Date parsing (WRONG - timezone dependent)
const date1 = new Date(testDate);
console.log("Method 1 - new Date(testDate):");
console.log("  toString():", date1.toString());
console.log("  toISOString():", date1.toISOString());
console.log("  toLocaleDateString():", date1.toLocaleDateString());
console.log("  toLocaleDateString('en-CA'):", date1.toLocaleDateString('en-CA'));
console.log("");

// Method 2: Extract date part first (CORRECT - timezone safe)
const datePart = testDate.includes('T') ? testDate.split('T')[0] : testDate;
console.log("Method 2 - Extract date part first:");
console.log("  Date part:", datePart);
console.log("");

// Simulating Canada timezone offset
console.log("Current timezone offset:", new Date().getTimezoneOffset(), "minutes");
console.log("Current timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log("");

// What happens when you format the date
const date2 = new Date(testDate);
console.log("Date formatting issues:");
console.log("  getDate():", date2.getDate());
console.log("  getMonth():", date2.getMonth() + 1);
console.log("  getFullYear():", date2.getFullYear());
console.log("");

// Proper way to format (from date-fns or manual)
const parts = datePart.split('-');
console.log("Correct parsing from date string:", {
  year: parts[0],
  month: parts[1],
  day: parts[2]
});
