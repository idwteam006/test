/**
 * Email Template Utilities for Outlook-Compatible Emails
 *
 * This file provides helper functions to create Outlook-compatible email templates
 * using table-based layouts and VML (Vector Markup Language) for backgrounds.
 *
 * Key fixes for Outlook:
 * 1. Uses table-based layout instead of div with background
 * 2. Adds VML backgrounds for Outlook using <!--[if mso]> conditional comments
 * 3. Uses bgcolor attribute on tables for solid color backgrounds
 * 4. Explicitly sets color on all text elements (Outlook ignores inherited colors)
 */

// Color presets for different email types
export const EMAIL_COLORS = {
  // Purple gradient (primary brand color)
  primary: {
    main: '#667eea',
    gradient: '#764ba2',
    vmlGradient: 'color="#764ba2" color2="#667eea"',
    fallback: '#667eea'
  },
  // Green (success/approved)
  success: {
    main: '#10b981',
    gradient: '#059669',
    vmlGradient: 'color="#059669" color2="#10b981"',
    fallback: '#10b981'
  },
  // Red (error/rejected/alert)
  danger: {
    main: '#ef4444',
    gradient: '#dc2626',
    vmlGradient: 'color="#dc2626" color2="#ef4444"',
    fallback: '#dc2626'
  },
  // Orange/Amber (warning/pending)
  warning: {
    main: '#f59e0b',
    gradient: '#d97706',
    vmlGradient: 'color="#d97706" color2="#f59e0b"',
    fallback: '#f59e0b'
  },
  // Indigo (invoices)
  indigo: {
    main: '#6366f1',
    gradient: '#4f46e5',
    vmlGradient: 'color="#4f46e5" color2="#6366f1"',
    fallback: '#4f46e5'
  },
  // Blue (projects, clients)
  blue: {
    main: '#3b82f6',
    gradient: '#2563eb',
    vmlGradient: 'color="#2563eb" color2="#3b82f6"',
    fallback: '#2563eb'
  },
  // Violet/Purple (assignments, managers)
  violet: {
    main: '#8b5cf6',
    gradient: '#7c3aed',
    vmlGradient: 'color="#7c3aed" color2="#8b5cf6"',
    fallback: '#7c3aed'
  },
  // Cyan/Teal (admin notifications)
  cyan: {
    main: '#06b6d4',
    gradient: '#0891b2',
    vmlGradient: 'color="#0891b2" color2="#06b6d4"',
    fallback: '#0891b2'
  }
};

export type EmailColorTheme = keyof typeof EMAIL_COLORS;

/**
 * Generates the opening HTML for an Outlook-compatible email
 */
export function getEmailDocumentHead(title: string): string {
  return `<!DOCTYPE html>
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
</head>`;
}

/**
 * Wraps email content in an Outlook-compatible container with background color
 *
 * @param content - The HTML content to wrap
 * @param theme - The color theme to use
 * @param useGradient - Whether to use gradient (true) or solid color (false)
 */
export function wrapInOutlookContainer(
  content: string,
  theme: EmailColorTheme = 'primary',
  useGradient: boolean = true
): string {
  const colors = EMAIL_COLORS[theme];
  const bgStyle = useGradient
    ? `background: linear-gradient(135deg, ${colors.main} 0%, ${colors.gradient} 100%); background-color: ${colors.fallback};`
    : `background-color: ${colors.fallback};`;

  const vmlFill = useGradient
    ? `<v:fill type="gradient" ${colors.vmlGradient} angle="135"/>`
    : `<v:fill type="solid" color="${colors.fallback}"/>`;

  return `
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;">
                ${vmlFill}
                <v:textbox style="mso-fit-shape-to-text:true" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${colors.fallback}" style="${bgStyle} border-radius: 10px;">
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

/**
 * Creates an Outlook-compatible button
 */
export function createEmailButton(
  href: string,
  text: string,
  buttonColor: string = '#ffffff',
  textColor: string = '#667eea'
): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background-color: ${buttonColor}; border-radius: 6px;">
            <a href="${href}" style="display: inline-block; padding: 14px 32px; color: ${textColor}; text-decoration: none; font-weight: 600; font-size: 16px;">${text}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/**
 * Creates an Outlook-compatible info box with translucent background
 */
export function createInfoBox(content: string, msoBackgroundColor: string = '#8b7bc7'): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
  <tr>
    <td style="background-color: rgba(255, 255, 255, 0.15); border-radius: 8px; padding: 20px;">
      <!--[if mso]>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${msoBackgroundColor}">
        <tr>
          <td style="padding: 20px;">
      <![endif]-->
      ${content}
      <!--[if mso]>
          </td>
        </tr>
      </table>
      <![endif]-->
    </td>
  </tr>
</table>`;
}

/**
 * Creates an Outlook-compatible warning/callout box with left border
 */
export function createWarningBox(content: string, borderColor: string = '#fbbf24', msoBackgroundColor: string = '#e8e0f0'): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
  <tr>
    <td style="background-color: rgba(255, 255, 255, 0.15); border-left: 4px solid ${borderColor}; padding: 12px 16px; border-radius: 4px;">
      <!--[if mso]>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${msoBackgroundColor}">
        <tr>
          <td style="padding: 12px 16px; border-left: 4px solid ${borderColor};">
      <![endif]-->
      ${content}
      <!--[if mso]>
          </td>
        </tr>
      </table>
      <![endif]-->
    </td>
  </tr>
</table>`;
}

/**
 * Creates email footer
 */
export function createEmailFooter(additionalText?: string): string {
  const year = new Date().getFullYear();
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 20px;">
  <tr>
    <td style="font-size: 12px; color: #e0e0e0;">
      ${additionalText ? `<p style="margin: 0 0 5px; color: #e0e0e0;">${additionalText}</p>` : ''}
      <p style="margin: 0; color: #e0e0e0;">&copy; ${year} Zenora.ai. All rights reserved.</p>
    </td>
  </tr>
</table>`;
}

/**
 * Generates a complete Outlook-compatible email
 */
export function generateOutlookEmail(
  title: string,
  content: string,
  theme: EmailColorTheme = 'primary',
  useGradient: boolean = true
): string {
  return getEmailDocumentHead(title) + wrapInOutlookContainer(content, theme, useGradient);
}

/**
 * Helper to create white text that's visible in Outlook
 * Outlook sometimes ignores inherited colors, so we need explicit color on each element
 */
export function whiteText(text: string, tag: 'p' | 'span' | 'strong' | 'h1' | 'h2' | 'h3' = 'span'): string {
  const baseStyle = 'color: #ffffff;';
  switch (tag) {
    case 'h1':
      return `<h1 style="margin: 0 0 20px; font-size: 28px; ${baseStyle}">${text}</h1>`;
    case 'h2':
      return `<h2 style="margin: 0 0 15px; font-size: 22px; ${baseStyle}">${text}</h2>`;
    case 'h3':
      return `<h3 style="margin: 0 0 10px; font-size: 18px; ${baseStyle}">${text}</h3>`;
    case 'p':
      return `<p style="margin: 0 0 15px; font-size: 16px; ${baseStyle}">${text}</p>`;
    case 'strong':
      return `<strong style="${baseStyle}">${text}</strong>`;
    default:
      return `<span style="${baseStyle}">${text}</span>`;
  }
}
