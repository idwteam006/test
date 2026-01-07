/**
 * Comprehensive Onboarding Validation Schema
 *
 * Complete validation rules for employee onboarding matching specification
 */

import { z } from 'zod';
import {
  validateIndianPhone,
  validateIFSC,
  validatePAN,
  validateAadhaar,
  validateAge,
} from './form-data';

// Address validation schema
export const addressSchema = z.object({
  line1: z.string().min(1, 'Address Line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Valid 6-digit PIN code is required'),
  country: z.string().min(1, 'Country is required').default('India'),
});

// Complete onboarding profile schema
export const onboardingProfileSchema = z.object({
  token: z.string().min(1, 'Token is required'),

  // ==================== PERSONAL INFORMATION ====================
  middleName: z.string().optional(),
  preferredName: z.string().optional(),
  dateOfBirth: z.string().datetime('Invalid date of birth')
    .refine((val) => {
      const { valid, age } = validateAge(new Date(val));
      return valid;
    }, {
      message: 'Age must be between 18 and 65 years',
    }),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed', 'Other']).optional(),
  personalEmail: z.string().email('Invalid email address').optional(),
  personalPhone: z.string()
    .min(10, 'Valid phone number is required')
    .refine((val) => validateIndianPhone(val), {
      message: 'Invalid phone number format. Use +91-XXXXXXXXXX or 10-digit number',
    }),
  alternatePhone: z.string()
    .optional()
    .refine((val) => !val || validateIndianPhone(val), {
      message: 'Invalid phone number format',
    }),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown']).optional(),
  profilePhotoUrl: z.string().url('Invalid photo URL').optional(),

  // ==================== ADDRESS INFORMATION ====================
  currentAddress: addressSchema,
  permanentAddress: addressSchema.optional(),
  sameAsCurrentAddress: z.boolean().default(false),

  // ==================== PROFESSIONAL INFORMATION ====================
  highestQualification: z.string().min(1, 'Qualification is required'),
  fieldOfStudy: z.string().optional(),
  university: z.string().min(1, 'University/Institution is required'),
  yearOfPassing: z.number()
    .int()
    .min(1950, 'Year must be after 1950')
    .max(new Date().getFullYear(), 'Year cannot be in the future'),
  linkedinUrl: z.string()
    .url('Invalid LinkedIn URL')
    .optional()
    .or(z.literal('')),
  githubUrl: z.string()
    .url('Invalid GitHub URL')
    .optional()
    .or(z.literal('')),
  portfolioUrl: z.string()
    .url('Invalid portfolio URL')
    .optional()
    .or(z.literal('')),
  previousCompany: z.string().optional(),
  previousDesignation: z.string().optional(),
  yearsOfExperience: z.number()
    .int()
    .min(0, 'Experience cannot be negative')
    .max(50, 'Experience seems too high'),
  skills: z.array(z.string()).optional().default([]),
  certifications: z.string().optional(),

  // ==================== DOCUMENTS (All Optional) ====================
  resumeUrl: z.string().url().optional().or(z.literal('')),
  photoIdUrl: z.string().url().optional().or(z.literal('')),
  addressProofUrl: z.string().url().optional().or(z.literal('')),
  educationCertsUrl: z.array(z.string().url()).optional().default([]),
  experienceLettersUrl: z.array(z.string().url()).optional().default([]),
  cancelledChequeUrl: z.string().url().optional().or(z.literal('')),
  panCardUrl: z.string().url().optional().or(z.literal('')),
  aadhaarCardUrl: z.string().url().optional().or(z.literal('')),
  passportPhotoUrl: z.string().url().optional().or(z.literal('')),

  // ==================== EMERGENCY CONTACT ====================
  emergencyContactName: z.string().min(1, 'Emergency contact name is required'),
  emergencyRelationship: z.enum([
    'Spouse',
    'Father',
    'Mother',
    'Brother',
    'Sister',
    'Son',
    'Daughter',
    'Friend',
    'Other',
  ]),
  emergencyPhone: z.string()
    .min(10, 'Valid phone number is required')
    .refine((val) => validateIndianPhone(val), {
      message: 'Invalid phone number format',
    }),
  emergencyAlternatePhone: z.string()
    .optional()
    .refine((val) => !val || validateIndianPhone(val), {
      message: 'Invalid phone number format',
    }),
  emergencyEmail: z.string().email('Invalid email address').optional(),

  // ==================== BANK DETAILS (FOR PAYROLL) ====================
  accountHolderName: z.string().min(1, 'Account holder name is required'),
  accountNumber: z.string()
    .min(9, 'Account number must be at least 9 digits')
    .max(18, 'Account number is too long'),
  accountNumberConfirm: z.string().min(1, 'Please re-enter account number'),
  bankName: z.string().min(1, 'Bank name is required'),
  ifscCode: z.string()
    .length(11, 'IFSC code must be 11 characters')
    .refine((val) => validateIFSC(val), {
      message: 'Invalid IFSC code format (e.g., HDFC0001234)',
    }),
  branchName: z.string().min(1, 'Branch name is required'),
  accountType: z.enum(['Savings', 'Current', 'Salary']),

  // ==================== DECLARATIONS ====================
  informationAccurate: z.boolean().refine((val) => val === true, {
    message: 'You must certify that all information is accurate',
  }),
  agreeToPolocies: z.boolean().refine((val) => val === true, {
    message: 'You must agree to company policies',
  }),
  consentVerification: z.boolean().refine((val) => val === true, {
    message: 'You must consent to background verification',
  }),
  dataPrivacyConsent: z.boolean().refine((val) => val === true, {
    message: 'You must consent to data privacy policy (GDPR)',
  }),
  codeOfConductAgreement: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the code of conduct',
  }),
}).refine((data) => data.accountNumber === data.accountNumberConfirm, {
  message: 'Account numbers do not match',
  path: ['accountNumberConfirm'],
});

export type OnboardingProfileData = z.infer<typeof onboardingProfileSchema>;
