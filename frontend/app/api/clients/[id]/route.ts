import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/clients/[id]
 *
 * Fetch single client details with all related information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session data
    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Get user details
    const session = await prisma.session.findFirst({
      where: { sessionId, userId: sessionData.userId },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 401 }
      );
    }

    const { user } = session;

    // Fetch client with all related data
    // Support both clientId (CLI-2025-0001) and database UUID for backward compatibility
    const client = await prisma.client.findFirst({
      where: {
        OR: [
          { clientId: clientId },
          { id: clientId }
        ],
        tenantId: user.tenantId, // Ensure multi-tenancy
      },
      include: {
        accountManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
        creator: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            budgetCost: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            status: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to view this client
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      // Regular users can only view clients they manage
      if (client.accountManagerId !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    }

    // Fetch ALL projects for status count (not limited)
    const allProjects = await prisma.project.findMany({
      where: { clientId: client.id },
      select: { status: true },
    });

    // Calculate project status counts
    const projectsByStatus = {
      ACTIVE: allProjects.filter(p => p.status === 'ACTIVE').length,
      COMPLETED: allProjects.filter(p => p.status === 'COMPLETED').length,
      PLANNING: allProjects.filter(p => p.status === 'PLANNING').length,
      ON_HOLD: allProjects.filter(p => p.status === 'ON_HOLD').length,
      CANCELLED: allProjects.filter(p => p.status === 'CANCELLED').length,
    };

    // Calculate financial summary
    const totalInvoiced = client.invoices.reduce((sum, inv) => sum + inv.total, 0);
    const paidInvoices = client.invoices.filter(inv => inv.status === 'PAID');
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalOutstanding = totalInvoiced - totalPaid;
    const pendingInvoices = client.invoices.filter(inv => inv.status === 'SENT').length;
    const overdueInvoices = client.invoices.filter(inv => inv.status === 'OVERDUE').length;

    return NextResponse.json({
      success: true,
      client: {
        ...client,
        projectsByStatus,
        financialSummary: {
          totalInvoiced,
          totalPaid,
          totalOutstanding,
          pendingInvoices,
          overdueInvoices,
          currency: client.currency,
        },
      },
    });
  } catch (error) {
    console.error('Get client error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch client',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/clients/[id]
 *
 * Update client information
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session data
    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Get user details
    const session = await prisma.session.findFirst({
      where: { sessionId, userId: sessionData.userId },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 401 }
      );
    }

    const { user } = session;

    // Check permissions
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get existing client
    // Support both clientId (CLI-2025-0001) and database UUID for backward compatibility
    const existingClient = await prisma.client.findFirst({
      where: {
        OR: [
          { clientId: clientId },
          { id: clientId }
        ],
        tenantId: user.tenantId,
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate accountManagerId if provided - must be a valid User in the same tenant
    let validAccountManagerId: string | null = null;
    if (body.accountManagerId && body.accountManagerId.trim() !== '') {
      const accountManager = await prisma.user.findFirst({
        where: {
          id: body.accountManagerId,
          tenantId: user.tenantId,
        },
      });
      if (!accountManager) {
        return NextResponse.json(
          { success: false, error: 'Invalid account manager selected' },
          { status: 400 }
        );
      }
      validAccountManagerId = accountManager.id;
    }

    // Update client
    const updatedClient = await prisma.client.update({
      where: { id: existingClient.id }, // Use the actual database ID for update
      data: {
        // Basic Info
        clientType: body.clientType,
        companyName: body.companyName,
        industry: body.industry,
        companySize: body.companySize,
        website: body.website,
        taxId: body.taxId,

        // Primary Contact
        contactName: body.contactName,
        contactDesignation: body.contactDesignation,
        contactEmail: body.contactEmail,
        contactPhone: body.contactPhone,
        portalAccess: body.portalAccess || false,

        // Secondary Contact
        secondaryContactName: body.secondaryContactName,
        secondaryContactDesignation: body.secondaryContactDesignation,
        secondaryContactEmail: body.secondaryContactEmail,
        secondaryContactPhone: body.secondaryContactPhone,
        secondaryPortalAccess: body.secondaryPortalAccess || false,

        // Address
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        state: body.state,
        postalCode: body.postalCode,
        country: body.country,

        // Billing
        billingEmail: body.billingEmail,
        paymentTerms: body.paymentTerms || 'NET_30',
        currency: body.currency || 'INR',

        // Account Management
        accountManagerId: validAccountManagerId,
        priority: body.priority || 'MEDIUM',

        // Contract
        contractStartDate: body.contractStartDate ? new Date(body.contractStartDate) : null,
        contractEndDate: body.contractEndDate ? new Date(body.contractEndDate) : null,
        contractValue: body.contractValue ? parseFloat(body.contractValue) : null,

        // Metadata
        tags: body.tags || [],
        internalNotes: body.internalNotes,
        status: body.status || 'ACTIVE',
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
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Client updated successfully',
      client: updatedClient,
    });
  } catch (error) {
    console.error('Update client error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update client',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/clients/[id]
 *
 * Delete a client (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    // Get session
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get session data
    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    // Get user details
    const session = await prisma.session.findFirst({
      where: { sessionId, userId: sessionData.userId },
      include: { user: true },
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 401 }
      );
    }

    const { user } = session;

    // Only ADMIN can delete clients
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Access denied - Admin only' },
        { status: 403 }
      );
    }

    // Get existing client
    const existingClient = await prisma.client.findFirst({
      where: {
        OR: [
          { clientId: clientId },
          { id: clientId }
        ],
        tenantId: user.tenantId,
      },
      include: {
        _count: {
          select: {
            projects: true,
            invoices: true,
          },
        },
      },
    });

    if (!existingClient) {
      return NextResponse.json(
        { success: false, error: 'Client not found' },
        { status: 404 }
      );
    }

    // Check if client has active projects or invoices
    if (existingClient._count.projects > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete client with ${existingClient._count.projects} active projects. Change status to INACTIVE instead.` },
        { status: 400 }
      );
    }

    if (existingClient._count.invoices > 0) {
      return NextResponse.json(
        { success: false, error: `Cannot delete client with ${existingClient._count.invoices} invoices. Change status to INACTIVE instead.` },
        { status: 400 }
      );
    }

    // Delete client
    await prisma.client.delete({
      where: { id: existingClient.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Client deleted successfully',
    });
  } catch (error) {
    console.error('Delete client error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete client',
      },
      { status: 500 }
    );
  }
}
