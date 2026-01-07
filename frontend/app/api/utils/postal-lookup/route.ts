import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/utils/postal-lookup
 *
 * Fetches address details based on postal code
 * Supports India (via India Post API) and US (via Zippopotam.us API)
 *
 * Query params:
 * - postalCode: The postal/zip code to lookup
 * - country: Optional country code (IN, US, etc.) - defaults to IN
 */

interface AddressDetails {
  city: string;
  state: string;
  country: string;
  district?: string;
  region?: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postalCode = searchParams.get('postalCode');
    const country = searchParams.get('country')?.toUpperCase() || 'IN';

    if (!postalCode) {
      return NextResponse.json(
        { success: false, error: 'Postal code is required' },
        { status: 400 }
      );
    }

    // Validate postal code format
    const cleanPostalCode = postalCode.trim();

    if (country === 'IN') {
      // Indian postal codes are 6 digits
      if (!/^\d{6}$/.test(cleanPostalCode)) {
        return NextResponse.json(
          { success: false, error: 'Invalid Indian postal code format. Must be 6 digits.' },
          { status: 400 }
        );
      }

      // Try India Post API (api.postalpincode.in)
      const result = await fetchIndianPostalData(cleanPostalCode);

      if (result) {
        return NextResponse.json({
          success: true,
          data: result,
        });
      }
    } else if (country === 'US') {
      // US zip codes are 5 digits (or 5+4 format)
      const zipCode = cleanPostalCode.split('-')[0]; // Get just the 5-digit part
      if (!/^\d{5}$/.test(zipCode)) {
        return NextResponse.json(
          { success: false, error: 'Invalid US zip code format. Must be 5 digits.' },
          { status: 400 }
        );
      }

      const result = await fetchUSPostalData(zipCode);

      if (result) {
        return NextResponse.json({
          success: true,
          data: result,
        });
      }
    } else {
      // For other countries, try Zippopotam.us which supports many countries
      const result = await fetchZippopotamData(country, cleanPostalCode);

      if (result) {
        return NextResponse.json({
          success: true,
          data: result,
        });
      }
    }

    return NextResponse.json(
      { success: false, error: 'No address found for the given postal code' },
      { status: 404 }
    );

  } catch (error) {
    console.error('Postal lookup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to lookup postal code',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch address data from India Post API
 */
async function fetchIndianPostalData(pincode: string): Promise<AddressDetails | null> {
  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: {
        'Accept': 'application/json',
      },
      // Add a reasonable timeout
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error('India Post API error:', response.status);
      return null;
    }

    const data = await response.json();

    // India Post API returns an array with status and PostOffice array
    if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
      const postOffice = data[0].PostOffice[0];

      return {
        city: postOffice.Block || postOffice.Name || postOffice.Division || '',
        state: postOffice.State || '',
        country: 'India',
        district: postOffice.District || '',
        region: postOffice.Region || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching Indian postal data:', error);
    return null;
  }
}

/**
 * Fetch address data from Zippopotam.us API for US
 */
async function fetchUSPostalData(zipCode: string): Promise<AddressDetails | null> {
  try {
    const response = await fetch(`https://api.zippopotam.us/us/${zipCode}`, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error('Zippopotam.us US API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data && data.places && data.places.length > 0) {
      const place = data.places[0];

      return {
        city: place['place name'] || '',
        state: place['state'] || '',
        country: 'United States',
        region: place['state abbreviation'] || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching US postal data:', error);
    return null;
  }
}

/**
 * Fetch address data from Zippopotam.us API for other countries
 */
async function fetchZippopotamData(countryCode: string, postalCode: string): Promise<AddressDetails | null> {
  try {
    // Map common country names to Zippopotam.us country codes
    const countryCodeMap: Record<string, string> = {
      'IN': 'in',
      'US': 'us',
      'UK': 'gb',
      'GB': 'gb',
      'CA': 'ca',
      'AU': 'au',
      'DE': 'de',
      'FR': 'fr',
      'IT': 'it',
      'ES': 'es',
      'NL': 'nl',
      'BE': 'be',
      'CH': 'ch',
      'AT': 'at',
      'PL': 'pl',
      'PT': 'pt',
      'BR': 'br',
      'MX': 'mx',
      'JP': 'jp',
    };

    const apiCountryCode = countryCodeMap[countryCode] || countryCode.toLowerCase();

    const response = await fetch(`https://api.zippopotam.us/${apiCountryCode}/${postalCode}`, {
      headers: {
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error('Zippopotam.us API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data && data.places && data.places.length > 0) {
      const place = data.places[0];

      return {
        city: place['place name'] || '',
        state: place['state'] || '',
        country: data.country || countryCode,
        region: place['state abbreviation'] || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching postal data:', error);
    return null;
  }
}
