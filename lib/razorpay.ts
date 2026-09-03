import { supabase } from './supabase';
import { processReferralReward } from './api';
import { sendInvoiceEmail } from './email';
import { saveSubscriptionRecord } from './subscriptions';

export interface RazorpayPlan {
  id: string; // Database UUID
  slug: string; // 'autopay', 'annual', etc.

  // Core properties
  title: string;
  amountRupees: number;
  amountPaise: number;
  days: number;

  // UI properties
  description: string;
  term: string;
  cadence: string;
  cta: string;
  badge_text: string | null;
  badge_color: string | null;
}

export async function fetchMobilePlans(): Promise<Record<string, RazorpayPlan>> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .eq('visible_on', 'mobile');

  if (error || !data) {
    console.error('Failed to fetch mobile plans:', error);
    return {};
  }

  const plansMap: Record<string, RazorpayPlan> = {};
  data.forEach((plan: any) => {
    // Determine badge color since plans table doesn't have badge_color
    let badge_color = null;
    if (plan.cart_name === 'autopay') badge_color = '#10b981'; // Green
    if (plan.cart_name === 'sixMonth') badge_color = '#818cf8'; // Primary light

    plansMap[plan.cart_name] = {
      id: plan.id,
      slug: plan.cart_name,
      
      title: plan.name,
      amountRupees: Number(plan.price),
      amountPaise: Math.round(Number(plan.price) * 100),
      days: plan.duration_value || 30, // Fallback to 30 if null

      description: plan.description || '',
      term: plan.term || '',
      cadence: plan.cadence || '',
      cta: plan.cta || '',
      badge_text: plan.note || null,
      badge_color,
    };
  });
  return plansMap;
}

export const RAZORPAY_KEY_ID =
  process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ||
  process.env.RAZORPAY_KEY_ID ||
  '';

const RAZORPAY_KEY_SECRET = process.env.EXPO_PUBLIC_RAZORPAY_KEY_SECRET || process.env.RAZORPAY_KEY_SECRET || '';

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

    if (plan.slug === 'autopay') {
      return await createRazorpaySubscription(plan, userId);
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
 * Create a Razorpay Subscription for AutoPay
 */
async function createRazorpaySubscription(
  plan: RazorpayPlan,
  userId: string
): Promise<{ orderId: string; amountPaise: number } | null> {
  const authHeader = 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

  // Find or Create Plan
  let rzpPlanId = '';
  try {
    const plansRes = await fetch('https://api.razorpay.com/v1/plans', {
      headers: { Authorization: authHeader }
    });
    const plansData = await plansRes.json();
    const existingPlan = (plansData.items || []).find((p: any) => p.item.name.includes('AutoPay') && p.item.amount === 19900);
    
    if (existingPlan) {
      rzpPlanId = existingPlan.id;
    } else {
      const newPlanRes = await fetch('https://api.razorpay.com/v1/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({
          period: 'monthly',
          interval: 1,
          item: {
            name: 'Genestac Pro - AutoPay 199',
            amount: 19900,
            currency: 'INR',
            description: 'Monthly AutoPay subscription'
          }
        })
      });
      const newPlanData = await newPlanRes.json();
      rzpPlanId = newPlanData.id;
    }
  } catch (err) {
    console.error('Failed to create/find Razorpay plan:', err);
    return null;
  }

  if (!rzpPlanId) return null;

  try {
    const startAt = Math.floor(Date.now() / 1000) + (plan.days * 24 * 60 * 60);
    const subRes = await fetch('https://api.razorpay.com/v1/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify({
        plan_id: rzpPlanId,
        total_count: 120, // 10 years maximum
        customer_notify: 0,
        start_at: startAt,
        notes: { user_id: userId },
        addons: [{
          item: {
            name: 'Trial Access',
            amount: plan.amountPaise,
            currency: 'INR'
          }
        }]
      })
    });
    const subData = await subRes.json();

    if (subRes.ok && subData.id) {
      // Record initial entry as pending using subscription ID
      await supabase.from('payments').insert({
        user_id: userId,
        provider: 'razorpay',
        provider_order_id: subData.id,
        amount: plan.amountRupees,
        status: 'pending',
      });
      // Return subscription ID disguised as orderId for frontend consistency
      return { orderId: subData.id, amountPaise: plan.amountPaise };
    } else {
      console.error('Razorpay subscription creation failed:', subData);
      return null;
    }
  } catch (err) {
    console.error('Exception creating subscription:', err);
    return null;
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

    // 3. Save record to public.subscriptions table
    await saveSubscriptionRecord({
      userId,
      planType: plan.slug,
      durationDays: plan.days,
    });

    // 4. Also try updating user_memberships if table exists
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

    // 5. Trigger referral reward processing for referrer!
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
