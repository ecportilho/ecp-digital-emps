import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  subtitle: string;
  type: 'pf' | 'pj';
  active: boolean;
}

const profiles: Profile[] = [
  {
    id: 'pf-1',
    name: 'Marina Silva',
    subtitle: 'Conta pessoal',
    type: 'pf',
    active: false,
  },
  {
    id: 'pj-1',
    name: 'AB Design Studio',
    subtitle: 'MEI \u2022 12.345.678/0001-95',
    type: 'pj',
    active: true,
  },
];

export function ProfileSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const activeProfile = profiles.find((p) => p.active);

  if (!activeProfile) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-control hover:bg-surface transition-colors"
      >
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-text-primary">
            {activeProfile.name}
          </span>
          <span className="text-xs text-text-tertiary">
            {activeProfile.subtitle}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-surface border border-border rounded-card shadow-xl">
            <div className="p-2 space-y-1">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => {
                    // In a real app, this would trigger profile switching via API
                    setIsOpen(false);
                    if (profile.type === 'pf') {
                      const pfUrl = import.meta.env.VITE_PF_APP_URL || 'http://localhost:5173';
                      window.location.href = pfUrl;
                    }
                  }}
                  className={`flex items-center gap-3 w-full px-3 py-3 rounded-control text-left transition-colors ${
                    profile.active ? 'bg-lime-dim' : 'hover:bg-background'
                  }`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      profile.active ? 'bg-lime' : 'bg-text-tertiary'
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {profile.name}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                          profile.type === 'pj'
                            ? 'bg-lime-dim text-lime'
                            : 'bg-info/10 text-info'
                        }`}
                      >
                        {profile.type.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs text-text-tertiary">{profile.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
