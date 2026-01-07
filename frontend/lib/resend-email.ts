/**
 * Email Service for Zenora.ai
 * Modern, reliable email delivery using SMTP (Hostinger)
 *
 * OUTLOOK COMPATIBILITY NOTES:
 * - All templates use table-based layouts for Outlook compatibility
 * - VML (Vector Markup Language) is used for background colors in Outlook
 * - bgcolor attribute is added to tables for fallback
 * - All text colors are explicitly set (Outlook ignores inherited colors)
 *
 * Required Environment Variables:
 * - SMTP_HOST (default: smtp.hostinger.com)
 * - SMTP_PORT (default: 465)
 * - SMTP_USER (e.g., support@mail.zenora.ai)
 * - SMTP_PASSWORD
 * - EMAIL_FROM (e.g., "Zenora <support@mail.zenora.ai>")
 */

import * as nodemailer from 'nodemailer';
import { EMAIL_COLORS, type EmailColorTheme } from './email-template-utils';

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

// SMTP Configuration for Hostinger
const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
  },
  pool: false,
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2' as const,
  },
} as any);

// Default from email
const DEFAULT_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || 'Zenora <support@mail.zenora.ai>';

// ============================================================================
// CORE EMAIL SENDING FUNCTION
// ============================================================================

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

// Test email override - when set, all emails are sent to this address instead
const TEST_EMAIL_OVERRIDE = process.env.TEST_EMAIL_OVERRIDE || '';

/**
 * Send email using SMTP (Hostinger)
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    // If TEST_EMAIL_OVERRIDE is set, redirect all emails to that address for testing
    let recipient = options.to;
    if (TEST_EMAIL_OVERRIDE) {
      const originalRecipient = Array.isArray(options.to) ? options.to.join(', ') : options.to;
      recipient = TEST_EMAIL_OVERRIDE;
      console.log(`[Email] TEST MODE: Redirecting email from "${originalRecipient}" to "${TEST_EMAIL_OVERRIDE}"`);
      // Modify subject to indicate original recipient
      options.subject = `[TEST - To: ${originalRecipient}] ${options.subject}`;
    }

    const recipientStr = Array.isArray(recipient) ? recipient.join(', ') : recipient;
    console.log('[Email] Sending to:', recipientStr.replace(/(.{3}).*(@.*)/, '$1***$2'));

    // Prepare attachments for nodemailer format
    const attachments = options.attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
    }));

    // Add timeout for serverless (Vercel has 10s limit)
    const sendPromise = transporter.sendMail({
      from: options.from || DEFAULT_FROM,
      to: recipient,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
      attachments,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Email send timeout (8s)')), 8000)
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    console.log('[Email] ✓ Email sent successfully. Message ID:', info.messageId);
    return true;
  } catch (error: any) {
    console.error('[Email] Failed to send email:', {
      error: error.message,
      code: error.code,
    });
    return false;
  }
}

// ============================================================================
// EMAIL TEMPLATES (Reusing existing templates from email.ts)
// ============================================================================

/**
 * Send magic link email
 */
export async function sendMagicLinkEmail(
  email: string,
  firstName: string,
  code: string,
  token: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';
  const magicLinkUrl = `${appUrl}/auth/verify?token=${token}`;
  const expiryMinutes = parseInt(process.env.CODE_EXPIRY || '600', 10) / 60;

  // Outlook-compatible email template using tables and VML for backgrounds
  const html = `
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
  <title>Your Login Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <!-- Outer wrapper table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Inner content table -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#764ba2" color2="#667eea" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <!-- Main content card with gradient background -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#667eea" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); background-color: #667eea; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <!-- Header -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          Welcome back to Zenora.ai!
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 10px;">
                          Hi ${firstName},
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 30px;">
                          You requested a login code for your account. Use the code below to sign in:
                        </td>
                      </tr>
                    </table>

                    <!-- OTP Code Box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 0 0 30px 0;">
                          <table role="presentation" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background-color: #ffffff; border-radius: 8px;">
                            <tr>
                              <td style="padding: 20px 40px; font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333333; text-align: center;">
                                ${code}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Button section -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Or click the button below to sign in automatically:
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${magicLinkUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="13%" strokecolor="#ffffff" fillcolor="#ffffff">
                            <w:anchorlock/>
                            <center style="color:#667eea;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Sign In to Zenora.ai</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${magicLinkUrl}" style="display: inline-block; background-color: #ffffff; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Sign In to Zenora.ai
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Warning box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="background-color: rgba(255, 255, 255, 0.15); border-left: 4px solid #fbbf24; border-radius: 4px;">
                      <tr>
                        <td style="padding: 15px; color: #ffffff;">
                          <strong style="color: #ffffff;">Security Notice:</strong><br>
                          <span style="color: #ffffff;">&#8226; This code expires in ${expiryMinutes} minutes</span><br>
                          <span style="color: #ffffff;">&#8226; You have 5 attempts to enter the code</span><br>
                          <span style="color: #ffffff;">&#8226; Never share this code with anyone</span><br>
                          <span style="color: #ffffff;">&#8226; If you didn't request this code, please contact your administrator immediately</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Footer -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0 0 8px 0; color: #e0e0e0;">This is an automated message from Zenora.ai Employee Management System.</p>
                          <p style="margin: 0 0 8px 0; color: #e0e0e0;">If you have any questions, please contact your system administrator.</p>
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
  `;

  const text = `
Welcome back to Zenora.ai!

Hi ${firstName},

You requested a login code for your account. Use the code below to sign in:

CODE: ${code}

Or copy and paste this link into your browser:
${magicLinkUrl}

SECURITY NOTICE:
- This code expires in ${expiryMinutes} minutes
- You have 5 attempts to enter the code
- Never share this code with anyone
- If you didn't request this code, please contact your administrator immediately

---
This is an automated message from Zenora.ai Employee Management System.
If you have any questions, please contact your system administrator.

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
  `.trim();

  return sendEmail({
    to: email,
    subject: 'Your Zenora.ai Login Code',
    html,
    text,
  });
}

/**
 * Send onboarding invite email
 */
export interface OnboardingInviteEmailOptions {
  to: string;
  firstName: string;
  token: string;
  invitedBy: string;
  expiresAt: Date;
}

export async function sendOnboardingInvite(
  options: OnboardingInviteEmailOptions
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';
  const onboardingUrl = `${appUrl}/onboard?token=${options.token}`;
  const expiryDays = Math.ceil(
    (options.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const html = `
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
  <title>Complete Your Onboarding</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#764ba2" color2="#667eea" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#667eea" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); background-color: #667eea; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          Welcome to Zenora.ai!
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 10px;">
                          Hi ${options.firstName},
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          You've been invited to join our team! ${options.invitedBy} has initiated your onboarding process.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#8b7bc7" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #ffffff; font-size: 18px; font-weight: bold; padding-bottom: 15px;">
                                Next Steps:
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">1. Complete Your Profile</strong> <span style="color: #ffffff;">- Fill in your personal details</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">2. Add Your Address</strong> <span style="color: #ffffff;">- Current and permanent address</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">3. Professional Information</strong> <span style="color: #ffffff;">- Education and experience</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 15px;">
                                <strong style="color: #ffffff;">4. Upload Documents</strong> <span style="color: #ffffff;">- Required documents for verification</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px;">
                                This will take approximately <strong style="color: #ffffff;">10-15 minutes</strong> to complete.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${onboardingUrl}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="13%" strokecolor="#ffffff" fillcolor="#ffffff">
                            <w:anchorlock/>
                            <center style="color:#667eea;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Start Onboarding</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${onboardingUrl}" style="display: inline-block; background-color: #ffffff; color: #667eea; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Start Onboarding
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#8b7bc7" style="background-color: rgba(255, 255, 255, 0.15); border-left: 4px solid #fbbf24; border-radius: 4px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 15px; color: #ffffff;">
                          <strong style="color: #ffffff;">Important:</strong><br>
                          <span style="color: #ffffff;">&#8226; This invitation link expires in <strong style="color: #ffffff;">${expiryDays} days</strong></span><br>
                          <span style="color: #ffffff;">&#8226; You can save your progress and return later</span><br>
                          <span style="color: #ffffff;">&#8226; HR will review your submission before approval</span><br>
                          <span style="color: #ffffff;">&#8226; You'll receive login access after approval</span>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 14px; padding-bottom: 20px;">
                          <span style="color: #e0e0e0;">If the button doesn't work, copy and paste this link into your browser:</span><br>
                          <span style="color: #ffffff; word-break: break-all;">${onboardingUrl}</span>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0 0 8px 0; color: #e0e0e0;">If you have any questions, please contact ${options.invitedBy} or your HR department.</p>
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
  `;

  const text = `
Welcome to Zenora.ai!

Hi ${options.firstName},

You've been invited to join our team! ${options.invitedBy} has initiated your onboarding process.

NEXT STEPS:
1. Complete Your Profile - Fill in your personal details
2. Add Your Address - Current and permanent address
3. Professional Information - Education and experience
4. Upload Documents - Required documents for verification

This will take approximately 10-15 minutes to complete.

Complete your onboarding here:
${onboardingUrl}

IMPORTANT:
• This invitation link expires in ${expiryDays} days
• You can save your progress and return later
• HR will review your submission before approval
• You'll receive login access after approval

If you have any questions, please contact ${options.invitedBy} or your HR department.

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
  `.trim();

  return sendEmail({
    to: options.to,
    subject: '🎉 Complete Your Onboarding - Zenora.ai',
    html,
    text,
  });
}

/**
 * Send task assignment notification
 */
export interface TaskAssignedEmailOptions {
  to: string;
  employeeName: string;
  taskName: string;
  description?: string;
  dueDate?: string;
  projectName?: string;
  assignedBy: string;
}

export async function sendTaskAssignedEmail(
  options: TaskAssignedEmailOptions
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';
  const taskUrl = `${appUrl}/employee/tasks`;

  const dueDateHtml = options.dueDate ? `<tr><td style="color: #ffffff; font-size: 14px; padding-bottom: 5px;"><strong style="color: #ffffff;">Due Date:</strong> <span style="color: #ffffff;">${options.dueDate}</span></td></tr>` : '';
  const projectHtml = options.projectName ? `<tr><td style="color: #ffffff; font-size: 14px; padding-bottom: 5px;"><strong style="color: #ffffff;">Project:</strong> <span style="color: #ffffff;">${options.projectName}</span></td></tr>` : '';
  const descriptionHtml = options.description ? `<tr><td style="color: #ffffff; font-size: 14px; padding-top: 10px;"><strong style="color: #ffffff;">Description:</strong><br><span style="color: #ffffff;">${options.description}</span></td></tr>` : '';

  const html = `
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
  <title>New Task Assigned</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#764ba2" color2="#667eea" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#667eea" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); background-color: #667eea; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          New Task Assigned
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 10px;">
                          Hi ${options.employeeName},
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          You have been assigned a new task by ${options.assignedBy}.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#8b7bc7" style="background-color: rgba(255, 255, 255, 0.15); border-left: 4px solid #fbbf24; border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #ffffff; font-size: 20px; font-weight: bold; padding-bottom: 10px;">
                                ${options.taskName}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 5px;">
                                <strong style="color: #ffffff;">Assigned by:</strong> <span style="color: #ffffff;">${options.assignedBy}</span>
                              </td>
                            </tr>
                            ${projectHtml}
                            ${dueDateHtml}
                            ${descriptionHtml}
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Please log in to your account to view task details and update progress.
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${taskUrl}" style="height:48px;v-text-anchor:middle;width:160px;" arcsize="13%" strokecolor="#ffffff" fillcolor="#ffffff">
                            <w:anchorlock/>
                            <center style="color:#667eea;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">View Task</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${taskUrl}" style="display: inline-block; background-color: #ffffff; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            View Task
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
  `;

  const dueDateText = options.dueDate ? `\nDue Date: ${options.dueDate}` : '';
  const projectText = options.projectName ? `\nProject: ${options.projectName}` : '';
  const descriptionText = options.description ? `\n\nDescription:\n${options.description}` : '';

  const text = `
New Task Assigned

Hi ${options.employeeName},

You have been assigned a new task by ${options.assignedBy}.

Task: ${options.taskName}
Assigned by: ${options.assignedBy}${projectText}${dueDateText}${descriptionText}

Please log in to your account to view task details and update progress.

View Task: ${taskUrl}

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
  `.trim();

  return sendEmail({
    to: options.to,
    subject: `New Task Assigned: ${options.taskName}`,
    html,
    text,
  });
}

/**
 * Test SMTP email configuration
 */
export async function testEmailConfiguration(testEmail: string): Promise<boolean> {
  return sendEmail({
    to: testEmail,
    subject: 'SMTP Test Email - Zenora.ai',
    html: `
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
  <title>SMTP Test Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#059669" color2="#10b981" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#10b981" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); background-color: #10b981; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          SMTP is Working!
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 15px;">
                          Congratulations! Your SMTP email configuration is set up correctly.
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          You can now send transactional emails through Zenora.ai using Hostinger SMTP.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0 0 8px 0; color: #e0e0e0;">Test conducted at: ${new Date().toLocaleString()}</p>
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
    `,
    text: `
SMTP is Working!

Congratulations! Your SMTP email configuration is set up correctly.

You can now send transactional emails through Zenora.ai using Hostinger SMTP.

Test conducted at: ${new Date().toLocaleString()}

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    `.trim(),
  });
}

// Legacy alias for backward compatibility
export const testResendConfiguration = testEmailConfiguration;

// ============================================================================
// LEAVE REQUEST EMAIL TEMPLATES
// ============================================================================

export interface LeaveApprovedEmailOptions {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
}

export function getLeaveApprovedEmail(options: LeaveApprovedEmailOptions) {
  return {
    subject: '✅ Leave Request Approved',
    html: `
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
  <title>Leave Request Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#059669" color2="#10b981" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#10b981" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); background-color: #10b981; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          Leave Request Approved
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 10px;">
                          Hi ${options.employeeName},
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Your leave request has been approved!
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0d9668" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">Leave Type:</strong> <span style="color: #ffffff;">${options.leaveType}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">Start Date:</strong> <span style="color: #ffffff;">${options.startDate}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">End Date:</strong> <span style="color: #ffffff;">${options.endDate}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px;">
                                <strong style="color: #ffffff;">Duration:</strong> <span style="color: #ffffff;">${options.days} day${options.days > 1 ? 's' : ''}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Enjoy your time off!
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
    `,
    text: `
Leave Request Approved

Hi ${options.employeeName},

Your leave request has been approved!

Leave Type: ${options.leaveType}
Start Date: ${options.startDate}
End Date: ${options.endDate}
Duration: ${options.days} day${options.days > 1 ? 's' : ''}

Enjoy your time off!

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    `.trim(),
  };
}

export interface LeaveRejectedEmailOptions {
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
}

export function getLeaveRejectedEmail(options: LeaveRejectedEmailOptions) {
  return {
    subject: '❌ Leave Request Rejected',
    html: `
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
  <title>Leave Request Rejected</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#dc2626" color2="#ef4444" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ef4444" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); background-color: #ef4444; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          Leave Request Rejected
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 10px;">
                          Hi ${options.employeeName},
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Unfortunately, your leave request has been rejected.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#dc3545" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">Leave Type:</strong> <span style="color: #ffffff;">${options.leaveType}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">Start Date:</strong> <span style="color: #ffffff;">${options.startDate}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">End Date:</strong> <span style="color: #ffffff;">${options.endDate}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px;">
                                <strong style="color: #ffffff;">Duration:</strong> <span style="color: #ffffff;">${options.days} day${options.days > 1 ? 's' : ''}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#dc3545" style="background-color: rgba(255, 255, 255, 0.15); border-left: 4px solid #fbbf24; border-radius: 4px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 15px; color: #ffffff;">
                          <strong style="color: #ffffff;">Reason:</strong><br>
                          <span style="color: #ffffff;">${options.reason}</span>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          If you have questions, please contact your manager.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
    `,
    text: `
Leave Request Rejected

Hi ${options.employeeName},

Unfortunately, your leave request has been rejected.

Leave Type: ${options.leaveType}
Start Date: ${options.startDate}
End Date: ${options.endDate}
Duration: ${options.days} day${options.days > 1 ? 's' : ''}

Reason:
${options.reason}

If you have questions, please contact your manager.

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    `.trim(),
  };
}

// ============================================================================
// TIMESHEET EMAIL TEMPLATES
// ============================================================================

export interface TimesheetApprovedEmailOptions {
  employeeName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
}

export function getTimesheetApprovedEmail(options: TimesheetApprovedEmailOptions) {
  return {
    subject: '✅ Timesheet Approved',
    html: `
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
  <title>Timesheet Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#059669" color2="#10b981" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#10b981" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); background-color: #10b981; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          Timesheet Approved
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 10px;">
                          Hi ${options.employeeName},
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Your timesheet entry has been approved!
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0d9668" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">Week:</strong> <span style="color: #ffffff;">${options.weekStart} - ${options.weekEnd}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">Hours:</strong> <span style="color: #ffffff;">${options.totalHours}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px;">
                                <strong style="color: #ffffff;">Status:</strong> <span style="color: #ffffff;">Approved</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Thank you for submitting your timesheet!
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
    `,
    text: `
Timesheet Approved

Hi ${options.employeeName},

Your timesheet entry has been approved!

Week: ${options.weekStart} - ${options.weekEnd}
Hours: ${options.totalHours}
Status: Approved

Thank you for submitting your timesheet!

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    `.trim(),
  };
}

export interface TimesheetRejectedEmailOptions {
  employeeName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  reason: string;
}

export function getTimesheetRejectedEmail(options: TimesheetRejectedEmailOptions) {
  return {
    subject: '❌ Timesheet Rejected',
    html: `
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
  <title>Timesheet Rejected</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#dc2626" color2="#ef4444" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ef4444" style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); background-color: #ef4444; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          Timesheet Rejected
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 10px;">
                          Hi ${options.employeeName},
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Your timesheet entry has been rejected and needs correction.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#dc3545" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">Week:</strong> <span style="color: #ffffff;">${options.weekStart} - ${options.weekEnd}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">Hours:</strong> <span style="color: #ffffff;">${options.totalHours}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px;">
                                <strong style="color: #ffffff;">Status:</strong> <span style="color: #ffffff;">Rejected</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#dc3545" style="background-color: rgba(255, 255, 255, 0.15); border-left: 4px solid #fbbf24; border-radius: 4px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 15px; color: #ffffff;">
                          <strong style="color: #ffffff;">Reason:</strong><br>
                          <span style="color: #ffffff;">${options.reason}</span>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Please review and resubmit your timesheet with the necessary corrections.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
    `,
    text: `
Timesheet Rejected

Hi ${options.employeeName},

Your timesheet entry has been rejected and needs correction.

Week: ${options.weekStart} - ${options.weekEnd}
Hours: ${options.totalHours}
Status: Rejected

Reason:
${options.reason}

Please review and resubmit your timesheet with the necessary corrections.

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    `.trim(),
  };
}

// ============================================================================
// TASK ASSIGNMENT EMAIL (function-style template for compatibility)
// ============================================================================

export interface GetTaskAssignedEmailOptions {
  employeeName: string;
  taskName: string;
  description?: string;
  dueDate?: string;
  projectName?: string;
  assignedBy: string;
}

export function getTaskAssignedEmail(options: GetTaskAssignedEmailOptions) {
  const dueDateText = options.dueDate ? `\nDue Date: ${options.dueDate}` : '';
  const projectText = options.projectName ? `\nProject: ${options.projectName}` : '';
  const descriptionText = options.description ? `\n\nDescription:\n${options.description}` : '';

  const dueDateHtml = options.dueDate ? `<tr><td style="color: #ffffff; font-size: 14px; padding-bottom: 5px;"><strong style="color: #ffffff;">Due Date:</strong> <span style="color: #ffffff;">${options.dueDate}</span></td></tr>` : '';
  const projectHtml = options.projectName ? `<tr><td style="color: #ffffff; font-size: 14px; padding-bottom: 5px;"><strong style="color: #ffffff;">Project:</strong> <span style="color: #ffffff;">${options.projectName}</span></td></tr>` : '';
  const descriptionHtml = options.description ? `<tr><td style="color: #ffffff; font-size: 14px; padding-top: 10px;"><strong style="color: #ffffff;">Description:</strong><br><span style="color: #ffffff;">${options.description}</span></td></tr>` : '';

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';

  return {
    subject: `New Task Assigned: ${options.taskName}`,
    html: `
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
  <title>New Task Assigned</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#764ba2" color2="#667eea" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#667eea" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); background-color: #667eea; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          New Task Assigned
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 10px;">
                          Hi ${options.employeeName},
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          You have been assigned a new task by ${options.assignedBy}.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#8b7bc7" style="background-color: rgba(255, 255, 255, 0.15); border-left: 4px solid #fbbf24; border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #ffffff; font-size: 20px; font-weight: bold; padding-bottom: 10px;">
                                ${options.taskName}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 5px;">
                                <strong style="color: #ffffff;">Assigned by:</strong> <span style="color: #ffffff;">${options.assignedBy}</span>
                              </td>
                            </tr>
                            ${projectHtml}
                            ${dueDateHtml}
                            ${descriptionHtml}
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Please log in to your account to view task details and update progress.
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-bottom: 30px;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${appUrl}/employee/tasks" style="height:48px;v-text-anchor:middle;width:160px;" arcsize="13%" strokecolor="#ffffff" fillcolor="#ffffff">
                            <w:anchorlock/>
                            <center style="color:#667eea;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">View Task</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${appUrl}/employee/tasks" style="display: inline-block; background-color: #ffffff; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            View Task
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>`,
    text: `
Hi ${options.employeeName},

You have been assigned a new task by ${options.assignedBy}.

Task: ${options.taskName}
Assigned by: ${options.assignedBy}${projectText}${dueDateText}${descriptionText}

Please log in to your account to view task details and update progress.

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.`.trim(),
  };
}

// ============================================================================
// WELCOME EMAIL
// ============================================================================

/**
 * Send welcome email to new employee
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  companyName: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zenora.ai';
  const loginUrl = `${appUrl}/login`;

  return sendEmail({
    to: email,
    subject: `Welcome to ${companyName} - Zenora.ai`,
    html: `
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
  <title>Welcome to ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#764ba2" color2="#667eea" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#667eea" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); background-color: #667eea; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          Welcome to ${companyName}!
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 10px;">
                          Hi ${firstName},
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Your account has been created. We're excited to have you on board!
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#8b7bc7" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #ffffff; font-size: 18px; font-weight: bold; padding-bottom: 10px;">
                                Getting Started:
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px;">
                                Zenora.ai uses secure, passwordless authentication. Each time you log in, you'll receive a unique code via email.
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${loginUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="13%" strokecolor="#ffffff" fillcolor="#ffffff">
                            <w:anchorlock/>
                            <center style="color:#667eea;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Login to Zenora.ai</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${loginUrl}" style="display: inline-block; background-color: #ffffff; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Login to Zenora.ai
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0 0 8px 0; color: #e0e0e0;">If you have any questions, please contact your administrator.</p>
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
    `,
    text: `
Welcome to Zenora.ai!

Hi ${firstName},

Your account has been created for ${companyName}. We're excited to have you on board!

To get started, visit: ${loginUrl}

Zenora.ai uses secure, passwordless authentication. Each time you log in, you'll receive a unique code via email.

If you have any questions, please contact your administrator.

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    `.trim(),
  });
}

// ============================================================================
// ONBOARDING HR EMAIL TEMPLATES
// ============================================================================

/**
 * Send onboarding submission notification to HR
 */
export async function sendOnboardingSubmissionNotification(
  hrEmail: string,
  employeeName: string,
  employeeEmail: string,
  reviewUrl: string
): Promise<boolean> {
  return sendEmail({
    to: hrEmail,
    subject: '📝 New Onboarding Submission - Action Required',
    html: `
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
  <title>New Onboarding Submission</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#764ba2" color2="#667eea" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#667eea" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); background-color: #667eea; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          New Onboarding Submission
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          A new employee has completed their onboarding and is awaiting your review.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#8b7bc7" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">Employee:</strong> <span style="color: #ffffff;">${employeeName}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">
                                <strong style="color: #ffffff;">Email:</strong> <span style="color: #ffffff;">${employeeEmail}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px;">
                                <strong style="color: #ffffff;">Status:</strong> <span style="color: #ffffff;">Pending Review</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${reviewUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="13%" strokecolor="#ffffff" fillcolor="#ffffff">
                            <w:anchorlock/>
                            <center style="color:#667eea;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Review Submission</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${reviewUrl}" style="display: inline-block; background-color: #ffffff; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Review Submission
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
    `,
    text: `
New Onboarding Submission

A new employee has completed their onboarding and is awaiting your review.

Employee: ${employeeName}
Email: ${employeeEmail}
Status: Pending Review

Review the submission here:
${reviewUrl}

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    `.trim(),
  });
}

/**
 * Send onboarding approval email to employee
 */
export async function sendOnboardingApprovalEmail(
  employeeEmail: string,
  employeeName: string,
  loginUrl: string
): Promise<boolean> {
  return sendEmail({
    to: employeeEmail,
    subject: '✅ Onboarding Approved - Welcome to the Team!',
    html: `
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
  <title>Onboarding Approved</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#059669" color2="#10b981" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#10b981" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); background-color: #10b981; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #ffffff; font-size: 28px; font-weight: bold; padding-bottom: 20px;">
                          Onboarding Approved!
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 10px;">
                          Hi ${employeeName},
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 16px; padding-bottom: 20px;">
                          Great news! Your onboarding has been approved. You now have full access to Zenora.ai.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0d9668" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="color: #ffffff; font-size: 18px; font-weight: bold; padding-bottom: 10px;">
                                You can now:
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 5px;">
                                <span style="color: #ffffff;">&#8226; Access your employee dashboard</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 5px;">
                                <span style="color: #ffffff;">&#8226; Track your time and projects</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 5px;">
                                <span style="color: #ffffff;">&#8226; Request leave</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px; padding-bottom: 5px;">
                                <span style="color: #ffffff;">&#8226; View company documents</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #ffffff; font-size: 14px;">
                                <span style="color: #ffffff;">&#8226; Connect with your team</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${loginUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="13%" strokecolor="#ffffff" fillcolor="#ffffff">
                            <w:anchorlock/>
                            <center style="color:#059669;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Login to Zenora.ai</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${loginUrl}" style="display: inline-block; background-color: #ffffff; color: #059669; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                            Login to Zenora.ai
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #ffffff; font-size: 14px; padding-bottom: 20px;">
                          Zenora.ai uses passwordless authentication. Simply enter your email and you'll receive a secure login code.
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid rgba(255,255,255,0.3); padding-top: 20px;">
                      <tr>
                        <td style="color: #e0e0e0; font-size: 12px; padding-top: 20px;">
                          <p style="margin: 0 0 8px 0; color: #e0e0e0;">If you have any questions, please contact your manager or HR department.</p>
                          <p style="margin: 0; color: #e0e0e0;">&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
    `,
    text: `
Onboarding Approved!

Hi ${employeeName},

Great news! Your onboarding has been approved. You now have full access to Zenora.ai.

You can now:
• Access your employee dashboard
• Track your time and projects
• Request leave
• View company documents
• Connect with your team

Login to Zenora.ai:
${loginUrl}

Zenora.ai uses passwordless authentication. Simply enter your email and you'll receive a secure login code.

If you have any questions, please contact your manager or HR department.

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    `.trim(),
  });
}

/**
 * Send changes requested email to employee
 */
export async function sendChangesRequestedEmail(
  employeeEmail: string,
  employeeName: string,
  feedback: string,
  onboardingUrl: string
): Promise<boolean> {
  return sendEmail({
    to: employeeEmail,
    subject: '📋 Onboarding Changes Requested',
    html: `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Changes Requested</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#d97706" color2="#f59e0b" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f59e0b" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 10px;">
                <tr>
                  <td style="padding: 40px;">
                    <h1 style="margin: 0 0 20px; font-size: 28px; font-weight: bold; color: #ffffff;">📋 Changes Requested</h1>
                    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${employeeName},</p>
                    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #ffffff;">Thank you for completing your onboarding. HR has reviewed your submission and requested some changes.</p>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#d97706" style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; margin: 20px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <h3 style="margin: 0 0 10px; font-size: 16px; font-weight: bold; color: #ffffff;">Feedback from HR:</h3>
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#b45309" style="background-color: rgba(255, 255, 255, 0.2); border-radius: 6px;">
                            <tr>
                              <td style="padding: 15px;">
                                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #ffffff;">${feedback}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 25px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${onboardingUrl}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="13%" stroke="f" fillcolor="#ffffff">
                            <w:anchorlock/>
                            <center style="color:#d97706;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Update Your Information</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${onboardingUrl}" style="display: inline-block; background-color: #ffffff; color: #d97706; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">Update Your Information</a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.5; color: #ffffff; opacity: 0.9;">Please make the requested changes and resubmit your onboarding. Your previous information has been saved.</p>

                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid rgba(255, 255, 255, 0.3); margin-top: 25px;">
                      <tr>
                        <td style="padding-top: 20px;">
                          <p style="margin: 0; font-size: 12px; color: #ffffff; opacity: 0.8;">If you have any questions about the feedback, please contact your HR department.</p>
                          <p style="margin: 10px 0 0; font-size: 12px; color: #ffffff; opacity: 0.8;">© ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
                        </td>
                      </tr>
                    </table>
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
</html>
    `,
    text: `
Changes Requested

Hi ${employeeName},

Thank you for completing your onboarding. HR has reviewed your submission and requested some changes.

Feedback from HR:
${feedback}

Update your information here:
${onboardingUrl}

Please make the requested changes and resubmit your onboarding. Your previous information has been saved.

If you have any questions about the feedback, please contact your HR department.

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    `.trim(),
  });
}

// ============================================================================
// INVOICE EMAIL TEMPLATES
// ============================================================================

export interface InvoiceEmailOptions {
  to: string;
  invoiceNumber: string;
  clientName: string;
  companyName: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  currency: string;
  invoiceUrl: string;
  pdfBuffer?: Buffer;
  from?: string;
}

/**
 * Send invoice email with optional PDF attachment
 */
export async function sendInvoiceEmail(options: InvoiceEmailOptions): Promise<boolean> {
  const currencySymbol = getCurrencySymbol(options.currency);

  const attachments: EmailAttachment[] = [];
  if (options.pdfBuffer) {
    attachments.push({
      filename: `Invoice-${options.invoiceNumber}.pdf`,
      content: options.pdfBuffer,
      contentType: 'application/pdf',
    });
  }

  return sendEmail({
    to: options.to,
    from: options.from,
    subject: `Invoice ${options.invoiceNumber} from ${options.companyName}`,
    attachments,
    html: `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Invoice ${options.invoiceNumber}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px;">
          <!-- Header with gradient -->
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#4f46e5" color2="#6366f1" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#6366f1" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); border-radius: 10px 10px 0 0;">
                <tr>
                  <td style="padding: 40px;">
                    <h1 style="margin: 0 0 10px; font-size: 32px; font-weight: bold; color: #ffffff;">Invoice</h1>
                    <p style="margin: 0; font-size: 16px; color: #ffffff; opacity: 0.9;">${options.invoiceNumber}</p>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>

          <!-- Content area -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#ffffff" style="background-color: #ffffff;">
                <tr>
                  <td style="padding: 30px 40px;">
                    <p style="margin: 0 0 15px; font-size: 16px; color: #1f2937;">
                      Dear <strong>${options.clientName}</strong>,
                    </p>
                    <p style="margin: 0 0 20px; font-size: 16px; color: #1f2937; line-height: 1.6;">
                      Thank you for your business! Please find your invoice details below.
                    </p>

                    <!-- Invoice details box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f9fafb" style="background-color: #f9fafb; border-radius: 8px; margin: 20px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Date:</td>
                              <td style="padding: 8px 0; color: #1f2937; text-align: right; font-size: 14px;">${options.invoiceDate}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Due Date:</td>
                              <td style="padding: 8px 0; color: #ef4444; text-align: right; font-weight: 600; font-size: 14px;">${options.dueDate}</td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding: 8px 0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                    <td style="border-top: 2px solid #e5e7eb;"></td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 18px;">Total Due:</td>
                              <td style="padding: 8px 0; color: #4f46e5; text-align: right; font-weight: 700; font-size: 20px;">
                                ${currencySymbol}${options.total.toFixed(2)}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${options.invoiceUrl}" style="height:48px;v-text-anchor:middle;width:180px;" arcsize="13%" stroke="f" fillcolor="#4f46e5">
                            <w:anchorlock/>
                            <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">View Full Invoice</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${options.invoiceUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">View Full Invoice</a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                      If you have any questions about this invoice, please don't hesitate to contact us.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f9fafb" style="background-color: #f9fafb; border-radius: 0 0 10px 10px; border-top: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #1f2937; font-weight: 600;">
                      ${options.companyName}
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">
                      © ${new Date().getFullYear()} ${options.companyName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
Invoice ${options.invoiceNumber}

Dear ${options.clientName},

Thank you for your business! Please find your invoice details below.

Invoice Date: ${options.invoiceDate}
Due Date: ${options.dueDate}
Total Due: ${currencySymbol}${options.total.toFixed(2)}

View the full invoice here: ${options.invoiceUrl}

If you have any questions about this invoice, please don't hesitate to contact us.

${options.companyName}
© ${new Date().getFullYear()} ${options.companyName}. All rights reserved.
    `.trim(),
  });
}

/**
 * Helper function to get currency symbol
 */
function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'INR': '₹',
    'AUD': 'A$',
    'CAD': 'C$',
  };
  return symbols[currency] || currency + ' ';
}

// ============================================================================
// INVOICE PAYMENT CONFIRMATION EMAIL
// ============================================================================

export interface InvoicePaymentConfirmationOptions {
  to: string;
  invoiceNumber: string;
  clientName: string;
  companyName: string;
  paidDate: string;
  total: number;
  currency: string;
  from?: string;
}

/**
 * Send invoice payment confirmation email to client
 */
export async function sendInvoicePaymentConfirmation(options: InvoicePaymentConfirmationOptions): Promise<boolean> {
  const currencySymbol = getCurrencySymbol(options.currency);

  return sendEmail({
    to: options.to,
    from: options.from,
    subject: `Payment Received - Invoice ${options.invoiceNumber}`,
    html: `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Payment Confirmation</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px;">
          <!-- Header with gradient -->
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#059669" color2="#10b981" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#10b981" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px 10px 0 0;">
                <tr>
                  <td style="padding: 40px;">
                    <h1 style="margin: 0 0 10px; font-size: 32px; font-weight: bold; color: #ffffff;">✅ Payment Received</h1>
                    <p style="margin: 0; font-size: 16px; color: #ffffff; opacity: 0.9;">Thank you for your payment!</p>
                  </td>
                </tr>
              </table>
              <!--[if mso]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </td>
          </tr>

          <!-- Content area -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#ffffff" style="background-color: #ffffff;">
                <tr>
                  <td style="padding: 30px 40px;">
                    <p style="margin: 0 0 15px; font-size: 16px; color: #1f2937;">
                      Dear <strong>${options.clientName}</strong>,
                    </p>
                    <p style="margin: 0 0 20px; font-size: 16px; color: #1f2937; line-height: 1.6;">
                      We have received your payment. Thank you for your prompt payment!
                    </p>

                    <!-- Payment details box -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f9fafb" style="background-color: #f9fafb; border-radius: 8px; margin: 20px 0;">
                      <tr>
                        <td style="padding: 20px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                            <tr>
                              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Invoice Number:</td>
                              <td style="padding: 8px 0; color: #1f2937; text-align: right; font-weight: 600; font-size: 14px;">${options.invoiceNumber}</td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Payment Date:</td>
                              <td style="padding: 8px 0; color: #1f2937; text-align: right; font-size: 14px;">${options.paidDate}</td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding: 8px 0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                  <tr>
                                    <td style="border-top: 2px solid #e5e7eb;"></td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0; color: #1f2937; font-weight: 600; font-size: 18px;">Amount Paid:</td>
                              <td style="padding: 8px 0; color: #10b981; text-align: right; font-weight: 700; font-size: 20px;">
                                ${currencySymbol}${options.total.toFixed(2)}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Payment status banner -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#ecfdf5" style="background-color: #ecfdf5; border-radius: 4px; margin: 20px 0; border-left: 4px solid #10b981;">
                      <tr>
                        <td style="padding: 15px;">
                          <p style="margin: 0; color: #065f46; font-weight: 600; font-size: 14px;">Payment Status: PAID</p>
                          <p style="margin: 5px 0 0 0; color: #047857; font-size: 14px;">Your invoice has been fully paid. No further action required.</p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                      Thank you for your business! We appreciate your partnership.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" bgcolor="#f9fafb" style="background-color: #f9fafb; border-radius: 0 0 10px 10px; border-top: 1px solid #e5e7eb;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 10px; font-size: 14px; color: #1f2937; font-weight: 600;">
                      ${options.companyName}
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #6b7280;">
                      © ${new Date().getFullYear()} ${options.companyName}. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    text: `
Payment Received - Invoice ${options.invoiceNumber}

Dear ${options.clientName},

We have received your payment. Thank you for your prompt payment!

Invoice Number: ${options.invoiceNumber}
Payment Date: ${options.paidDate}
Amount Paid: ${currencySymbol}${options.total.toFixed(2)}

Payment Status: PAID
Your invoice has been fully paid. No further action required.

Thank you for your business! We appreciate your partnership.

${options.companyName}
© ${new Date().getFullYear()} ${options.companyName}. All rights reserved.
    `.trim(),
  });
}
