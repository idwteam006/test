/**
 * GET /api/debug/rejected-analysis
 * Analyze rejected timesheet entries for a specific user
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email parameter required' }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        tenantId: true,
        employeeId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get rejected timesheet entries
    const rejectedEntries = await prisma.timesheetEntry.findMany({
      where: {
        userId: user.id,
        status: 'REJECTED',
      },
      include: {
        project: {
          select: {
            name: true,
            projectCode: true,
          },
        },
        task: {
          select: {
            name: true,
          },
        },
        approver: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        approvedAt: 'desc',
      },
    });

    // Get rejection history
    const rejectionHistory = await prisma.timesheetRejectionHistory.findMany({
      where: {
        timesheetEntry: {
          userId: user.id,
        },
      },
      include: {
        rejector: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        timesheetEntry: {
          select: {
            id: true,
            workDate: true,
            hoursWorked: true,
            description: true,
            status: true,
            project: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        rejectedAt: 'desc',
      },
    });

    // Get all entries (for context)
    const allEntries = await prisma.timesheetEntry.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        workDate: true,
        status: true,
        hoursWorked: true,
      },
      orderBy: {
        workDate: 'desc',
      },
      take: 50,
    });

    // Calculate statistics
    const stats = {
      totalEntries: allEntries.length,
      byStatus: {
        DRAFT: allEntries.filter((e) => e.status === 'DRAFT').length,
        SUBMITTED: allEntries.filter((e) => e.status === 'SUBMITTED').length,
        APPROVED: allEntries.filter((e) => e.status === 'APPROVED').length,
        REJECTED: allEntries.filter((e) => e.status === 'REJECTED').length,
        INVOICED: allEntries.filter((e) => e.status === 'INVOICED').length,
      },
      rejectionRate: ((rejectedEntries.length / allEntries.length) * 100).toFixed(2) + '%',
    };

    // Group rejection history by category
    const byCategory = rejectionHistory.reduce((acc: any, record) => {
      const category = record.rejectionCategory || 'NO_CATEGORY';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(record);
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      user,
      stats,
      rejectedEntries,
      rejectionHistory,
      rejectionsByCategory: byCategory,
      analysis: {
        totalRejected: rejectedEntries.length,
        totalRejectionEvents: rejectionHistory.length,
        categoriesUsed: Object.keys(byCategory),
        mostCommonCategory: Object.entries(byCategory).sort((a: any, b: any) => b[1].length - a[1].length)[0]?.[0],
      },
    });
  } catch (error) {
    console.error('[GET /api/debug/rejected-analysis] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze rejected entries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
