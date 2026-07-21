/**
 * src/hooks/useAuth.tsx
 * Context React global pour l'authentification.
 *
 * Expose :
 *  - user          : profil courant (null si non connecté)
 *  - isLoading     : true pendant la vérification initiale de session
 *  - login()       : credentials → tokenPair OU preAuthToken si 2FA requis
 *  - verify2fa()   : preAuthToken + code TOTP → tokenPair
 *  - logout()      : révoque le refresh token côté serveur + nettoie le stockage
 *  - isAuthenticated : dérivé de user != null
 */

import api, {
    authExpiredEmitter,
    extractErrorMessage,
    LoginResponse
} from '@/lib/api';
import {
    clearAll,
    getAccessToken,
    getSavedUser,
    saveTokens,
    saveUser
} from '@/lib/secureStorage';
import { useRouter, useSegments } from 'expo-router';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'Avocat' | 'Assistant' | 'Associe' | 'Administrateur';

export interface AuthUser {
  id: number;
  cabinetId: number;
  nom: string;
  email: string;
  role: UserRole;
  permissions: string[];
  authentif2faActif: boolean;
}

export interface LoginResult {
  /** Connexion directe réussie */
  success: true;
}

export interface TwoFactorRequired {
  /** Le serveur demande un code TOTP */
  requiresTwoFactor: true;
  preAuthToken: string;
}

export type LoginOutcome = LoginResult | TwoFactorRequired;

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, motDePasse: string) => Promise<LoginOutcome>;
  verify2fa: (preAuthToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ── Création du context ───────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();
  // Évite la double-navigation pendant le montage
  const hasNavigated = useRef(false);

  // ── Chargement initial de session ─────────────────────────────────────────

  useEffect(() => {
    async function initSession() {
      try {
        const token = await getAccessToken();
        if (!token) {
          setUser(null);
          return;
        }
        // Token présent → on recharge le profil depuis le cache d'abord
        const cached = await getSavedUser<AuthUser>();
        if (cached) setUser(cached);

        // Puis on valide avec le serveur (intercepteur gère le refresh si besoin)
        try {
          const { data } = await api.get<AuthUser>('/auth/me');
          setUser(data);
          await saveUser(data);
        } catch {
          // /auth/me a échoué (refresh également échoué) → déjà nettoyé par l'intercepteur
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    }
    initSession();
  }, []);

  // ── Écoute de l'événement "session expirée" (depuis api.ts) ───────────────

  useEffect(() => {
    const unsubscribe = authExpiredEmitter.on(() => {
      setUser(null);
      router.replace('/login');
    });
    return unsubscribe;
  }, [router]);

  // ── Redirection automatique selon l'état d'auth ───────────────────────────

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const onLogin = segments[0] === 'login' || segments[0] === undefined || segments[0] === 'index';

    if (!user && inAuthGroup) {
      hasNavigated.current = true;
      router.replace('/login');
    } else if (user && onLogin && !hasNavigated.current) {
      hasNavigated.current = true;
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments, router]);

  // ── login ─────────────────────────────────────────────────────────────────

  const login = useCallback(async (
    email: string,
    motDePasse: string,
  ): Promise<LoginOutcome> => {
    const { data } = await api.post<LoginResponse>('/auth/login', {
      email,
      motDePasse,
    });

    if ('requiresTwoFactor' in data && data.requiresTwoFactor) {
      return { requiresTwoFactor: true, preAuthToken: data.preAuthToken };
    }

    // Connexion directe (2FA désactivé)
    const tokens = data as TokenPair;
    await saveTokens(tokens.accessToken, tokens.refreshToken);

    const { data: profile } = await api.get<AuthUser>('/auth/me');
    setUser(profile);
    await saveUser(profile);
    hasNavigated.current = false; // laisse l'effet de redirection tourner

    return { success: true };
  }, []);

  // ── verify2fa ─────────────────────────────────────────────────────────────

  const verify2fa = useCallback(async (
    preAuthToken: string,
    code: string,
  ): Promise<void> => {
    const { data } = await api.post<TokenPair>('/auth/2fa/verify', {
      preAuthToken,
      code,
    });

    await saveTokens(data.accessToken, data.refreshToken);

    const { data: profile } = await api.get<AuthUser>('/auth/me');
    setUser(profile);
    await saveUser(profile);
    hasNavigated.current = false;
  }, []);

  // ── logout ────────────────────────────────────────────────────────────────

  const logout = useCallback(async (): Promise<void> => {
    try {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken }).catch(() => {
          // Pas bloquant : on nettoie localement même si le serveur ne répond pas
        });
      }
    } finally {
      await clearAll();
      setUser(null);
      hasNavigated.current = true;
      router.replace('/login');
    }
  }, [router]);

  // ── refreshUser ───────────────────────────────────────────────────────────

  const refreshUser = useCallback(async (): Promise<void> => {
    const { data } = await api.get<AuthUser>('/auth/me');
    setUser(data);
    await saveUser(data);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    verify2fa,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook consommateur ─────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un <AuthProvider>");
  }
  return ctx;
}

export { extractErrorMessage };

