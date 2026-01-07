/**
 * GET /api/manager/reports/export
 * Export team reports in Excel, PDF, or CSV format
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


export async function GET(request: NextRequest) {
  try {
    // Authenticate user
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
        { success: false, error: 'Invalid session' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      select: { id: true, tenantId: true, role: true, departmentId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: userId, tenantId, role } = user;

    // Only managers and admins can export
    if (role !== 'MANAGER' && role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Manager access required.' },
        { status: 403 }
      );
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const format_type = searchParams.get('format') || 'excel';
    const startDate = searchParams.get('startDate') || format(new Date(), 'yyyy-MM-dd');
    const endDate = searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd');
    const teamMemberId = searchParams.get('teamMember');
    const projectId = searchParams.get('project');

    // Build where clause
    const whereClause: any = {
      tenantId,
      workDate: {
        gte: startOfDay(new Date(startDate)),
        lte: endOfDay(new Date(endDate)),
      },
    };

    if (teamMemberId && teamMemberId !== 'all') {
      whereClause.userId = teamMemberId;
    }

    if (projectId && projectId !== 'all') {
      whereClause.projectId = projectId;
    }

    // If MANAGER role, only show their department
    if (role === 'MANAGER') {
      const manager = await prisma.user.findUnique({
        where: { id: userId },
        select: { departmentId: true },
      });

      if (manager?.departmentId) {
        whereClause.user = {
          departmentId: manager.departmentId,
        };
      }
    }

    // Fetch entries with all details
    const entries = await prisma.timesheetEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            employeeId: true,
            email: true,
          },
        },
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
      },
      orderBy: [
        { workDate: 'desc' },
        { user: { firstName: 'asc' } },
      ],
    });

    // Calculate summary stats
    const totalHours = entries.reduce((sum, e) => sum + e.hoursWorked, 0);
    const billableHours = entries.filter((e) => e.isBillable).reduce((sum, e) => sum + e.hoursWorked, 0);
    // Revenue calculation would require billableRate from ProjectAssignment
    // For now, use a default rate of $100/hour for billable hours
    const revenue = billableHours * 100;

    // Team member summary
    const teamSummaryMap = new Map<string, any>();
    entries.forEach((entry) => {
      const memberId = entry.user.employeeId;
      if (!teamSummaryMap.has(memberId)) {
        teamSummaryMap.set(memberId, {
          name: `${entry.user.firstName} ${entry.user.lastName}`,
          employeeId: entry.user.employeeId,
          totalHours: 0,
          billableHours: 0,
        });
      }
      const member = teamSummaryMap.get(memberId);
      member.totalHours += entry.hoursWorked;
      if (entry.isBillable) member.billableHours += entry.hoursWorked;
    });

    const teamSummary = Array.from(teamSummaryMap.values());

    // Project summary
    const projectSummaryMap = new Map<string, any>();
    entries.forEach((entry) => {
      if (!entry.projectId) return;
      if (!projectSummaryMap.has(entry.projectId)) {
        projectSummaryMap.set(entry.projectId, {
          projectName: entry.project?.name || 'Unknown',
          projectCode: entry.project?.projectCode || 'N/A',
          totalHours: 0,
          billableHours: 0,
          revenue: 0,
        });
      }
      const project = projectSummaryMap.get(entry.projectId);
      project.totalHours += entry.hoursWorked;
      if (entry.isBillable) {
        project.billableHours += entry.hoursWorked;
        // Use default rate of $100/hour for revenue calculation
        project.revenue += entry.hoursWorked * 100;
      }
    });

    const projectSummary = Array.from(projectSummaryMap.values());

    // Generate based on format
    if (format_type === 'excel') {
      const buffer = await generateExcelReport({
        startDate,
        endDate,
        entries,
        teamSummary,
        projectSummary,
        totalHours,
        billableHours,
        revenue,
      });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="team-report-${startDate}-to-${endDate}.xlsx"`,
        },
      });
    } else if (format_type === 'pdf') {
      const buffer = await generatePDFReport({
        startDate,
        endDate,
        entries,
        teamSummary,
        projectSummary,
        totalHours,
        billableHours,
        revenue,
      });

      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="team-report-${startDate}-to-${endDate}.pdf"`,
        },
      });
    } else if (format_type === 'csv') {
      const csv = generateCSVReport(entries);

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="team-report-${startDate}-to-${endDate}.csv"`,
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid format' }, { status: 400 });
  } catch (error) {
    console.error('[GET /api/manager/reports/export] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function generateExcelReport(data: any) {
  const workbook = new ExcelJS.Workbook();

  // Executive Summary Sheet
  const summarySheet = workbook.addWorksheet('Executive Summary');

  summarySheet.columns = [
    { header: 'Metric', key: 'metric', width: 30 },
    { header: 'Value', key: 'value', width: 20 },
  ];

  summarySheet.addRows([
    { metric: 'Report Period', value: `${data.startDate} to ${data.endDate}` },
    { metric: 'Total Hours', value: data.totalHours.toFixed(2) },
    { metric: 'Billable Hours', value: data.billableHours.toFixed(2) },
    { metric: 'Billable %', value: `${((data.billableHours / data.totalHours) * 100).toFixed(1)}%` },
    { metric: 'Total Revenue', value: `$${data.revenue.toLocaleString()}` },
    { metric: 'Team Members', value: data.teamSummary.length },
    { metric: 'Projects', value: data.projectSummary.length },
  ]);

  // Style header row
  summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };

  // Team Summary Sheet
  const teamSheet = workbook.addWorksheet('Team Summary');

  teamSheet.columns = [
    { header: 'Employee ID', key: 'employeeId', width: 15 },
    { header: 'Name', key: 'name', width: 25 },
    { header: 'Total Hours', key: 'totalHours', width: 15 },
    { header: 'Billable Hours', key: 'billableHours', width: 15 },
    { header: 'Billable %', key: 'billablePercent', width: 15 },
  ];

  data.teamSummary.forEach((member: any) => {
    teamSheet.addRow({
      employeeId: member.employeeId,
      name: member.name,
      totalHours: member.totalHours.toFixed(2),
      billableHours: member.billableHours.toFixed(2),
      billablePercent: `${((member.billableHours / member.totalHours) * 100).toFixed(1)}%`,
    });
  });

  teamSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  teamSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };

  // Project Summary Sheet
  const projectSheet = workbook.addWorksheet('Project Summary');

  projectSheet.columns = [
    { header: 'Project Code', key: 'projectCode', width: 15 },
    { header: 'Project Name', key: 'projectName', width: 30 },
    { header: 'Total Hours', key: 'totalHours', width: 15 },
    { header: 'Billable Hours', key: 'billableHours', width: 15 },
    { header: 'Revenue', key: 'revenue', width: 15 },
  ];

  data.projectSummary.forEach((project: any) => {
    projectSheet.addRow({
      projectCode: project.projectCode,
      projectName: project.projectName,
      totalHours: project.totalHours.toFixed(2),
      billableHours: project.billableHours.toFixed(2),
      revenue: `$${project.revenue.toLocaleString()}`,
    });
  });

  projectSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  projectSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };

  // Detailed Entries Sheet
  const detailsSheet = workbook.addWorksheet('Detailed Entries');

  detailsSheet.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Employee', key: 'employee', width: 20 },
    { header: 'Project', key: 'project', width: 20 },
    { header: 'Task', key: 'task', width: 20 },
    { header: 'Activity', key: 'activity', width: 15 },
    { header: 'Hours', key: 'hours', width: 10 },
    { header: 'Billable', key: 'billable', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Description', key: 'description', width: 40 },
  ];

  data.entries.forEach((entry: any) => {
    detailsSheet.addRow({
      date: format(new Date(entry.workDate), 'yyyy-MM-dd'),
      employee: `${entry.user.firstName} ${entry.user.lastName}`,
      project: entry.project?.name || 'N/A',
      task: entry.task?.title || 'N/A',
      activity: entry.activityType || 'N/A',
      hours: entry.hoursWorked.toFixed(2),
      billable: entry.isBillable ? 'Yes' : 'No',
      status: entry.status,
      description: entry.description,
    });
  });

  detailsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  detailsSheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

async function generatePDFReport(data: any) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(20);
  doc.text('Team Timesheet Report', 14, 20);

  doc.setFontSize(10);
  doc.text(`Period: ${data.startDate} to ${data.endDate}`, 14, 30);
  doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, 14, 36);

  // Executive Summary
  doc.setFontSize(14);
  doc.text('Executive Summary', 14, 50);

  autoTable(doc, {
    startY: 55,
    head: [['Metric', 'Value']],
    body: [
      ['Total Hours', data.totalHours.toFixed(2)],
      ['Billable Hours', data.billableHours.toFixed(2)],
      ['Billable %', `${((data.billableHours / data.totalHours) * 100).toFixed(1)}%`],
      ['Total Revenue', `$${data.revenue.toLocaleString()}`],
      ['Team Members', data.teamSummary.length],
      ['Projects', data.projectSummary.length],
    ],
  });

  // Team Summary
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Team Member Summary', 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [['Employee ID', 'Name', 'Total Hours', 'Billable Hours', 'Billable %']],
    body: data.teamSummary.map((member: any) => [
      member.employeeId,
      member.name,
      member.totalHours.toFixed(2),
      member.billableHours.toFixed(2),
      `${((member.billableHours / member.totalHours) * 100).toFixed(1)}%`,
    ]),
  });

  // Project Summary
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Project Summary', 14, 20);

  autoTable(doc, {
    startY: 25,
    head: [['Code', 'Project Name', 'Total Hours', 'Billable Hours', 'Revenue']],
    body: data.projectSummary.map((project: any) => [
      project.projectCode,
      project.projectName,
      project.totalHours.toFixed(2),
      project.billableHours.toFixed(2),
      `$${project.revenue.toLocaleString()}`,
    ]),
  });

  return Buffer.from(doc.output('arraybuffer'));
}

function generateCSVReport(entries: any[]) {
  const headers = [
    'Date',
    'Employee ID',
    'Employee Name',
    'Project',
    'Task',
    'Activity Type',
    'Hours',
    'Billable',
    'Status',
    'Description',
  ];

  const rows = entries.map((entry) => [
    format(new Date(entry.workDate), 'yyyy-MM-dd'),
    entry.user.employeeId,
    `${entry.user.firstName} ${entry.user.lastName}`,
    entry.project?.name || 'N/A',
    entry.task?.title || 'N/A',
    entry.activityType || 'N/A',
    entry.hoursWorked.toFixed(2),
    entry.isBillable ? 'Yes' : 'No',
    entry.status,
    `"${entry.description.replace(/"/g, '""')}"`, // Escape quotes in description
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  return csv;
}
