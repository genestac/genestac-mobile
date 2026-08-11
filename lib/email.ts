import { RazorpayPlan } from './razorpay';

interface InvoiceData {
  userName: string;
  userEmail: string;
  userPhone?: string;
  plan: RazorpayPlan;
  orderId: string;
  paymentId: string;
  dateStr: string;
  amountRupees: number;
}

/**
 * Generates and sends a brand-styled HTML invoice email to the patient after Razorpay payment
 */
export async function sendInvoiceEmail(invoice: InvoiceData): Promise<boolean> {
  const invoiceNumber = `GEN-${Math.floor(100000 + Math.random() * 900000)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Genestac Pro Subscription Invoice</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 20px;
            color: #0f172a;
          }
          .invoice-box {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            border: 1px solid #e2e8f0;
          }
          .header {
            background-color: #0b1f17;
            padding: 30px;
            text-align: center;
            color: #ffffff;
          }
          .logo-title {
            font-size: 26px;
            font-weight: 800;
            color: #12879a;
            letter-spacing: 1px;
            margin: 0;
            display: inline-block;
          }
          .subtitle {
            font-size: 13px;
            color: #94a3b8;
            margin-top: 4px;
          }
          .content {
            padding: 30px;
          }
          .status-badge {
            background-color: #dcfce7;
            color: #15803d;
            font-size: 12px;
            font-weight: 700;
            padding: 6px 16px;
            border-radius: 20px;
            display: inline-block;
            margin-bottom: 20px;
          }
          .section-title {
            font-size: 12px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 6px;
          }
          .info-grid {
            width: 100%;
            margin-bottom: 24px;
          }
          .info-grid td {
            padding: 6px 0;
            font-size: 14px;
          }
          .label {
            color: #64748b;
            font-weight: 500;
          }
          .value {
            color: #0f172a;
            font-weight: 700;
            text-align: right;
            word-break: break-all;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .table th {
            background: #f8fafc;
            color: #475569;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            padding: 10px 12px;
            text-align: left;
            border-top: 1px solid #e2e8f0;
            border-bottom: 1px solid #e2e8f0;
          }
          .table td {
            padding: 14px 12px;
            font-size: 14px;
            border-bottom: 1px solid #f1f5f9;
          }
          .total-row td {
            font-weight: 800;
            font-size: 16px;
            color: #12879a;
            border-top: 2px solid #e2e8f0;
            border-bottom: none;
          }
          .benefits {
            background-color: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 16px;
            margin-top: 24px;
          }
          .benefits-title {
            font-size: 14px;
            font-weight: 700;
            color: #166534;
            margin-top: 0;
            margin-bottom: 8px;
          }
          .benefits-list {
            margin: 0;
            padding-left: 20px;
            font-size: 13px;
            color: #15803d;
          }
          .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div style="font-size: 32px; margin-bottom: 6px;">🌱</div>
            <h1 class="logo-title">GENESTAC HEALTH</h1>
            <div class="subtitle">Doctor-Guided Weight Loss & Health Program</div>
          </div>

          <div class="content">
            <div style="text-align: center;">
              <span class="status-badge">✓ PAYMENT SUCCESSFUL</span>
            </div>

            <table class="info-grid">
              <tr>
                <td class="label">Invoice Reference:</td>
                <td class="value">${invoiceNumber}</td>
              </tr>
              <tr>
                <td class="label">Date & Time:</td>
                <td class="value">${invoice.dateStr}</td>
              </tr>
              <tr>
                <td class="label">Patient Name:</td>
                <td class="value">${invoice.userName}</td>
              </tr>
              <tr>
                <td class="label">Patient Email:</td>
                <td class="value">${invoice.userEmail}</td>
              </tr>
              ${invoice.userPhone ? `
              <tr>
                <td class="label">Phone Number:</td>
                <td class="value">${invoice.userPhone}</td>
              </tr>` : ''}
              <tr>
                <td class="label">Razorpay Order ID:</td>
                <td class="value">${invoice.orderId}</td>
              </tr>
              <tr>
                <td class="label">Razorpay Payment ID:</td>
                <td class="value">${invoice.paymentId}</td>
              </tr>
              <tr>
                <td class="label">Payment Provider:</td>
                <td class="value">Razorpay Secure Gateway</td>
              </tr>
            </table>

            <div class="section-title">Subscription Details</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Duration</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Genestac Pro - ${invoice.plan.title}</strong></td>
                  <td>${invoice.plan.days} Days</td>
                  <td style="text-align: right;">₹${invoice.amountRupees.toLocaleString('en-IN')}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="2">Total Paid:</td>
                  <td style="text-align: right;">₹${invoice.amountRupees.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div class="benefits">
              <div class="benefits-title">🎉 Your VIP Pro Access Is Unlocked:</div>
              <ul class="benefits-list">
                <li>Unlimited Hunger Games access (no daily token limits)</li>
                <li>Deep metabolic & nutrient macro breakdown insights</li>
                <li>Exclusive Pro badges & community leaderboards</li>
                <li>Priority support & ad-free experience</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            Thank you for choosing Genestac Health & Weight Loss!<br>
            For any queries or billing support, contact <strong>support@genestac.com</strong><br>
            © 2026 Genestac Health Inc. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const apiKey = process.env.RESEND_API_KEY || '';
    const resendFrom = process.env.RESEND_FROM || 'Genestac Health <noreply@genestac.com>';

    if (!apiKey) {
      console.warn('RESEND_API_KEY is not configured in environment.');
      return false;
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [invoice.userEmail],
        subject: `Receipt & Tax Invoice ${invoiceNumber} - Genestac Pro Subscription`,
        html: htmlContent,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      console.log('Invoice email sent via Resend:', data.id);
      return true;
    } else {
      console.warn('Resend response:', data);
      return false;
    }
  } catch (err) {
    console.error('Error dispatching invoice email:', err);
    return false;
  }
}
