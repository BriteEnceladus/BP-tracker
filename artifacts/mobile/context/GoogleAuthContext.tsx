import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';

WebBrowser.maybeCompleteAuthSession();

const SESSION_KEY = 'bp_google_session_v1';

export type GoogleProfile = {
  sub: string;
  email?: string;
  name?: string;
};

type GoogleAuthContextType = {
  profile: GoogleProfile | null;
  isReady: boolean;
  isConfigured: boolean;
  isBusy: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

const GoogleAuthContext = createContext<GoogleAuthContextType | undefined>(undefined);

const disabledValue: GoogleAuthContextType = {
  profile: null,
  isReady: true,
  isConfigured: false,
  isBusy: false,
  signIn: async () => {
    Alert.alert(
      'Google sign-in is not configured',
      'Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, then rebuild the app. Health data is never sent to Google.'
    );
  },
  signOut: async () => {},
};

function readClientIds() {
  return {
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || '',
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || '',
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || '',
  };
}

async function persistProfile(profile: GoogleProfile | null) {
  if (Platform.OS === 'web') {
    if (profile) localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    else localStorage.removeItem(SESSION_KEY);
    return;
  }
  if (profile) {
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(profile));
  } else {
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

async function loadProfile(): Promise<GoogleProfile | null> {
  try {
    const raw =
      Platform.OS === 'web'
        ? localStorage.getItem(SESSION_KEY)
        : await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleProfile;
    if (!parsed?.sub) return null;
    return parsed;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = globalThis.atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Auth-request hooks only mount when client IDs exist — empty config must not crash launch. */
function GoogleAuthProviderConfigured({
  children,
  ids,
}: {
  children: ReactNode;
  ids: ReturnType<typeof readClientIds>;
}) {
  const [profile, setProfile] = useState<GoogleProfile | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'bptracker' });

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: ids.androidClientId || undefined,
    iosClientId: ids.iosClientId || undefined,
    webClientId: ids.webClientId || ids.androidClientId || undefined,
    redirectUri,
  });

  useEffect(() => {
    loadProfile()
      .then(setProfile)
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params.id_token;
    if (!idToken) {
      Alert.alert('Google sign-in', 'Google did not return an ID token.');
      return;
    }
    const payload = decodeJwtPayload(idToken);
    const sub = typeof payload?.sub === 'string' ? payload.sub : '';
    if (!sub) {
      Alert.alert('Google sign-in', 'Could not read the Google account.');
      return;
    }
    const next: GoogleProfile = {
      sub,
      email: typeof payload?.email === 'string' ? payload.email : undefined,
      name: typeof payload?.name === 'string' ? payload.name : undefined,
    };
    void (async () => {
      await persistProfile(next);
      setProfile(next);
    })();
  }, [response]);

  const signIn = useCallback(async () => {
    setIsBusy(true);
    try {
      await promptAsync();
    } catch {
      Alert.alert('Google sign-in failed', 'Could not open Google. Try again on a real APK, not Expo Go.');
    } finally {
      setIsBusy(false);
    }
  }, [promptAsync]);

  const signOut = useCallback(async () => {
    await persistProfile(null);
    setProfile(null);
  }, []);

  return (
    <GoogleAuthContext.Provider
      value={{
        profile,
        isReady,
        isConfigured: true,
        isBusy: isBusy || !request,
        signIn,
        signOut,
      }}
    >
      {children}
    </GoogleAuthContext.Provider>
  );
}

export function GoogleAuthProvider({ children }: { children: ReactNode }) {
  const ids = useMemo(readClientIds, []);
  const isConfigured = Boolean(ids.androidClientId || ids.webClientId || ids.iosClientId);

  if (!isConfigured) {
    return (
      <GoogleAuthContext.Provider value={disabledValue}>{children}</GoogleAuthContext.Provider>
    );
  }

  return (
    <GoogleAuthProviderConfigured ids={ids}>{children}</GoogleAuthProviderConfigured>
  );
}

export function useGoogleAuth() {
  const ctx = useContext(GoogleAuthContext);
  if (!ctx) throw new Error('useGoogleAuth must be used within GoogleAuthProvider');
  return ctx;
}
