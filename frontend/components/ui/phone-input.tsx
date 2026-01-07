'use client';

import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertCircle } from 'lucide-react';

// Country codes with validation patterns and formats
const countryCodes = [
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States', pattern: /^\d{10}$/, format: 'XXX-XXX-XXXX', example: '202-555-0123' },
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India', pattern: /^\d{10}$/, format: 'XXXXX-XXXXX', example: '98765-43210' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom', pattern: /^\d{10,11}$/, format: 'XXXX XXX XXXX', example: '7911 123456' },
  { code: '+61', country: 'AU', flag: '🇦🇺', name: 'Australia', pattern: /^\d{9}$/, format: 'XXX XXX XXX', example: '412 345 678' },
  { code: '+81', country: 'JP', flag: '🇯🇵', name: 'Japan', pattern: /^\d{10}$/, format: 'XX-XXXX-XXXX', example: '90-1234-5678' },
  { code: '+86', country: 'CN', flag: '🇨🇳', name: 'China', pattern: /^\d{11}$/, format: 'XXX XXXX XXXX', example: '138 0013 8000' },
  { code: '+49', country: 'DE', flag: '🇩🇪', name: 'Germany', pattern: /^\d{10,11}$/, format: 'XXX XXXXXXX', example: '151 12345678' },
  { code: '+33', country: 'FR', flag: '🇫🇷', name: 'France', pattern: /^\d{9}$/, format: 'X XX XX XX XX', example: '6 12 34 56 78' },
  { code: '+39', country: 'IT', flag: '🇮🇹', name: 'Italy', pattern: /^\d{10}$/, format: 'XXX XXX XXXX', example: '312 345 6789' },
  { code: '+7', country: 'RU', flag: '🇷🇺', name: 'Russia', pattern: /^\d{10}$/, format: 'XXX XXX-XX-XX', example: '912 345-67-89' },
  { code: '+55', country: 'BR', flag: '🇧🇷', name: 'Brazil', pattern: /^\d{11}$/, format: 'XX XXXXX-XXXX', example: '11 91234-5678' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa', pattern: /^\d{9}$/, format: 'XX XXX XXXX', example: '71 123 4567' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'United Arab Emirates', pattern: /^\d{9}$/, format: 'XX XXX XXXX', example: '50 123 4567' },
  { code: '+65', country: 'SG', flag: '🇸🇬', name: 'Singapore', pattern: /^\d{8}$/, format: 'XXXX XXXX', example: '8123 4567' },
  { code: '+60', country: 'MY', flag: '🇲🇾', name: 'Malaysia', pattern: /^\d{9,10}$/, format: 'XX-XXX XXXX', example: '12-345 6789' },
  { code: '+66', country: 'TH', flag: '🇹🇭', name: 'Thailand', pattern: /^\d{9}$/, format: 'XX XXX XXXX', example: '81 234 5678' },
  { code: '+63', country: 'PH', flag: '🇵🇭', name: 'Philippines', pattern: /^\d{10}$/, format: 'XXX XXX XXXX', example: '917 123 4567' },
  { code: '+62', country: 'ID', flag: '🇮🇩', name: 'Indonesia', pattern: /^\d{10,12}$/, format: 'XXX-XXXX-XXXX', example: '812-3456-7890' },
  { code: '+82', country: 'KR', flag: '🇰🇷', name: 'South Korea', pattern: /^\d{10}$/, format: 'XX-XXXX-XXXX', example: '10-1234-5678' },
  { code: '+52', country: 'MX', flag: '🇲🇽', name: 'Mexico', pattern: /^\d{10}$/, format: 'XXX XXX XXXX', example: '222 123 4567' },
  { code: '+34', country: 'ES', flag: '🇪🇸', name: 'Spain', pattern: /^\d{9}$/, format: 'XXX XX XX XX', example: '612 34 56 78' },
  { code: '+31', country: 'NL', flag: '🇳🇱', name: 'Netherlands', pattern: /^\d{9}$/, format: 'X XX XX XX XX', example: '6 12 34 56 78' },
  { code: '+46', country: 'SE', flag: '🇸🇪', name: 'Sweden', pattern: /^\d{9}$/, format: 'XX-XXX XX XX', example: '70-123 45 67' },
  { code: '+47', country: 'NO', flag: '🇳🇴', name: 'Norway', pattern: /^\d{8}$/, format: 'XXX XX XXX', example: '412 34 567' },
  { code: '+45', country: 'DK', flag: '🇩🇰', name: 'Denmark', pattern: /^\d{8}$/, format: 'XX XX XX XX', example: '32 12 34 56' },
  { code: '+41', country: 'CH', flag: '🇨🇭', name: 'Switzerland', pattern: /^\d{9}$/, format: 'XX XXX XX XX', example: '78 123 45 67' },
  { code: '+43', country: 'AT', flag: '🇦🇹', name: 'Austria', pattern: /^\d{10,11}$/, format: 'XXX XXXXXXX', example: '664 1234567' },
  { code: '+32', country: 'BE', flag: '🇧🇪', name: 'Belgium', pattern: /^\d{9}$/, format: 'XXX XX XX XX', example: '470 12 34 56' },
  { code: '+64', country: 'NZ', flag: '🇳🇿', name: 'New Zealand', pattern: /^\d{9}$/, format: 'XX XXX XXXX', example: '21 123 4567' },
  { code: '+351', country: 'PT', flag: '🇵🇹', name: 'Portugal', pattern: /^\d{9}$/, format: 'XXX XXX XXX', example: '912 345 678' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  disabled?: boolean;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = 'Phone number',
  required = false,
  id,
  disabled = false,
}: PhoneInputProps) {
  // Parse the existing value to extract country code and number
  const getInitialCountryCode = () => {
    if (!value) return '+1'; // Default to US

    // Try to match against known country codes
    for (const country of countryCodes) {
      if (value.startsWith(country.code)) {
        return country.code;
      }
    }
    return '+1';
  };

  const getInitialPhoneNumber = () => {
    if (!value) return '';

    const countryCode = getInitialCountryCode();
    return value.replace(countryCode, '').trim();
  };

  const [countryCode, setCountryCode] = useState(getInitialCountryCode());
  const [phoneNumber, setPhoneNumber] = useState(getInitialPhoneNumber());
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Get current country data
  const currentCountry = countryCodes.find(c => c.code === countryCode);

  // Validate phone number based on country pattern
  useEffect(() => {
    if (!phoneNumber) {
      setIsValid(null);
      return;
    }

    // Remove all non-digit characters for validation
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    if (currentCountry) {
      const isValidFormat = currentCountry.pattern.test(digitsOnly);
      setIsValid(isValidFormat);
    } else {
      setIsValid(null);
    }
  }, [phoneNumber, currentCountry]);

  const handleCountryCodeChange = (newCode: string) => {
    setCountryCode(newCode);
    const fullNumber = phoneNumber ? `${newCode} ${phoneNumber}` : newCode;
    onChange(fullNumber);
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value;
    setPhoneNumber(newNumber);
    const fullNumber = newNumber ? `${countryCode} ${newNumber}` : '';
    onChange(fullNumber);
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <Select value={countryCode} onValueChange={handleCountryCodeChange} disabled={disabled}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {countryCodes.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <div className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span>{country.code}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Input
            id={id}
            type="tel"
            placeholder={currentCountry?.example || placeholder}
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            required={required}
            disabled={disabled}
            className={`pr-10 ${
              isValid === false
                ? 'border-red-500 focus-visible:ring-red-500'
                : isValid === true
                ? 'border-green-500 focus-visible:ring-green-500'
                : ''
            }`}
          />
          {isValid !== null && phoneNumber && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
            </div>
          )}
        </div>
      </div>
      {currentCountry && phoneNumber && (
        <p className="text-xs text-muted-foreground ml-[148px]">
          Format: {currentCountry.format}
          {isValid === false && (
            <span className="text-red-600 ml-2">Invalid format for {currentCountry.name}</span>
          )}
        </p>
      )}
    </div>
  );
}
