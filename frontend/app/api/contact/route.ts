/**
 * Contact Form API
 * Handles contact form submissions from both the contact page and "Start Your Free Trial" modal
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/resend-email';

// Contact form submission interface
interface ContactFormData {
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  formType: 'contact' | 'trial';
}

// Email address to receive contact form submissions
const CONTACT_EMAIL = 'contact@zenora.ai';

/**
 * POST /api/contact
 * Send contact form submission via email
 */
export async function POST(request: NextRequest) {
  try {
    const data: ContactFormData = await request.json();

    // Validate required fields
    if (!data.email || !data.message) {
      return NextResponse.json(
        { success: false, error: 'Email and message are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get the sender's name (handle both fullName and name fields)
    const senderName = data.fullName || data.name || 'Not provided';

    // Build email subject based on form type
    const emailSubject = data.formType === 'trial'
      ? `New Free Trial Request from ${senderName}`
      : `Contact Form: ${data.subject || 'General Inquiry'}`;

    // Build email content
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; border-bottom: 2px solid #6366f1;">
              <h1 style="margin: 0; color: #1f2937; font-size: 24px; font-weight: 600;">
                ${data.formType === 'trial' ? '🚀 New Free Trial Request' : '📧 New Contact Form Submission'}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px 40px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6366f1; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Full Name</strong>
                    <p style="margin: 8px 0 0; color: #1f2937; font-size: 16px;">${senderName}</p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6366f1; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Email</strong>
                    <p style="margin: 8px 0 0; color: #1f2937; font-size: 16px;">
                      <a href="mailto:${data.email}" style="color: #6366f1; text-decoration: none;">${data.email}</a>
                    </p>
                  </td>
                </tr>

                ${data.phone ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6366f1; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Phone</strong>
                    <p style="margin: 8px 0 0; color: #1f2937; font-size: 16px;">
                      <a href="tel:${data.phone}" style="color: #6366f1; text-decoration: none;">${data.phone}</a>
                    </p>
                  </td>
                </tr>
                ` : ''}

                ${data.company ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6366f1; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Company</strong>
                    <p style="margin: 8px 0 0; color: #1f2937; font-size: 16px;">${data.company}</p>
                  </td>
                </tr>
                ` : ''}

                ${data.subject ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #6366f1; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Subject</strong>
                    <p style="margin: 8px 0 0; color: #1f2937; font-size: 16px;">${data.subject}</p>
                  </td>
                </tr>
                ` : ''}

                <tr>
                  <td style="padding: 12px 0;">
                    <strong style="color: #6366f1; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Message</strong>
                    <p style="margin: 8px 0 0; color: #1f2937; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${data.message}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #6b7280; font-size: 14px; text-align: center;">
                Sent from Zenora Contact Form • ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })}
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

    // Plain text version
    const text = `
${data.formType === 'trial' ? 'NEW FREE TRIAL REQUEST' : 'NEW CONTACT FORM SUBMISSION'}

Full Name: ${senderName}
Email: ${data.email}
${data.phone ? `Phone: ${data.phone}` : ''}
${data.company ? `Company: ${data.company}` : ''}
${data.subject ? `Subject: ${data.subject}` : ''}

Message:
${data.message}

---
Sent from Zenora Contact Form
${new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' })}
    `.trim();

    // Send email
    const success = await sendEmail({
      to: CONTACT_EMAIL,
      subject: emailSubject,
      html,
      text,
      replyTo: data.email, // Allow direct reply to the sender
    });

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Contact form submitted successfully',
    });
  } catch (error: any) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
