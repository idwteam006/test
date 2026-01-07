/**
 * Currency Utilities
 * Centralized currency handling for the application
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
  locale: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyConfig> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    locale: 'en-US',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'en-EU',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    locale: 'en-GB',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    decimals: 0,
    locale: 'ja-JP',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimals: 2,
    locale: 'en-IN',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    decimals: 2,
    locale: 'en-AU',
  },
  CAD: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimals: 2,
    locale: 'en-CA',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    decimals: 2,
    locale: 'zh-CN',
  },
};

/**
 * Format a number as currency
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  options: {
    showSymbol?: boolean;
    showCode?: boolean;
    decimals?: number;
  } = {}
): string {
  const config = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.USD;
  const decimals = options.decimals ?? config.decimals;

  // Format the number
  const formatted = amount.toLocaleString(config.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // Build the output
  const parts: string[] = [];

  if (options.showSymbol !== false) {
    parts.push(config.symbol);
  }

  parts.push(formatted);

  if (options.showCode) {
    parts.push(config.code);
  }

  return parts.join(' ').trim();
}

/**
 * Format currency for Indian numbering system (lakhs/crores)
 */
export function formatIndianCurrency(amount: number): string {
  if (amount >= 10000000) {
    // Crores
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  } else if (amount >= 100000) {
    // Lakhs
    return `₹${(amount / 100000).toFixed(2)}L`;
  } else {
    return `₹${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

/**
 * Format currency for US numbering system (millions/billions)
 */
export function formatUSCurrency(amount: number, showCents: boolean = true): string {
  if (amount >= 1000000000) {
    // Billions
    return `$${(amount / 1000000000).toFixed(2)}B`;
  } else if (amount >= 1000000) {
    // Millions
    return `$${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    // Thousands
    return `$${(amount / 1000).toFixed(1)}K`;
  } else {
    return `$${amount.toFixed(showCents ? 2 : 0)}`;
  }
}

/**
 * Format currency with smart abbreviation based on currency type
 */
export function formatCurrencySmart(amount: number, currencyCode: string = 'USD'): string {
  const config = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.USD;

  // Use specific formatting for certain currencies
  if (currencyCode === 'INR') {
    return formatIndianCurrency(amount);
  }

  if (['USD', 'CAD', 'AUD'].includes(currencyCode)) {
    return formatUSCurrency(amount);
  }

  // For other currencies, use millions/billions
  if (amount >= 1000000000) {
    return `${config.symbol}${(amount / 1000000000).toFixed(2)}B`;
  } else if (amount >= 1000000) {
    return `${config.symbol}${(amount / 1000000).toFixed(2)}M`;
  } else if (amount >= 1000) {
    return `${config.symbol}${(amount / 1000).toFixed(1)}K`;
  }

  return formatCurrency(amount, currencyCode);
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  const config = SUPPORTED_CURRENCIES[currencyCode];
  return config?.symbol || currencyCode;
}

/**
 * Get currency config
 */
export function getCurrencyConfig(currencyCode: string = 'USD'): CurrencyConfig {
  return SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.USD;
}

/**
 * Parse currency string to number
 */
export function parseCurrency(value: string, currencyCode: string = 'USD'): number {
  const config = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.USD;

  // Remove currency symbols and formatting
  const cleaned = value
    .replace(config.symbol, '')
    .replace(/[,\s]/g, '')
    .trim();

  return parseFloat(cleaned) || 0;
}

/**
 * Convert amount between currencies (placeholder - should use real exchange rates)
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  // TODO: Implement real currency conversion with exchange rates API
  // For now, return as-is
  console.warn('Currency conversion not implemented, returning original amount');
  return amount;
}

/**
 * Get all supported currencies as options for select inputs
 */
export function getCurrencyOptions(): Array<{ value: string; label: string }> {
  return Object.values(SUPPORTED_CURRENCIES).map(currency => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name} (${currency.symbol})`,
  }));
}
