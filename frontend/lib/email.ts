/**
 * Email Service for Zenora.ai
 * Handles magic link emails, welcome emails, and security alerts
 *
 * IMPORTANT: Install nodemailer for email sending
 * npm install nodemailer @types/nodemailer
 *
 * SECURITY NOTES:
 * - Never log email contents or codes
 * - Use environment variables for SMTP configuration
 * - Include security best practices in email templates
 */

import nodemailer from 'nodemailer';

// ============================================================================
// EMAIL CONFIGURATION
// ============================================================================

// SMTP configuration optimized for serverless (Vercel)
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);

console.log('[Email] SMTP Config:', {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: smtpPort,
  secure: smtpPort === 465,
  user: process.env.SMTP_USER ? '***SET***' : '***NOT SET***',
  pass: (process.env.SMTP_PASS || process.env.SMTP_PASSWORD) ? '***SET***' : '***NOT SET***'
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: smtpPort,
  secure: smtpPort === 465, // true for 465, false for other ports (use STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
  },
  pool: false, // Disable connection pooling for serverless
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2' as const,
  },
} as any);

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

/**
 * Magic link email template (HTML)
 * Outlook-compatible with table-based layout and VML backgrounds
 */
function getMagicLinkEmailHTML(
  firstName: string,
  code: string,
  magicLinkUrl: string,
  expiryMinutes: number = 10
): string {
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
  <title>Your Login Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Main content with background -->
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                <v:fill type="gradient" color="#764ba2" color2="#667eea" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); background-color: #667eea; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px; color: #ffffff;">
                    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">Welcome back to Zenora.ai!</h1>
                    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${firstName},</p>
                    <p style="margin: 0 0 30px; font-size: 16px; color: #ffffff;">You requested a login code for your account. Use the code below to sign in:</p>

                    <!-- Code box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px;">
                            <tr>
                              <td style="padding: 20px 40px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333333; font-family: 'Courier New', monospace; text-align: center;">
                                ${code}
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 30px 0 20px; font-size: 16px; color: #ffffff;">Or click the button below to sign in automatically:</p>

                    <!-- Button -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background-color: #ffffff; border-radius: 6px;">
                                <a href="${magicLinkUrl}" style="display: inline-block; padding: 14px 32px; color: #667eea; text-decoration: none; font-weight: 600; font-size: 16px;">Sign In to Zenora.ai</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Warning box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                      <tr>
                        <td style="background-color: rgba(255, 255, 255, 0.15); border-left: 4px solid #fbbf24; padding: 12px; border-radius: 4px;">
                          <!--[if mso]>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#e8e0f0">
                            <tr>
                              <td style="padding: 0; border-left: 4px solid #fbbf24;">
                          <![endif]-->
                          <strong style="color: #ffffff;">Security Notice:</strong><br style="color: #ffffff;">
                          <span style="color: #ffffff;">• This code expires in ${expiryMinutes} minutes</span><br>
                          <span style="color: #ffffff;">• You have 5 attempts to enter the code</span><br>
                          <span style="color: #ffffff;">• Never share this code with anyone</span><br>
                          <span style="color: #ffffff;">• If you didn't request this code, please contact your administrator immediately</span>
                          <!--[if mso]>
                            </td>
                          </tr>
                          </table>
                          <![endif]-->
                        </td>
                      </tr>
                    </table>

                    <!-- Footer -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
                      <tr>
                        <td style="font-size: 12px; color: #ffffff; opacity: 0.8;">
                          <p style="margin: 0 0 5px; color: #e0e0e0;">This is an automated message from Zenora.ai Employee Management System.</p>
                          <p style="margin: 0 0 5px; color: #e0e0e0;">If you have any questions, please contact your system administrator.</p>
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
}

/**
 * Magic link email template (Plain text)
 */
function getMagicLinkEmailText(
  firstName: string,
  code: string,
  magicLinkUrl: string,
  expiryMinutes: number = 10
): string {
  return `
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
}

/**
 * Welcome email template (HTML)
 * Outlook-compatible with table-based layout and VML backgrounds
 */
function getWelcomeEmailHTML(
  firstName: string,
  companyName: string,
  loginUrl: string
): string {
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
  <title>Welcome to Zenora.ai</title>
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
                <v:fill type="gradient" color="#764ba2" color2="#667eea" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); background-color: #667eea; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px; color: #ffffff;">
                    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">Welcome to Zenora.ai!</h1>
                    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${firstName},</p>
                    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">Your account has been created for ${companyName}. We're excited to have you on board!</p>

                    <!-- Features box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                      <tr>
                        <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
                          <!--[if mso]>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#8b7bc7">
                            <tr>
                              <td style="padding: 20px;">
                          <![endif]-->
                          <h3 style="margin: 0 0 15px; color: #ffffff;">What you can do with Zenora.ai:</h3>
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr><td style="padding: 4px 0; color: #ffffff;">• Track your time and projects</td></tr>
                            <tr><td style="padding: 4px 0; color: #ffffff;">• Request and manage leave</td></tr>
                            <tr><td style="padding: 4px 0; color: #ffffff;">• View your performance goals</td></tr>
                            <tr><td style="padding: 4px 0; color: #ffffff;">• Access important documents</td></tr>
                            <tr><td style="padding: 4px 0; color: #ffffff;">• Stay connected with your team</td></tr>
                          </table>
                          <!--[if mso]>
                              </td>
                            </tr>
                          </table>
                          <![endif]-->
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0; font-size: 16px; color: #ffffff;">To get started, simply click the button below and request a login code:</p>

                    <!-- Button -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center">
                          <table role="presentation" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="background-color: #ffffff; border-radius: 6px;">
                                <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; color: #667eea; text-decoration: none; font-weight: 600; font-size: 16px;">Get Started</a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0 0; font-size: 16px; color: #ffffff;"><strong style="color: #ffffff;">Passwordless Login:</strong><br>
                    Zenora.ai uses secure, passwordless authentication. Each time you log in, you'll receive a unique code via email. This keeps your account secure without the need to remember passwords.</p>

                    <!-- Footer -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
                      <tr>
                        <td style="font-size: 12px; color: #e0e0e0;">
                          <p style="margin: 0 0 5px; color: #e0e0e0;">If you have any questions or need assistance, please contact your administrator.</p>
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
}

/**
 * Security alert email template (HTML)
 * Outlook-compatible with table-based layout and VML backgrounds
 */
function getSecurityAlertEmailHTML(
  firstName: string,
  alertType: string,
  details: string,
  timestamp: Date
): string {
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
  <title>Security Alert</title>
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
                <v:fill type="solid" color="#dc2626"/>
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#dc2626" style="background-color: #dc2626; border-radius: 10px;">
                <tr>
                  <td style="padding: 40px; color: #ffffff;">
                    <h1 style="margin: 0 0 20px; font-size: 28px; color: #ffffff;">Security Alert</h1>
                    <p style="margin: 0 0 15px; font-size: 16px; color: #ffffff;">Hi ${firstName},</p>
                    <p style="margin: 0 0 20px; font-size: 16px; color: #ffffff;">We detected unusual activity on your Zenora.ai account:</p>

                    <!-- Alert box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                      <tr>
                        <td style="background-color: rgba(255, 255, 255, 0.15); border-left: 4px solid #fbbf24; padding: 20px; border-radius: 4px;">
                          <!--[if mso]>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#e85454">
                            <tr>
                              <td style="padding: 20px; border-left: 4px solid #fbbf24;">
                          <![endif]-->
                          <strong style="color: #ffffff;">Alert Type:</strong> <span style="color: #ffffff;">${alertType}</span><br>
                          <strong style="color: #ffffff;">Details:</strong> <span style="color: #ffffff;">${details}</span><br>
                          <strong style="color: #ffffff;">Time:</strong> <span style="color: #ffffff;">${timestamp.toLocaleString()}</span>
                          <!--[if mso]>
                              </td>
                            </tr>
                          </table>
                          <![endif]-->
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0 10px; font-size: 16px; color: #ffffff;"><strong style="color: #ffffff;">What should you do?</strong></p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr><td style="padding: 4px 0; color: #ffffff;">• If this was you, no action is needed</td></tr>
                      <tr><td style="padding: 4px 0; color: #ffffff;">• If this wasn't you, contact your administrator immediately</td></tr>
                      <tr><td style="padding: 4px 0; color: #ffffff;">• Review your recent account activity</td></tr>
                    </table>

                    <!-- Footer -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
                      <tr>
                        <td style="font-size: 12px; color: #e0e0e0;">
                          <p style="margin: 0 0 5px; color: #e0e0e0;">This is an automated security alert from Zenora.ai.</p>
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
}

// ============================================================================
// EMAIL SENDING FUNCTIONS
// ============================================================================

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Send email using configured SMTP server with timeout
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  try {
    console.log('[Email] Sending to:', options.to.replace(/(.{3}).*(@.*)/, '$1***$2'));
    console.log('[Email] From:', process.env.SMTP_FROM || process.env.SMTP_USER);

    // Add 8 second timeout (Vercel has 10s limit, leave buffer)
    const sendPromise = transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Email send timeout (8s)')), 8000)
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);

    console.log('[Email] ✓ Message sent successfully:', {
      to: options.to.replace(/(.{3}).*(@.*)/, '$1***$2'),
      messageId: info.messageId,
      response: info.response,
    });

    return true;
  } catch (error: any) {
    console.error('[Email] ✗ Failed to send email:', {
      error: error.message,
      code: error.code,
      command: error.command,
    });
    return false;
  }
}

/**
 * Send magic link email
 * NEVER log the code or full magic link URL
 */
export async function sendMagicLinkEmail(
  email: string,
  firstName: string,
  code: string,
  token: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zenora.ai';
  const magicLinkUrl = `${appUrl}/auth/verify?token=${token}`;
  const expiryMinutes = parseInt(process.env.CODE_EXPIRY || '600', 10) / 60;

  return sendEmail({
    to: email,
    subject: 'Your Zenora.ai Login Code',
    html: getMagicLinkEmailHTML(firstName, code, magicLinkUrl, expiryMinutes),
    text: getMagicLinkEmailText(firstName, code, magicLinkUrl, expiryMinutes),
  });
}

/**
 * Send welcome email to new employee
 */
export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  companyName: string
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zenora.ai';
  const loginUrl = `${appUrl}/login`;

  return sendEmail({
    to: email,
    subject: `Welcome to ${companyName} - Zenora.ai`,
    html: getWelcomeEmailHTML(firstName, companyName, loginUrl),
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

/**
 * Send security alert email
 */
export async function sendSecurityAlertEmail(
  email: string,
  firstName: string,
  alertType: string,
  details: string
): Promise<boolean> {
  const timestamp = new Date();

  return sendEmail({
    to: email,
    subject: 'Security Alert - Zenora.ai',
    html: getSecurityAlertEmailHTML(firstName, alertType, details, timestamp),
    text: `
Security Alert - Zenora.ai

Hi ${firstName},

We detected unusual activity on your account:

Alert Type: ${alertType}
Details: ${details}
Time: ${timestamp.toLocaleString()}

What should you do?
- If this was you, no action is needed
- If this wasn't you, contact your administrator immediately
- Review your recent account activity

This is an automated security alert from Zenora.ai.
    `.trim(),
  });
}

/**
 * Send account deactivation email
 */
export async function sendAccountDeactivationEmail(
  email: string,
  firstName: string,
  reason?: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Your Account Has Been Deactivated - Zenora.ai',
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2>Account Deactivated</h2>
  <p>Hi ${firstName},</p>
  <p>Your Zenora.ai account has been deactivated.</p>
  ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
  <p>If you believe this is an error, please contact your administrator.</p>
  <hr>
  <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
</body>
</html>
    `,
    text: `
Account Deactivated

Hi ${firstName},

Your Zenora.ai account has been deactivated.
${reason ? `\nReason: ${reason}` : ''}

If you believe this is an error, please contact your administrator.

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    `.trim(),
  });
}

/**
 * Send onboarding invite email to new employee
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zenora.ai';
  const onboardingUrl = `${appUrl}/onboard?token=${options.token}`;
  const expiryDays = Math.ceil(
    (options.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete Your Onboarding</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .container {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
      padding: 40px;
      color: white;
    }
    .button {
      display: inline-block;
      background: white;
      color: #667eea;
      padding: 16px 40px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      margin: 30px 0;
    }
    .info-box {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .info-box h3 {
      margin-top: 0;
    }
    .footer {
      margin-top: 30px;
      font-size: 12px;
      opacity: 0.8;
      border-top: 1px solid rgba(255,255,255,0.2);
      padding-top: 20px;
    }
    .warning {
      background: rgba(255, 255, 255, 0.1);
      border-left: 4px solid #fbbf24;
      padding: 12px;
      margin: 20px 0;
      border-radius: 4px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎉 Welcome to Zenora.ai!</h1>
    <p>Hi ${options.firstName},</p>
    <p>You've been invited to join our team! ${options.invitedBy} has initiated your onboarding process.</p>

    <div class="info-box">
      <h3>📋 Next Steps:</h3>
      <ol style="margin: 10px 0; padding-left: 20px;">
        <li><strong>Complete Your Profile</strong> - Fill in your personal details</li>
        <li><strong>Add Your Address</strong> - Current and permanent address</li>
        <li><strong>Professional Information</strong> - Education and experience</li>
        <li><strong>Upload Documents</strong> - Required documents for verification</li>
      </ol>
      <p style="margin-top: 15px;">This will take approximately <strong>10-15 minutes</strong> to complete.</p>
    </div>

    <center>
      <a href="${onboardingUrl}" class="button">
        Start Onboarding →
      </a>
    </center>

    <div class="warning">
      <strong>⏰ Important:</strong><br>
      • This invitation link expires in <strong>${expiryDays} days</strong><br>
      • You can save your progress and return later<br>
      • HR will review your submission before approval<br>
      • You'll receive login access after approval
    </div>

    <p style="font-size: 14px; opacity: 0.9;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="background: rgba(255,255,255,0.2); padding: 8px; border-radius: 4px; display: inline-block; margin-top: 8px; word-break: break-all;">${onboardingUrl}</span>
    </p>

    <div class="footer">
      <p>If you have any questions, please contact ${options.invitedBy} or your HR department.</p>
      <p>&copy; ${new Date().getFullYear()} Zenora.ai. All rights reserved.</p>
    </div>
  </div>
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
 * Send onboarding submission notification to HR
 */
export async function sendOnboardingSubmissionNotification(
  hrEmail: string,
  employeeName: string,
  employeeEmail: string,
  reviewUrl: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Onboarding Submission</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>📝 New Onboarding Submission</h1>
    <p>A new employee has completed their onboarding and is awaiting your review.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Employee:</strong> ${employeeName}</p>
      <p style="margin: 5px 0;"><strong>Email:</strong> ${employeeEmail}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Pending Review</p>
    </div>

    <center>
      <a href="${reviewUrl}" style="display: inline-block; background: white; color: #667eea; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        Review Submission
      </a>
    </center>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
New Onboarding Submission

A new employee has completed their onboarding and is awaiting your review.

Employee: ${employeeName}
Email: ${employeeEmail}
Status: Pending Review

Review the submission here:
${reviewUrl}

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
  `.trim();

  return sendEmail({
    to: hrEmail,
    subject: '📝 New Onboarding Submission - Action Required',
    html,
    text,
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
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Onboarding Approved</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>✅ Onboarding Approved!</h1>
    <p>Hi ${employeeName},</p>
    <p>Great news! Your onboarding has been approved. You now have full access to Zenora.ai.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0;">🚀 You can now:</h3>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Access your employee dashboard</li>
        <li>Track your time and projects</li>
        <li>Request leave</li>
        <li>View company documents</li>
        <li>Connect with your team</li>
      </ul>
    </div>

    <center>
      <a href="${loginUrl}" style="display: inline-block; background: white; color: #059669; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        Login to Zenora.ai
      </a>
    </center>

    <p style="font-size: 14px; opacity: 0.9;">
      Zenora.ai uses passwordless authentication. Simply enter your email and you'll receive a secure login code.
    </p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      If you have any questions, please contact your manager or HR department.<br>
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
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
  `.trim();

  return sendEmail({
    to: employeeEmail,
    subject: '✅ Onboarding Approved - Welcome to the Team!',
    html,
    text,
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
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Changes Requested</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>📋 Changes Requested</h1>
    <p>Hi ${employeeName},</p>
    <p>Thank you for completing your onboarding. HR has reviewed your submission and requested some changes.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin-top: 0;">Feedback from HR:</h3>
      <p style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 6px;">${feedback}</p>
    </div>

    <center>
      <a href="${onboardingUrl}" style="display: inline-block; background: white; color: #d97706; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">
        Update Your Information
      </a>
    </center>

    <p style="font-size: 14px; opacity: 0.9;">
      Please make the requested changes and resubmit your onboarding. Your previous information has been saved.
    </p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      If you have any questions about the feedback, please contact your HR department.<br>
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
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
  `.trim();

  return sendEmail({
    to: employeeEmail,
    subject: '📋 Onboarding Changes Requested',
    html,
    text,
  });
}

/**
 * Send onboarding reminder email
 */
export async function sendOnboardingReminderEmail(
  employeeEmail: string,
  employeeName: string,
  onboardingUrl: string,
  expiresAt: Date
): Promise<boolean> {
  const daysLeft = Math.ceil(
    (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Onboarding Reminder</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>⏰ Reminder: Complete Your Onboarding</h1>
    <p>Hi ${employeeName},</p>
    <p>We noticed you haven't completed your onboarding yet. Don't worry - your progress has been saved!</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>📅 Time Remaining:</strong> ${daysLeft} days</p>
      <p style="margin: 5px 0;"><strong>✅ What's Completed:</strong> We've saved your progress</p>
      <p style="margin: 5px 0;"><strong>⏱️ Time Needed:</strong> ~10-15 minutes to complete</p>
    </div>

    <center>
      <a href="${onboardingUrl}" style="display: inline-block; background: white; color: #d97706; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0;">
        Continue Onboarding →
      </a>
    </center>

    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px; font-size: 14px;">
      <strong>Why complete now?</strong><br>
      • Get access to your employee dashboard<br>
      • Start tracking your work and projects<br>
      • Connect with your team<br>
      • Access important company resources
    </div>

    <p style="font-size: 14px; opacity: 0.9;">
      Need help? Contact your HR department or the person who invited you.
    </p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      This is an automated reminder. Your invitation expires in ${daysLeft} days.<br>
      © ${new Date().getFullYear()} Zenora.ai. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  const text = `
Reminder: Complete Your Onboarding

Hi ${employeeName},

We noticed you haven't completed your onboarding yet. Don't worry - your progress has been saved!

Time Remaining: ${daysLeft} days
What's Completed: We've saved your progress
Time Needed: ~10-15 minutes to complete

Continue your onboarding here:
${onboardingUrl}

Why complete now?
• Get access to your employee dashboard
• Start tracking your work and projects
• Connect with your team
• Access important company resources

Need help? Contact your HR department or the person who invited you.

This is an automated reminder. Your invitation expires in ${daysLeft} days.

© ${new Date().getFullYear()} Zenora.ai. All rights reserved.
  `.trim();

  return sendEmail({
    to: employeeEmail,
    subject: `⏰ Reminder: Complete Your Onboarding (${daysLeft} days left)`,
    html,
    text,
  });
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('[Email] Configuration test passed');
    return true;
  } catch (error) {
    console.error('[Email] Configuration test failed:', error);
    return false;
  }
}

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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leave Request Approved</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>✅ Leave Request Approved</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your leave request has been approved!</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Leave Type:</strong> ${options.leaveType}</p>
      <p style="margin: 5px 0;"><strong>Start Date:</strong> ${options.startDate}</p>
      <p style="margin: 5px 0;"><strong>End Date:</strong> ${options.endDate}</p>
      <p style="margin: 5px 0;"><strong>Duration:</strong> ${options.days} day${options.days > 1 ? 's' : ''}</p>
    </div>

    <p>Enjoy your time off!</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora. All rights reserved.
    </p>
  </div>
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

© ${new Date().getFullYear()} Zenora. All rights reserved.
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Leave Request Rejected</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>❌ Leave Request Rejected</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Unfortunately, your leave request has been rejected.</p>

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

    <p>If you have questions, please contact your manager.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora. All rights reserved.
    </p>
  </div>
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

© ${new Date().getFullYear()} Zenora. All rights reserved.
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timesheet Approved</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>✅ Timesheet Approved</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your timesheet entry has been approved!</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Week:</strong> ${options.weekStart} - ${options.weekEnd}</p>
      <p style="margin: 5px 0;"><strong>Hours:</strong> ${options.totalHours}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Approved</p>
    </div>

    <p>Thank you for submitting your timesheet!</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora. All rights reserved.
    </p>
  </div>
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

© ${new Date().getFullYear()} Zenora. All rights reserved.
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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Timesheet Rejected</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>❌ Timesheet Rejected</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your timesheet entry has been rejected and needs correction.</p>

    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Week:</strong> ${options.weekStart} - ${options.weekEnd}</p>
      <p style="margin: 5px 0;"><strong>Hours:</strong> ${options.totalHours}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Rejected</p>
    </div>

    <div style="background: rgba(255, 255, 255, 0.1); border-left: 4px solid #fbbf24; padding: 12px; margin: 20px 0; border-radius: 4px;">
      <strong>Reason:</strong><br>
      ${options.reason}
    </div>

    <p>Please review and resubmit your timesheet with the necessary corrections.</p>

    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora. All rights reserved.
    </p>
  </div>
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

© ${new Date().getFullYear()} Zenora. All rights reserved.
    `.trim(),
  };
}


// ============================================================================
// PERFORMANCE REVIEW EMAIL TEMPLATES
// ============================================================================

export interface PerformanceReviewEmailOptions {
  employeeName: string;
  period: string;
  reviewerName: string;
}

export function getPerformanceReviewCompletedEmail(options: PerformanceReviewEmailOptions) {
  return {
    subject: "✅ Performance Review Completed",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Review Completed</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>✅ Performance Review Completed</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your performance review for <strong>${options.period}</strong> has been completed by ${options.reviewerName}.</p>
    <p>Please log in to view your complete review and manager's feedback.</p>
    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora. All rights reserved.
    </p>
  </div>
</body>
</html>
    `,
    text: `Performance Review Completed

Hi ${options.employeeName},

Your performance review for ${options.period} has been completed by ${options.reviewerName}.

Please log in to view your complete review and manager's feedback.

© ${new Date().getFullYear()} Zenora. All rights reserved.`.trim(),
  };
}

// ============================================================================
// PAYROLL EMAIL TEMPLATES
// ============================================================================

export interface PayrollProcessedEmailOptions {
  employeeName: string;
  period: string;
  netPay: number;
}

export function getPayrollProcessedEmail(options: PayrollProcessedEmailOptions) {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(options.netPay);

  return {
    subject: "💰 Payroll Processed",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payroll Processed</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 10px; padding: 40px; color: white;">
    <h1>💰 Payroll Processed</h1>
    <p>Hi ${options.employeeName},</p>
    <p>Your payroll for <strong>${options.period}</strong> has been processed.</p>
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Period:</strong> ${options.period}</p>
      <p style="margin: 5px 0;"><strong>Net Pay:</strong> ${formattedAmount}</p>
      <p style="margin: 5px 0;"><strong>Status:</strong> Pending Payment</p>
    </div>
    <p>You will receive your payment soon. Please log in to view your detailed payslip.</p>
    <p style="font-size: 12px; opacity: 0.8; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
      © ${new Date().getFullYear()} Zenora. All rights reserved.
    </p>
  </div>
</body>
</html>
    `,
    text: `Payroll Processed

Hi ${options.employeeName},

Your payroll for ${options.period} has been processed.

Period: ${options.period}
Net Pay: ${formattedAmount}
Status: Pending Payment

You will receive your payment soon. Please log in to view your detailed payslip.

© ${new Date().getFullYear()} Zenora. All rights reserved.`.trim(),
  };
}

// ============================================================================
// TASK ASSIGNMENT EMAIL
// ============================================================================

interface TaskAssignedEmailOptions {
  employeeName: string;
  taskName: string;
  description?: string;
  dueDate?: string;
  projectName?: string;
  assignedBy: string;
}

export function getTaskAssignedEmail(options: TaskAssignedEmailOptions) {
  const dueDateText = options.dueDate ? `\nDue Date: ${options.dueDate}` : '';
  const projectText = options.projectName ? `\nProject: ${options.projectName}` : '';
  const descriptionText = options.description ? `\n\nDescription:\n${options.description}` : '';

  return {
    subject: `New Task Assigned: ${options.taskName}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
    .task-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
    .task-title { font-size: 20px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
    .task-details { color: #666; margin: 10px 0; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
    .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">📋 New Task Assigned</h1>
    </div>
    <div class="content">
      <p>Hi ${options.employeeName},</p>
      <p>You have been assigned a new task by ${options.assignedBy}.</p>

      <div class="task-box">
        <div class="task-title">${options.taskName}</div>
        <div class="task-details">
          <strong>Assigned by:</strong> ${options.assignedBy}${dueDateText}${projectText}${descriptionText}
        </div>
      </div>

      <p>Please log in to your account to view task details and update progress.</p>

      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.zenora.ai'}/employee/tasks" class="button">
        View Task
      </a>

      <div class="footer">
        <p>© ${new Date().getFullYear()} Zenora. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
    text: `
Hi ${options.employeeName},

You have been assigned a new task by ${options.assignedBy}.

Task: ${options.taskName}
Assigned by: ${options.assignedBy}${dueDateText}${projectText}${descriptionText}

Please log in to your account to view task details and update progress.

© ${new Date().getFullYear()} Zenora. All rights reserved.`.trim(),
  };
}
