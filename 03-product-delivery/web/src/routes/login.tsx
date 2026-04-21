import { useState } from 'react';
import { useAuthPJ } from '../hooks/useAuthPJ';

const DEMO_ACCOUNTS = [
  { email: 'marina@email.com', company: 'AB Design Studio', role: 'MEI — Design' },
  { email: 'carlos.mendes@email.com', company: 'Pasta & Fogo', role: 'MEI — Restaurante' },
  { email: 'aisha.santos@email.com', company: 'Sushi Wave', role: 'MEI — Restaurante' },
  { email: 'roberto.tanaka@email.com', company: 'Burger Lab', role: 'EI — Restaurante' },
  { email: 'francisca.lima@email.com', company: 'Green Bowl Co.', role: 'MEI — Restaurante' },
  { email: 'lucas.ndongo@email.com', company: 'Pizza Club 24h', role: 'LTDA — Restaurante' },
  { email: 'patricia.werneck@email.com', company: 'Brasa & Lenha', role: 'MEI — Restaurante' },
];

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemoAccounts, setShowDemoAccounts] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await onLogin(email, password);
    if (!ok) setError('Email ou senha inválidos');
    setLoading(false);
  }

  function handleQuickLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword('Senha@123');
    setError('');
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0f14',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
      padding: '20px',
    }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#b7ff2a', marginBottom: 4 }}>
            ⬡ ECP Emps
          </div>
          <div style={{ fontSize: 14, color: '#a9b7cc' }}>
            Banco Digital PJ — MEI & Microempresas
          </div>
        </div>

        {/* Login Form */}
        <div style={{
          background: '#131c28',
          border: '1px solid #27364a',
          borderRadius: 18,
          padding: 32,
          marginBottom: 24,
        }}>
          <h2 style={{ color: '#eaf2ff', fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
            Entrar na conta PJ
          </h2>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#7b8aa3', marginBottom: 6 }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#0b0f14',
                  border: '1px solid #27364a',
                  borderRadius: 13,
                  color: '#eaf2ff',
                  fontSize: 14,
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#7b8aa3', marginBottom: 6 }}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: '#0b0f14',
                  border: '1px solid #27364a',
                  borderRadius: 13,
                  color: '#eaf2ff',
                  fontSize: 14,
                  fontFamily: "'Inter', sans-serif",
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,77,77,0.1)',
                border: '1px solid rgba(255,77,77,0.3)',
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 16,
                color: '#ff4d4d',
                fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: loading ? '#7b8aa3' : '#b7ff2a',
                color: '#0b0f14',
                border: 'none',
                borderRadius: 13,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Discreet toggle — revela o acesso rapido apenas sob demanda */}
        {!showDemoAccounts && (
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={() => setShowDemoAccounts(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#7b8aa3',
                fontSize: 11,
                fontFamily: "'Inter', sans-serif",
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
                textUnderlineOffset: 3,
                cursor: 'pointer',
                padding: '4px 8px',
                opacity: 0.6,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.6'; }}
              aria-label="Mostrar contas de demo"
              title="Acesso rapido para demo"
            >
              ·
            </button>
          </div>
        )}

        {/* Quick Login Buttons — aparece apenas apos clicar no toggle */}
        {showDemoAccounts && (
          <div style={{
            background: '#131c28',
            border: '1px solid #27364a',
            borderRadius: 18,
            padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: '#7b8aa3', textTransform: 'uppercase', letterSpacing: 1 }}>
                Acesso rápido (demo) — Senha: Senha@123
              </div>
              <button
                onClick={() => setShowDemoAccounts(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#7b8aa3',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                }}
                aria-label="Fechar acesso rapido"
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {DEMO_ACCOUNTS.map(account => (
                <button
                  key={account.email}
                  onClick={() => handleQuickLogin(account.email)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    background: email === account.email ? 'rgba(183,255,42,0.12)' : '#0b0f14',
                    border: `1px solid ${email === account.email ? '#b7ff2a' : '#27364a'}`,
                    borderRadius: 10,
                    color: '#eaf2ff',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 13,
                    textAlign: 'left',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{account.company}</div>
                    <div style={{ fontSize: 11, color: '#7b8aa3' }}>{account.email}</div>
                  </div>
                  <div style={{
                    fontSize: 10,
                    color: '#a9b7cc',
                    background: '#0f1620',
                    padding: '3px 8px',
                    borderRadius: 20,
                  }}>
                    {account.role}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: '#7b8aa3' }}>
          Ecossistema ECP — ecp-digital-bank (PF) + ecp-digital-emps (PJ) + ecp-digital-food
        </div>
      </div>
    </div>
  );
}
