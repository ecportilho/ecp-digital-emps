import { useState, useEffect } from 'react';
import {
  Building2,
  Edit3,
  Save,
  X,
  AlertTriangle,
  RefreshCw,
  MapPin,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useFetch } from '../hooks/useFetch';
import { useAuthPJ } from '../hooks/useAuthPJ';
import { apiPJ } from '../services/api-pj';
import { formatCnpj } from '../lib/formatters';

interface CompanyData {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  naturezaJuridica: string;
  status: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  email: string;
  telefone: string;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-border/40 rounded-control ${className}`} />;
}

export default function Empresa() {
  const { isAdmin } = useAuthPJ();
  const { data: company, loading, error, refetch } = useFetch<CompanyData>('/companies/me');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Edit form state
  const [form, setForm] = useState({
    nomeFantasia: '',
    email: '',
    telefone: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
  });

  useEffect(() => {
    if (company) {
      setForm({
        nomeFantasia: company.nomeFantasia || '',
        email: company.email || '',
        telefone: company.telefone || '',
        logradouro: company.endereco?.logradouro || '',
        numero: company.endereco?.numero || '',
        complemento: company.endereco?.complemento || '',
        bairro: company.endereco?.bairro || '',
        cidade: company.endereco?.cidade || '',
        estado: company.endereco?.estado || '',
        cep: company.endereco?.cep || '',
      });
    }
  }, [company]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      await apiPJ.patch('/companies/me', {
        nomeFantasia: form.nomeFantasia || null,
        email: form.email,
        telefone: form.telefone,
        endereco: {
          logradouro: form.logradouro,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          cep: form.cep,
        },
      });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      refetch();
    } catch (err: any) {
      setSaveError(err?.message || 'Erro ao salvar dados');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setSaveError('');
    if (company) {
      setForm({
        nomeFantasia: company.nomeFantasia || '',
        email: company.email || '',
        telefone: company.telefone || '',
        logradouro: company.endereco?.logradouro || '',
        numero: company.endereco?.numero || '',
        complemento: company.endereco?.complemento || '',
        bairro: company.endereco?.bairro || '',
        cidade: company.endereco?.cidade || '',
        estado: company.endereco?.estado || '',
        cep: company.endereco?.cep || '',
      });
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={48} className="text-danger" />
        <p className="text-text-secondary text-lg">Erro ao carregar dados da empresa</p>
        <Button variant="secondary" onClick={refetch} icon={<RefreshCw size={16} />}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!company) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dados da Empresa</h1>
          <p className="text-text-secondary text-sm mt-1">{company.razaoSocial}</p>
        </div>
        {isAdmin && !editing && (
          <Button variant="secondary" onClick={() => setEditing(true)} icon={<Edit3 size={16} />}>
            Editar
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={cancelEdit} icon={<X size={16} />}>
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving} icon={<Save size={16} />}>
              Salvar
            </Button>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 p-4 rounded-control bg-success/10 border border-success/20">
          <CheckCircle2 size={18} className="text-success" />
          <p className="text-sm text-success">Dados atualizados com sucesso!</p>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-control bg-danger/10 border border-danger/20">
          <p className="text-sm text-danger">{saveError}</p>
        </div>
      )}

      {/* Company Info */}
      <Card>
        <CardHeader title="Informacoes Gerais" />
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-tertiary mb-1">Razao Social</p>
              <p className="text-sm font-medium text-text-primary">{company.razaoSocial}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1">Nome Fantasia</p>
              {editing ? (
                <Input
                  value={form.nomeFantasia}
                  onChange={(e) => updateField('nomeFantasia', e.target.value)}
                  placeholder="Nome fantasia"
                />
              ) : (
                <p className="text-sm text-text-primary">{company.nomeFantasia || '-'}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-tertiary mb-1">CNPJ</p>
              <p className="text-sm font-mono text-text-primary">{formatCnpj(company.cnpj)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary mb-1">Natureza Juridica</p>
              <p className="text-sm text-text-primary">{company.naturezaJuridica}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-text-tertiary mb-1">Status</p>
              <Badge variant={company.status === 'active' ? 'success' : 'warning'}>
                {company.status === 'active' ? 'Ativa' : company.status}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Contact */}
      <Card>
        <CardHeader title="Contato" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-tertiary mb-1">E-mail</p>
            {editing ? (
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="empresa@email.com"
              />
            ) : (
              <p className="text-sm text-text-primary">{company.email || '-'}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-text-tertiary mb-1">Telefone</p>
            {editing ? (
              <Input
                value={form.telefone}
                onChange={(e) => updateField('telefone', e.target.value)}
                placeholder="(00) 0000-0000"
              />
            ) : (
              <p className="text-sm text-text-primary">{company.telefone || '-'}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader title="Endereco" />
        {editing ? (
          <div className="space-y-4">
            <Input
              label="CEP"
              value={form.cep}
              onChange={(e) => updateField('cep', e.target.value)}
              placeholder="00000-000"
            />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input
                  label="Logradouro"
                  value={form.logradouro}
                  onChange={(e) => updateField('logradouro', e.target.value)}
                  placeholder="Rua, Avenida..."
                />
              </div>
              <Input
                label="Numero"
                value={form.numero}
                onChange={(e) => updateField('numero', e.target.value)}
                placeholder="123"
              />
            </div>
            <Input
              label="Complemento"
              value={form.complemento}
              onChange={(e) => updateField('complemento', e.target.value)}
              placeholder="Sala 1, Andar 2..."
            />
            <Input
              label="Bairro"
              value={form.bairro}
              onChange={(e) => updateField('bairro', e.target.value)}
              placeholder="Bairro"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Cidade"
                value={form.cidade}
                onChange={(e) => updateField('cidade', e.target.value)}
                placeholder="Cidade"
              />
              <Input
                label="Estado"
                value={form.estado}
                onChange={(e) => updateField('estado', e.target.value)}
                placeholder="UF"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {company.endereco ? (
              <>
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-text-tertiary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-text-primary">
                      {company.endereco.logradouro}, {company.endereco.numero}
                      {company.endereco.complemento ? ` - ${company.endereco.complemento}` : ''}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {company.endereco.bairro} - {company.endereco.cidade}/{company.endereco.estado}
                    </p>
                    <p className="text-xs text-text-tertiary mt-0.5">CEP: {company.endereco.cep}</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-tertiary">Endereco nao cadastrado</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
