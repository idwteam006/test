import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { sessions } from '@/lib/redis';
import { z } from 'zod';

const generateDocumentSchema = z.object({
  type: z.enum([
    'employment_verification',
    'salary_certificate',
    'bonafide_certificate',
    'address_proof',
  ]),
  purpose: z.string().optional(),
});

/**
 * POST /api/employee/documents/generate
 *
 * Generate a document letter for the employee
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('session')?.value;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
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

    const body = await request.json();
    const validation = generateDocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { type, purpose } = validation.data;

    // Get employee details with all necessary info
    const user = await prisma.user.findUnique({
      where: { id: sessionData.userId },
      include: {
        employee: {
          include: {
            department: true,
          },
        },
        department: true,
        employeeProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.employee) {
      return NextResponse.json(
        { success: false, error: 'Employee record not found' },
        { status: 404 }
      );
    }

    // Get company settings
    const tenantSettings = await prisma.tenantSettings.findUnique({
      where: { tenantId: sessionData.tenantId },
    });

    if (!tenantSettings) {
      return NextResponse.json(
        { success: false, error: 'Company settings not found' },
        { status: 404 }
      );
    }

    // Get latest payroll for salary certificate
    const latestPayroll = await prisma.payrollRecord.findFirst({
      where: {
        tenantId: sessionData.tenantId,
        employeeId: user.employee.id,
      },
      orderBy: {
        period: 'desc',
      },
    });

    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const employeeName = `${user.firstName} ${user.lastName}`;
    const startDate = user.employee.startDate
      ? new Date(user.employee.startDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'N/A';
    const department = user.department?.name || user.employee.department?.name || 'N/A';
    const designation = user.employee.jobTitle || 'N/A';
    const employeeNumber = user.employee.employeeNumber;
    const companyName = tenantSettings.companyName;

    let documentContent = '';
    let documentTitle = '';

    switch (type) {
      case 'employment_verification':
        documentTitle = 'Employment Verification Letter';
        documentContent = generateEmploymentVerificationLetter({
          employeeName,
          employeeNumber,
          designation,
          department,
          startDate,
          companyName,
          date: formattedDate,
          purpose,
        });
        break;

      case 'salary_certificate':
        if (!latestPayroll) {
          return NextResponse.json(
            { success: false, error: 'No payroll records found' },
            { status: 404 }
          );
        }
        documentTitle = 'Salary Certificate';
        documentContent = generateSalaryCertificate({
          employeeName,
          employeeNumber,
          designation,
          department,
          companyName,
          date: formattedDate,
          baseSalary: latestPayroll.baseSalary,
          bonuses: latestPayroll.bonuses,
          deductions: latestPayroll.deductions,
          netPay: latestPayroll.netPay,
          currency: tenantSettings.currency || 'USD',
          period: latestPayroll.period,
        });
        break;

      case 'bonafide_certificate':
        documentTitle = 'Bonafide Employee Certificate';
        documentContent = generateBonafideCertificate({
          employeeName,
          employeeNumber,
          designation,
          department,
          startDate,
          companyName,
          date: formattedDate,
          purpose,
        });
        break;

      case 'address_proof':
        const address = user.employeeProfile?.currentAddress as any;
        if (!address) {
          return NextResponse.json(
            { success: false, error: 'No address on file. Please update your profile.' },
            { status: 400 }
          );
        }
        documentTitle = 'Address Proof Letter';
        documentContent = generateAddressProofLetter({
          employeeName,
          employeeNumber,
          designation,
          department,
          companyName,
          date: formattedDate,
          address: formatAddress(address),
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid document type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: {
        title: documentTitle,
        type,
        content: documentContent,
        generatedAt: today.toISOString(),
        employee: {
          name: employeeName,
          employeeNumber,
          designation,
          department,
        },
        company: {
          name: companyName,
        },
      },
    });
  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function formatAddress(address: any): string {
  if (typeof address === 'string') return address;

  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);

  return parts.join(', ');
}

interface EmploymentVerificationParams {
  employeeName: string;
  employeeNumber: string;
  designation: string;
  department: string;
  startDate: string;
  companyName: string;
  date: string;
  purpose?: string;
}

function generateEmploymentVerificationLetter(params: EmploymentVerificationParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .date { text-align: right; margin-bottom: 20px; }
    .subject { margin: 30px 0; }
    .subject strong { text-decoration: underline; }
    .content { margin: 30px 0; text-align: justify; }
    .content p { margin: 15px 0; }
    .signature { margin-top: 60px; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${params.companyName}</h1>
  </div>

  <div class="date">
    <p>Date: ${params.date}</p>
  </div>

  <div class="subject">
    <p><strong>TO WHOM IT MAY CONCERN</strong></p>
  </div>

  <div class="content">
    <p><strong>Subject: Employment Verification Letter${params.purpose ? ` - ${params.purpose}` : ''}</strong></p>

    <p>This is to certify that <strong>${params.employeeName}</strong> (Employee ID: ${params.employeeNumber}) is currently employed with ${params.companyName}.</p>

    <p>The employment details are as follows:</p>

    <table style="margin: 20px 0; width: 100%;">
      <tr><td style="padding: 8px 0; width: 200px;"><strong>Name:</strong></td><td>${params.employeeName}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Employee ID:</strong></td><td>${params.employeeNumber}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Designation:</strong></td><td>${params.designation}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Department:</strong></td><td>${params.department}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Date of Joining:</strong></td><td>${params.startDate}</td></tr>
      <tr><td style="padding: 8px 0;"><strong>Employment Status:</strong></td><td>Active</td></tr>
    </table>

    <p>This letter is issued at the request of the employee for ${params.purpose || 'verification purposes'}.</p>

    <p>If you require any additional information, please feel free to contact our HR department.</p>
  </div>

  <div class="signature">
    <p>For ${params.companyName}</p>
    <br><br>
    <p>_____________________________</p>
    <p><strong>Authorized Signatory</strong></p>
    <p>Human Resources Department</p>
  </div>

  <div class="footer">
    <p>This is a computer-generated document and does not require a physical signature.</p>
    <p>Generated on ${params.date}</p>
  </div>
</body>
</html>
  `.trim();
}

interface SalaryCertificateParams {
  employeeName: string;
  employeeNumber: string;
  designation: string;
  department: string;
  companyName: string;
  date: string;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netPay: number;
  currency: string;
  period: string;
}

function generateSalaryCertificate(params: SalaryCertificateParams): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: params.currency,
    }).format(amount);
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .date { text-align: right; margin-bottom: 20px; }
    .subject { margin: 30px 0; }
    .subject strong { text-decoration: underline; }
    .content { margin: 30px 0; text-align: justify; }
    .content p { margin: 15px 0; }
    .salary-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .salary-table th, .salary-table td { border: 1px solid #333; padding: 10px; text-align: left; }
    .salary-table th { background-color: #f5f5f5; }
    .salary-table .amount { text-align: right; }
    .signature { margin-top: 60px; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${params.companyName}</h1>
  </div>

  <div class="date">
    <p>Date: ${params.date}</p>
  </div>

  <div class="subject">
    <p><strong>SALARY CERTIFICATE</strong></p>
  </div>

  <div class="content">
    <p>This is to certify that <strong>${params.employeeName}</strong> (Employee ID: ${params.employeeNumber}) is employed with ${params.companyName} as <strong>${params.designation}</strong> in the <strong>${params.department}</strong> department.</p>

    <p>The salary details for the period <strong>${params.period}</strong> are as follows:</p>

    <table class="salary-table">
      <tr>
        <th>Component</th>
        <th class="amount">Amount</th>
      </tr>
      <tr>
        <td>Basic Salary</td>
        <td class="amount">${formatCurrency(params.baseSalary)}</td>
      </tr>
      <tr>
        <td>Bonuses/Allowances</td>
        <td class="amount">${formatCurrency(params.bonuses)}</td>
      </tr>
      <tr>
        <td>Gross Salary</td>
        <td class="amount">${formatCurrency(params.baseSalary + params.bonuses)}</td>
      </tr>
      <tr>
        <td>Deductions</td>
        <td class="amount">(${formatCurrency(params.deductions)})</td>
      </tr>
      <tr style="font-weight: bold;">
        <td>Net Salary</td>
        <td class="amount">${formatCurrency(params.netPay)}</td>
      </tr>
    </table>

    <p>This certificate is issued at the request of the employee for personal purposes only.</p>
  </div>

  <div class="signature">
    <p>For ${params.companyName}</p>
    <br><br>
    <p>_____________________________</p>
    <p><strong>Authorized Signatory</strong></p>
    <p>Human Resources Department</p>
  </div>

  <div class="footer">
    <p>This is a computer-generated document and does not require a physical signature.</p>
    <p>Generated on ${params.date}</p>
  </div>
</body>
</html>
  `.trim();
}

interface BonafideCertificateParams {
  employeeName: string;
  employeeNumber: string;
  designation: string;
  department: string;
  startDate: string;
  companyName: string;
  date: string;
  purpose?: string;
}

function generateBonafideCertificate(params: BonafideCertificateParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .date { text-align: right; margin-bottom: 20px; }
    .subject { margin: 30px 0; text-align: center; }
    .subject strong { text-decoration: underline; font-size: 18px; }
    .content { margin: 30px 0; text-align: justify; }
    .content p { margin: 15px 0; }
    .signature { margin-top: 60px; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${params.companyName}</h1>
  </div>

  <div class="date">
    <p>Date: ${params.date}</p>
  </div>

  <div class="subject">
    <p><strong>BONAFIDE EMPLOYEE CERTIFICATE</strong></p>
  </div>

  <div class="content">
    <p><strong>TO WHOM IT MAY CONCERN</strong></p>

    <p>This is to certify that <strong>${params.employeeName}</strong> (Employee ID: ${params.employeeNumber}) is a bonafide employee of ${params.companyName}.</p>

    <p>The employee is currently working as <strong>${params.designation}</strong> in our <strong>${params.department}</strong> department since <strong>${params.startDate}</strong>.</p>

    <p>The employee is a permanent member of our organization and is in good standing with the company.</p>

    <p>This certificate is being issued at the request of the employee for ${params.purpose || 'official purposes'}.</p>
  </div>

  <div class="signature">
    <p>For ${params.companyName}</p>
    <br><br>
    <p>_____________________________</p>
    <p><strong>Authorized Signatory</strong></p>
    <p>Human Resources Department</p>
  </div>

  <div class="footer">
    <p>This is a computer-generated document and does not require a physical signature.</p>
    <p>Generated on ${params.date}</p>
  </div>
</body>
</html>
  `.trim();
}

interface AddressProofParams {
  employeeName: string;
  employeeNumber: string;
  designation: string;
  department: string;
  companyName: string;
  date: string;
  address: string;
}

function generateAddressProofLetter(params: AddressProofParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 14px; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px; }
    .header h1 { margin: 0; font-size: 24px; }
    .date { text-align: right; margin-bottom: 20px; }
    .subject { margin: 30px 0; text-align: center; }
    .subject strong { text-decoration: underline; font-size: 18px; }
    .content { margin: 30px 0; text-align: justify; }
    .content p { margin: 15px 0; }
    .address-box { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-left: 4px solid #333; }
    .signature { margin-top: 60px; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${params.companyName}</h1>
  </div>

  <div class="date">
    <p>Date: ${params.date}</p>
  </div>

  <div class="subject">
    <p><strong>ADDRESS PROOF LETTER</strong></p>
  </div>

  <div class="content">
    <p><strong>TO WHOM IT MAY CONCERN</strong></p>

    <p>This is to certify that <strong>${params.employeeName}</strong> (Employee ID: ${params.employeeNumber}) is employed with ${params.companyName} as <strong>${params.designation}</strong> in the <strong>${params.department}</strong> department.</p>

    <p>As per our records, the employee's current residential address is:</p>

    <div class="address-box">
      <p><strong>${params.address}</strong></p>
    </div>

    <p>This letter is issued at the request of the employee for address verification purposes.</p>

    <p>We confirm that the above information is correct as per our records.</p>
  </div>

  <div class="signature">
    <p>For ${params.companyName}</p>
    <br><br>
    <p>_____________________________</p>
    <p><strong>Authorized Signatory</strong></p>
    <p>Human Resources Department</p>
  </div>

  <div class="footer">
    <p>This is a computer-generated document and does not require a physical signature.</p>
    <p>Generated on ${params.date}</p>
  </div>
</body>
</html>
  `.trim();
}
