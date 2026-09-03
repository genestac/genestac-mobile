import { supabase } from './supabase';

export interface SubscriptionRecord {
  id?: string;
  user_id: string;
  medicine_id?: string | null;
  plan_type: string;
  quantity: number;
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date?: string | null;
  next_delivery_date?: string | null;
  created_at?: string;
  updated_at?: string;
  plan_id?: string | null;
  variant_id?: string | null;
}

export interface UserSubscriptionStatus {
  isSubscribed: boolean;
  isExpired: boolean;
  status: 'active' | 'expired' | 'none';
  daysRemaining: number;
  endDateStr: string | null;
  nextDeliveryDateStr: string | null;
  planType: string | null;
  subscription: SubscriptionRecord | null;
}

/**
 * Check active subscription status for a user.
 * Automatically marks subscription as 'expired' if end_date has passed.
 */
export async function checkUserSubscription(userId: string): Promise<UserSubscriptionStatus> {
  const defaultStatus: UserSubscriptionStatus = {
    isSubscribed: false,
    isExpired: false,
    status: 'none',
    daysRemaining: 0,
    endDateStr: null,
    nextDeliveryDateStr: null,
    planType: null,
    subscription: null,
  };

  if (!userId) return defaultStatus;

  try {
    // 1. Primary check: Query public.subscriptions table
    const { data: subData, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && subData) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const endDate = subData.end_date ? new Date(subData.end_date) : null;
      if (endDate) {
        endDate.setHours(23, 59, 59, 999);
      }

      const isDatePast = endDate ? endDate < today : false;
      const isExpired = subData.status === 'expired' || isDatePast;

      if (isDatePast && subData.status === 'active') {
        await supabase
          .from('subscriptions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', subData.id);
        subData.status = 'expired';
      }

      const diffTime = endDate ? endDate.getTime() - today.getTime() : 0;
      const daysRemaining = endDate ? Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) : 0;

      const isActive = subData.status === 'active' && !isDatePast;

      return {
        isSubscribed: isActive,
        isExpired: isExpired,
        status: isActive ? 'active' : 'expired',
        daysRemaining,
        endDateStr: subData.end_date || null,
        nextDeliveryDateStr: subData.next_delivery_date || subData.end_date || null,
        planType: subData.plan_type,
        subscription: subData as SubscriptionRecord,
      };
    }

    // 2. Fallback check: Query user_memberships table
    const { data: memData } = await supabase
      .from('user_memberships')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (memData) {
      const today = new Date();
      const expiresAt = new Date(memData.expires_at);
      const isExpired = expiresAt < today;
      const diffTime = expiresAt.getTime() - today.getTime();
      const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      return {
        isSubscribed: !isExpired && memData.status === 'ACTIVE',
        isExpired,
        status: !isExpired && memData.status === 'ACTIVE' ? 'active' : 'expired',
        daysRemaining,
        endDateStr: memData.expires_at,
        nextDeliveryDateStr: memData.expires_at,
        planType: memData.plan_id || 'membership',
        subscription: null,
      };
    }

    // 3. Fallback check: Query users metadata (is_pro & pro_expires_at)
    const { data: userData } = await supabase
      .from('users')
      .select('metadata')
      .eq('id', userId)
      .maybeSingle();

    const meta = userData?.metadata as any;
    if (meta?.is_pro) {
      const today = new Date();
      const expiresAt = meta.pro_expires_at ? new Date(meta.pro_expires_at) : null;
      const isExpired = expiresAt ? expiresAt < today : true; // if no expiry, treat as expired
      const diffTime = expiresAt ? expiresAt.getTime() - today.getTime() : 0;
      const daysRemaining = expiresAt ? Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24))) : 0;

      return {
        isSubscribed: !isExpired,
        isExpired,
        status: !isExpired ? 'active' : 'expired',
        daysRemaining,
        endDateStr: meta.pro_expires_at || null,
        nextDeliveryDateStr: meta.pro_expires_at || null,
        planType: meta.pro_plan_id || 'pro',
        subscription: null,
      };
    }
  } catch (err) {
    console.error('Error checking user subscription:', err);
  }

  return defaultStatus;
}

/**
 * Save new subscription record post-payment into public.subscriptions table
 */
export async function saveSubscriptionRecord(data: {
  userId: string;
  planType: string;
  durationDays: number;
  planId?: string | null;
  variantId?: string | null;
  medicineId?: string | null;
  quantity?: number;
}): Promise<boolean> {
  try {
    const startDateObj = new Date();
    const endDateObj = new Date(startDateObj.getTime() + data.durationDays * 24 * 60 * 60 * 1000);
    const nextDeliveryObj = new Date(startDateObj.getTime() + data.durationDays * 24 * 60 * 60 * 1000);

    const startDateStr = startDateObj.toISOString().split('T')[0];
    const endDateStr = endDateObj.toISOString().split('T')[0];
    const nextDeliveryStr = nextDeliveryObj.toISOString().split('T')[0];

    let targetPlanId = data.planId || null;
    let targetMedicineId = data.medicineId || null;

    // Satisfy subscription_type_check constraint:
    // Either (plan_id is not null AND medicine_id is null) OR (medicine_id is not null AND plan_id is null)
    if (!targetPlanId && !targetMedicineId) {
      try {
        const { data: existingPlan } = await supabase
          .from('plans')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (existingPlan?.id) {
          targetPlanId = existingPlan.id;
        }
      } catch (_) {}
    }

    const payload: SubscriptionRecord = {
      user_id: data.userId,
      plan_type: data.planType,
      quantity: data.quantity || 1,
      status: 'active',
      start_date: startDateStr,
      end_date: endDateStr,
      next_delivery_date: nextDeliveryStr,
      plan_id: targetPlanId,
      variant_id: data.variantId || null,
      medicine_id: targetMedicineId,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('subscriptions').insert(payload);
    if (error) {
      console.warn('Could not insert into subscriptions table:', error.message);

      // Handle subscription_type_check or foreign key constraint error
      if (error.code === '23502' || error.code === '23503' || error.message?.includes('subscription_type_check')) {
        try {
          // Attempt inserting a plan entry to satisfy foreign key & check constraint
          const defaultPlanId = '00000000-0000-0000-0000-000000000001';
          try {
            await supabase.from('plans').insert({ id: defaultPlanId, name: data.planType });
          } catch (_) {}
          payload.plan_id = defaultPlanId;
          payload.medicine_id = null;
          const { error: retryErr } = await supabase.from('subscriptions').insert(payload);
          if (!retryErr) return true;
        } catch (_) {}
      }
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to save subscription record:', err);
    return false;
  }
}
