import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { z } from 'zod';

const exitInterviewSchema = z.object({
  overallExperience: z.number().min(1).max(5).optional(),
  managementRating: z.number().min(1).max(5).optional(),
  workEnvironmentRating: z.number().min(1).max(5).optional(),
  growthOpportunities: z.number().min(1).max(5).optional(),
  compensationRating: z.number().min(1).max(5).optional(),
  wouldRecommend: z.boolean().optional(),
  wouldRejoin: z.boolean().optional(),
  reasonForLeaving: z.string().optional(),
  whatCouldImprove: z.string().optional(),
  bestPartOfJob: z.string().optional(),
  suggestions: z.string().optional(),
  additionalComments: z.string().optional(),
  isCompleted: z.boolean().optional(),
});

/**
 * GET /api/hr/exit/[id]/interview
 * Get exit interview for an exit request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    const exitInterview = await prisma.exitInterview.findFirst({
      where: {
        exitRequestId: id,
        tenantId: sessionData.tenantId,
      },
    });

    if (!exitInterview) {
      return NextResponse.json(
        { success: false, error: 'Exit interview not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: exitInterview,
    });
  } catch (error) {
    console.error('Get exit interview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch exit interview' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/hr/exit/[id]/interview
 * Update exit interview (by HR or the exiting employee)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessions.get(sessionId);
    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = exitInterviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    // Get exit request to verify access
    const exitRequest = await prisma.exitRequest.findFirst({
      where: {
        id,
        tenantId: sessionData.tenantId,
      },
      include: {
        employee: true,
      },
    });

    if (!exitRequest) {
      return NextResponse.json(
        { success: false, error: 'Exit request not found' },
        { status: 404 }
      );
    }

    // Allow HR/Admin or the exiting employee to fill the interview
    const isHR = ['ADMIN', 'HR'].includes(sessionData.role);
    const isEmployee = exitRequest.employee.userId === sessionData.userId;

    if (!isHR && !isEmployee) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to update this exit interview' },
        { status: 403 }
      );
    }

    const exitInterview = await prisma.exitInterview.findFirst({
      where: {
        exitRequestId: id,
        tenantId: sessionData.tenantId,
      },
    });

    if (!exitInterview) {
      return NextResponse.json(
        { success: false, error: 'Exit interview not found' },
        { status: 404 }
      );
    }

    const updateData: any = { ...validation.data };

    // If HR is completing the interview, record who conducted it
    if (isHR && validation.data.isCompleted) {
      updateData.conductedBy = sessionData.userId;
      updateData.conductedAt = new Date();
    }

    const updatedInterview = await prisma.exitInterview.update({
      where: { id: exitInterview.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedInterview,
      message: 'Exit interview updated successfully',
    });
  } catch (error) {
    console.error('Update exit interview error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update exit interview' },
      { status: 500 }
    );
  }
}
