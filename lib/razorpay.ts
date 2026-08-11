import { supabase } from './supabase';
import { processReferralReward } from './api';
import { sendInvoiceEmail } from './email';

export interface RazorpayPlan {
  id: 'annual' | 'sixMonth' | 'monthly';
  title: string;
  amountRupees: number;
  amountPaise: number;
  days: number;
}

export const RAZORPAY_PLANS: Record<string, RazorpayPlan> = {
  annual: {
    id: 'annual',
    title: 'Yearly Membership',
    amountRupees: 1499,
    amountPaise: 149900,
    days: 365,
  },
  sixMonth: {
    id: 'sixMonth',
    title: '6-Month Pass',
    amountRupees: 899,
    amountPaise: 89900,
    days: 180,
  },
  monthly: {
    id: 'monthly',
    title: 'Monthly Pass',
    amountRupees: 199,
    amountPaise: 19900,
    days: 30,
  },
};

export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ||
  process.env.RAZORPAY_KEY_ID ||
  '';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

/**
 * Create a Razorpay Order via Razorpay Orders API
 */
export async function createRazorpayOrder(
  plan: RazorpayPlan,
  userId: string
): Promise<{ orderId: string; amountPaise: number } | null> {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.warn('Razorpay API key or secret not configured in environment.');
      return null;
    }

    const authHeader = 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const receipt = `rcpt_${userId.substring(0, 8)}_${Date.now()}`;

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify({
        amount: plan.amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          plan_id: plan.id,
          user_id: userId,
          app: 'Genestac Mobile',
        },
      }),
    });

    const data = await res.json();
    if (res.ok && data.id) {
      // Insert initial order into existing payments table
      await supabase.from('payments').insert({
        user_id: userId,
        provider: 'razorpay',
        provider_order_id: data.id,
        amount: plan.amountRupees,
        status: 'pending',
      });

      return { orderId: data.id, amountPaise: plan.amountPaise };
    } else {
      console.warn('Razorpay server order creation response:', data);
      const fallbackOrderId = `order_${Math.random().toString(36).substring(2, 14)}`;
      await supabase.from('payments').insert({
        user_id: userId,
        provider: 'razorpay',
        provider_order_id: fallbackOrderId,
        amount: plan.amountRupees,
        status: 'pending',
      });
      return { orderId: fallbackOrderId, amountPaise: plan.amountPaise };
    }
  } catch (err) {
    console.error('Exception creating Razorpay order:', err);
    const fallbackOrderId = `order_${Math.random().toString(36).substring(2, 14)}`;
    return { orderId: fallbackOrderId, amountPaise: plan.amountPaise };
  }
}

/**
 * Record payment completion in existing payments table & update user pro status
 */
export async function recordSuccessfulPayment({
  userId,
  plan,
  orderId,
  paymentId,
  signature,
  userName,
  userEmail,
  userPhone,
}: {
  userId: string;
  plan: RazorpayPlan;
  orderId: string;
  paymentId: string;
  signature?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}): Promise<boolean> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000).toISOString();

    // 1. Update existing payments record by provider_order_id
    const { error: payErr } = await supabase
      .from('payments')
      .update({
        provider_payment_id: paymentId,
        status: 'success',
      })
      .eq('provider_order_id', orderId);

    if (payErr) {
      // If no matching pending record, insert new completed payment row
      await supabase.from('payments').insert({
        user_id: userId,
        provider: 'razorpay',
        provider_order_id: orderId,
        provider_payment_id: paymentId,
        amount: plan.amountRupees,
        status: 'success',
      });
    }

    // 2. Fetch existing user metadata and update Pro status & interested_plan_id
    const { data: user } = await supabase
      .from('users')
      .select('name, email, phone, metadata')
      .eq('id', userId)
      .maybeSingle();

    const existingMetadata = (typeof user?.metadata === 'object' && user?.metadata !== null)
      ? user.metadata
      : {};

    await supabase
      .from('users')
      .update({
        interested_plan_id: plan.id,
        metadata: {
          ...existingMetadata,
          is_pro: true,
          pro_plan_id: plan.id,
          pro_expires_at: expiresAt,
        },
      })
      .eq('id', userId);

    // 3. Also try updating user_memberships if table exists
    try {
      await supabase.from('user_memberships').insert({
        user_id: userId,
        plan_id: plan.id,
        plan_name: plan.title,
        amount: plan.amountRupees,
        currency: 'INR',
        status: 'ACTIVE',
        started_at: now.toISOString(),
        expires_at: expiresAt,
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
      });
    } catch (_) {
      // Ignore if user_memberships is not created yet
    }

    // 4. Trigger referral reward processing for referrer!
    await processReferralReward(userId, 250);

    // 5. Send branded Tax Invoice email
    const finalEmail = userEmail || user?.email;
    const finalName = userName || user?.name || 'Patient';
    const finalPhone = userPhone || user?.phone;

    if (finalEmail) {
      const dateStr = now.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      sendInvoiceEmail({
        userName: finalName,
        userEmail: finalEmail,
        userPhone: finalPhone,
        plan,
        orderId,
        paymentId,
        dateStr,
        amountRupees: plan.amountRupees,
      }).catch(e => console.error('Invoice email dispatch exception:', e));
    }

    return true;
  } catch (err) {
    console.error('Error recording payment in Supabase:', err);
    return false;
  }
}
