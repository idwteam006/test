import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// GET /api/employee/courses - Get employee's course submissions
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      // Return empty array if employee record doesn't exist yet
      return NextResponse.json({
        success: true,
        courses: [],
        total: 0
      });
    }

    const courses = await prisma.courseCompletion.findMany({
      where: {
        tenantId: user.tenantId,
        employeeId: employee.id,
      },
      include: {
        reviewer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        }
      },
      orderBy: {
        completionDate: 'desc'
      }
    });

    const formattedCourses = courses.map(course => ({
      id: course.id,
      courseTitle: course.courseTitle,
      courseProvider: course.courseProvider,
      category: course.category,
      completionDate: course.completionDate.toISOString(),
      certificateUrl: course.certificateUrl,
      certificateNumber: course.certificateNumber,
      description: course.description,
      skillsLearned: course.skillsLearned,
      duration: course.duration,
      status: course.status,
      reviewedBy: course.reviewer ? {
        name: `${course.reviewer.user.firstName} ${course.reviewer.user.lastName}`,
        email: course.reviewer.user.email,
      } : null,
      reviewedAt: course.reviewedAt?.toISOString(),
      reviewComments: course.reviewComments,
      rating: course.rating,
      createdAt: course.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, courses: formattedCourses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch courses' }, { status: 500 });
  }
}

// POST /api/employee/courses - Submit a new course completion
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!employee) {
      return NextResponse.json({
        success: false,
        error: 'Employee record not found. Please contact HR to complete your onboarding.'
      }, { status: 404 });
    }

    const body = await req.json();
    const {
      courseTitle,
      courseProvider,
      category,
      completionDate,
      certificateUrl,
      certificateNumber,
      description,
      skillsLearned,
      duration,
    } = body;

    // Validation
    if (!courseTitle || !category || !completionDate) {
      return NextResponse.json({
        success: false,
        error: 'Course title, category, and completion date are required'
      }, { status: 400 });
    }

    // Check if root-level employee (no manager)
    const isRootLevel = !employee.managerId;

    // Root-level employees auto-approve their own courses
    // Non-root employees submit for manager review
    const course = await prisma.courseCompletion.create({
      data: {
        tenantId: user.tenantId,
        employeeId: employee.id,
        courseTitle,
        courseProvider: courseProvider || null,
        category,
        completionDate: new Date(completionDate),
        certificateUrl: certificateUrl || null,
        certificateNumber: certificateNumber || null,
        description: description || null,
        skillsLearned: skillsLearned || [],
        duration: duration || null,
        status: isRootLevel ? 'APPROVED' : 'PENDING_REVIEW',
        reviewedBy: isRootLevel ? employee.id : null,
        reviewedAt: isRootLevel ? new Date() : null,
      },
    });

    // Send notification to manager if not root-level
    if (!isRootLevel) {
      // TODO: Send notification to manager
      // await sendCourseSubmissionEmail(employee.managerId);
    }

    return NextResponse.json({
      success: true,
      message: isRootLevel
        ? 'Course auto-approved successfully (root-level employee)'
        : 'Course submitted successfully for manager review',
      course: {
        id: course.id,
        courseTitle: course.courseTitle,
        status: course.status,
      },
      isAutoApproved: isRootLevel,
    });
  } catch (error) {
    console.error('Error submitting course:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit course' }, { status: 500 });
  }
}
