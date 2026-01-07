/**
 * PATCH /api/admin/tenant - Update tenant settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Extract allowed fields to update
    const {
      companyName,
      logoUrl,
      industry,
      companySize,
      website,
      description,
      companyPhone,
      timezone,
      currency,
      dateFormat,
      timeFormat,
      weekStartDay,
      language,
      primaryColor,
      secondaryColor,
      customDomain,
      billingEmail,
      billingAddress,
      taxId,
      sessionTimeout,
      require2FA,
      isDevelopmentMode,
      zoomHostEmail,
    } = body;

    console.log('[PATCH /api/admin/tenant] Received body:', JSON.stringify(body, null, 2));

    // Prepare update data (only include non-undefined fields)
    const updateData: any = {};

    if (companyName !== undefined) updateData.companyName = companyName;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (industry !== undefined) updateData.industry = industry;
    if (companySize !== undefined) updateData.companySize = companySize;
    if (website !== undefined) updateData.website = website;
    if (description !== undefined) updateData.description = description;
    if (companyPhone !== undefined) updateData.companyPhone = companyPhone;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (currency !== undefined) updateData.currency = currency;
    if (dateFormat !== undefined) updateData.dateFormat = dateFormat;
    if (timeFormat !== undefined) updateData.timeFormat = timeFormat;
    if (weekStartDay !== undefined) updateData.weekStartDay = weekStartDay;
    if (language !== undefined) updateData.language = language;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (customDomain !== undefined) updateData.customDomain = customDomain;
    if (billingEmail !== undefined) updateData.billingEmail = billingEmail;
    if (billingAddress !== undefined) updateData.billingAddress = billingAddress;
    if (taxId !== undefined) updateData.taxId = taxId;
    if (sessionTimeout !== undefined) updateData.sessionTimeout = sessionTimeout;
    if (require2FA !== undefined) updateData.require2FA = require2FA;
    if (isDevelopmentMode !== undefined) updateData.isDevelopmentMode = isDevelopmentMode;
    if (zoomHostEmail !== undefined) updateData.zoomHostEmail = zoomHostEmail;

    console.log('[PATCH /api/admin/tenant] Update data:', JSON.stringify(updateData, null, 2));

    // Update tenant settings
    const settings = await prisma.tenantSettings.upsert({
      where: { tenantId: user.tenantId },
      update: updateData,
      create: {
        tenantId: user.tenantId,
        companyName: companyName || 'My Company',
        workingHours: { start: '09:00', end: '17:00', days: [1, 2, 3, 4, 5] },
        leavePolicies: { annualLeave: 20, sickLeave: 10 },
        ...updateData,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Tenant settings updated successfully',
      settings,
    });
  } catch (error) {
    console.error('[PATCH /api/admin/tenant] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update tenant settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
