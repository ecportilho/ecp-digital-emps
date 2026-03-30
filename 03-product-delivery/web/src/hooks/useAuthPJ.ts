import { useState, useEffect, useCallback } from 'react';
import { apiPJ } from '../services/api-pj';

interface Company {
  id: string;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  naturezaJuridica: string;
  status: string;
}

interface AuthPJState {
  userId: string;
  companyId: string;
  role: 'admin' | 'financial' | 'viewer';
  company: Company;
}

export function useAuthPJ() {
  const [auth, setAuth] = useState<AuthPJState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiPJ.get<AuthPJState>('/auth/pj/me');
      setAuth(data);
      setError(null);
    } catch (err) {
      setError('Falha ao carregar perfil PJ');
      setAuth(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const switchProfile = useCallback(async (companyId: string) => {
    try {
      const data = await apiPJ.post<{ token: string }>('/auth/pj/switch', { companyId });
      localStorage.setItem('pj_token', data.token);
      await fetchMe();
    } catch (err) {
      setError('Falha ao alternar perfil');
    }
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const data = await apiPJ.post<{
        token: string;
        user: { id: string; name: string; email: string };
        company: { id: string; razaoSocial: string; nomeFantasia: string | null; cnpj: string; role: string };
      }>('/auth/pj/dev-login', { email, password });
      localStorage.setItem('pj_token', data.token);
      await fetchMe();
      return true;
    } catch {
      setError('Email ou senha inválidos');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchMe]);

  const logout = useCallback(() => {
    localStorage.removeItem('pj_token');
    setAuth(null);
    setError(null);
  }, []);

  useEffect(() => {
    // If arriving from bank with ?switch=pj, clear stale token to force re-login
    const params = new URLSearchParams(window.location.search);
    if (params.get('switch') === 'pj') {
      localStorage.removeItem('pj_token');
      window.history.replaceState({}, '', window.location.pathname);
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('pj_token');
    if (token) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, [fetchMe]);

  return {
    auth,
    loading,
    error,
    login,
    logout,
    switchProfile,
    isAuthenticated: auth !== null,
    isAdmin: auth?.role === 'admin',
    isFinancial: auth?.role === 'financial' || auth?.role === 'admin',
    isViewer: true,
  };
}
