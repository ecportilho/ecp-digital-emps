import { Bell, LogOut } from 'lucide-react';
import { ProfileSwitcher } from './ProfileSwitcher';
import { Badge } from '../ui/Badge';
import { useAuthPJ } from '../../hooks/useAuthPJ';

function computeInitials(name: string | undefined): string {
  if (!name) return 'PJ';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PJ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function HeaderPJ() {
  const { auth, logout } = useAuthPJ();
  const displayName = auth?.company?.nomeFantasia || auth?.company?.razaoSocial;
  const initials = computeInitials(displayName);

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-secondary-bg border-b border-border">
      {/* Left: Company info */}
      <div className="flex items-center gap-3">
        <ProfileSwitcher />
        <Badge variant="lime" size="sm">PJ</Badge>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-control text-text-secondary hover:text-text-primary hover:bg-surface transition-colors"
          aria-label="Notificacoes"
        >
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-2 rounded-control text-text-secondary hover:text-danger hover:bg-surface transition-colors"
          aria-label="Sair"
          title="Sair"
        >
          <LogOut size={20} />
        </button>

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-lime-dim flex items-center justify-center" title={displayName || 'Conta PJ'}>
          <span className="text-sm font-semibold text-lime">{initials}</span>
        </div>
      </div>
    </header>
  );
}
