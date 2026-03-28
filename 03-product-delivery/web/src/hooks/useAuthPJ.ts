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

  useEffect(() => {
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
    switchProfile,
    isAdmin: auth?.role === 'admin',
    isFinancial: auth?.role === 'financial' || auth?.role === 'admin',
    isViewer: true,
  };
}
