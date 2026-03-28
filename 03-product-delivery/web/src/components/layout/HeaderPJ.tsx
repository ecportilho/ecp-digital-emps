import { Bell } from 'lucide-react';
import { ProfileSwitcher } from './ProfileSwitcher';
import { Badge } from '../ui/Badge';

export function HeaderPJ() {
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

        {/* User avatar */}
        <div className="w-8 h-8 rounded-full bg-lime-dim flex items-center justify-center">
          <span className="text-sm font-semibold text-lime">MS</span>
        </div>
      </div>
    </header>
  );
}
