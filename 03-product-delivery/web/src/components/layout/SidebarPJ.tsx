import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScrollText,
  Zap,
  FileText,
  CreditCard,
  Users,
  Building2,
  UserCircle,
} from 'lucide-react';
import { useAuthPJ } from '../../hooks/useAuthPJ';

const navItems = [
  { to: '/pj/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/pj/extrato', label: 'Extrato', icon: ScrollText },
  { to: '/pj/pix/enviar', label: 'Pix', icon: Zap },
  { to: '/pj/cobrancas', label: 'Cobrancas', icon: FileText },
  { to: '/pj/cartoes', label: 'Cartoes', icon: CreditCard },
  { to: '/pj/time', label: 'Time', icon: Users },
  { to: '/pj/empresa', label: 'Empresa', icon: Building2 },
  { to: '/pj/perfil', label: 'Perfil', icon: UserCircle },
];

export function SidebarPJ() {
  const { auth } = useAuthPJ();
  const companyName = auth?.company?.nomeFantasia || auth?.company?.razaoSocial || 'Empresa';
  const companyCnpj = (auth?.company?.cnpj || '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  const companyType = auth?.company?.naturezaJuridica?.toUpperCase() || 'PJ';

  return (
    <aside className="hidden lg:flex flex-col w-[280px] bg-secondary-bg border-r border-border">
      {/* Logo area */}
      <div className="px-6 py-5 border-b border-border">
        <h1 className="text-xl font-bold text-lime"><span className="text-2xl">&#x2B21;</span> ECP Emps</h1>
        <p className="text-sm text-text-secondary mt-1">{companyName}</p>
        <p className="text-xs text-text-tertiary">{companyType} &bull; {companyCnpj}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-control text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-lime-dim text-lime'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Profile switcher trigger */}
      <div className="px-3 py-4 border-t border-border">
        <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-control text-sm text-text-secondary hover:text-text-primary hover:bg-surface transition-colors">
          <div className="w-2 h-2 rounded-full bg-lime" />
          <span>Alternar para PF</span>
        </button>
      </div>
    </aside>
  );
}
