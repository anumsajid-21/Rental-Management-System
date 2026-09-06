import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { authenticateUser, registerUser, fetchCurrentUser } from '../lib/userStore';
import { ROLE_HOME } from '../lib/roles';

const SESSION_KEY = 'rms_session';

const AuthContext = createContext(null);

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  // Restore session synchronously so protected routes render correctly on
  // the first paint after a refresh; the token is re-validated with the
  // server immediately afterwards.
  const [session, setSession] = useState(readSession);
  const [user, setUser] = useState(session?.user || null);
  const [loading, setLoading] = useState(false);

  const persist = useCallback((next) => {
    setSession(next);
    setUser(next?.user || null);
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  }, []);

  // Re-validate the stored token against the server on mount/refresh.
  useEffect(() => {
    const token = session?.token;
    if (!token) return;
    let cancelled = false;
    fetchCurrentUser(token).then((fresh) => {
      if (cancelled) return;
      if (fresh) persist({ token, user: fresh });
      else persist(null); // token invalid/expired → force sign-in
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signUp = useCallback(async (payload) => {
    setLoading(true);
    try {
      const result = await registerUser(payload);
      if (result.ok) persist({ token: result.token, user: result.user });
      return result;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const signIn = useCallback(async (payload) => {
    setLoading(true);
    try {
      const result = await authenticateUser(payload);
      if (result.ok) persist({ token: result.token, user: result.user });
      return result;
    } finally {
      setLoading(false);
    }
  }, [persist]);

  const logout = useCallback(() => persist(null), [persist]);

<<<<<<< HEAD
  /** Refresh the cached user object (e.g. after a profile update). */
  const updateUser = useCallback((nextUser) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = { ...prev, user: nextUser };
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      return next;
=======
  /** Merge fresh user data (e.g. after a profile update) into the session. */
  const updateUser = useCallback((nextUser) => {
    setSession((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, user: nextUser };
      localStorage.setItem(SESSION_KEY, JSON.stringify(merged));
      return merged;
>>>>>>> 89a2e32bf6f31a866729cdbd13dfda64daff2406
    });
    setUser(nextUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      token: session?.token || null,
      isAuthenticated: Boolean(user),
      signUp,
      signIn,
      logout,
      updateUser,
      homeForRole: (role) => ROLE_HOME[role] || '/',
    }),
    [user, session, loading, signUp, signIn, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
