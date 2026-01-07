/**
 * Invoice Email Templates
 * Outlook-compatible with VML backgrounds
 */

interface InvoiceEmailParams {
  clientName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  total: number;
  currency: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  companyName: string;
  companyAddress?: string;
  paymentInstructions?: string;
  invoiceUrl: string;
}

export function generateInvoiceEmail(params: InvoiceEmailParams): string {
  const currencySymbol = getCurrencySymbol(params.currency);

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
  <title>Invoice ${params.invoiceNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header with VML background for Outlook -->
          <tr>
            <td>
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:120px;">
                <v:fill type="gradient" color="#4f46e5" color2="#6366f1" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:false" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#4f46e5" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); background-color: #4f46e5;">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                      Invoice
                    </h1>
                    <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px;">
                      ${params.invoiceNumber}
                    </p>
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
                Dear <strong>${params.clientName}</strong>,
              </p>

              <p style="margin: 0 0 30px; font-size: 16px; color: #1f2937;">
                Thank you for your business! Please find your invoice details below.
              </p>

              <!-- Invoice Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td width="50%" style="padding: 8px 0; font-size: 14px; color: #6b7280;">
                    <strong style="color: #1f2937;">Invoice Date:</strong>
                  </td>
                  <td width="50%" style="padding: 8px 0; font-size: 14px; color: #1f2937; text-align: right;">
                    ${params.invoiceDate}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">
                    <strong style="color: #1f2937;">Due Date:</strong>
                  </td>
                  <td style="padding: 8px 0; font-size: 14px; color: #ef4444; text-align: right; font-weight: 600;">
                    ${params.dueDate}
                  </td>
                </tr>
              </table>

              <!-- Line Items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin-bottom: 20px;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">
                      Description
                    </th>
                    <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">
                      Qty
                    </th>
                    <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">
                      Rate
                    </th>
                    <th style="padding: 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${params.items.map(item => `
                  <tr style="border-top: 1px solid #e5e7eb;">
                    <td style="padding: 12px; font-size: 14px; color: #1f2937;">
                      ${item.description}
                    </td>
                    <td style="padding: 12px; font-size: 14px; color: #1f2937; text-align: center;">
                      ${item.quantity}
                    </td>
                    <td style="padding: 12px; font-size: 14px; color: #1f2937; text-align: right;">
                      ${currencySymbol}${item.unitPrice.toFixed(2)}
                    </td>
                    <td style="padding: 12px; font-size: 14px; color: #1f2937; text-align: right;">
                      ${currencySymbol}${item.total.toFixed(2)}
                    </td>
                  </tr>
                  `).join('')}
                </tbody>
              </table>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td width="60%"></td>
                  <td width="40%">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">
                          Subtotal:
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1f2937; text-align: right;">
                          ${currencySymbol}${params.subtotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #6b7280;">
                          Tax:
                        </td>
                        <td style="padding: 8px 0; font-size: 14px; color: #1f2937; text-align: right;">
                          ${currencySymbol}${params.taxAmount.toFixed(2)}
                        </td>
                      </tr>
                      <tr style="border-top: 2px solid #e5e7eb;">
                        <td style="padding: 12px 0 0; font-size: 16px; color: #1f2937; font-weight: 600;">
                          Total:
                        </td>
                        <td style="padding: 12px 0 0; font-size: 18px; color: #4f46e5; text-align: right; font-weight: 700;">
                          ${currencySymbol}${params.total.toFixed(2)}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${params.paymentInstructions ? `
              <!-- Payment Instructions -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                <p style="margin: 0 0 10px; font-size: 14px; font-weight: 600; color: #92400e;">
                  Payment Instructions:
                </p>
                <p style="margin: 0; font-size: 14px; color: #92400e; white-space: pre-line;">
                  ${params.paymentInstructions}
                </p>
              </div>
              ` : ''}

              <!-- View Invoice Button -->
              <div style="text-align: center; margin-top: 30px;">
                <a href="${params.invoiceUrl}" style="display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Full Invoice
                </a>
              </div>

              <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                If you have any questions about this invoice, please don't hesitate to contact us.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #1f2937; font-weight: 600;">
                ${params.companyName}
              </p>
              ${params.companyAddress ? `
              <p style="margin: 0 0 10px; font-size: 12px; color: #6b7280;">
                ${params.companyAddress}
              </p>
              ` : ''}
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                © ${new Date().getFullYear()} ${params.companyName}. All rights reserved.
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

export function generateInvoiceReminderEmail(params: {
  clientName: string;
  invoiceNumber: string;
  dueDate: string;
  total: number;
  currency: string;
  daysOverdue: number;
  invoiceUrl: string;
  companyName: string;
}): string {
  const currencySymbol = getCurrencySymbol(params.currency);
  const isOverdue = params.daysOverdue > 0;
  const bgColor = isOverdue ? '#dc2626' : '#d97706';
  const gradientStart = isOverdue ? '#ef4444' : '#f59e0b';

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
  <title>Invoice Reminder - ${params.invoiceNumber}</title>
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
                <v:fill type="gradient" color="${bgColor}" color2="${gradientStart}" angle="135"/>
                <v:textbox style="mso-fit-shape-to-text:false" inset="0,0,0,0">
              <![endif]-->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${bgColor}" style="background: linear-gradient(135deg, ${gradientStart} 0%, ${bgColor} 100%); background-color: ${bgColor};">
                <tr>
                  <td style="padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                      ${isOverdue ? '⚠️ Payment Overdue' : '📋 Payment Reminder'}
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
                Dear <strong>${params.clientName}</strong>,
              </p>
              <p style="margin: 0 0 30px; font-size: 16px; color: #1f2937;">
                ${isOverdue
                  ? `This is a friendly reminder that invoice <strong>${params.invoiceNumber}</strong> is now <strong>${params.daysOverdue} days overdue</strong>.`
                  : `This is a friendly reminder about upcoming payment for invoice <strong>${params.invoiceNumber}</strong>.`
                }
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${isOverdue ? '#fee2e2' : '#fef3c7'}; border-left: 4px solid ${isOverdue ? '#ef4444' : '#f59e0b'}; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                <tr>
                  <td>
                    <p style="margin: 0 0 10px; color: ${isOverdue ? '#991b1b' : '#92400e'}; font-size: 14px;">
                      <strong>Invoice Number:</strong> ${params.invoiceNumber}
                    </p>
                    <p style="margin: 0 0 10px; color: ${isOverdue ? '#991b1b' : '#92400e'}; font-size: 14px;">
                      <strong>Due Date:</strong> ${params.dueDate}
                    </p>
                    <p style="margin: 0; color: ${isOverdue ? '#991b1b' : '#92400e'}; font-size: 18px; font-weight: 700;">
                      <strong>Amount Due:</strong> ${currencySymbol}${params.total.toFixed(2)}
                    </p>
                  </td>
                </tr>
              </table>
              <div style="text-align: center;">
                <a href="${params.invoiceUrl}" style="display: inline-block; padding: 14px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                  View Invoice & Pay Now
                </a>
              </div>
              <p style="margin: 30px 0 0; font-size: 14px; color: #6b7280; text-align: center;">
                If you have already made this payment, please disregard this reminder.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                © ${new Date().getFullYear()} ${params.companyName}. All rights reserved.
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
