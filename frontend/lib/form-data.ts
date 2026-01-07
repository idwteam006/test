/**
 * Form Dropdown Data
 *
 * Centralized dropdown options for onboarding and employee forms
 */

export const COMMON_DESIGNATIONS = [
  // Engineering
  'Software Engineer',
  'Senior Software Engineer',
  'Lead Software Engineer',
  'Principal Engineer',
  'Engineering Manager',
  'Technical Architect',
  'DevOps Engineer',
  'QA Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Mobile Developer',
  'Data Engineer',
  'ML Engineer',

  // Product & Design
  'Product Manager',
  'Senior Product Manager',
  'UI/UX Designer',
  'Graphic Designer',
  'Product Designer',

  // Business & Sales
  'Business Analyst',
  'Sales Executive',
  'Account Manager',
  'Business Development Manager',
  'Sales Manager',

  // Marketing
  'Marketing Manager',
  'Digital Marketing Specialist',
  'Content Writer',
  'SEO Specialist',
  'Social Media Manager',

  // HR & Admin
  'HR Manager',
  'HR Executive',
  'Recruiter',
  'Admin Manager',
  'Office Administrator',

  // Finance & Accounting
  'Accountant',
  'Finance Manager',
  'Financial Analyst',
  'Accounts Executive',

  // Operations
  'Operations Manager',
  'Operations Executive',
  'Project Manager',
  'Program Manager',

  // Customer Support
  'Customer Support Executive',
  'Customer Success Manager',
  'Technical Support Engineer',

  // Leadership
  'CEO',
  'CTO',
  'CFO',
  'COO',
  'VP Engineering',
  'VP Sales',
  'VP Marketing',
  'Director',
  'Senior Manager',
  'Manager',

  // Intern
  'Intern',
];

/**
 * Get designations based on department name
 */
export function getDesignationsByDepartment(departmentName: string): string[] {
  const deptLower = departmentName.toLowerCase();

  if (deptLower.includes('engineering') || deptLower.includes('devops')) {
    return [
      'Software Engineer',
      'Senior Software Engineer',
      'Lead Software Engineer',
      'Principal Engineer',
      'Engineering Manager',
      'Technical Architect',
      'DevOps Engineer',
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'Mobile Developer',
      'Data Engineer',
      'ML Engineer',
    ];
  }

  if (deptLower.includes('product')) {
    return [
      'Product Manager',
      'Senior Product Manager',
      'Associate Product Manager',
      'Product Designer',
      'UI/UX Designer',
      'Graphic Designer',
    ];
  }

  if (deptLower.includes('sales')) {
    return [
      'Sales Executive',
      'Senior Sales Executive',
      'Sales Manager',
      'Account Manager',
      'Business Development Manager',
      'Sales Director',
    ];
  }

  if (deptLower.includes('marketing')) {
    return [
      'Marketing Manager',
      'Digital Marketing Specialist',
      'Content Writer',
      'SEO Specialist',
      'Social Media Manager',
      'Marketing Executive',
      'Brand Manager',
    ];
  }

  if (deptLower.includes('hr') || deptLower.includes('human')) {
    return [
      'HR Manager',
      'HR Executive',
      'Senior HR Manager',
      'Recruiter',
      'Talent Acquisition Specialist',
      'HR Business Partner',
    ];
  }

  if (deptLower.includes('finance') || deptLower.includes('account')) {
    return [
      'Accountant',
      'Senior Accountant',
      'Finance Manager',
      'Financial Analyst',
      'Accounts Executive',
      'Finance Controller',
      'CFO',
    ];
  }

  if (deptLower.includes('operation')) {
    return [
      'Operations Manager',
      'Operations Executive',
      'Project Manager',
      'Program Manager',
      'Operations Coordinator',
      'COO',
    ];
  }

  if (deptLower.includes('customer') || deptLower.includes('support')) {
    return [
      'Customer Support Executive',
      'Senior Support Executive',
      'Customer Success Manager',
      'Technical Support Engineer',
      'Support Team Lead',
    ];
  }

  if (deptLower.includes('qa') || deptLower.includes('test') || deptLower.includes('quality')) {
    return [
      'QA Engineer',
      'Senior QA Engineer',
      'QA Lead',
      'Test Automation Engineer',
      'QA Manager',
    ];
  }

  if (deptLower.includes('data') || deptLower.includes('analytics')) {
    return [
      'Data Analyst',
      'Data Scientist',
      'Data Engineer',
      'Business Intelligence Analyst',
      'Analytics Manager',
    ];
  }

  if (deptLower.includes('admin')) {
    return [
      'Admin Manager',
      'Office Administrator',
      'Administrative Assistant',
      'Office Manager',
    ];
  }

  // Default fallback - return common designations
  return COMMON_DESIGNATIONS;
}

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
];

export const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Singapore',
  'United Arab Emirates',
  'Germany',
  'France',
  'Other',
];

export const BLOOD_GROUPS = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

export const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'Prefer not to say', label: 'Prefer not to say' },
];

export const MARITAL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Other', label: 'Other' },
];

export const QUALIFICATIONS = [
  'High School',
  'Diploma',
  'Bachelor\'s Degree',
  'B.Tech',
  'B.E.',
  'B.Sc',
  'B.Com',
  'B.A.',
  'BBA',
  'BCA',
  'Master\'s Degree',
  'M.Tech',
  'M.E.',
  'M.Sc',
  'M.Com',
  'M.A.',
  'MBA',
  'MCA',
  'Ph.D.',
  'Other',
];

export const RELATIONSHIP_OPTIONS = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Brother', label: 'Brother' },
  { value: 'Sister', label: 'Sister' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Friend', label: 'Friend' },
  { value: 'Other', label: 'Other' },
];

export const INDIAN_BANKS = [
  'State Bank of India (SBI)',
  'HDFC Bank',
  'ICICI Bank',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
  'Yes Bank',
  'IDFC First Bank',
  'Punjab National Bank (PNB)',
  'Bank of Baroda',
  'Canara Bank',
  'Union Bank of India',
  'Bank of India',
  'Indian Bank',
  'Central Bank of India',
  'Indian Overseas Bank',
  'UCO Bank',
  'Bank of Maharashtra',
  'Punjab & Sind Bank',
  'Other',
];

export const ACCOUNT_TYPES = [
  { value: 'Savings', label: 'Savings Account' },
  { value: 'Current', label: 'Current Account' },
  { value: 'Salary', label: 'Salary Account' },
];

export const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'INTERN', label: 'Intern' },
];

/**
 * Validate Indian phone number format
 */
export function validateIndianPhone(phone: string): boolean {
  // Accepts: +91-XXXXXXXXXX, +91 XXXXXXXXXX, 91XXXXXXXXXX, XXXXXXXXXX
  const phoneRegex = /^(\+91[\-\s]?)?[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Format phone number to +91-XXXXXXXXXX
 */
export function formatIndianPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91-${cleaned}`;
  } else if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+91-${cleaned.substring(2)}`;
  }
  return phone;
}

/**
 * Validate IFSC code format
 */
export function validateIFSC(ifsc: string): boolean {
  // IFSC format: 4 letters (bank code) + 0 + 6 alphanumeric (branch code)
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return ifscRegex.test(ifsc.toUpperCase());
}

/**
 * Validate PAN card format
 */
export function validatePAN(pan: string): boolean {
  // PAN format: AAAAA9999A
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase());
}

/**
 * Validate Aadhaar number format
 */
export function validateAadhaar(aadhaar: string): boolean {
  // Aadhaar: 12 digits
  const cleaned = aadhaar.replace(/\s/g, '');
  return /^\d{12}$/.test(cleaned);
}

/**
 * Validate age range (20-65 years)
 */
export function validateAge(dateOfBirth: Date): { valid: boolean; age: number } {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return {
    valid: age >= 20 && age <= 65,
    age,
  };
}

/**
 * Validate file size (in bytes)
 */
export function validateFileSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Validate file type
 */
export function validateFileType(file: File, allowedTypes: string[]): boolean {
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const mimeType = file.type.toLowerCase();

  return allowedTypes.some(type => {
    const typeLower = type.toLowerCase();
    return mimeType.includes(typeLower) || fileExtension === typeLower;
  });
}

/**
 * Get file validation rules
 */
export const FILE_VALIDATION_RULES = {
  resume: {
    maxSize: 5, // MB
    allowedTypes: ['pdf'],
    label: 'Resume/CV',
  },
  photoId: {
    maxSize: 5,
    allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    label: 'Photo ID Proof',
  },
  addressProof: {
    maxSize: 5,
    allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    label: 'Address Proof',
  },
  educationCerts: {
    maxSize: 10,
    allowedTypes: ['pdf'],
    label: 'Educational Certificates',
  },
  experienceLetters: {
    maxSize: 10,
    allowedTypes: ['pdf'],
    label: 'Experience Letters',
  },
  cancelledCheque: {
    maxSize: 2,
    allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    label: 'Cancelled Cheque',
  },
  panCard: {
    maxSize: 2,
    allowedTypes: ['pdf', 'jpg', 'jpeg', 'png'],
    label: 'PAN Card',
  },
  aadhaarCard: {
    maxSize: 2,
    allowedTypes: ['pdf'],
    label: 'Aadhaar Card',
  },
  passportPhoto: {
    maxSize: 1,
    allowedTypes: ['jpg', 'jpeg', 'png'],
    label: 'Passport Size Photo',
  },
  profilePhoto: {
    maxSize: 2,
    allowedTypes: ['jpg', 'jpeg', 'png'],
    label: 'Profile Photo',
  },
};
