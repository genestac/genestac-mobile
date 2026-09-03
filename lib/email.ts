import { supabase } from './supabase';
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
                <li>Unlimited AI logging & health tracking access</li>
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
    const apiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY || process.env.RESEND_API_KEY || '';
    const resendFrom = process.env.EXPO_PUBLIC_RESEND_FROM || process.env.RESEND_FROM || 'Genestac Health <noreply@genestac.com>';

    if (!apiKey) {
      console.warn('RESEND_API_KEY / EXPO_PUBLIC_RESEND_API_KEY is not configured in environment.');
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
      console.error('Resend API Error (Email dispatch failed):', res.status, data);
      return false;
    }
  } catch (err) {
    console.error('Error dispatching invoice email:', err);
    return false;
  }
}

/**
 * Generates a 6-digit OTP code, saves it to user metadata in Supabase,
 * and emails it via Resend API (matching Genestac Web app flow).
 */
export async function sendRegistrationOtpEmail(params: {
  userId: string;
  userEmail: string;
  userName?: string;
}): Promise<{ success: boolean; otp?: string; error?: string }> {
  try {
    const { userId, userEmail, userName } = params;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: userRow } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', userId)
      .maybeSingle();

    const currentMetadata = (userRow?.metadata as Record<string, any>) || {};

    // Save OTP to users table metadata
    const { error: updateError } = await supabase
      .from('users')
      .update({
        metadata: {
          ...currentMetadata,
          otp,
          otp_expires_at: expiresAt,
        },
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to store OTP in metadata:', updateError);
    }

    const apiKey = process.env.EXPO_PUBLIC_RESEND_API_KEY || process.env.RESEND_API_KEY || '';
    const resendFrom = process.env.EXPO_PUBLIC_RESEND_FROM || process.env.RESEND_FROM || 'Genestac Health <noreply@genestac.com>';

    if (!apiKey) {
      console.warn('RESEND_API_KEY is not configured in environment. OTP saved in DB only.');
      return { success: true, otp };
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Verify your Genestac account</title>
    </head>
    <body style="margin:0; padding:0; background:#eef4f7; font-family:Arial, Helvetica, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4f7; padding:40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:22px; overflow:hidden; box-shadow:0 12px 35px rgba(0,31,63,0.12);">
              <tr>
                <td style="height:6px; background:linear-gradient(90deg,#001f3f,#10b981);"></td>
              </tr>
              <tr>
                <td style="padding:32px 32px 18px; text-align:center;">
                  <img src="https://genestac.com/logo2.png" alt="Genestac Therapeutics" width="150" style="display:block; margin:0 auto;" />
                </td>
              </tr>
              <tr>
                <td style="padding:24px 36px 34px;">
                  <h1 style="color:#001f3f; font-size:26px; line-height:1.3; margin:0 0 14px; text-align:center;">
                    Verify your email
                  </h1>
                  <p style="font-size:15px; color:#425466; line-height:1.7; margin:0 0 26px; text-align:center;">
                    Welcome to Genestac${userName ? `, ${userName}` : ''}. Please enter the verification code below to activate your account.
                  </p>
                  <div style="background:linear-gradient(135deg,#ecfdf5,#f8fafc); border:1px solid #10b981; border-radius:18px; padding:26px 18px; text-align:center; margin:28px 0;">
                    <div style="font-size:12px; text-transform:uppercase; letter-spacing:1.6px; color:#10b981; font-weight:700; margin-bottom:10px;">
                      Verification Code
                    </div>
                    <div style="font-size:38px; font-weight:900; letter-spacing:10px; color:#001f3f;">
                      ${otp}
                    </div>
                  </div>
                  <p style="font-size:14px; color:#000000; line-height:1.6; margin:0 0 10px; text-align:center;">
                    This code will expire in <strong style="color:#001f3f;">10 minutes</strong>.
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

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: resendFrom,
        to: [userEmail],
        subject: 'Your Genestac Account Verification Code',
        html: htmlContent,
      }),
    });

    const resData = await res.json();
    if (res.ok) {
      console.log('OTP email sent via Resend:', resData.id);
      return { success: true, otp };
    } else {
      console.error('Resend API Error (OTP dispatch failed):', res.status, resData);
      return { success: false, error: resData.message || 'Failed to dispatch email' };
    }
  } catch (err: any) {
    console.error('sendRegistrationOtpEmail error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Verifies custom OTP against user metadata in Supabase
 */
export async function verifyRegistrationOtp(params: {
  userId: string;
  otp: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { userId, otp } = params;
    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', userId)
      .maybeSingle();

    if (fetchError || !userRow) {
      return { success: false, error: 'User record not found.' };
    }

    const metadata = (userRow.metadata as Record<string, any>) || {};

    if (!metadata.otp || !metadata.otp_expires_at) {
      return { success: false, error: 'No OTP requested. Please request a new code.' };
    }

    if (new Date(metadata.otp_expires_at) < new Date()) {
      return { success: false, error: 'OTP code has expired. Please request a new code.' };
    }

    if (metadata.otp !== otp.trim()) {
      return { success: false, error: 'Invalid OTP code. Please check and try again.' };
    }

    // OTP is valid! Clear OTP fields and mark verified
    const { otp: _, otp_expires_at: __, ...restMetadata } = metadata;
    await supabase
      .from('users')
      .update({
        status: 'ACTIVE',
        metadata: {
          ...restMetadata,
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        },
      })
      .eq('id', userId);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
