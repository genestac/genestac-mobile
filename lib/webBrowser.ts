import * as Linking from 'expo-linking';

let WebBrowser: typeof import('expo-web-browser') | null = null;
try {
  WebBrowser = require('expo-web-browser');
} catch (e) {
  console.warn('Failed to load expo-web-browser module:', e);
}

export function makeRedirectUri(options: { scheme?: string; path?: string } = {}) {
  try {
    const AuthSession = require('expo-auth-session');
    if (AuthSession?.makeRedirectUri) {
      return AuthSession.makeRedirectUri(options);
    }
  } catch (e) {
    // Ignore fallback errors
  }
  return Linking.createURL(options.path || '', { scheme: options.scheme });
}

export const safeWebBrowser = {
  maybeCompleteAuthSession: () => {
    try {
      return WebBrowser?.maybeCompleteAuthSession();
    } catch (e) {
      // Ignore
    }
  },
  warmUpAsync: async (browserPackage?: string) => {
    try {
      return await WebBrowser?.warmUpAsync(browserPackage);
    } catch (e) {
      // Ignore
    }
  },
  coolDownAsync: async (browserPackage?: string) => {
    try {
      return await WebBrowser?.coolDownAsync(browserPackage);
    } catch (e) {
      // Ignore
    }
  },
  openAuthSessionAsync: async (url: string, redirectUrl?: string) => {
    if (WebBrowser?.openAuthSessionAsync) {
      try {
        return await WebBrowser.openAuthSessionAsync(url, redirectUrl);
      } catch (e) {
        console.warn('WebBrowser.openAuthSessionAsync error:', e);
      }
    }
    // Fallback to React Native Linking if WebBrowser is unavailable
    await Linking.openURL(url);
    return { type: 'dismiss' as const };
  },
};
