import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';
import { startOfMonth, endOfMonth, format } from 'date-fns';

// POST /api/admin/invoices/generate-from-timesheets - Auto-generate invoice from approved timesheets
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user || (user.role !== 'ADMIN' && user.role !== 'ACCOUNTANT')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, projectId, startDate, endDate, hourlyRate } = body;

    if (!clientId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: clientId, startDate, endDate' },
        { status: 400 }
      );
    }

    // Build query for approved timesheet entries
    const where: any = {
      tenantId: user.tenantId,
      status: 'APPROVED',
      isBillable: true,
      workDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (projectId) {
      where.projectId = projectId;
    } else {
      // If no project specified, get entries for any project of this client
      where.project = {
        clientId,
      };
    }

    const timesheetEntries = await prisma.timesheetEntry.findMany({
      where,
      include: {
        project: true,
        task: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        workDate: 'asc',
      },
    });

    if (timesheetEntries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No approved billable timesheet entries found for the specified period' },
        { status: 400 }
      );
    }

    // Group entries by project/task for line items
    const lineItemsMap = new Map<string, any>();

    timesheetEntries.forEach((entry) => {
      const key = `${entry.projectId || 'general'}-${entry.taskId || 'general'}`;
      const rate = hourlyRate || entry.billingRate || 100; // Default $100/hr

      if (lineItemsMap.has(key)) {
        const existing = lineItemsMap.get(key);
        existing.hours += entry.hoursWorked;
        existing.amount += entry.hoursWorked * rate;
      } else {
        const projectName = entry.project?.name || 'General Services';
        const taskName = entry.task?.name || '';
        const description = taskName
          ? `${projectName} - ${taskName}`
          : projectName;

        lineItemsMap.set(key, {
          description,
          hours: entry.hoursWorked,
          rate,
          amount: entry.hoursWorked * rate,
        });
      }
    });

    const lineItems = Array.from(lineItemsMap.values());

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const taxRate = 0.1; // 10% tax
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // Generate invoice number
    const lastInvoice = await prisma.invoice.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const invoiceNumber = lastInvoice
      ? `INV-${(parseInt(lastInvoice.invoiceNumber.split('-')[1]) + 1).toString().padStart(5, '0')}`
      : 'INV-00001';

    // Create invoice
    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days payment term

    const invoice = await prisma.invoice.create({
      data: {
        tenantId: user.tenantId,
        clientId,
        invoiceNumber,
        issueDate,
        dueDate,
        subtotal,
        tax,
        total,
        status: 'DRAFT',
        lineItems: {
          create: lineItems.map((item) => ({
            tenantId: user.tenantId,
            description: item.description,
            hours: item.hours,
            rate: item.rate,
            amount: item.amount,
          })),
        },
      },
      include: {
        client: true,
        lineItems: true,
      },
    });

    // Update timesheet entries to mark them as invoiced
    await prisma.timesheetEntry.updateMany({
      where: {
        id: {
          in: timesheetEntries.map((e) => e.id),
        },
      },
      data: {
        status: 'INVOICED',
      },
    });

    return NextResponse.json({
      success: true,
      invoice,
      timesheetCount: timesheetEntries.length,
      totalHours: lineItems.reduce((sum, item) => sum + item.hours, 0),
    });
  } catch (error) {
    console.error('Error generating invoice from timesheets:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate invoice from timesheets' },
      { status: 500 }
    );
  }
}
