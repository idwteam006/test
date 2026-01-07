import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { notifyAdminNewClient, notifyAccountManagerClientAssigned } from '@/lib/email-notifications';

// Validation schema for client creation
const CreateClientSchema = z.object({
  // Step 1: Basic Info
  clientType: z.enum(['COMPANY', 'INDIVIDUAL', 'GOVERNMENT', 'NON_PROFIT']),
  companyName: z.string().min(1, 'Company name is required'),
  industry: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  companySize: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  website: z.string().optional().or(z.literal('')).transform((val) => {
    if (!val || val === '') return undefined;
    // Auto-add https:// if not present
    if (!val.startsWith('http://') && !val.startsWith('https://')) {
      return `https://${val}`;
    }
    return val;
  }),
  taxId: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),

  // Step 2: Contacts
  contactName: z.string().min(1, 'Primary contact name is required'),
  contactDesignation: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  contactEmail: z.string().email('Invalid email format'),
  contactPhone: z.string().min(10, 'Phone number is required'),
  portalAccess: z.boolean().default(false),

  secondaryContactName: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  secondaryContactDesignation: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  secondaryContactEmail: z.string().optional().or(z.literal('')).transform(val => {
    if (!val || val === '') return undefined;
    // Validate email only if provided
    if (val && !z.string().email().safeParse(val).success) {
      throw new Error('Invalid secondary email format');
    }
    return val;
  }),
  secondaryContactPhone: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  secondaryPortalAccess: z.boolean().default(false),

  // Step 3: Address & Billing (all optional for flexibility)
  addressLine1: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  addressLine2: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  city: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  state: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  postalCode: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  country: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),

  billingEmail: z.string().optional().or(z.literal('')).transform(val => {
    if (!val || val === '') return undefined;
    // Validate email only if provided
    if (val && !z.string().email().safeParse(val).success) {
      throw new Error('Invalid billing email format');
    }
    return val;
  }),
  sameAsOfficeAddress: z.boolean().default(true),
  billingAddress: z.any().optional(),
  paymentTerms: z.string().default('NET_30'),
  currency: z.string().default('INR'),

  // Step 4: Additional Details
  accountManagerId: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VIP']).default('MEDIUM'),
  contractStartDate: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  contractEndDate: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  contractValue: z.number().optional().nullable(),
  tags: z.array(z.string()).default([]),
  internalNotes: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});

/**
 * POST /api/clients/create
 * Create a new client (Admin/Manager only)
 */
export async function POST(request: NextRequest) {
  try {
    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from session
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        user: {
          include: {
            tenant: {
              select: {
                name: true,
                slug: true,
              }
            }
          }
        }
      },
    });

    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    // Check if user is ADMIN or MANAGER
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, error: 'Only Admin and Manager can create clients' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CreateClientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Generate unique client ID with tenant prefix: {TENANT_SLUG}-CLI-{YEAR}-{NUMBER}
    // This ensures each tenant has their own sequential client IDs
    const tenantPrefix = session.user.tenant?.slug?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'CLI';
    const year = new Date().getFullYear();
    const prefix = `${tenantPrefix}-CLI-${year}-`;

    // Find the highest existing client ID number for THIS tenant and year
    const lastClient = await prisma.client.findFirst({
      where: {
        tenantId: session.user.tenantId,
        clientId: { startsWith: prefix },
      },
      orderBy: { clientId: 'desc' },
      select: { clientId: true },
    });

    let nextNumber = 1;
    if (lastClient?.clientId) {
      // Extract the number from {TENANT}-CLI-YYYY-NNNN format
      const match = lastClient.clientId.match(/-(\d{4})$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    let clientId = `${prefix}${String(nextNumber).padStart(4, '0')}`;

    // Double-check to prevent race conditions - if clientId already exists, increment
    let retries = 5;
    while (retries > 0) {
      const existingClient = await prisma.client.findUnique({
        where: { clientId },
        select: { id: true },
      });

      if (!existingClient) {
        break; // Code is available
      }

      // Increment and retry
      nextNumber++;
      clientId = `${prefix}${String(nextNumber).padStart(4, '0')}`;
      retries--;
    }

    if (retries === 0) {
      // Fallback: add random suffix if all retries exhausted
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      clientId = `${tenantPrefix}-CLI-${year}-${randomSuffix}`;
    }

    // Create client
    const client = await prisma.client.create({
      data: {
        clientId,
        tenantId: session.user.tenantId,
        createdBy: session.user.id,

        // Basic Info
        clientType: data.clientType,
        companyName: data.companyName,
        industry: data.industry,
        companySize: data.companySize,
        website: data.website || null,
        taxId: data.taxId,

        // Primary Contact
        contactName: data.contactName,
        contactDesignation: data.contactDesignation,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        portalAccess: data.portalAccess,

        // Secondary Contact
        secondaryContactName: data.secondaryContactName,
        secondaryContactDesignation: data.secondaryContactDesignation,
        secondaryContactEmail: data.secondaryContactEmail || null,
        secondaryContactPhone: data.secondaryContactPhone,
        secondaryPortalAccess: data.secondaryPortalAccess,

        // Address
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        city: data.city || null,
        state: data.state || null,
        postalCode: data.postalCode || null,
        country: data.country || null,

        // Billing
        billingEmail: data.billingEmail || null,
        billingAddress: data.sameAsOfficeAddress && data.addressLine1
          ? {
              addressLine1: data.addressLine1,
              addressLine2: data.addressLine2,
              city: data.city,
              state: data.state,
              postalCode: data.postalCode,
              country: data.country,
            }
          : data.billingAddress || null,
        paymentTerms: data.paymentTerms || 'NET_30',
        currency: data.currency || 'INR',

        // Account Management
        accountManagerId: data.accountManagerId || null,
        priority: data.priority,

        // Contract
        contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : null,
        contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : null,
        contractValue: data.contractValue || null,

        // Metadata
        tags: data.tags || [],
        internalNotes: data.internalNotes || null,
        status: data.status || 'ACTIVE',
      },
      include: {
        accountManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        creator: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Send email notification to account manager
    if (data.accountManagerId && client.accountManager) {
      try {
        await notifyAccountManagerClientAssigned({
          managerEmail: client.accountManager.email,
          managerName: `${client.accountManager.firstName} ${client.accountManager.lastName}`,
          clientName: client.companyName,
          clientId: client.clientId,
          contactName: client.contactName,
          contactEmail: client.contactEmail,
          contactPhone: client.contactPhone,
          priority: client.priority,
          assignedByName: `${session.user.firstName} ${session.user.lastName}`,
          organizationName: session.user.tenant?.name || 'Zenora',
        });
      } catch (emailError) {
        console.error('[Client] Failed to send account manager notification:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Send email notification to all admins
    try {
      const admins = await prisma.user.findMany({
        where: {
          tenantId: session.user.tenantId,
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        select: {
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      for (const admin of admins) {
        try {
          await notifyAdminNewClient({
            adminEmail: admin.email,
            adminName: `${admin.firstName} ${admin.lastName}`,
            clientName: client.companyName,
            clientId: client.clientId,
            contactName: client.contactName,
            contactEmail: client.contactEmail,
            accountManagerName: client.accountManager
              ? `${client.accountManager.firstName} ${client.accountManager.lastName}`
              : undefined,
            createdByName: `${session.user.firstName} ${session.user.lastName}`,
            organizationName: session.user.tenant?.name || 'Zenora',
          });
        } catch (adminEmailError) {
          console.error(`[Client] Failed to send admin notification to ${admin.email}:`, adminEmailError);
        }
      }
    } catch (emailError) {
      console.error('[Client] Failed to send admin notifications:', emailError);
      // Don't fail the request if email fails
    }

    // TODO: If portal access is enabled, create user account and send welcome email
    // TODO: Create audit log

    console.log('[Client] Created successfully:', {
      clientId: client.clientId,
      companyName: client.companyName,
      createdBy: session.user.email,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Client created successfully',
        client: {
          id: client.id,
          clientId: client.clientId,
          companyName: client.companyName,
          contactName: client.contactName,
          contactEmail: client.contactEmail,
          accountManager: client.accountManager,
          status: client.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Client Create] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create client',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
