import nodemailer, { Transporter } from 'nodemailer';

export class MailgunClient {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.mailgun.org',
      port: 587,
      secure: false,
      auth: {
        user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
        pass: process.env.MAILGUN_API_KEY || '',
      },
    });
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: `${process.env.MAILGUN_FROM_NAME} <${process.env.MAILGUN_FROM_EMAIL}>`,
        to,
        subject,
        html,
        text,
      });
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  async sendWelcome(tenantName: string, userName: string, userEmail: string): Promise<boolean> {
    const html = `
      <html style="margin:0;padding:0">
        <body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:0 auto;background:#fff;padding:20px">
            <div style="background:#1a1a1a;color:#ff6600;padding:20px;text-align:center;border-radius:4px">
              <h1 style="margin:0">DGSmart Hub</h1>
            </div>
            <div style="padding:20px">
              <h2 style="color:#333">Welcome ${userName}!</h2>
              <p style="color:#666;line-height:1.6">
                Your DGSmart Hub account for <strong>${tenantName}</strong> is now active.
              </p>
              <p style="color:#666;line-height:1.6">
                You can now start managing your Milesight LoRaWAN devices.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/app/dashboard" style="display:inline-block;background:#ff6600;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;margin-top:10px">
                Go to Dashboard
              </a>
            </div>
            <div style="border-top:1px solid #eee;padding-top:20px;margin-top:20px;color:#999;font-size:12px;text-align:center">
              <p>DGSmart Hub by DGSOFT</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(userEmail, 'Welcome to DGSmart Hub', html);
  }

  async sendEmailVerification(
    userEmail: string,
    userName: string,
    token: string
  ): Promise<boolean> {
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${token}`;

    const html = `
      <html style="margin:0;padding:0">
        <body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:0 auto;background:#fff;padding:20px">
            <div style="background:#1a1a1a;color:#ff6600;padding:20px;text-align:center;border-radius:4px">
              <h1 style="margin:0">Verify Your Email</h1>
            </div>
            <div style="padding:20px">
              <h2 style="color:#333">Hi ${userName},</h2>
              <p style="color:#666;line-height:1.6">
                Please verify your email address to activate your DGSmart Hub account.
              </p>
              <a href="${verifyUrl}" style="display:inline-block;background:#ff6600;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;margin-top:10px">
                Verify Email
              </a>
              <p style="color:#999;font-size:12px;margin-top:20px">
                This link expires in 24 hours.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(userEmail, 'Verify Your Email Address', html);
  }

  async sendPasswordReset(
    userEmail: string,
    userName: string,
    token: string
  ): Promise<boolean> {
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

    const html = `
      <html style="margin:0;padding:0">
        <body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:0 auto;background:#fff;padding:20px">
            <div style="background:#1a1a1a;color:#ff6600;padding:20px;text-align:center;border-radius:4px">
              <h1 style="margin:0">Reset Your Password</h1>
            </div>
            <div style="padding:20px">
              <p style="color:#666;line-height:1.6">
                Hi ${userName}, we received a request to reset your password.
              </p>
              <a href="${resetUrl}" style="display:inline-block;background:#ff6600;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;margin-top:10px">
                Reset Password
              </a>
              <p style="color:#999;font-size:12px;margin-top:20px">
                This link expires in 1 hour. If you didn't request this, please ignore this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(userEmail, 'Reset Your Password', html);
  }

  async sendInvoiceIssued(
    tenantEmail: string,
    tenantName: string,
    invoiceId: string,
    amount: number,
    pdfUrl?: string
  ): Promise<boolean> {
    const html = `
      <html style="margin:0;padding:0">
        <body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:0 auto;background:#fff;padding:20px">
            <div style="background:#1a1a1a;color:#ff6600;padding:20px;text-align:center;border-radius:4px">
              <h1 style="margin:0">Invoice Issued</h1>
            </div>
            <div style="padding:20px">
              <p style="color:#666;line-height:1.6">
                Hi ${tenantName}, your monthly invoice has been issued.
              </p>
              <div style="background:#f9f9f9;padding:15px;border-radius:4px;margin:20px 0">
                <p style="margin:0;color:#666"><strong>Invoice ID:</strong> ${invoiceId}</p>
                <p style="margin:10px 0 0 0;color:#666"><strong>Amount Due:</strong> €${amount.toFixed(2)}</p>
              </div>
              ${
                pdfUrl
                  ? `<a href="${pdfUrl}" style="display:inline-block;background:#ff6600;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;margin-top:10px">
                View Invoice
              </a>`
                  : ''
              }
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(tenantEmail, 'Invoice Issued - DGSmart Hub', html);
  }

  async sendPaymentConfirmed(
    tenantEmail: string,
    tenantName: string,
    invoiceId: string,
    amount: number
  ): Promise<boolean> {
    const html = `
      <html style="margin:0;padding:0">
        <body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:0 auto;background:#fff;padding:20px">
            <div style="background:#1a1a1a;color:#ff6600;padding:20px;text-align:center;border-radius:4px">
              <h1 style="margin:0">Payment Confirmed</h1>
            </div>
            <div style="padding:20px">
              <p style="color:#666;line-height:1.6">
                Hi ${tenantName}, we have received your payment.
              </p>
              <div style="background:#f0f9f0;padding:15px;border-radius:4px;margin:20px 0;border-left:4px solid #4caf50">
                <p style="margin:0;color:#666"><strong>Invoice ID:</strong> ${invoiceId}</p>
                <p style="margin:10px 0 0 0;color:#666"><strong>Amount Paid:</strong> €${amount.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(tenantEmail, 'Payment Confirmed - DGSmart Hub', html);
  }

  async sendPaymentFailed(
    tenantEmail: string,
    tenantName: string,
    invoiceId: string
  ): Promise<boolean> {
    const html = `
      <html style="margin:0;padding:0">
        <body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:0 auto;background:#fff;padding:20px">
            <div style="background:#1a1a1a;color:#ff6600;padding:20px;text-align:center;border-radius:4px">
              <h1 style="margin:0">Payment Failed</h1>
            </div>
            <div style="padding:20px">
              <p style="color:#666;line-height:1.6">
                Hi ${tenantName}, your payment for invoice ${invoiceId} could not be processed.
              </p>
              <p style="color:#666;line-height:1.6">
                Please try again or contact our support team for assistance.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/app/billing" style="display:inline-block;background:#ff6600;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;margin-top:10px">
                Try Again
              </a>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(tenantEmail, 'Payment Failed - DGSmart Hub', html);
  }

  async sendAlertTriggered(
    tenantEmail: string,
    tenantName: string,
    deviceName: string,
    alertMessage: string,
    severity: string
  ): Promise<boolean> {
    const severityColor = {
      low: '#2196F3',
      medium: '#FF9800',
      high: '#F44336',
      critical: '#9C27B0',
    }[severity] || '#666';

    const html = `
      <html style="margin:0;padding:0">
        <body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:0 auto;background:#fff;padding:20px">
            <div style="background:#1a1a1a;color:#ff6600;padding:20px;text-align:center;border-radius:4px">
              <h1 style="margin:0">Alert Triggered</h1>
            </div>
            <div style="padding:20px">
              <div style="background:${severityColor}22;padding:15px;border-radius:4px;border-left:4px solid ${severityColor};margin:20px 0">
                <p style="margin:0;color:#333"><strong>Device:</strong> ${deviceName}</p>
                <p style="margin:5px 0 0 0;color:#333"><strong>Message:</strong> ${alertMessage}</p>
                <p style="margin:5px 0 0 0;color:#666"><strong>Severity:</strong> <span style="color:${severityColor}">${severity.toUpperCase()}</span></p>
              </div>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/app/alerts" style="display:inline-block;background:#ff6600;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;margin-top:10px">
                View Alert
              </a>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(tenantEmail, `Alert Triggered - ${severity.toUpperCase()} - DGSmart Hub`, html);
  }

  async sendDeviceOffline(
    tenantEmail: string,
    tenantName: string,
    deviceName: string,
    lastSeen: Date
  ): Promise<boolean> {
    const html = `
      <html style="margin:0;padding:0">
        <body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:0 auto;background:#fff;padding:20px">
            <div style="background:#1a1a1a;color:#ff6600;padding:20px;text-align:center;border-radius:4px">
              <h1 style="margin:0">Device Offline</h1>
            </div>
            <div style="padding:20px">
              <p style="color:#666;line-height:1.6">
                Hi ${tenantName}, device <strong>${deviceName}</strong> has gone offline.
              </p>
              <div style="background:#fff3cd;padding:15px;border-radius:4px;margin:20px 0;border-left:4px solid #FF9800">
                <p style="margin:0;color:#666"><strong>Last Seen:</strong> ${lastSeen.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(tenantEmail, `Device Offline - ${deviceName} - DGSmart Hub`, html);
  }

  async sendNewTeamMember(
    userEmail: string,
    userName: string,
    invitedByName: string,
    tenantName: string
  ): Promise<boolean> {
    const html = `
      <html style="margin:0;padding:0">
        <body style="font-family:Arial,sans-serif;margin:0;padding:0;background:#f5f5f5">
          <div style="max-width:600px;margin:0 auto;background:#fff;padding:20px">
            <div style="background:#1a1a1a;color:#ff6600;padding:20px;text-align:center;border-radius:4px">
              <h1 style="margin:0">Welcome to the Team</h1>
            </div>
            <div style="padding:20px">
              <p style="color:#666;line-height:1.6">
                Hi ${userName}, you have been added to <strong>${tenantName}</strong> by ${invitedByName}.
              </p>
              <p style="color:#666;line-height:1.6">
                You can now access DGSmart Hub and start managing IoT devices.
              </p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/app/dashboard" style="display:inline-block;background:#ff6600;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;margin-top:10px">
                Go to Dashboard
              </a>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(userEmail, 'You have been added to DGSmart Hub', html);
  }
}

export function createMailgunClient(): MailgunClient {
  return new MailgunClient();
}
