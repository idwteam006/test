// Default onboarding fields structure
export const DEFAULT_ONBOARDING_FIELDS = {
  sections: [
    {
      id: 'personal',
      name: 'Personal Information',
      order: 1,
      enabled: true,
      fields: [
        { id: 'firstName', name: 'First Name', type: 'text', required: true, enabled: true, order: 1 },
        { id: 'middleName', name: 'Middle Name', type: 'text', required: false, enabled: true, order: 2 },
        { id: 'lastName', name: 'Last Name', type: 'text', required: true, enabled: true, order: 3 },
        { id: 'preferredName', name: 'Preferred Name', type: 'text', required: false, enabled: true, order: 4 },
        { id: 'dateOfBirth', name: 'Date of Birth', type: 'date', required: true, enabled: true, order: 5 },
        {
          id: 'gender',
          name: 'Gender',
          type: 'select',
          required: true,
          enabled: true,
          order: 6,
          options: ['Male', 'Female', 'Other', 'Prefer not to say'],
        },
        { id: 'bloodGroup', name: 'Blood Group', type: 'text', required: false, enabled: true, order: 7 },
        { id: 'personalEmail', name: 'Personal Email', type: 'email', required: false, enabled: true, order: 8 },
        { id: 'personalPhone', name: 'Personal Phone', type: 'tel', required: true, enabled: true, order: 9 },
        { id: 'alternatePhone', name: 'Alternate Phone', type: 'tel', required: false, enabled: true, order: 10 },
      ],
    },
    {
      id: 'address',
      name: 'Address Information',
      order: 2,
      enabled: true,
      fields: [
        { id: 'currentAddressStreet', name: 'Current Address - Street', type: 'text', required: true, enabled: true, order: 1 },
        { id: 'currentAddressCity', name: 'Current Address - City', type: 'text', required: true, enabled: true, order: 2 },
        { id: 'currentAddressState', name: 'Current Address - State', type: 'text', required: true, enabled: true, order: 3 },
        { id: 'currentAddressPincode', name: 'Current Address - Pincode', type: 'text', required: true, enabled: true, order: 4 },
        { id: 'currentAddressCountry', name: 'Current Address - Country', type: 'text', required: true, enabled: true, order: 5 },
        { id: 'permanentAddressStreet', name: 'Permanent Address - Street', type: 'text', required: true, enabled: true, order: 6 },
        { id: 'permanentAddressCity', name: 'Permanent Address - City', type: 'text', required: true, enabled: true, order: 7 },
        { id: 'permanentAddressState', name: 'Permanent Address - State', type: 'text', required: true, enabled: true, order: 8 },
        { id: 'permanentAddressPincode', name: 'Permanent Address - Pincode', type: 'text', required: true, enabled: true, order: 9 },
        { id: 'permanentAddressCountry', name: 'Permanent Address - Country', type: 'text', required: true, enabled: true, order: 10 },
      ],
    },
    {
      id: 'professional',
      name: 'Professional Information',
      order: 3,
      enabled: true,
      fields: [
        { id: 'highestQualification', name: 'Highest Qualification', type: 'text', required: false, enabled: true, order: 1 },
        { id: 'institution', name: 'Institution', type: 'text', required: false, enabled: true, order: 2 },
        { id: 'graduationYear', name: 'Graduation Year', type: 'number', required: false, enabled: true, order: 3 },
        { id: 'fieldOfStudy', name: 'Field of Study', type: 'text', required: false, enabled: true, order: 4 },
        { id: 'previousEmployer', name: 'Previous Employer', type: 'text', required: false, enabled: true, order: 5 },
        { id: 'previousJobTitle', name: 'Previous Job Title', type: 'text', required: false, enabled: true, order: 6 },
        { id: 'yearsOfExperience', name: 'Years of Experience', type: 'number', required: false, enabled: true, order: 7 },
        { id: 'skills', name: 'Key Skills', type: 'textarea', required: false, enabled: true, order: 8 },
      ],
    },
    {
      id: 'emergency',
      name: 'Emergency Contact',
      order: 4,
      enabled: true,
      fields: [
        { id: 'emergencyContactName', name: 'Emergency Contact Name', type: 'text', required: true, enabled: true, order: 1 },
        { id: 'emergencyContactRelation', name: 'Relationship', type: 'text', required: true, enabled: true, order: 2 },
        { id: 'emergencyContactPhone', name: 'Emergency Phone', type: 'tel', required: true, enabled: true, order: 3 },
        {
          id: 'emergencyContactAddress',
          name: 'Emergency Contact Address',
          type: 'text',
          required: false,
          enabled: true,
          order: 4,
        },
      ],
    },
    {
      id: 'documents',
      name: 'Documents',
      order: 5,
      enabled: true,
      fields: [
        { id: 'profilePhoto', name: 'Profile Photo', type: 'file', required: false, enabled: true, order: 1 },
        { id: 'aadhaarCard', name: 'Aadhaar Card', type: 'file', required: false, enabled: true, order: 2 },
        { id: 'panCard', name: 'PAN Card', type: 'file', required: false, enabled: true, order: 3 },
        { id: 'passport', name: 'Passport', type: 'file', required: false, enabled: true, order: 4 },
        { id: 'educationCertificates', name: 'Education Certificates', type: 'file', required: false, enabled: true, order: 5 },
        {
          id: 'previousEmploymentDocs',
          name: 'Previous Employment Documents',
          type: 'file',
          required: false,
          enabled: true,
          order: 6,
        },
        { id: 'resume', name: 'Resume/CV', type: 'file', required: false, enabled: true, order: 7 },
      ],
    },
  ],
};

// Helper to get fields for a section, merging defaults with custom
export function getSectionFields(section: any) {
  if (!section || !section.id) return [];

  // If section has custom fields, return them
  if (section.fields && section.fields.length > 0) {
    return section.fields;
  }

  // Otherwise return default fields for this section
  const defaultSection = DEFAULT_ONBOARDING_FIELDS.sections.find((s) => s.id === section.id);
  return defaultSection?.fields || [];
}

// Helper to initialize onboarding fields if missing
export function initializeOnboardingFields(settings: any) {
  if (!settings.onboardingFields) {
    return DEFAULT_ONBOARDING_FIELDS;
  }

  // Merge with defaults to ensure all sections have fields
  const sections = settings.onboardingFields.sections.map((section: any) => ({
    ...section,
    fields: getSectionFields(section),
  }));

  return { sections };
}
