import { SidebarPJ } from './components/layout/SidebarPJ';
import { HeaderPJ } from './components/layout/HeaderPJ';
import { AppRoutes } from './routes';
import { useAuthPJ } from './hooks/useAuthPJ';
import LoginPage from './routes/login';

export function App() {
  const { auth, loading, login, logout, isAuthenticated } = useAuthPJ();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-2xl font-bold text-lime mb-2">⬡ ECP Emps</div>
          <div className="text-sm text-text-secondary">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarPJ />
      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderPJ />
        <main className="flex-1 overflow-y-auto p-6">
          <AppRoutes />
        </main>
      </div>
    </div>
  );
}
