import { LogOut, Building2, Shield, User, Mail } from 'lucide-react';
import { useAuthPJ } from '../hooks/useAuthPJ';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  financial: 'Financeiro',
  viewer: 'Visualizador',
};

export default function PerfilPage() {
  const { auth, logout } = useAuthPJ();

  const handleLogout = () => {
    if (!window.confirm('Deseja sair da sua conta PJ?')) return;
    logout();
  };

  if (!auth) {
    return null;
  }

  const companyName = auth.company?.nomeFantasia || auth.company?.razaoSocial || 'Empresa';
  const companyCnpj = (auth.company?.cnpj || '').replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  const naturezaJuridica = auth.company?.naturezaJuridica?.toUpperCase() || '—';
  const role = roleLabel[auth.role] || auth.role;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Perfil</h1>
        <p className="text-sm text-text-secondary mt-1">Operador e sessao atual</p>
      </div>

      <Card>
        <CardHeader title="Operador" subtitle="Dados do usuario autenticado" />
        <div className="space-y-4 mt-4">
          <Field icon={<User size={16} />} label="ID do usuario" value={auth.userId} mono />
          <Field
            icon={<Mail size={16} />}
            label="Email"
            value="Mesmo email do login PF/PJ (dev-login)"
          />
          <Field
            icon={<Shield size={16} />}
            label="Papel nesta empresa"
            valueElement={
              <Badge variant={auth.role === 'admin' ? 'lime' : 'neutral'} size="sm">
                {role}
              </Badge>
            }
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Empresa ativa" subtitle="Conta PJ desta sessao" />
        <div className="space-y-4 mt-4">
          <Field icon={<Building2 size={16} />} label="Nome fantasia" value={companyName} />
          <Field label="Razao social" value={auth.company?.razaoSocial || '—'} />
          <Field label="CNPJ" value={companyCnpj} mono />
          <Field label="Natureza juridica" value={naturezaJuridica} />
          <Field label="ID da empresa" value={auth.companyId} mono />
        </div>
      </Card>

      <Card>
        <CardHeader title="Sessao" subtitle="Encerrar acesso a conta PJ" />
        <div className="mt-4 flex flex-col sm:flex-row gap-3 items-start">
          <p className="text-sm text-text-secondary flex-1">
            Ao sair, seu token local sera removido e voce sera redirecionado para a tela de
            login. Nenhum dado persistido e apagado.
          </p>
          <Button variant="danger" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut size={16} />
            Sair desta conta
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface FieldProps {
  icon?: React.ReactNode;
  label: string;
  value?: string;
  valueElement?: React.ReactNode;
  mono?: boolean;
}

function Field({ icon, label, value, valueElement, mono }: FieldProps) {
  return (
    <div className="flex items-start gap-3">
      {icon && <div className="mt-0.5 text-text-tertiary">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-text-tertiary">{label}</div>
        {valueElement ? (
          <div className="mt-0.5">{valueElement}</div>
        ) : (
          <div
            className={`text-sm text-text-primary mt-0.5 ${mono ? 'font-mono' : ''} break-all`}
          >
            {value}
          </div>
        )}
      </div>
    </div>
  );
}
