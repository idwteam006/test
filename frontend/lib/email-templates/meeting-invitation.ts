/**
 * Meeting Invitation Email Templates
 * Outlook-compatible with VML backgrounds
 */

interface MeetingInvitationData {
  attendeeName: string;
  meetingTitle: string;
  startTime: Date;
  endTime: Date;
  organizerName: string;
  location?: string;
  zoomJoinUrl?: string;
  agenda?: string;
  meetingType: string;
  acceptUrl: string;
  declineUrl: string;
  maybeUrl: string;
}

export function generateMeetingInvitationEmail(data: MeetingInvitationData): string {
  const startTimeFormatted = data.startTime.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const duration = Math.round((data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60));

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
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
  <title>Meeting Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header with VML background for Outlook -->
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:110px;">
                <v:fill type="gradient" color="#4f46e5" color2="#7c3aed" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:false" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#4f46e5" style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); background-color: #4f46e5;">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                      📅 Meeting Invitation
                    </h1>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #1f2937;">
                Hi <strong>${data.attendeeName}</strong>,
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #1f2937;">
                You've been invited to attend a meeting:
              </p>

              <!-- Meeting Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 20px; font-size: 24px; color: #111827;">
                      ${data.meetingTitle}
                    </h2>

                    <table width="100%" cellpadding="8" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; width: 100px;">
                          <strong>📅 When:</strong>
                        </td>
                        <td style="color: #1f2937; font-size: 14px;">
                          ${startTimeFormatted}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">
                          <strong>⏱️ Duration:</strong>
                        </td>
                        <td style="color: #1f2937; font-size: 14px;">
                          ${duration} minutes
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">
                          <strong>👤 Organizer:</strong>
                        </td>
                        <td style="color: #1f2937; font-size: 14px;">
                          ${data.organizerName}
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">
                          <strong>📍 Type:</strong>
                        </td>
                        <td style="color: #1f2937; font-size: 14px;">
                          ${data.meetingType.replace('_', ' ')}
                        </td>
                      </tr>
                      ${data.location ? `
                      <tr>
                        <td style="color: #6b7280; font-size: 14px;">
                          <strong>📌 Location:</strong>
                        </td>
                        <td style="color: #1f2937; font-size: 14px;">
                          ${data.location}
                        </td>
                      </tr>
                      ` : ''}
                    </table>

                    ${data.agenda ? `
                    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px; font-weight: 600;">
                        Agenda:
                      </p>
                      <p style="margin: 0; color: #1f2937; font-size: 14px; white-space: pre-wrap;">
                        ${data.agenda}
                      </p>
                    </div>
                    ` : ''}
                  </td>
                </tr>
              </table>

              ${data.zoomJoinUrl ? `
              <!-- Zoom Link -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 6px; padding: 15px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px; color: #1e40af; font-size: 14px; font-weight: 600;">
                      🎥 Zoom Meeting Link
                    </p>
                    <a href="${data.zoomJoinUrl}" style="color: #2563eb; font-size: 14px; text-decoration: none;">
                      ${data.zoomJoinUrl}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- RSVP Buttons -->
              <p style="margin: 0 0 20px; font-size: 16px; color: #1f2937; font-weight: 600;">
                Will you attend?
              </p>

              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right: 10px;">
                    <a href="${data.acceptUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center; width: 100%; box-sizing: border-box;">
                      ✓ Accept
                    </a>
                  </td>
                  <td style="padding-right: 10px;">
                    <a href="${data.maybeUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center; width: 100%; box-sizing: border-box;">
                      ? Maybe
                    </a>
                  </td>
                  <td>
                    <a href="${data.declineUrl}" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; text-align: center; width: 100%; box-sizing: border-box;">
                      ✕ Decline
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                This is an automated message from Zenora. Please do not reply to this email.
              </p>
              <p style="margin: 10px 0 0; font-size: 12px; color: #6b7280;">
                © ${new Date().getFullYear()} Zenora. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export function generateMeetingUpdateEmail(data: MeetingInvitationData): string {
  return generateMeetingInvitationEmail(data).replace(
    '📅 Meeting Invitation',
    '📝 Meeting Updated'
  ).replace(
    "You've been invited to attend a meeting:",
    "A meeting you're attending has been updated:"
  );
}

export function generateMeetingCancellationEmail(data: {
  attendeeName: string;
  meetingTitle: string;
  startTime: Date;
  organizerName: string;
  reason?: string;
}): string {
  const startTimeFormatted = data.startTime.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
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
  <title>Meeting Cancelled</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:110px;">
                <v:fill type="gradient" color="#991b1b" color2="#dc2626" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:false" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#dc2626" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); background-color: #dc2626;">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                      🚫 Meeting Cancelled
                    </h1>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>

          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #1f2937;">
                Hi <strong>${data.attendeeName}</strong>,
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #1f2937;">
                The following meeting has been cancelled by <strong>${data.organizerName}</strong>:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <h2 style="margin: 0 0 15px; font-size: 20px; color: #991b1b;">
                      ${data.meetingTitle}
                    </h2>
                    <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
                      <strong>Scheduled for:</strong> ${startTimeFormatted}
                    </p>
                  </td>
                </tr>
              </table>

              ${data.reason ? `
              <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280; font-weight: 600;">
                Reason:
              </p>
              <p style="margin: 0 0 30px; font-size: 14px; color: #1f2937;">
                ${data.reason}
              </p>
              ` : ''}

              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                If you have any questions, please contact ${data.organizerName}.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                © ${new Date().getFullYear()} Zenora. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
