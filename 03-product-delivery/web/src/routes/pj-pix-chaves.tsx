import { useState, useCallback } from 'react';
import {
  Key,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Building2,
  Mail,
  Phone,
  Hash,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useFetch } from '../hooks/useFetch';
import { apiPJ } from '../services/api-pj';

interface PixKey {
  id: string;
  type: 'cnpj' | 'email' | 'phone' | 'random';
  value: string;
  createdAt: string;
}

const keyTypeConfig: Record<string, { label: string; icon: typeof Key; variant: 'lime' | 'info' | 'warning' | 'neutral' }> = {
  cnpj: { label: 'CNPJ', icon: Building2, variant: 'lime' },
  email: { label: 'Email', icon: Mail, variant: 'info' },
  phone: { label: 'Telefone', icon: Phone, variant: 'warning' },
  random: { label: 'Aleatoria', icon: Hash, variant: 'neutral' },
};

const MAX_KEYS = 20;

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-border/40 rounded-control ${className}`} />;
}

export default function PJPixChaves() {
  const { data: keys, loading, error, refetch } = useFetch<PixKey[]>('/pj/pix/keys');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PixKey | null>(null);
  const [newKeyType, setNewKeyType] = useState<string>('email');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleAddKey = async () => {
    setSaving(true);
    setActionError('');
    try {
      await apiPJ.post('/pj/pix/keys', { type: newKeyType, value: newKeyValue });
      setShowAddModal(false);
      setNewKeyValue('');
      setNewKeyType('email');
      refetch();
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao cadastrar chave');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      await apiPJ.delete(`/pj/pix/keys/${deleteTarget.id}`);
      setShowDeleteModal(false);
      setDeleteTarget(null);
      refetch();
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao excluir chave');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteModal = (key: PixKey) => {
    setDeleteTarget(key);
    setShowDeleteModal(true);
    setActionError('');
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={48} className="text-danger" />
        <p className="text-text-secondary text-lg">Erro ao carregar chaves Pix</p>
        <Button variant="secondary" onClick={refetch} icon={<RefreshCw size={16} />}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const keyCount = keys?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Chaves Pix</h1>
          <p className="text-text-secondary text-sm mt-1">
            {keyCount}/{MAX_KEYS} chaves cadastradas
          </p>
        </div>
        <Button
          onClick={() => { setShowAddModal(true); setActionError(''); }}
          disabled={keyCount >= MAX_KEYS}
          icon={<Plus size={16} />}
        >
          Nova Chave
        </Button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full bg-border">
        <div
          className="h-2 rounded-full bg-lime transition-all"
          style={{ width: `${(keyCount / MAX_KEYS) * 100}%` }}
        />
      </div>

      {/* Keys List */}
      <Card padding={false}>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !keys || keys.length === 0 ? (
          <div className="py-16 text-center">
            <Key size={48} className="mx-auto text-text-tertiary mb-3" />
            <p className="text-text-secondary text-lg">Nenhuma chave cadastrada</p>
            <p className="text-text-tertiary text-sm mt-1">
              Adicione chaves para receber transferencias via Pix
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {keys.map((key) => {
              const config = keyTypeConfig[key.type] || keyTypeConfig.random;
              const IconComp = config.icon;
              return (
                <div
                  key={key.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-background/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-control bg-lime-dim flex items-center justify-center">
                      <IconComp size={18} className="text-lime" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">{key.value}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={config.variant} size="sm">{config.label}</Badge>
                        <span className="text-xs text-text-tertiary">
                          Cadastrada em {new Date(key.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteModal(key)}
                    icon={<Trash2 size={16} />}
                    className="text-danger hover:text-danger"
                  >
                    Excluir
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Add Key Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Nova Chave Pix"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddKey}
              loading={saving}
              disabled={newKeyType !== 'random' && !newKeyValue.trim()}
            >
              Cadastrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Tipo de chave</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(keyTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => { setNewKeyType(type); setNewKeyValue(''); }}
                    className={`flex items-center gap-2 p-3 rounded-control border text-sm font-medium transition-colors ${
                      newKeyType === type
                        ? 'border-lime/50 bg-lime-dim text-lime'
                        : 'border-border bg-background text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon size={16} />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {newKeyType !== 'random' && (
            <Input
              label={
                newKeyType === 'cnpj' ? 'CNPJ' :
                newKeyType === 'email' ? 'E-mail' :
                'Telefone'
              }
              placeholder={
                newKeyType === 'cnpj' ? '00.000.000/0000-00' :
                newKeyType === 'email' ? 'empresa@email.com' :
                '+55 11 99999-9999'
              }
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
            />
          )}

          {newKeyType === 'random' && (
            <p className="text-sm text-text-tertiary p-4 rounded-control bg-background">
              Uma chave aleatoria sera gerada automaticamente pelo sistema.
            </p>
          )}

          {actionError && (
            <div className="p-3 rounded-control bg-danger/10 border border-danger/20">
              <p className="text-sm text-danger">{actionError}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Excluir Chave Pix"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteKey} loading={deleting}>
              Excluir
            </Button>
          </>
        }
      >
        <div>
          <p className="text-text-secondary">
            Tem certeza que deseja excluir esta chave Pix?
          </p>
          {deleteTarget && (
            <div className="mt-3 p-3 rounded-control bg-background">
              <p className="text-sm font-medium text-text-primary">{deleteTarget.value}</p>
              <p className="text-xs text-text-tertiary mt-0.5">
                {keyTypeConfig[deleteTarget.type]?.label || deleteTarget.type}
              </p>
            </div>
          )}
          {actionError && (
            <div className="mt-3 p-3 rounded-control bg-danger/10 border border-danger/20">
              <p className="text-sm text-danger">{actionError}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
