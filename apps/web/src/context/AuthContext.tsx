import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAuthToken } from '../lib/api';

interface Profile {
  id: string;
  _id: string;
  username: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  login: (token: string, profile: Profile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in by attempting to fetch the profile
    const loadUser = async () => {
      try {
        // If we don't have a token, the API call will 401, which will trigger the refresh interceptor.
        // If the refresh succeeds, the interceptor retries and we get the profile.
        // Wait, `/me` requires token. But we don't persist access token in localStorage for security (XSS).
        // Let's just try to call `/auth/refresh` directly on initial load to get a fresh token if a session exists.
        const res = await api.post('/auth/refresh');
        if (res.data.accessToken) {
          setAuthToken(res.data.accessToken);
          const meRes = await api.get('/auth/me');
          setUser(meRes.data.profile);
        }
      } catch (err) {
        // Not authenticated
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = (token: string, profile: Profile) => {
    setAuthToken(token);
    setUser(profile);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error(err);
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
