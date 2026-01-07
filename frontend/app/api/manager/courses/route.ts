import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

// GET /api/manager/courses - Get course submissions from direct reports
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const manager = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!manager) {
      return NextResponse.json({ success: false, error: 'Manager profile not found' }, { status: 404 });
    }

    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get employee IDs of direct reports
    const teamMembers = await prisma.employee.findMany({
      where: {
        tenantId: user.tenantId,
        managerId: manager.id,
      },
      select: { id: true }
    });

    const employeeIds = teamMembers.map(emp => emp.id);

    // If no direct reports, return empty (applies to all roles)
    if (employeeIds.length === 0) {
      return NextResponse.json({
        success: true,
        courses: [],
      });
    }

    // All roles (ADMIN, MANAGER) can only see direct reports' courses
    const whereClause: any = {
      tenantId: user.tenantId,
      employeeId: {
        in: employeeIds
      },
    };

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    if (status) {
      whereClause.status = status;
    }

    const courses = await prisma.courseCompletion.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              }
            }
          }
        },
        reviewer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formattedCourses = courses.map(course => ({
      id: course.id,
      employee: {
        id: course.employee.id,
        name: `${course.employee.user.firstName} ${course.employee.user.lastName}`,
        email: course.employee.user.email,
      },
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

// PUT /api/manager/courses - Review a course submission
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromSession(req);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const manager = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!manager) {
      return NextResponse.json({ success: false, error: 'Manager profile not found' }, { status: 404 });
    }

    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { courseId, status, reviewComments, rating } = body;

    if (!courseId || !status) {
      return NextResponse.json({
        success: false,
        error: 'Course ID and status are required'
      }, { status: 400 });
    }

    if (!['APPROVED', 'REJECTED', 'REVISION_REQUIRED'].includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid status. Must be APPROVED, REJECTED, or REVISION_REQUIRED'
      }, { status: 400 });
    }

    // Verify the course exists and belongs to a direct report
    const course = await prisma.courseCompletion.findUnique({
      where: { id: courseId },
      include: {
        employee: {
          select: { managerId: true }
        }
      }
    });

    if (!course) {
      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 });
    }

    if (user.role === 'MANAGER' && course.employee.managerId !== manager.id) {
      return NextResponse.json({
        success: false,
        error: 'You can only review courses from your direct reports'
      }, { status: 403 });
    }

    // Update the course
    const updatedCourse = await prisma.courseCompletion.update({
      where: { id: courseId },
      data: {
        status,
        reviewedBy: manager.id,
        reviewedAt: new Date(),
        reviewComments: reviewComments || null,
        rating: rating || null,
      },
    });

    // TODO: Send notification to employee
    // await sendCourseReviewEmail(course.employeeId, status);

    return NextResponse.json({
      success: true,
      message: `Course ${status.toLowerCase().replace('_', ' ')} successfully`,
      course: {
        id: updatedCourse.id,
        courseTitle: updatedCourse.courseTitle,
        status: updatedCourse.status,
      }
    });
  } catch (error) {
    console.error('Error reviewing course:', error);
    return NextResponse.json({ success: false, error: 'Failed to review course' }, { status: 500 });
  }
}
