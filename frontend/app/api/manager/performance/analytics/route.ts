/**
 * GET /api/manager/performance/analytics
 * Auto-calculated performance analytics based on real work data
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromSession } from '@/lib/auth-helpers';

export const runtime = 'nodejs';

interface EmployeePerformance {
  employee: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
      avatarUrl: string | null;
    };
    jobTitle: string;
  };
  metrics: {
    // Learning metrics
    coursesCompleted: number;
    coursesApproved: number;
    coursesPending: number;
    averageCourseRating: number;
    certificationsEarned: number;
    skillsAcquired: string[];
    totalLearningHours: number;

    // Work metrics
    tasksCompleted: number;
    tasksInProgress: number;
    projectsCompleted: number;
    projectsActive: number;

    // Goals metrics
    goalsCompleted: number;
    goalsInProgress: number;
    goalsOverdue: number;

    // Attendance metrics
    meetingsAttended: number;
    meetingResponseRate: number;

    // Overall performance score (0-100)
    performanceScore: number;
  };
  period: string;
}

function calculatePerformanceScore(metrics: any): number {
  let score = 0;

  // Learning (30 points)
  const learningScore = Math.min(30, (
    (metrics.coursesApproved * 5) +
    (metrics.certificationsEarned * 10) +
    (metrics.averageCourseRating * 2)
  ));
  score += learningScore;

  // Task completion (25 points)
  const taskScore = Math.min(25, (metrics.tasksCompleted * 0.5));
  score += taskScore;

  // Project completion (25 points)
  const projectScore = Math.min(25, (metrics.projectsCompleted * 5));
  score += projectScore;

  // Goals achievement (15 points)
  const totalGoals = metrics.goalsCompleted + metrics.goalsInProgress + metrics.goalsOverdue;
  const goalsScore = totalGoals > 0
    ? (metrics.goalsCompleted / totalGoals) * 15
    : 0;
  score += goalsScore;

  // Meeting engagement (5 points)
  const meetingScore = Math.min(5, metrics.meetingResponseRate * 5);
  score += meetingScore;

  return Math.round(Math.min(100, score));
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromSession(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'Q1 2025';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get current user's employee record
    const currentUserEmployee = await prisma.employee.findFirst({
      where: { userId: user.id, tenantId: user.tenantId },
    });

    if (!currentUserEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 400 }
      );
    }

    // Get direct reports only - applies to all roles (ADMIN, MANAGER, HR, ACCOUNTANT, EMPLOYEE)
    const directReports = await prisma.employee.findMany({
      where: {
        managerId: currentUserEmployee.id,
        tenantId: user.tenantId,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (directReports.length === 0) {
      // No direct reports, return empty result
      return NextResponse.json({
        success: true,
        period,
        teamSize: 0,
        data: [],
      });
    }

    // Calculate performance for each employee
    const performanceData: EmployeePerformance[] = [];

    for (const employee of directReports) {
      // Learning metrics
      const allCourses = await prisma.courseCompletion.findMany({
        where: {
          employeeId: employee.id,
          tenantId: user.tenantId,
        },
      });

      const coursesApproved = allCourses.filter((c) => c.status === 'APPROVED');
      const coursesPending = allCourses.filter((c) => c.status === 'PENDING_REVIEW');

      const averageRating = coursesApproved.length > 0
        ? coursesApproved.reduce((sum, c) => sum + (c.rating || 0), 0) / coursesApproved.length
        : 0;

      const allSkills = coursesApproved.flatMap((c) => c.skillsLearned);
      const uniqueSkills = [...new Set(allSkills)];

      const certificationsEarned = coursesApproved.filter(
        (c) => c.category === 'CERTIFICATION' && c.certificateUrl
      ).length;

      // Calculate total learning hours
      const totalHours = coursesApproved.reduce((sum, c) => {
        const hours = c.duration?.match(/(\d+)\s*hours?/i);
        return sum + (hours ? parseInt(hours[1]) : 0);
      }, 0);

      // Task metrics
      const allTasks = await prisma.task.findMany({
        where: {
          assigneeId: employee.id,
          tenantId: user.tenantId,
        },
      });

      const tasksCompleted = allTasks.filter((t) => t.status === 'COMPLETED').length;
      const tasksInProgress = allTasks.filter((t) => t.status === 'IN_PROGRESS').length;

      // Project metrics
      const projectAssignments = await prisma.projectAssignment.findMany({
        where: {
          employeeId: employee.id,
          tenantId: user.tenantId,
        },
        include: {
          project: true,
        },
      });

      const projectsCompleted = projectAssignments.filter(
        (pa) => pa.project.status === 'COMPLETED'
      ).length;
      const projectsActive = projectAssignments.filter(
        (pa) => pa.project.status === 'ACTIVE'
      ).length;

      // Goals metrics
      const goals = await prisma.goal.findMany({
        where: {
          employeeId: employee.id,
          tenantId: user.tenantId,
        },
      });

      const goalsCompleted = goals.filter((g) => g.status === 'COMPLETED').length;
      const goalsInProgress = goals.filter((g) => g.status === 'IN_PROGRESS').length;
      const goalsOverdue = goals.filter(
        (g) => g.status === 'IN_PROGRESS' && g.dueDate && new Date(g.dueDate) < new Date()
      ).length;

      // Meeting metrics
      const meetingAttendances = await prisma.meetingAttendee.findMany({
        where: {
          employeeId: employee.id,
        },
        include: {
          meeting: true,
        },
      });

      const meetingsAttended = meetingAttendances.filter(
        (ma) => ma.responseStatus === 'ACCEPTED'
      ).length;

      const meetingResponseRate = meetingAttendances.length > 0
        ? meetingAttendances.filter((ma) => ma.responseStatus !== 'PENDING').length /
          meetingAttendances.length
        : 0;

      const metrics = {
        coursesCompleted: allCourses.length,
        coursesApproved: coursesApproved.length,
        coursesPending: coursesPending.length,
        averageCourseRating: Math.round(averageRating * 10) / 10,
        certificationsEarned,
        skillsAcquired: uniqueSkills,
        totalLearningHours: totalHours,
        tasksCompleted,
        tasksInProgress,
        projectsCompleted,
        projectsActive,
        goalsCompleted,
        goalsInProgress,
        goalsOverdue,
        meetingsAttended,
        meetingResponseRate: Math.round(meetingResponseRate * 100) / 100,
        performanceScore: 0, // Will be calculated below
      };

      metrics.performanceScore = calculatePerformanceScore(metrics);

      performanceData.push({
        employee: {
          id: employee.id,
          user: employee.user,
          jobTitle: employee.jobTitle,
        },
        metrics,
        period,
      });
    }

    // Sort by performance score descending
    performanceData.sort((a, b) => b.metrics.performanceScore - a.metrics.performanceScore);

    return NextResponse.json({
      success: true,
      period,
      teamSize: directReports.length,
      data: performanceData,
    });
  } catch (error) {
    console.error('[GET /api/manager/performance/analytics] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch performance analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
