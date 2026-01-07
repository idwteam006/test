const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const prisma = new PrismaClient();

async function sendTestOTP() {
  try {
    const email = 'nagavijay@hotmail.com';

    console.log('📧 Sending test OTP email to:', email);
    console.log('');

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database with 10-minute expiry
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.verificationCode.create({
      data: {
        email: email,
        code: otp,
        expiresAt: expiresAt,
      },
    });

    console.log('✅ OTP stored in database:', otp);
    console.log('⏰ Expires at:', expiresAt.toLocaleString());
    console.log('');

    // Send email using Hostinger SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: 'info@addtechno.com',
        pass: 'Addtechno@123',
      },
    });

    const mailOptions = {
      from: '"Zenora.ai" <info@addtechno.com>',
      to: email,
      subject: 'Your Login Code - Zenora.ai',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your Login Code</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #e8e8e8;">
                      <h1 style="margin: 0; color: #1890ff; font-size: 28px; font-weight: 600;">Zenora.ai</h1>
                      <p style="margin: 8px 0 0; color: #666; font-size: 14px;">Employee Management System</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 16px; color: #262626; font-size: 22px; font-weight: 600;">Your Login Code</h2>
                      <p style="margin: 0 0 24px; color: #595959; font-size: 16px; line-height: 1.6;">
                        Use this code to complete your login to Zenora.ai:
                      </p>

                      <!-- OTP Code Box -->
                      <div style="background-color: #f0f7ff; border: 2px solid #1890ff; border-radius: 8px; padding: 24px; text-align: center; margin: 0 0 24px;">
                        <div style="font-size: 36px; font-weight: 700; color: #1890ff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                          ${otp}
                        </div>
                      </div>

                      <p style="margin: 0 0 16px; color: #595959; font-size: 14px; line-height: 1.6;">
                        <strong>Important:</strong> This code will expire in 10 minutes.
                      </p>

                      <p style="margin: 0 0 24px; color: #595959; font-size: 14px; line-height: 1.6;">
                        If you didn't request this code, please ignore this email.
                      </p>

                      <!-- Security Notice -->
                      <div style="background-color: #fff7e6; border-left: 4px solid #faad14; padding: 16px; border-radius: 4px;">
                        <p style="margin: 0; color: #8c6e0b; font-size: 13px; line-height: 1.5;">
                          🔒 <strong>Security Tip:</strong> Never share this code with anyone. Zenora.ai staff will never ask for your verification code.
                        </p>
                      </div>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e8e8e8; border-radius: 0 0 8px 8px;">
                      <p style="margin: 0 0 8px; color: #8c8c8c; font-size: 12px; text-align: center;">
                        This is an automated message from Zenora.ai
                      </p>
                      <p style="margin: 0; color: #8c8c8c; font-size: 12px; text-align: center;">
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
      `,
      text: `Your Zenora.ai login code is: ${otp}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
    };

    console.log('📨 Sending email via Hostinger SMTP...');
    console.log('   From: info@addtechno.com');
    console.log('   To:', email);
    console.log('');

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('');
    console.log('📬 Please check your inbox at', email);
    console.log('   Don\'t forget to check your spam/junk folder if you don\'t see it.');
    console.log('');
    console.log('🔑 OTP Code:', otp);
    console.log('⏰ Valid for: 10 minutes');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'EAUTH') {
      console.error('\n⚠️  SMTP Authentication failed. Please check:');
      console.error('   - Email: info@addtechno.com');
      console.error('   - Password is correct');
      console.error('   - SMTP settings: smtp.hostinger.com:465');
    }
  } finally {
    await prisma.$disconnect();
  }
}

sendTestOTP();
