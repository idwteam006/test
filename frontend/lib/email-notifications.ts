/**
 * Email Notifications Service for Zenora.ai
 * Comprehensive notifications for all roles and modules
 *
 * OUTLOOK COMPATIBILITY NOTES:
 * - All templates use table-based layouts for Outlook compatibility
 * - VML (Vector Markup Language) is used for background colors in Outlook
 * - bgcolor attribute is added to tables for fallback
 * - All text colors are explicitly set (Outlook ignores inherited colors)
 */

import { sendEmail } from './resend-email';
import {
  generateOutlookEmail,
  createEmailButton,
  createInfoBox,
  createWarningBox,
  createEmailFooter,
  EMAIL_COLORS,
  type EmailColorTheme
} from './email-template-utils';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';

/**
 * Helper function to generate Outlook-compatible email wrapper
 * Used for templates that need colored backgrounds
 */
function wrapEmailContent(
  title: string,
  content: string,
  theme: EmailColorTheme = 'primary'
): string {
  const colors = EMAIL_COLORS[theme];
  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" ${colors.vmlGradient} angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${colors.fallback}" style="background: linear-gradient(135deg, ${colors.main} 0%, ${colors.gradient} 100%); background-color: ${colors.fallback}; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px; color: #ffffff;">
                    ${content}
                  </td>
                </tr>
              </table>
              <!--[if mso]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// MANAGER NOTIFICATIONS
// ============================================================================

/**
 * Notify manager when timesheet is submitted for approval
 * Outlook-compatible with table-based layout and VML backgrounds
 */
export async function notifyManagerTimesheetSubmitted(options: {
  managerEmail: string;
  managerName: string;
  employeeName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  reviewUrl: string;
}): Promise<boolean> {
  const content = `
    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">⏱️ Timesheet Pending Approval</h1>
    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${options.managerName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;"><strong style="color: #ffffff;">${options.employeeName}</strong> has submitted a timesheet for your review.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
          <!--[if mso]>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#c78a00">
            <tr><td style="padding: 20px;">
          <![endif]-->
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Employee:</strong> ${options.employeeName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Week:</strong> ${options.weekStart} - ${options.weekEnd}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Total Hours:</strong> ${options.totalHours}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Status:</strong> Pending Review</p>
          <!--[if mso]>
            </td></tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color: #ffffff; border-radius: 6px;">
                <a href="${options.reviewUrl}" style="display: inline-block; padding: 14px 32px; color: #d97706; text-decoration: none; font-weight: 600; font-size: 16px;">Review Timesheet</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      <tr>
        <td style="font-size: 12px; color: #e0e0e0;">
          <p style="margin: 0; color: #e0e0e0;">© ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
        </td>
      </tr>
    </table>
  `;

  const html = wrapEmailContent('Timesheet Pending Approval', content, 'warning');

  return sendEmail({
    to: options.managerEmail,
    subject: `⏱️ Timesheet Submitted by ${options.employeeName}`,
    html,
  });
}

/**
 * Notify manager when leave request is submitted
 * Outlook-compatible with table-based layout and VML backgrounds
 */
export async function notifyManagerLeaveRequested(options: {
  managerEmail: string;
  managerName: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  reviewUrl: string;
}): Promise<boolean> {
  const reasonHtml = options.reason ? `<p style="margin: 15px 0 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Reason:</strong><br>${options.reason}</p>` : '';

  const content = `
    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">🌴 Leave Request Pending Approval</h1>
    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${options.managerName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;"><strong style="color: #ffffff;">${options.employeeName}</strong> has requested leave for your approval.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
          <!--[if mso]>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#c78a00">
            <tr><td style="padding: 20px;">
          <![endif]-->
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Employee:</strong> ${options.employeeName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Leave Type:</strong> ${options.leaveType}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Start Date:</strong> ${options.startDate}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">End Date:</strong> ${options.endDate}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Duration:</strong> ${options.days} day${options.days > 1 ? 's' : ''}</p>
          ${reasonHtml}
          <!--[if mso]>
            </td></tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color: #ffffff; border-radius: 6px;">
                <a href="${options.reviewUrl}" style="display: inline-block; padding: 14px 32px; color: #d97706; text-decoration: none; font-weight: 600; font-size: 16px;">Review Leave Request</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      <tr>
        <td style="font-size: 12px; color: #e0e0e0;">
          <p style="margin: 0; color: #e0e0e0;">© ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
        </td>
      </tr>
    </table>
  `;

  const html = wrapEmailContent('Leave Request Pending Approval', content, 'warning');

  return sendEmail({
    to: options.managerEmail,
    subject: `🌴 Leave Request from ${options.employeeName}`,
    html,
  });
}

/**
 * Notify manager when expense is submitted
 * Outlook-compatible with table-based layout and VML backgrounds
 */
export async function notifyManagerExpenseSubmitted(options: {
  managerEmail: string;
  managerName: string;
  employeeName: string;
  expenseTitle: string;
  amount: number;
  currency: string;
  category: string;
  expenseDate: string;
  reviewUrl: string;
}): Promise<boolean> {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: options.currency || 'USD',
  }).format(options.amount);

  const content = `
    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">💰 Expense Claim Pending Approval</h1>
    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${options.managerName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;"><strong style="color: #ffffff;">${options.employeeName}</strong> has submitted an expense claim for your review.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
          <!--[if mso]>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#c78a00">
            <tr><td style="padding: 20px;">
          <![endif]-->
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Employee:</strong> ${options.employeeName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Expense:</strong> ${options.expenseTitle}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Amount:</strong> ${formattedAmount}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Category:</strong> ${options.category}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Date:</strong> ${options.expenseDate}</p>
          <!--[if mso]>
            </td></tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color: #ffffff; border-radius: 6px;">
                <a href="${options.reviewUrl}" style="display: inline-block; padding: 14px 32px; color: #d97706; text-decoration: none; font-weight: 600; font-size: 16px;">Review Expense</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      <tr>
        <td style="font-size: 12px; color: #e0e0e0;">
          <p style="margin: 0; color: #e0e0e0;">© ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
        </td>
      </tr>
    </table>
  `;

  const html = wrapEmailContent('Expense Claim Pending Approval', content, 'warning');

  return sendEmail({
    to: options.managerEmail,
    subject: `💰 Expense Claim from ${options.employeeName} - ${formattedAmount}`,
    html,
  });
}

// ============================================================================
// EMPLOYEE NOTIFICATIONS
// ============================================================================

/**
 * Notify employee when timesheet is approved
 * Professional, lightweight version with clean design
 */
export async function notifyEmployeeTimesheetApproved(options: {
  employeeEmail: string;
  employeeName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  approvedBy: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timesheet Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-collapse: collapse;">

          <!-- Header with success indicator -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e2e8f0;">
              <div style="display: inline-block; background: #dcfce7; color: #059669; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; margin-bottom: 16px;">
                APPROVED
              </div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.2;">
                Timesheet Approved
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                Week of ${options.weekStart} - ${options.weekEnd}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Hi ${options.employeeName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Your timesheet has been approved. Great work this week!
              </p>

              <!-- Timesheet Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <!-- WEEK field -->
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #64748b; font-weight: 500;">WEEK</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a; font-weight: 500;">${options.weekStart} - ${options.weekEnd}</span>
                        </td>
                      </tr>

                      <!-- TOTAL HOURS field -->
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #64748b; font-weight: 500;">TOTAL HOURS</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a;">${options.totalHours} hours</span>
                        </td>
                      </tr>

                      <!-- APPROVED BY field -->
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #64748b; font-weight: 500;">APPROVED BY</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0;">
                          <span style="font-size: 15px; color: #0f172a;">${options.approvedBy}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${APP_URL}/employee/timesheets" style="display: inline-block; background: #059669; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      View Timesheets
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                This is an automated notification from Zenora.ai
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `Timesheet Approved: ${options.weekStart} - ${options.weekEnd}`,
    html,
  });
}

/**
 * Notify employee when timesheet is rejected
 */
export async function notifyEmployeeTimesheetRejected(options: {
  employeeEmail: string;
  employeeName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  rejectedBy: string;
  reason: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>❌ Timesheet Requires Correction</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your timesheet has been rejected by ${options.rejectedBy} and needs correction.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Week:</strong> ${options.weekStart} - ${options.weekEnd}</p>
      <p style="margin: 5px 0;"><strong>Total Hours:</strong> ${options.totalHours}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Rejected</p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Reason:</strong><br>
      ${options.reason}
    </div>

    <p>Please make the necessary corrections and resubmit your timesheet.</p>

    <center>
      <a href="${APP_URL}/employee/timesheets" style="display: inline-block; background: white; color: #dc2626; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        Update Timesheet
      </a>
    </center>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: '❌ Timesheet Requires Correction',
    html,
  });
}

/**
 * Notify employee when leave is approved
 */
export async function notifyEmployeeLeaveApproved(options: {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  approvedBy: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100 %); border-radius: 10px; padding: 40px; color: white;">
    <h1>✅ Leave Request Approved</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your leave request has been approved by ${options.approvedBy}!</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${options.leaveType}</p>
      <p style="margin: 5px 0;"><strong>Start Date:</strong> ${options.startDate}</p>
      <p style="margin: 5px 0;"><strong>End Date:</strong> ${options.endDate}</p>
      <p style="margin: 5px 0;"><strong>Duration:</strong> ${options.days} day${options.days > 1 ? 's' : ''}</p>
    </div>

    <p>Enjoy your time off! 🌴</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: '✅ Leave Request Approved',
    html,
  });
}

/**
 * Notify employee when leave is rejected
 */
export async function notifyEmployeeLeaveRejected(options: {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  rejectedBy: string;
  reason: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>❌ Leave Request Rejected</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Unfortunately, your leave request has been rejected by ${options.rejectedBy}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${options.leaveType}</p>
      <p style="margin: 5px 0;"><strong>Start Date:</strong> ${options.startDate}</p>
      <p style="margin: 5px 0;"><strong>End Date:</strong> ${options.endDate}</p>
      <p style="margin: 5px 0;"><strong>Duration:</strong> ${options.days} day${options.days > 1 ? 's' : ''}</p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Reason:</strong><br>
      ${options.reason}
    </div>

    <p>If you have questions, please contact ${options.rejectedBy}.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: '❌ Leave Request Rejected',
    html,
  });
}

/**
 * Notify employee when expense is approved
 */
export async function notifyEmployeeExpenseApproved(options: {
  employeeEmail: string;
  employeeName: string;
  expenseTitle: string;
  amount: number;
  currency: string;
  approvedBy: string;
}): Promise<boolean> {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: options.currency || 'USD',
  }).format(options.amount);

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>✅ Expense Approved</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your expense claim has been approved by ${options.approvedBy}!</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Expense:</strong> ${options.expenseTitle}</p>
      <p style="margin: 5px 0;"><strong>Amount:</strong> ${formattedAmount}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Approved ✅</p>
    </div>

    <p>Your reimbursement will be processed in the next payroll cycle.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `✅ Expense Approved - ${formattedAmount}`,
    html,
  });
}

/**
 * Notify employee when expense is rejected
 */
export async function notifyEmployeeExpenseRejected(options: {
  employeeEmail: string;
  employeeName: string;
  expenseTitle: string;
  amount: number;
  currency: string;
  rejectedBy: string;
  reason: string;
}): Promise<boolean> {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: options.currency || 'USD',
  }).format(options.amount);

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>❌ Expense Rejected</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your expense claim has been rejected by ${options.rejectedBy}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Expense:</strong> ${options.expenseTitle}</p>
      <p style="margin: 5px 0;"><strong>Amount:</strong> ${formattedAmount}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Rejected</p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Reason:</strong><br>
      ${options.reason}
    </div>

    <p>If you have questions, please contact ${options.rejectedBy}.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `❌ Expense Rejected - ${formattedAmount}`,
    html,
  });
}

/**
 * Notify employee when task is assigned
 */
export async function notifyEmployeeTaskAssigned(options: {
  employeeEmail: string;
  employeeName: string;
  taskName: string;
  description?: string;
  dueDate?: string;
  projectName?: string;
  assignedBy: string;
}): Promise<boolean> {
  const dueDateHtml = options.dueDate ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${options.dueDate}</p>` : '';
  const projectHtml = options.projectName ? `<p style="margin: 5px 0;"><strong>Project:</strong> ${options.projectName}</p>` : '';
  const descriptionHtml = options.description ? `<p style="margin-top: 15px;"><strong>Description:</strong><br>${options.description}</p>` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>📋 New Task Assigned</h1>
    <p>Hi ${options.employeeName},</p>
    <p>You have been assigned a new task by ${options.assignedBy}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; font-size: 20px;">${options.taskName}</h2>
      <p style="margin: 5px 0;"><strong>Assigned by:</strong> ${options.assignedBy}</p>
      ${projectHtml}
      ${dueDateHtml}
      ${descriptionHtml}
    </div>

    <center>
      <a href="${APP_URL}/employee/tasks" style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        View Task
      </a>
    </center>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `📋 New Task: ${options.taskName}`,
    html,
  });
}

// ============================================================================
// HR NOTIFICATIONS
// ============================================================================

/**
 * Notify HR when onboarding is submitted
 */
export async function notifyHROnboardingSubmitted(options: {
  hrEmail: string;
  employeeName: string;
  employeeEmail: string;
  reviewUrl: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>📝 New Onboarding Submission</h1>
    <p>A new employee has completed their onboarding and is awaiting your review.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Employee:</strong> ${options.employeeName}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${options.employeeEmail}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Pending Review</p>
    </div>

    <center>
      <a href="${options.reviewUrl}" style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        Review Onboarding
      </a>
    </center>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.hrEmail,
    subject: '📝 New Onboarding Submission - Action Required',
    html,
  });
}

// ============================================================================
// ACCOUNTANT NOTIFICATIONS
// ============================================================================

/**
 * Notify accountant when invoice is generated
 */
export async function notifyAccountantInvoiceGenerated(options: {
  accountantEmail: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  dueDate: string;
  viewUrl: string;
}): Promise<boolean> {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: options.currency || 'USD',
  }).format(options.amount);

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>📄 New Invoice Generated</h1>
    <p>A new invoice has been generated and is ready for review.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Invoice Number:</strong> ${options.invoiceNumber}</p>
      <p style="margin: 5px 0;"><strong>Client:</strong> ${options.clientName}</p>
      <p style="margin: 5px 0;"><strong>Amount:</strong> ${formattedAmount}</p>
      <p style="margin: 5px 0;"><strong>Due Date:</strong> ${options.dueDate}</p>
    </div>

    <center>
      <a href="${options.viewUrl}" style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        View Invoice
      </a>
    </center>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.accountantEmail,
    subject: `📄 Invoice ${options.invoiceNumber} - ${formattedAmount}`,
    html,
  });
}

// ============================================================================
// MEETING NOTIFICATIONS
// ============================================================================

/**
 * Notify participants when meeting is scheduled
 */
export async function notifyMeetingScheduled(options: {
  participantEmail: string;
  participantName: string;
  meetingTitle: string;
  organizer: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingUrl?: string;
  agenda?: string;
}): Promise<boolean> {
  const locationHtml = options.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${options.location}</p>` : '';
  const meetingUrlHtml = options.meetingUrl ? `<p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${options.meetingUrl}" style="color: white; text-decoration: underline;">${options.meetingUrl}</a></p>` : '';
  const agendaHtml = options.agenda ? `<p style="margin: 15px 0 5px 0;"><strong>Agenda:</strong><br>${options.agenda}</p>` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>📅 Meeting Scheduled</h1>
    <p>Hi ${options.participantName},</p>
    <p>You have been invited to a meeting by ${options.organizer}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; font-size: 20px;">${options.meetingTitle}</h2>
      <p style="margin: 5px 0;"><strong>Organizer:</strong> ${options.organizer}</p>
      <p style="margin: 5px 0;"><strong>Start:</strong> ${options.startTime}</p>
      <p style="margin: 5px 0;"><strong>End:</strong> ${options.endTime}</p>
      ${locationHtml}
      ${meetingUrlHtml}
      ${agendaHtml}
    </div>

    <p>📌 Please mark your calendar and join on time.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.participantEmail,
    subject: `📅 Meeting: ${options.meetingTitle}`,
    html,
  });
}

/**
 * Notify participants when meeting is updated
 */
export async function notifyMeetingUpdated(options: {
  participantEmail: string;
  participantName: string;
  meetingTitle: string;
  organizer: string;
  changes: string;
  newStartTime: string;
  newEndTime: string;
  location?: string;
  meetingUrl?: string;
}): Promise<boolean> {
  const locationHtml = options.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${options.location}</p>` : '';
  const meetingUrlHtml = options.meetingUrl ? `<p style="margin: 5px 0;"><strong>Meeting Link:</strong> <a href="${options.meetingUrl}" style="color: white; text-decoration: underline;">${options.meetingUrl}</a></p>` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>🔄 Meeting Updated</h1>
    <p>Hi ${options.participantName},</p>
    <p>The meeting "<strong>${options.meetingTitle}</strong>" has been updated by ${options.organizer}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>What Changed:</strong><br>
      ${options.changes}
    </div>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; font-size: 20px;">${options.meetingTitle}</h2>
      <p style="margin: 5px 0;"><strong>New Start:</strong> ${options.newStartTime}</p>
      <p style="margin: 5px 0;"><strong>New End:</strong> ${options.newEndTime}</p>
      ${locationHtml}
      ${meetingUrlHtml}
    </div>

    <p>Please update your calendar accordingly.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.participantEmail,
    subject: `🔄 Meeting Updated: ${options.meetingTitle}`,
    html,
  });
}

/**
 * Notify participants when meeting is cancelled
 */
export async function notifyMeetingCancelled(options: {
  participantEmail: string;
  participantName: string;
  meetingTitle: string;
  organizer: string;
  scheduledTime: string;
  reason?: string;
}): Promise<boolean> {
  const reasonHtml = options.reason ? `
    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Cancellation Reason:</strong><br>
      ${options.reason}
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>❌ Meeting Cancelled</h1>
    <p>Hi ${options.participantName},</p>
    <p>The meeting "<strong>${options.meetingTitle}</strong>" scheduled for <strong>${options.scheduledTime}</strong> has been cancelled by ${options.organizer}.</p>

    ${reasonHtml}

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Meeting:</strong> ${options.meetingTitle}</p>
      <p style="margin: 5px 0;"><strong>Was Scheduled:</strong> ${options.scheduledTime}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Cancelled</p>
    </div>

    <p>You can remove this from your calendar.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.participantEmail,
    subject: `❌ Meeting Cancelled: ${options.meetingTitle}`,
    html,
  });
}

/**
 * Notify participant when meeting reminder (15 min before)
 */
export async function notifyMeetingReminder(options: {
  participantEmail: string;
  participantName: string;
  meetingTitle: string;
  startTime: string;
  location?: string;
  meetingUrl?: string;
  minutesBefore: number;
}): Promise<boolean> {
  const locationHtml = options.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${options.location}</p>` : '';
  const meetingUrlHtml = options.meetingUrl ? `
    <center>
      <a href="${options.meetingUrl}" style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        Join Meeting
      </a>
    </center>
  ` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>⏰ Meeting Reminder</h1>
    <p>Hi ${options.participantName},</p>
    <p>Your meeting "<strong>${options.meetingTitle}</strong>" starts in <strong>${options.minutesBefore} minutes</strong>.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; font-size: 20px;">${options.meetingTitle}</h2>
      <p style="margin: 5px 0;"><strong>Start Time:</strong> ${options.startTime}</p>
      ${locationHtml}
    </div>

    ${meetingUrlHtml}

    <p>📌 Don't forget to join on time!</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.participantEmail,
    subject: `⏰ Meeting in ${options.minutesBefore} min: ${options.meetingTitle}`,
    html,
  });
}

// ============================================================================
// SCHEDULE CHANGE NOTIFICATIONS
// ============================================================================

/**
 * Notify employee of schedule change
 */
export async function notifyScheduleChanged(options: {
  employeeEmail: string;
  employeeName: string;
  date: string;
  oldShift?: string;
  newShift: string;
  changedBy: string;
  reason?: string;
}): Promise<boolean> {
  const oldShiftHtml = options.oldShift ? `<p style="margin: 5px 0;"><strong>Previous Shift:</strong> ${options.oldShift}</p>` : '';
  const reasonHtml = options.reason ? `
    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Reason:</strong><br>
      ${options.reason}
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>📅 Schedule Change</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your work schedule has been updated by ${options.changedBy}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Date:</strong> ${options.date}</p>
      ${oldShiftHtml}
      <p style="margin: 5px 0;"><strong>New Shift:</strong> ${options.newShift}</p>
      <p style="margin: 5px 0;"><strong>Changed By:</strong> ${options.changedBy}</p>
    </div>

    ${reasonHtml}

    <p>Please update your calendar and plan accordingly.</p>

    <center>
      <a href="${APP_URL}/employee/schedule" style="display: inline-block; background: white; color: #d97706; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        View Full Schedule
      </a>
    </center>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `📅 Schedule Change - ${options.date}`,
    html,
  });
}

// ============================================================================
// LEAVE CANCELLATION
// ============================================================================

/**
 * Notify manager when employee cancels approved leave
 */
export async function notifyManagerLeaveCancelled(options: {
  managerEmail: string;
  managerName: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
}): Promise<boolean> {
  const reasonHtml = options.reason ? `
    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Cancellation Reason:</strong><br>
      ${options.reason}
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>❌ Leave Cancelled</h1>
    <p>Hi ${options.managerName},</p>
    <p><strong>${options.employeeName}</strong> has cancelled their approved leave.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Employee:</strong> ${options.employeeName}</p>
      <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${options.leaveType}</p>
      <p style="margin: 5px 0;"><strong>Dates:</strong> ${options.startDate} - ${options.endDate}</p>
      <p style="margin: 5px 0;"><strong>Duration:</strong> ${options.days} day${options.days > 1 ? 's' : ''}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Cancelled</p>
    </div>

    ${reasonHtml}

    <p>The employee will now be available during these dates.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.managerEmail,
    subject: `❌ Leave Cancelled by ${options.employeeName}`,
    html,
  });
}

/**
 * Notify employee when leave is cancelled by manager/admin
 */
export async function notifyEmployeeLeaveCancelledByManager(options: {
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  cancelledBy: string;
  reason: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>❌ Leave Cancelled</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your approved leave has been cancelled by ${options.cancelledBy}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${options.leaveType}</p>
      <p style="margin: 5px 0;"><strong>Dates:</strong> ${options.startDate} - ${options.endDate}</p>
      <p style="margin: 5px 0;"><strong>Duration:</strong> ${options.days} day${options.days > 1 ? 's' : ''}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Cancelled</p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Reason:</strong><br>
      ${options.reason}
    </div>

    <p>You are expected to be available during these dates. If you have questions, please contact ${options.cancelledBy}.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: '❌ Your Leave Has Been Cancelled',
    html,
  });
}

// ============================================================================
// PROJECT MANAGEMENT NOTIFICATIONS
// ============================================================================

/**
 * Notify client when new project is created
 */
export async function notifyClientProjectCreated(options: {
  clientEmail: string;
  clientName: string;
  projectName: string;
  projectCode: string;
  projectDescription?: string;
  startDate: string;
  endDate?: string;
  projectManagerName: string;
  organizationName: string;
}): Promise<boolean> {
  const endDateHtml = options.endDate ? `<p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Target End Date:</strong> ${options.endDate}</p>` : '';
  const descriptionHtml = options.projectDescription ? `<p style="margin: 15px 0 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Description:</strong><br>${options.projectDescription}</p>` : '';

  const content = `
    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">New Project Started</h1>
    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${options.clientName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">We're excited to announce that a new project has been created for your organization!</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
          <!--[if mso]>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1e40af">
            <tr><td style="padding: 20px;">
          <![endif]-->
          <h2 style="margin: 0 0 15px; font-size: 20px; color: #ffffff;">${options.projectName}</h2>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Project Code:</strong> ${options.projectCode}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Start Date:</strong> ${options.startDate}</p>
          ${endDateHtml}
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Project Manager:</strong> ${options.projectManagerName}</p>
          ${descriptionHtml}
          <!--[if mso]>
            </td></tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Your project manager will be in touch soon to discuss the next steps. You can track the project progress through our client portal.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color: #ffffff; border-radius: 6px;">
                <a href="${APP_URL}/client/projects" style="display: inline-block; padding: 14px 32px; color: #2563eb; text-decoration: none; font-weight: 600; font-size: 16px;">View Project</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      <tr>
        <td style="font-size: 12px; color: #e0e0e0;">
          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} ${options.organizationName}. All rights reserved.</p>
        </td>
      </tr>
    </table>
  `;

  const html = wrapEmailContent('New Project Created', content, 'blue');

  return sendEmail({
    to: options.clientEmail,
    subject: `New Project Created: ${options.projectName}`,
    html,
  });
}

/**
 * Notify project manager when assigned to a new project
 */
export async function notifyProjectManagerAssigned(options: {
  managerEmail: string;
  managerName: string;
  projectName: string;
  projectCode: string;
  projectDescription?: string;
  clientName: string;
  startDate: string;
  endDate?: string;
  budgetCost?: number;
  currency?: string;
  organizationName: string;
}): Promise<boolean> {
  const endDateHtml = options.endDate ? `<p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Target End Date:</strong> ${options.endDate}</p>` : '';
  const descriptionHtml = options.projectDescription ? `<p style="margin: 15px 0 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Description:</strong><br>${options.projectDescription}</p>` : '';
  const budgetHtml = options.budgetCost ? `
    <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Budget:</strong> ${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: options.currency || 'USD',
    }).format(options.budgetCost)}</p>
  ` : '';

  const content = `
    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">You've Been Assigned as Project Manager</h1>
    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${options.managerName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">You have been assigned as the project manager for a new project!</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
          <!--[if mso]>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#5b21b6">
            <tr><td style="padding: 20px;">
          <![endif]-->
          <h2 style="margin: 0 0 15px; font-size: 20px; color: #ffffff;">${options.projectName}</h2>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Project Code:</strong> ${options.projectCode}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Client:</strong> ${options.clientName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Start Date:</strong> ${options.startDate}</p>
          ${endDateHtml}
          ${budgetHtml}
          ${descriptionHtml}
          <!--[if mso]>
            </td></tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">As the project manager, you'll be responsible for planning, executing, and successfully delivering this project. Please review the project details and coordinate with your team.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color: #ffffff; border-radius: 6px;">
                <a href="${APP_URL}/manager/projects" style="display: inline-block; padding: 14px 32px; color: #7c3aed; text-decoration: none; font-weight: 600; font-size: 16px;">View Project Details</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      <tr>
        <td style="font-size: 12px; color: #e0e0e0;">
          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} ${options.organizationName}. All rights reserved.</p>
        </td>
      </tr>
    </table>
  `;

  const html = wrapEmailContent('Project Manager Assignment', content, 'violet');

  return sendEmail({
    to: options.managerEmail,
    subject: `Project Manager Assignment: ${options.projectName}`,
    html,
  });
}

/**
 * Notify admin when new project is created
 */
export async function notifyAdminProjectCreated(options: {
  adminEmail: string;
  adminName: string;
  projectName: string;
  projectCode: string;
  clientName: string;
  projectManagerName: string;
  startDate: string;
  endDate?: string;
  budgetCost?: number;
  currency?: string;
  createdByName: string;
  organizationName: string;
}): Promise<boolean> {
  const endDateHtml = options.endDate ? `<p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Target End Date:</strong> ${options.endDate}</p>` : '';
  const budgetHtml = options.budgetCost ? `
    <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Budget:</strong> ${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: options.currency || 'USD',
    }).format(options.budgetCost)}</p>
  ` : '';

  const content = `
    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">New Project Created</h1>
    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${options.adminName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">A new project has been created in your organization.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
          <!--[if mso]>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0e7490">
            <tr><td style="padding: 20px;">
          <![endif]-->
          <h3 style="margin: 0 0 15px; font-size: 18px; color: #ffffff;">Project Information</h3>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Project Name:</strong> ${options.projectName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Project Code:</strong> ${options.projectCode}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Client:</strong> ${options.clientName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Project Manager:</strong> ${options.projectManagerName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Start Date:</strong> ${options.startDate}</p>
          ${endDateHtml}
          ${budgetHtml}
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Created By:</strong> ${options.createdByName}</p>
          <!--[if mso]>
            </td></tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color: #ffffff; border-radius: 6px;">
                <a href="${APP_URL}/admin/projects" style="display: inline-block; padding: 14px 32px; color: #0891b2; text-decoration: none; font-weight: 600; font-size: 16px;">View All Projects</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #ffffff;">
      This is an automated notification to keep you informed about new projects in ${options.organizationName}.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      <tr>
        <td style="font-size: 12px; color: #e0e0e0;">
          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
        </td>
      </tr>
    </table>
  `;

  const html = wrapEmailContent('New Project Created', content, 'cyan');

  return sendEmail({
    to: options.adminEmail,
    subject: `New Project Created: ${options.projectName}`,
    html,
  });
}

// ============================================================================
// PROJECT/TASK CANCELLATION
// ============================================================================

/**
 * Notify team when project is cancelled
 */
export async function notifyProjectCancelled(options: {
  teamEmails: string[];
  projectName: string;
  cancelledBy: string;
  reason?: string;
}): Promise<boolean> {
  const reasonHtml = options.reason ? `
    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Cancellation Reason:</strong><br>
      ${options.reason}
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>❌ Project Cancelled</h1>
    <p>The project "<strong>${options.projectName}</strong>" has been cancelled by ${options.cancelledBy}.</p>

    ${reasonHtml}

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Project:</strong> ${options.projectName}</p>
      <p style="margin: 5px 0;"><strong>Cancelled By:</strong> ${options.cancelledBy}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Cancelled</p>
    </div>

    <p>All tasks associated with this project have been cancelled. Please reach out to ${options.cancelledBy} if you have questions.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.teamEmails,
    subject: `❌ Project Cancelled: ${options.projectName}`,
    html,
  });
}

/**
 * Notify employee when task is cancelled
 */
export async function notifyTaskCancelled(options: {
  employeeEmail: string;
  employeeName: string;
  taskName: string;
  projectName?: string;
  cancelledBy: string;
  reason?: string;
}): Promise<boolean> {
  const projectHtml = options.projectName ? `<p style="margin: 5px 0;"><strong>Project:</strong> ${options.projectName}</p>` : '';
  const reasonHtml = options.reason ? `
    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Cancellation Reason:</strong><br>
      ${options.reason}
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>❌ Task Cancelled</h1>
    <p>Hi ${options.employeeName},</p>
    <p>The task "<strong>${options.taskName}</strong>" has been cancelled by ${options.cancelledBy}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Task:</strong> ${options.taskName}</p>
      ${projectHtml}
      <p style="margin: 5px 0;"><strong>Cancelled By:</strong> ${options.cancelledBy}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Cancelled</p>
    </div>

    ${reasonHtml}

    <p>You no longer need to work on this task.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `❌ Task Cancelled: ${options.taskName}`,
    html,
  });
}

// ============================================================================
// ADMIN NOTIFICATIONS
// ============================================================================

/**
 * Notify admin of system events
 */
export async function notifyAdminSystemEvent(options: {
  adminEmail: string;
  eventType: string;
  description: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
}): Promise<boolean> {
  const severityColors = {
    info: { bg: '#667eea', border: '#3b82f6' },
    warning: { bg: '#f59e0b', border: '#fbbf24' },
    error: { bg: '#ef4444', border: '#dc2626' },
  };

  const color = severityColors[options.severity];

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${color.bg} 0%, ${color.border} 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>🔔 System Event</h1>
    <p>A system event has occurred that requires your attention.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Event Type:</strong> ${options.eventType}</p>
      <p style="margin: 5px 0;"><strong>Severity:</strong> ${options.severity.toUpperCase()}</p>
      <p style="margin: 5px 0;"><strong>Time:</strong> ${options.timestamp.toLocaleString()}</p>
      <p style="margin: 15px 0 5px 0;"><strong>Description:</strong><br>${options.description}</p>
    </div>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.adminEmail,
    subject: `🔔 System Event: ${options.eventType}`,
    html,
  });
}

// ============================================================================
// STATUS CHANGE NOTIFICATIONS
// ============================================================================

/**
 * Notify employee when their account status changes
 */
export async function notifyEmployeeStatusChanged(options: {
  employeeEmail: string;
  employeeName: string;
  newStatus: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  previousStatus: string;
  changedBy: string;
  reason?: string;
  organizationName: string;
}): Promise<boolean> {
  const statusConfig = {
    ACTIVE: {
      emoji: '✅',
      title: 'Account Activated',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      message: 'Your account has been activated',
    },
    SUSPENDED: {
      emoji: '⏸️',
      title: 'Account Suspended',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      message: 'Your account has been temporarily suspended',
    },
    INACTIVE: {
      emoji: '🔒',
      title: 'Account Deactivated',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      message: 'Your account has been deactivated',
    },
  };

  const config = statusConfig[options.newStatus];
  const reasonHtml = options.reason ? `
    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Reason:</strong><br>
      ${options.reason}
    </div>
  ` : '';

  const actionHtml = options.newStatus === 'ACTIVE' ? `
    <p>You can now access your account and all features.</p>
    <center>
      <a href="${APP_URL}/employee/dashboard" style="display: inline-block; background: white; color: #059669; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        Access Dashboard
      </a>
    </center>
  ` : `
    <p>If you believe this is an error or have questions, please contact ${options.changedBy} or your HR department.</p>
  `;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: ${config.gradient}; border-radius: 10px; padding: 40px; color: white;">
    <h1>${config.emoji} ${config.title}</h1>
    <p>Hi ${options.employeeName},</p>
    <p>${config.message} in ${options.organizationName}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Previous Status:</strong> ${options.previousStatus}</p>
      <p style="margin: 5px 0;"><strong>New Status:</strong> ${options.newStatus}</p>
      <p style="margin: 5px 0;"><strong>Changed By:</strong> ${options.changedBy}</p>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>

    ${reasonHtml}
    ${actionHtml}

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} ${options.organizationName}. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `${config.emoji} Account Status Changed - ${options.organizationName}`,
    html,
  });
}

// ============================================================================
// ROLE ASSIGNMENT NOTIFICATIONS
// ============================================================================

/**
 * Notify employee when role/designation is assigned or updated
 */
export async function notifyEmployeeRoleAssigned(options: {
  employeeEmail: string;
  employeeName: string;
  role: string;
  jobTitle?: string;
  departmentName?: string;
  managerName?: string;
  organizationName: string;
  assignedBy: string;
}): Promise<boolean> {
  const jobTitleHtml = options.jobTitle ? `<p style="margin: 5px 0;"><strong>Job Title:</strong> ${options.jobTitle}</p>` : '';
  const departmentHtml = options.departmentName ? `<p style="margin: 5px 0;"><strong>Department:</strong> ${options.departmentName}</p>` : '';
  const managerHtml = options.managerName ? `<p style="margin: 5px 0;"><strong>Reporting Manager:</strong> ${options.managerName}</p>` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>🎉 Role Assignment Update</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your role and details have been updated in ${options.organizationName} by ${options.assignedBy}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; font-size: 20px;">Your New Assignment</h2>
      <p style="margin: 5px 0;"><strong>Organization:</strong> ${options.organizationName}</p>
      <p style="margin: 5px 0;"><strong>Role:</strong> ${options.role}</p>
      ${jobTitleHtml}
      ${departmentHtml}
      ${managerHtml}
    </div>

    <p>Welcome to your new role! You can now access all relevant resources and collaborate with your team.</p>

    <center>
      <a href="${APP_URL}/employee/dashboard" style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        Go to Dashboard
      </a>
    </center>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} ${options.organizationName}. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `🎉 Role Update at ${options.organizationName}`,
    html,
  });
}

/**
 * Notify manager when new employee is assigned to them
 */
export async function notifyManagerNewEmployeeAssigned(options: {
  managerEmail: string;
  managerName: string;
  employeeName: string;
  employeeEmail: string;
  role: string;
  jobTitle?: string;
  departmentName?: string;
  organizationName: string;
  assignedBy: string;
}): Promise<boolean> {
  const jobTitleHtml = options.jobTitle ? `<p style="margin: 5px 0;"><strong>Job Title:</strong> ${options.jobTitle}</p>` : '';
  const departmentHtml = options.departmentName ? `<p style="margin: 5px 0;"><strong>Department:</strong> ${options.departmentName}</p>` : '';

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>👥 New Team Member Assigned</h1>
    <p>Hi ${options.managerName},</p>
    <p>A new employee has been assigned to report to you in ${options.organizationName}.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin-top: 0; font-size: 20px;">Employee Details</h2>
      <p style="margin: 5px 0;"><strong>Name:</strong> ${options.employeeName}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${options.employeeEmail}</p>
      <p style="margin: 5px 0;"><strong>Role:</strong> ${options.role}</p>
      ${jobTitleHtml}
      ${departmentHtml}
      <p style="margin: 15px 0 5px 0; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2);"><strong>Assigned By:</strong> ${options.assignedBy}</p>
    </div>

    <p>Please reach out to ${options.employeeName} to welcome them to the team and help them get started.</p>

    <center>
      <a href="${APP_URL}/manager/team" style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        View Your Team
      </a>
    </center>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} ${options.organizationName}. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail({
    to: options.managerEmail,
    subject: `👥 New Team Member: ${options.employeeName}`,
    html,
  });
}

// ============================================================================
// CLIENT MANAGEMENT NOTIFICATIONS
// ============================================================================

/**
 * Notify admin when new client is created
 */
export async function notifyAdminNewClient(options: {
  adminEmail: string;
  adminName: string;
  clientName: string;
  clientId: string;
  contactName: string;
  contactEmail: string;
  accountManagerName?: string;
  createdByName: string;
  organizationName: string;
}): Promise<boolean> {
  const accountManagerHtml = options.accountManagerName ? `<p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Account Manager:</strong> ${options.accountManagerName}</p>` : '';

  const content = `
    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">New Client Added</h1>
    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${options.adminName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">A new client has been added to your organization.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
          <!--[if mso]>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1e40af">
            <tr><td style="padding: 20px;">
          <![endif]-->
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Client:</strong> ${options.clientName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Client ID:</strong> ${options.clientId}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Contact Person:</strong> ${options.contactName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Contact Email:</strong> ${options.contactEmail}</p>
          ${accountManagerHtml}
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Created By:</strong> ${options.createdByName}</p>
          <!--[if mso]>
            </td></tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color: #ffffff; border-radius: 6px;">
                <a href="${APP_URL}/admin/clients" style="display: inline-block; padding: 14px 32px; color: #2563eb; text-decoration: none; font-weight: 600; font-size: 16px;">View All Clients</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #ffffff;">
      This is an automated notification to keep you informed about new clients in ${options.organizationName}.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      <tr>
        <td style="font-size: 12px; color: #e0e0e0;">
          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
        </td>
      </tr>
    </table>
  `;

  const html = wrapEmailContent('New Client Added', content, 'blue');

  return sendEmail({
    to: options.adminEmail,
    subject: `New Client Added: ${options.clientName}`,
    html,
  });
}

/**
 * Notify account manager when assigned to a client
 */
export async function notifyAccountManagerClientAssigned(options: {
  managerEmail: string;
  managerName: string;
  clientName: string;
  clientId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  priority: string;
  assignedByName: string;
  organizationName: string;
}): Promise<boolean> {
  const priorityColors: Record<string, string> = {
    VIP: '#ef4444',
    HIGH: '#f59e0b',
    MEDIUM: '#3b82f6',
    LOW: '#6b7280',
  };

  const priorityColor = priorityColors[options.priority] || '#3b82f6';

  const content = `
    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">New Client Assigned to You</h1>
    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${options.managerName},</p>
    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">You have been assigned as the account manager for a new client.</p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
          <!--[if mso]>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#5b21b6">
            <tr><td style="padding: 20px;">
          <![endif]-->
          <h3 style="margin: 0 0 15px; font-size: 18px; color: #ffffff;">Client Information</h3>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Client Name:</strong> ${options.clientName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Client ID:</strong> ${options.clientId}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Priority:</strong> <span style="background: ${priorityColor}; padding: 4px 12px; border-radius: 4px; font-weight: 600; color: #ffffff;">${options.priority}</span></p>
          <!--[if mso]>
            </td></tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
          <!--[if mso]>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#5b21b6">
            <tr><td style="padding: 20px;">
          <![endif]-->
          <h3 style="margin: 0 0 15px; font-size: 18px; color: #ffffff;">Primary Contact</h3>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Name:</strong> ${options.contactName}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Email:</strong> ${options.contactEmail}</p>
          <p style="margin: 5px 0; color: #ffffff;"><strong style="color: #ffffff;">Phone:</strong> ${options.contactPhone}</p>
          <!--[if mso]>
            </td></tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background-color: #ffffff; border-radius: 6px;">
                <a href="${APP_URL}/admin/clients/${options.clientId}" style="display: inline-block; padding: 14px 32px; color: #7c3aed; text-decoration: none; font-weight: 600; font-size: 16px;">View Client Details</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin: 30px 0 0; font-size: 14px; line-height: 1.6; color: #ffffff;">
      You are now responsible for managing this client relationship. Please reach out to introduce yourself and establish communication.
    </p>

    <p style="margin: 20px 0 0; font-size: 12px; color: #e0e0e0;">
      <strong style="color: #e0e0e0;">Assigned by:</strong> ${options.assignedByName}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      <tr>
        <td style="font-size: 12px; color: #e0e0e0;">
          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
        </td>
      </tr>
    </table>
  `;

  const html = wrapEmailContent('New Client Assignment', content, 'violet');

  return sendEmail({
    to: options.managerEmail,
    subject: `New Client Assignment: ${options.clientName}`,
    html,
  });
}

// ============================================================================
// SYSTEM USER MANAGEMENT NOTIFICATIONS
// ============================================================================

/**
 * Notify admin when new system user is created
 * Professional, lightweight version with clean design
 */
export async function notifyAdminNewSystemUser(options: {
  adminEmail: string;
  adminName: string;
  newUserName: string;
  newUserEmail: string;
  newUserRole: string;
  organizationName: string;
  createdByName: string;
}): Promise<boolean> {
  const roleColors: Record<string, string> = {
    ADMIN: '#dc2626',
    HR: '#7c3aed',
    MANAGER: '#2563eb',
    ACCOUNTANT: '#059669',
    EMPLOYEE: '#64748b',
  };

  const roleColor = roleColors[options.newUserRole] || '#2563eb';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New System User</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e2e8f0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #0f172a; line-height: 1.2;">
                New System User Created
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                ${options.organizationName}
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Hi ${options.adminName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                A new user account has been created in your organization.
              </p>

              <!-- User Info Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #64748b; font-weight: 500;">NAME</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a; font-weight: 500;">${options.newUserName}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #64748b; font-weight: 500;">EMAIL</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a;">${options.newUserEmail}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #64748b; font-weight: 500;">ROLE</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="display: inline-block; background: ${roleColor}; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                            ${options.newUserRole}
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #64748b; font-weight: 500;">CREATED BY</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0;">
                          <span style="font-size: 15px; color: #0f172a;">${options.createdByName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${APP_URL}/admin/system-users" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      View System Users
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                This is an automated notification from Zenora.ai
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: options.adminEmail,
    subject: `New System User: ${options.newUserName}`,
    html,
  });
}

// ============================================================================
// EXIT MANAGEMENT NOTIFICATIONS
// ============================================================================

/**
 * Notify manager when an employee submits a resignation
 */
export async function notifyManagerResignationSubmitted(options: {
  managerEmail: string;
  managerName: string;
  employeeName: string;
  employeePosition: string;
  resignationDate: string;
  lastWorkingDate: string;
  reasonCategory: string;
  reviewUrl: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resignation Submitted</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #dc2626;">
                      Resignation Notice
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                      An employee has submitted their resignation
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Hi ${options.managerName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                <strong>${options.employeeName}</strong> (${options.employeePosition}) has submitted their resignation and requires your review.
              </p>

              <!-- Resignation Details -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #991b1b; font-weight: 500;">EMPLOYEE</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a; font-weight: 500;">${options.employeeName}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #991b1b; font-weight: 500;">RESIGNATION DATE</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a;">${options.resignationDate}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #991b1b; font-weight: 500;">PROPOSED LAST WORKING DATE</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a;">${options.lastWorkingDate}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #991b1b; font-weight: 500;">REASON CATEGORY</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0;">
                          <span style="font-size: 15px; color: #0f172a;">${options.reasonCategory}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${options.reviewUrl}" style="display: inline-block; background: #dc2626; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      Review Resignation
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Please review and take action promptly to ensure a smooth offboarding process.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: options.managerEmail,
    subject: `Resignation Notice: ${options.employeeName} has submitted their resignation`,
    html,
  });
}

/**
 * Notify employee when their resignation is approved by manager
 */
export async function notifyEmployeeResignationApproved(options: {
  employeeEmail: string;
  employeeName: string;
  managerName: string;
  lastWorkingDate: string;
  remarks?: string;
}): Promise<boolean> {
  const remarksHtml = options.remarks ? `
    <tr>
      <td style="padding: 6px 0;">
        <span style="font-size: 13px; color: #166534; font-weight: 500;">MANAGER'S REMARKS</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 0;">
        <span style="font-size: 15px; color: #0f172a;">${options.remarks}</span>
      </td>
    </tr>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resignation Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #16a34a;">
                      Resignation Approved
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                      Your resignation has been approved by your manager
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Hi ${options.employeeName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Your resignation request has been approved by <strong>${options.managerName}</strong>. HR will now process your exit and initiate the clearance procedure.
              </p>

              <!-- Details -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #166534; font-weight: 500;">STATUS</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="display: inline-block; background: #16a34a; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                            Approved
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #166534; font-weight: 500;">LAST WORKING DATE</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a; font-weight: 500;">${options.lastWorkingDate}</span>
                        </td>
                      </tr>
                      ${remarksHtml}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                You will be contacted by HR for the exit interview and clearance process. Please ensure all company assets are returned and knowledge transfer is completed before your last working day.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${APP_URL}/employee/resignation" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      View Exit Status
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                We appreciate your service and wish you the best in your future endeavors.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `Your resignation has been approved`,
    html,
  });
}

/**
 * Notify employee when their resignation is rejected by manager
 */
export async function notifyEmployeeResignationRejected(options: {
  employeeEmail: string;
  employeeName: string;
  managerName: string;
  remarks?: string;
}): Promise<boolean> {
  const remarksHtml = options.remarks ? `
    <table role="presentation" style="width: 100%; border-collapse: collapse; background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca; margin-bottom: 24px;">
      <tr>
        <td style="padding: 20px;">
          <p style="margin: 0 0 8px; font-size: 13px; color: #991b1b; font-weight: 500;">MANAGER'S FEEDBACK</p>
          <p style="margin: 0; font-size: 15px; color: #0f172a;">${options.remarks}</p>
        </td>
      </tr>
    </table>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resignation Not Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #dc2626;">
                      Resignation Not Approved
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                      Your manager has responded to your resignation request
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Hi ${options.employeeName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Your resignation request has not been approved by <strong>${options.managerName}</strong>. Please reach out to your manager to discuss further.
              </p>

              ${remarksHtml}

              <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.6;">
                Your manager may want to discuss your concerns or explore alternatives. Please schedule a meeting at your earliest convenience.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${APP_URL}/employee/resignation" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      View Details
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                If you have any questions, please contact your manager or HR.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `Resignation Request Update`,
    html,
  });
}

/**
 * Notify HR when a resignation is approved by manager and ready for processing
 */
export async function notifyHRResignationApproved(options: {
  hrEmail: string;
  hrName: string;
  employeeName: string;
  employeePosition: string;
  department: string;
  managerName: string;
  lastWorkingDate: string;
  reviewUrl: string;
}): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resignation Ready for HR Processing</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #7c3aed;">
                      Exit Processing Required
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                      A manager-approved resignation is ready for HR processing
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Hi ${options.hrName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                A resignation has been approved by the reporting manager and requires HR processing. Please review and initiate the clearance process.
              </p>

              <!-- Employee Details -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f5f3ff; border-radius: 8px; border: 1px solid #c4b5fd;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #5b21b6; font-weight: 500;">EMPLOYEE</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a; font-weight: 500;">${options.employeeName}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #5b21b6; font-weight: 500;">POSITION</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a;">${options.employeePosition}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #5b21b6; font-weight: 500;">DEPARTMENT</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a;">${options.department}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #5b21b6; font-weight: 500;">APPROVED BY</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a;">${options.managerName}</span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #5b21b6; font-weight: 500;">LAST WORKING DATE</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0;">
                          <span style="font-size: 15px; color: #0f172a; font-weight: 500;">${options.lastWorkingDate}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${options.reviewUrl}" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      Process Exit
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Please initiate the clearance process and schedule the exit interview.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: options.hrEmail,
    subject: `Exit Processing: ${options.employeeName} - Manager Approved`,
    html,
  });
}

/**
 * Notify employee when clearance process has started
 */
export async function notifyEmployeeClearanceStarted(options: {
  employeeEmail: string;
  employeeName: string;
  lastWorkingDate: string;
  clearanceTasks: { department: string; taskName: string }[];
}): Promise<boolean> {
  const taskListHtml = options.clearanceTasks.map(task => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
        <strong style="color: #0f172a;">${task.department}</strong>
        <br>
        <span style="font-size: 14px; color: #64748b;">${task.taskName}</span>
      </td>
    </tr>
  `).join('');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clearance Process Started</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ea580c;">
                      Clearance Process Started
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                      Your exit clearance has been initiated
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Hi ${options.employeeName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Your clearance process has been initiated. Please ensure you complete all handover activities and return company assets before your last working day: <strong>${options.lastWorkingDate}</strong>.
              </p>

              <!-- Clearance Tasks -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #fff7ed; border-radius: 8px; border: 1px solid #fed7aa;">
                <tr>
                  <td style="padding: 16px 16px 8px;">
                    <span style="font-size: 13px; color: #c2410c; font-weight: 600;">CLEARANCE TASKS</span>
                  </td>
                </tr>
                ${taskListHtml}
              </table>

              <p style="margin: 24px 0 0; font-size: 14px; color: #64748b; line-height: 1.6;">
                Each department will verify and sign off on their respective clearance items. Please coordinate with the respective teams to ensure a smooth process.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0 0;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${APP_URL}/employee/resignation" style="display: inline-block; background: #ea580c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                      View Clearance Status
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Thank you for your cooperation during the offboarding process.
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `Clearance Process Initiated - Action Required`,
    html,
  });
}

/**
 * Notify employee when exit is complete
 */
export async function notifyEmployeeExitComplete(options: {
  employeeEmail: string;
  employeeName: string;
  lastWorkingDate: string;
  finalSettlementAmount?: number;
}): Promise<boolean> {
  const settlementHtml = options.finalSettlementAmount ? `
    <tr>
      <td style="padding: 6px 0;">
        <span style="font-size: 13px; color: #166534; font-weight: 500;">FINAL SETTLEMENT</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 0;">
        <span style="font-size: 20px; color: #16a34a; font-weight: 600;">$${options.finalSettlementAmount.toLocaleString()}</span>
      </td>
    </tr>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exit Process Complete</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; border-bottom: 1px solid #e2e8f0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #16a34a;">
                      Exit Complete - Farewell!
                    </h1>
                    <p style="margin: 8px 0 0; font-size: 14px; color: #64748b;">
                      Your offboarding process has been completed
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px;">
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Dear ${options.employeeName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; color: #334155; line-height: 1.6;">
                Your exit process has been completed. We thank you for your contributions and wish you the best in your future endeavors.
              </p>

              <!-- Summary -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #166534; font-weight: 500;">STATUS</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="display: inline-block; background: #16a34a; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 13px; font-weight: 600;">
                            Completed
                          </span>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding: 6px 0;">
                          <span style="font-size: 13px; color: #166534; font-weight: 500;">LAST WORKING DATE</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 0 0 16px;">
                          <span style="font-size: 15px; color: #0f172a; font-weight: 500;">${options.lastWorkingDate}</span>
                        </td>
                      </tr>
                      ${settlementHtml}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 15px; color: #334155; line-height: 1.6;">
                Thank you for being a part of our team. We hope to stay in touch, and our doors are always open if you wish to return in the future.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                Best wishes from the entire team at Zenora.ai
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return sendEmail({
    to: options.employeeEmail,
    subject: `Farewell - Your Exit Process is Complete`,
    html,
  });
}
