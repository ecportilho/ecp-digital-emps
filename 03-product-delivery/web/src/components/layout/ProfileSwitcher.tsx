import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuthPJ } from '../../hooks/useAuthPJ';

interface Profile {
  id: string;
  name: string;
  subtitle: string;
  type: 'pf' | 'pj';
  active: boolean;
}

export function ProfileSwitcher() {
  const { auth } = useAuthPJ();
  const [isOpen, setIsOpen] = useState(false);

  const companyName = auth?.company?.nomeFantasia || auth?.company?.razaoSocial || 'Empresa';
  const companyCnpj = auth?.company?.cnpj || '';
  const formattedCnpj = companyCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');

  const profiles: Profile[] = [
    {
      id: 'pf-1',
      name: 'Conta Pessoal',
      subtitle: 'Pessoa física',
      type: 'pf',
      active: false,
    },
    {
      id: 'pj-1',
      name: companyName,
      subtitle: formattedCnpj ? `PJ • ${formattedCnpj}` : 'Conta empresarial',
      type: 'pj',
      active: true,
    },
  ];

  const activeProfile = profiles.find((p) => p.active)!;

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
                    setIsOpen(false);
                    if (profile.type === 'pf') {
                      const pfUrl = import.meta.env.VITE_PF_APP_URL || 'https://bank.ecportilho.com';
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
