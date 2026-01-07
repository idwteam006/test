/**
 * Email Service for Meeting Notifications
 */

import nodemailer from 'nodemailer';
import {
  generateMeetingInvitationEmail,
  generateMeetingUpdateEmail,
  generateMeetingCancellationEmail,
} from './email-templates/meeting-invitation';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

interface SendMeetingInvitationParams {
  to: string;
  attendeeName: string;
  meetingTitle: string;
  startTime: Date;
  endTime: Date;
  organizerName: string;
  location?: string;
  zoomJoinUrl?: string;
  agenda?: string;
  meetingType: string;
  meetingId: string;
  attendeeId: string;
}

export async function sendMeetingInvitation(params: SendMeetingInvitationParams) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';

  const emailHtml = generateMeetingInvitationEmail({
    ...params,
    acceptUrl: `${baseUrl}/api/meetings/${params.meetingId}/respond?attendeeId=${params.attendeeId}&response=ACCEPTED`,
    declineUrl: `${baseUrl}/api/meetings/${params.meetingId}/respond?attendeeId=${params.attendeeId}&response=DECLINED`,
    maybeUrl: `${baseUrl}/api/meetings/${params.meetingId}/respond?attendeeId=${params.attendeeId}&response=TENTATIVE`,
  });

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: params.to,
      subject: `Meeting Invitation: ${params.meetingTitle}`,
      html: emailHtml,
    });

    console.log(`Meeting invitation sent to ${params.to}`);
  } catch (error) {
    console.error('Error sending meeting invitation:', error);
    throw error;
  }
}

export async function sendMeetingUpdate(params: SendMeetingInvitationParams) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';

  const emailHtml = generateMeetingUpdateEmail({
    ...params,
    acceptUrl: `${baseUrl}/api/meetings/${params.meetingId}/respond?attendeeId=${params.attendeeId}&response=ACCEPTED`,
    declineUrl: `${baseUrl}/api/meetings/${params.meetingId}/respond?attendeeId=${params.attendeeId}&response=DECLINED`,
    maybeUrl: `${baseUrl}/api/meetings/${params.meetingId}/respond?attendeeId=${params.attendeeId}&response=TENTATIVE`,
  });

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: params.to,
      subject: `Meeting Updated: ${params.meetingTitle}`,
      html: emailHtml,
    });

    console.log(`Meeting update sent to ${params.to}`);
  } catch (error) {
    console.error('Error sending meeting update:', error);
    throw error;
  }
}

export async function sendMeetingCancellation(params: {
  to: string;
  attendeeName: string;
  meetingTitle: string;
  startTime: Date;
  organizerName: string;
  reason?: string;
}) {
  const emailHtml = generateMeetingCancellationEmail(params);

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: params.to,
      subject: `Meeting Cancelled: ${params.meetingTitle}`,
      html: emailHtml,
    });

    console.log(`Meeting cancellation sent to ${params.to}`);
  } catch (error) {
    console.error('Error sending meeting cancellation:', error);
    throw error;
  }
}

export async function sendMeetingReminder(params: {
  to: string;
  attendeeName: string;
  meetingTitle: string;
  startTime: Date;
  location?: string;
  zoomJoinUrl?: string;
  minutesUntilMeeting: number;
}) {
  const startTimeFormatted = params.startTime.toLocaleString('en-US', {
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  const emailHtml = `
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
  <title>Meeting Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:110px;">
                <v:fill type="gradient" color="#d97706" color2="#f59e0b" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:false" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#d97706" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); background-color: #d97706;">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                      ⏰ Meeting Reminder
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
                Hi <strong>${params.attendeeName}</strong>,
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; color: #1f2937;">
                Your meeting <strong>"${params.meetingTitle}"</strong> starts in <strong>${params.minutesUntilMeeting} minutes</strong>.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px; color: #92400e; font-size: 14px;">
                      <strong>⏰ Start Time:</strong> ${startTimeFormatted}
                    </p>
                    ${params.location ? `
                    <p style="margin: 0; color: #92400e; font-size: 14px;">
                      <strong>📍 Location:</strong> ${params.location}
                    </p>
                    ` : ''}
                  </td>
                </tr>
              </table>
              ${params.zoomJoinUrl ? `
              <div style="text-align: center;">
                <a href="${params.zoomJoinUrl}" style="display: inline-block; padding: 14px 32px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  🎥 Join Zoom Meeting
                </a>
              </div>
              ` : ''}
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

  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.SMTP_FROM}>`,
      to: params.to,
      subject: `Reminder: ${params.meetingTitle} starts in ${params.minutesUntilMeeting} minutes`,
      html: emailHtml,
    });

    console.log(`Meeting reminder sent to ${params.to}`);
  } catch (error) {
    console.error('Error sending meeting reminder:', error);
    throw error;
  }
}
