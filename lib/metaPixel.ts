import { Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

// ── Environment Variables ───────────────────────────────────────────────────
export const META_PIXEL_ID: string =
  process.env.EXPO_PUBLIC_META_PIXEL_ID ||
  process.env.META_PIXEL_ID ||
  '';

// Removed for security: Conversions API token must never be in frontend code.
// Client events are handled securely via react-native-fbsdk-next.
export const META_ACCESS_TOKEN: string = '';

export const META_APP_ID: string =
  process.env.EXPO_PUBLIC_META_APP_ID ||
  process.env.META_APP_ID ||
  process.env.EXPO_PUBLIC_FACEBOOK_APP_ID ||
  '';

export const META_TEST_EVENT_CODE: string =
  process.env.EXPO_PUBLIC_META_TEST_EVENT_CODE ||
  process.env.META_TEST_EVENT_CODE ||
  '';

// ── Types ───────────────────────────────────────────────────────────────────
export interface MetaUserData {
  id?: string;
  email?: string;
  phone?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
}

export interface MetaCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_category?: string;
  content_type?: string;
  content_ids?: string[];
  order_id?: string;
  transaction_id?: string;
  num_items?: number;
  status?: boolean | string;
  [key: string]: any;
}

// In-memory cache for user identity
let currentUserData: MetaUserData = {};

// Helper: Normalize & SHA-256 Hash for Meta Advanced Matching
export async function hashForMeta(value: string | undefined): Promise<string | undefined> {
  if (!value || typeof value !== 'string') return undefined;
  const clean = value.trim().toLowerCase();
  if (!clean) return undefined;
  try {
    return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, clean);
  } catch {
    return undefined;
  }
}

// Helper: Normalize phone to E.164-like digits only before hashing
export async function hashPhoneForMeta(phone: string | undefined): Promise<string | undefined> {
  if (!phone || typeof phone !== 'string') return undefined;
  // Strip non-digits
  let digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  // If Indian mobile number without country code (10 digits), prepend 91
  if (digits.length === 10) {
    digits = '91' + digits;
  }
  return await hashForMeta(digits);
}

/**
 * Store user identity for Meta Advanced Matching.
 * Automatically hashes and attaches to all future events.
 */
export async function setMetaUser(user: MetaUserData): Promise<void> {
  currentUserData = { ...currentUserData, ...user };
  try {
    await AsyncStorage.setItem(
      '@genestac_meta_user_data',
      JSON.stringify(currentUserData)
    );
  } catch {
    // Ignore storage errors
  }

  // Native Meta SDK user data is updated via ud parameters in Meta Pixel HTTP ping below.
}

/**
 * Retrieve cached user identity
 */
export async function getMetaUser(): Promise<MetaUserData> {
  if (currentUserData.id || currentUserData.email) {
    return currentUserData;
  }
  try {
    const raw = await AsyncStorage.getItem('@genestac_meta_user_data');
    if (raw) {
      currentUserData = JSON.parse(raw);
    }
  } catch {
    // Ignore storage errors
  }
  return currentUserData;
}

/**
 * Clear user data on logout
 */
export async function clearMetaUser(): Promise<void> {
  currentUserData = {};
  try {
    await AsyncStorage.removeItem('@genestac_meta_user_data');
  } catch {
    // Ignore storage errors
  }

  // User data cleared from cache and storage.
}

/**
 * Initialize Meta Tracking (Native SDK + Web Script injection)
 */
export async function initMetaTracking(): Promise<void> {
  // 1. Native Meta SDK (disabled until native manifest is configured & built)
  // Calling react-native-fbsdk-next before native AndroidManifest has com.facebook.sdk.ApplicationId
  // causes a fatal JNI SIGABRT in New Architecture Bridgeless mode.
  // All events are tracked via Meta Pixel HTTP endpoint below.

  // Restore user from storage if available
  await getMetaUser();

  // 2. If running on Web platform, dynamically inject official Meta Pixel SDK script
  const pixelId = META_PIXEL_ID;
  if (Platform.OS === 'web' && typeof window !== 'undefined' && pixelId) {
    try {
      const win = window as any;
      if (!win.fbq) {
        /* eslint-disable */
        (function (f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(
          window,
          document,
          'script',
          'https://connect.facebook.net/en_US/fbevents.js'
        );
        /* eslint-enable */
      }
      if (win.fbq) {
        win.fbq('init', pixelId);
        win.fbq('track', 'PageView');
      }
    } catch (e) {
      console.error('[MetaPixel] Error injecting web pixel script:', e);
    }
  }
}

/**
 * Dispatches an event to Meta:
 * 1. Web window.fbq (if running on Web)
 * 2. Official Native Meta SDK (react-native-fbsdk-next) on Android & iOS
 * 3. Meta Pixel HTTP Endpoint ping (fallback)
 */
export async function trackMetaEvent(
  eventName: string,
  customData: MetaCustomData = {},
  userOverride?: MetaUserData
): Promise<void> {
  try {
    const user = { ...currentUserData, ...(userOverride || {}) };


    // ── 1. Web Pixel SDK (if on web) ─────────────────────────────────────────
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const win = window as any;
      if (win.fbq) {
        win.fbq('track', eventName, customData);
      }
    }

    // ── 2. Meta Pixel HTTP Endpoint ──────────────────────────────────────────
    // Tracks events securely via the official Meta Pixel endpoint with SHA-256
    // hashed Advanced Matching parameters (email, phone, user id, name).
    // Native react-native-fbsdk-next is omitted here to prevent unhandled JNI SIGABRT crashes.

    // ── 3. Meta Pixel HTTP Ping (Optional lightweight fallback) ───────────────
    const pixelId = META_PIXEL_ID;
    if (pixelId) {
      const hashedEmail = await hashForMeta(user.email);
      const hashedPhone = await hashPhoneForMeta(user.phone);
      const hashedExternalId = await hashForMeta(user.id);

      let hashedFirstName: string | undefined;
      let hashedLastName: string | undefined;
      if (user.name) {
        const parts = user.name.trim().split(/\s+/);
        hashedFirstName = await hashForMeta(parts[0]);
        if (parts.length > 1) {
          hashedLastName = await hashForMeta(parts.slice(1).join(' '));
        }
      }

      const { width, height } = Dimensions.get('window');
      const trParams = new URLSearchParams({
        id: pixelId,
        ev: eventName,
        dl: `genestac://app/${eventName.toLowerCase().replace(/\s+/g, '_')}`,
        rl: '',
        if: 'false',
        ts: Date.now().toString(),
        sw: Math.round(width).toString(),
        sh: Math.round(height).toString(),
        v: '2.9.150',
        r: Math.random().toString(),
        noscript: '1',
      });

      if (META_TEST_EVENT_CODE) {
        trParams.append('test_event_code', META_TEST_EVENT_CODE);
      }

      for (const [k, v] of Object.entries(customData)) {
        if (v !== undefined && v !== null) {
          trParams.append(`cd[${k}]`, typeof v === 'object' ? JSON.stringify(v) : String(v));
        }
      }

      if (hashedEmail) trParams.append('ud[em]', hashedEmail);
      if (hashedPhone) trParams.append('ud[ph]', hashedPhone);
      if (hashedExternalId) trParams.append('ud[external_id]', hashedExternalId);
      if (hashedFirstName) trParams.append('ud[fn]', hashedFirstName);
      if (hashedLastName) trParams.append('ud[ln]', hashedLastName);

      fetch(`https://www.facebook.com/tr/?${trParams.toString()}`, {
        method: 'GET',
        headers: {
          'User-Agent': `GenestacMobile/1.0 (${Platform.OS})`,
        },
      }).catch(() => {});
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[MetaPixel] Error tracking event:', eventName, err);
    }
  }
}

/**
 * Track custom event (name can be any string)
 */
export async function trackCustomEvent(
  eventName: string,
  params: MetaCustomData = {}
): Promise<void> {
  return trackMetaEvent(eventName, params);
}

// ────────────────────────────────────────────────────────────────────────────
// Dedicated Funnel Event Helpers Requested by User:
// 1. App Install
// 2. Complete Registration
// 3. View Doctor Consultation
// 4. Initiate Checkout
// 5. Purchase ₹1 (and other purchases)
// 6. Book Consultation
// ────────────────────────────────────────────────────────────────────────────

/**
 * 1. App Install
 * Ensures event is sent strictly once per app installation using AsyncStorage.
 */
export async function trackAppInstall(): Promise<void> {
  try {
    const installed = await AsyncStorage.getItem('@genestac_meta_app_installed');
    if (installed === 'true') {
      return;
    }

    // Mark as installed immediately to avoid race conditions
    await AsyncStorage.setItem('@genestac_meta_app_installed', 'true');

    // Send AppInstall event
    await trackMetaEvent('AppInstall', {
      content_name: 'App Installation',
      platform: Platform.OS,
      timestamp: new Date().toISOString(),
    });

    // Also trigger mobile activate event for Meta App Promotion Ads
    await trackMetaEvent('MobileAppInstall', {
      platform: Platform.OS,
    });
  } catch (e) {
    if (__DEV__) console.warn('[MetaPixel] AppInstall tracking error:', e);
  }
}

/**
 * 2. Complete Registration
 * Standard Meta event: 'CompleteRegistration'
 */
export async function trackCompleteRegistration(params?: {
  userId?: string;
  email?: string;
  phone?: string;
  name?: string;
  method?: string;
}): Promise<void> {
  if (params) {
    await setMetaUser({
      id: params.userId,
      email: params.email,
      phone: params.phone,
      name: params.name,
    });
  }

  // Standard Meta event: CompleteRegistration
  await trackMetaEvent('CompleteRegistration', {
    content_name: 'Patient Registration',
    status: true,
    registration_method: params?.method || 'email_otp',
  });
}

/**
 * 3. View Doctor Consultation
 * Standard Meta event: 'ViewContent' + Custom event: 'View Doctor Consultation'
 */
export async function trackViewDoctorConsultation(params?: {
  doctorId?: string;
  doctorName?: string;
  specialty?: string;
}): Promise<void> {
  const customData: MetaCustomData = {
    content_name: 'Doctor Consultation',
    content_category: params?.specialty || 'Medical Consultation',
    content_type: 'service',
    doctor_id: params?.doctorId,
    doctor_name: params?.doctorName,
  };

  // Standard Meta Event
  await trackMetaEvent('ViewContent', customData);
  // Custom Meta Event for specific ad campaign funnels
  await trackMetaEvent('View Doctor Consultation', customData);
}

/**
 * 4. Initiate Checkout
 * Standard Meta event: 'InitiateCheckout'
 */
export async function trackInitiateCheckout(params: {
  planTitle: string;
  amount: number;
  currency?: string;
  orderId?: string;
}): Promise<void> {
  const customData: MetaCustomData = {
    content_name: params.planTitle,
    content_category: 'Health Plan Membership',
    value: params.amount,
    currency: params.currency || 'INR',
    order_id: params.orderId,
    num_items: 1,
  };

  await trackMetaEvent('InitiateCheckout', customData);
}

/**
 * 5. Purchase ₹1 (and general purchases)
 * Standard Meta event: 'Purchase'
 * If amount is 1, also sends custom event 'Purchase ₹1'
 */
export async function trackPurchase(params: {
  planTitle: string;
  amount: number;
  currency?: string;
  transactionId: string;
  orderId?: string;
}): Promise<void> {
  const customData: MetaCustomData = {
    content_name: params.planTitle,
    content_category: 'Health Plan Membership',
    value: params.amount,
    currency: params.currency || 'INR',
    num_items: 1,
    transaction_id: params.transactionId,
    order_id: params.orderId || params.transactionId,
  };

  // Standard Meta Event: Purchase
  await trackMetaEvent('Purchase', customData);

  // If amount is 1 or specifically a ₹1 conversion payment:
  if (Math.round(params.amount) === 1) {
    await trackMetaEvent('Purchase ₹1', customData);
  }
}

/**
 * 6. Book Consultation
 * Standard Meta event: 'Schedule' + Custom event: 'Book Consultation'
 */
export async function trackBookConsultation(params: {
  doctorId?: string;
  doctorName: string;
  fee?: string | number;
  specialty?: string;
  appointmentDate?: string;
}): Promise<void> {
  // Parse numeric fee if available
  let numericValue: number | undefined;
  if (typeof params.fee === 'number') {
    numericValue = params.fee;
  } else if (typeof params.fee === 'string') {
    const parsed = parseFloat(params.fee.replace(/[^\d.]/g, ''));
    if (!isNaN(parsed)) numericValue = parsed;
  }

  const customData: MetaCustomData = {
    content_name: `Consultation with ${params.doctorName}`,
    content_category: params.specialty || 'Doctor Consultation',
    doctor_id: params.doctorId,
    doctor_name: params.doctorName,
    fee: params.fee,
    ...(numericValue !== undefined ? { value: numericValue, currency: 'INR' } : {}),
    appointment_date: params.appointmentDate,
  };

  // Standard Meta Event for appointments / consultations
  await trackMetaEvent('Schedule', customData);
  // Also track Lead standard event
  await trackMetaEvent('Lead', customData);
  // Custom Meta Event for direct ad funnel optimization
  await trackMetaEvent('Book Consultation', customData);
}
