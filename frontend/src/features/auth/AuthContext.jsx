import { createContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, loginUser, logoutUser, registerUser } from './authApi';
import { authStorage } from './authStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authStorage.getUser());
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const me = await fetchMe();
        setUser(me);
        authStorage.setUser(me);
      } catch {
        authStorage.clearAll();
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      authStorage.clearAll();
    };

    window.addEventListener('shareit:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('shareit:unauthorized', handleUnauthorized);
  }, []);

  const applyAuth = (payload) => {
    setUser(payload.user);
    authStorage.setUser(payload.user);
  };

  const login = async (credentials) => {
    const payload = await loginUser(credentials);
    applyAuth(payload);
    return payload.user;
  };

  const register = async (newUserPayload) => {
    const payload = await registerUser(newUserPayload);
    applyAuth(payload);
    return payload.user;
  };

  const logout = async () => {
    try {
      await logoutUser();
    } finally {
      authStorage.clearAll();
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isBootstrapping,
      login,
      register,
      logout,
    }),
    [user, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
