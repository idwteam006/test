import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessions } from '@/lib/redis';
import { prisma } from '@/lib/prisma';
import {
  notifyClientProjectCreated,
  notifyProjectManagerAssigned,
  notifyAdminProjectCreated,
} from '@/lib/email-notifications';

/**
 * POST /api/projects/create
 *
 * Create a new project
 *
 * Security:
 * - Requires authentication
 * - Creates project for current tenant
 * - Validates client belongs to tenant
 */
export async function POST(request: NextRequest) {
  try {
    // Get session cookie
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    // Get session from Redis
    const sessionData = await sessions.get(sessionId);

    if (!sessionData) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session expired. Please login again.',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.clientId || !body.startDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, clientId, startDate',
        },
        { status: 400 }
      );
    }

    // Verify client belongs to tenant
    const client = await prisma.client.findFirst({
      where: {
        id: body.clientId,
        tenantId: sessionData.tenantId,
      },
    });

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          error: 'Client not found or does not belong to your organization',
        },
        { status: 404 }
      );
    }

    // Get tenant details for project code prefix and email notifications
    const tenant = await prisma.tenant.findUnique({
      where: { id: sessionData.tenantId },
      select: { slug: true, name: true },
    });

    // Generate project code with retry logic to handle race conditions
    // Format: {TENANT_SLUG}-{YEAR}-{NUMBER} (e.g., ZENORA-2025-0001)
    const tenantPrefix = tenant?.slug?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'PROJ';
    const year = new Date().getFullYear();

    let projectCode: string = '';
    let retries = 5;

    while (retries > 0) {
      // Get the last project code for this tenant and year
      const lastProject = await prisma.project.findFirst({
        where: {
          tenantId: sessionData.tenantId,
          projectCode: {
            startsWith: `${tenantPrefix}-${year}-`,
          },
        },
        orderBy: {
          projectCode: 'desc',
        },
      });

      if (lastProject && lastProject.projectCode) {
        const parts = lastProject.projectCode.split('-');
        const lastNumber = parseInt(parts[parts.length - 1]) || 0;
        projectCode = `${tenantPrefix}-${year}-${String(lastNumber + 1).padStart(4, '0')}`;
      } else {
        projectCode = `${tenantPrefix}-${year}-0001`;
      }

      // Check if this code already exists globally (handles race conditions)
      const existingProject = await prisma.project.findUnique({
        where: { projectCode },
      });

      if (!existingProject) {
        break; // Code is available, proceed
      }

      // Code exists, increment and retry
      const parts = projectCode.split('-');
      const currentNumber = parseInt(parts[parts.length - 1]) || 0;
      projectCode = `${tenantPrefix}-${year}-${String(currentNumber + 1).padStart(4, '0')}`;
      retries--;
    }

    if (retries === 0) {
      // Fallback: add random suffix if all retries exhausted
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      projectCode = `${tenantPrefix}-${year}-${randomSuffix}`;
    }

    // Map form data to project model
    const projectData: any = {
      tenantId: sessionData.tenantId,
      projectCode,
      name: body.name,
      description: body.description || null,
      clientId: body.clientId,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      status: body.initialStatus || 'PLANNING',
    };

    // Add budget fields if provided
    if (body.estimatedHours) {
      projectData.budgetHours = parseFloat(body.estimatedHours);
    }

    if (body.totalBudget) {
      projectData.budgetCost = parseFloat(body.totalBudget);
    }

    // Add currency if provided
    if (body.currency) {
      projectData.currency = body.currency;
    }

    // Create project with retry on unique constraint violation
    let project;
    let createRetries = 3;

    while (createRetries > 0) {
      try {
        project = await prisma.project.create({
          data: projectData,
          include: {
            client: {
              select: {
                id: true,
                clientId: true,
                companyName: true,
              },
            },
          },
        });
        break; // Success, exit loop
      } catch (createError: any) {
        if (createError.code === 'P2002' && createRetries > 1) {
          // Unique constraint violation - generate new code and retry
          console.log(`Project code ${projectData.projectCode} already exists, generating new code...`);
          const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
          projectData.projectCode = `${tenantPrefix}-${year}-${randomSuffix}`;
          createRetries--;
        } else {
          throw createError; // Re-throw if not unique constraint or out of retries
        }
      }
    }

    if (!project) {
      throw new Error('Failed to create project after multiple retries');
    }

    // Create project assignments for team members if provided
    if (body.teamMembers && Array.isArray(body.teamMembers) && body.teamMembers.length > 0) {
      const assignments = body.teamMembers.map((member: any) => ({
        tenantId: sessionData.tenantId,
        projectId: project.id,
        employeeId: member.userId,
        billableRate: member.hourlyRate || 0,
        role: member.role || null,
      }));

      await prisma.projectAssignment.createMany({
        data: assignments,
        skipDuplicates: true,
      });
    }

    // Add project manager as assignment if provided
    if (body.projectManagerId) {
      // Check if user exists and has employee record
      const manager = await prisma.user.findFirst({
        where: {
          id: body.projectManagerId,
          tenantId: sessionData.tenantId,
        },
        include: {
          employee: true,
        },
      });

      if (manager && manager.employee) {
        // Create assignment for project manager
        await prisma.projectAssignment.create({
          data: {
            tenantId: sessionData.tenantId,
            projectId: project.id,
            employeeId: manager.employee.id,
            billableRate: parseFloat(body.hourlyRate || '0'),
            role: 'Project Manager',
          },
        });

        // Recursively get all subordinates at all levels
        const getAllSubordinates = async (employeeId: string, visited = new Set<string>()): Promise<string[]> => {
          // Prevent infinite loops
          if (visited.has(employeeId)) {
            return [];
          }
          visited.add(employeeId);

          const employee = await prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
              subordinates: true,
            },
          });

          if (!employee || !employee.subordinates || employee.subordinates.length === 0) {
            return [];
          }

          const allSubordinateIds: string[] = [];

          for (const subordinate of employee.subordinates) {
            // Add the direct subordinate
            allSubordinateIds.push(subordinate.id);

            // Recursively get subordinates of this subordinate
            const nestedSubordinateIds = await getAllSubordinates(subordinate.id, visited);
            allSubordinateIds.push(...nestedSubordinateIds);
          }

          return allSubordinateIds;
        };

        // Get all subordinates at all levels
        const allSubordinateIds = await getAllSubordinates(manager.employee.id);

        // Automatically assign all subordinates (at all levels) to the project
        if (allSubordinateIds.length > 0) {
          const subordinateAssignments = allSubordinateIds.map((employeeId) => ({
            tenantId: sessionData.tenantId,
            projectId: project.id,
            employeeId: employeeId,
            billableRate: 0, // Default rate, can be updated later
            role: 'Team Member',
          }));

          await prisma.projectAssignment.createMany({
            data: subordinateAssignments,
            skipDuplicates: true,
          });

          console.log(`Auto-assigned ${subordinateAssignments.length} subordinate(s) at all levels to project ${project.id}`);
        }
      }
    }

    console.log('Project created:', project.id);

    // ============================================================================
    // Send Email Notifications
    // ============================================================================

    // Get current user details for email notifications
    const currentUser = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const createdByName = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : 'System Admin';

    const organizationName = tenant?.name || 'Zenora';

    // Get project manager details if assigned
    const projectManager = body.projectManagerId
      ? await prisma.user.findFirst({
          where: {
            id: body.projectManagerId,
            tenantId: sessionData.tenantId,
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        })
      : null;

    // Format dates for emails
    const formatDate = (date: Date | null) => {
      if (!date) return undefined;
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    };

    const projectStartDate = formatDate(project.startDate);
    const projectEndDate = project.endDate ? formatDate(project.endDate) : undefined;

    // 1. Notify client (primary contact)
    if (client.contactEmail) {
      const projectManagerName = projectManager
        ? `${projectManager.firstName} ${projectManager.lastName}`
        : 'TBD';

      notifyClientProjectCreated({
        clientEmail: client.contactEmail,
        clientName: client.companyName,
        projectName: project.name,
        projectCode: project.projectCode,
        projectDescription: project.description || undefined,
        startDate: projectStartDate || new Date().toLocaleDateString(),
        endDate: projectEndDate,
        projectManagerName,
        organizationName,
      }).catch((error) => {
        console.error('Failed to send client notification:', error);
      });
    }

    // 2. Notify project manager
    if (projectManager && projectManager.email) {
      notifyProjectManagerAssigned({
        managerEmail: projectManager.email,
        managerName: `${projectManager.firstName} ${projectManager.lastName}`,
        projectName: project.name,
        projectCode: project.projectCode,
        projectDescription: project.description || undefined,
        clientName: client.companyName,
        startDate: projectStartDate || new Date().toLocaleDateString(),
        endDate: projectEndDate,
        budgetCost: project.budgetCost || undefined,
        currency: project.currency || 'USD',
        organizationName,
      }).catch((error) => {
        console.error('Failed to send project manager notification:', error);
      });
    }

    // 3. Notify all admin users
    const adminUsers = await prisma.user.findMany({
      where: {
        tenantId: sessionData.tenantId,
        role: 'ADMIN',
        // Don't send duplicate email if admin is also the project manager
        ...(projectManager ? { id: { not: projectManager.id } } : {}),
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const projectManagerName = projectManager
      ? `${projectManager.firstName} ${projectManager.lastName}`
      : 'TBD';

    adminUsers.forEach((admin) => {
      notifyAdminProjectCreated({
        adminEmail: admin.email,
        adminName: `${admin.firstName} ${admin.lastName}`,
        projectName: project.name,
        projectCode: project.projectCode,
        clientName: client.companyName,
        projectManagerName,
        startDate: projectStartDate || new Date().toLocaleDateString(),
        endDate: projectEndDate,
        budgetCost: project.budgetCost || undefined,
        currency: project.currency || 'USD',
        createdByName,
        organizationName,
      }).catch((error) => {
        console.error(`Failed to send admin notification to ${admin.email}:`, error);
      });
    });

    console.log('Email notifications sent to client, project manager, and admins');

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        projectId: project.id, // For backward compatibility
        name: project.name,
        clientId: project.clientId,
        client: project.client,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
      },
    });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create project',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
