import { useState } from 'react';
import {
  Users,
  Plus,
  MoreHorizontal,
  Mail,
  Shield,
  Trash2,
  AlertTriangle,
  RefreshCw,
  UserCircle,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { RoleBadge, Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useFetch } from '../hooks/useFetch';
import { apiPJ } from '../services/api-pj';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'financial' | 'viewer';
  status: 'active' | 'pending';
  avatarInitials: string;
}

const roleOptions = [
  { value: 'admin', label: 'Admin', description: 'Acesso total a todas as funcionalidades' },
  { value: 'financial', label: 'Financeiro', description: 'Gerencia financeira e cobrancas' },
  { value: 'viewer', label: 'Visualizador', description: 'Apenas visualizacao de dados' },
];

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-border/40 rounded-control ${className}`} />;
}

export default function Team() {
  const { data: members, loading, error, refetch } = useFetch<TeamMember[]>('/pj/team');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('financial');
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const handleInvite = async () => {
    setSaving(true);
    setActionError('');
    try {
      await apiPJ.post('/pj/team', { email: inviteEmail, role: inviteRole });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('financial');
      refetch();
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao convidar membro');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeRole = async () => {
    if (!selectedMember) return;
    setSaving(true);
    setActionError('');
    try {
      await apiPJ.patch(`/pj/team/${selectedMember.id}`, { role: newRole });
      setShowRoleModal(false);
      setSelectedMember(null);
      refetch();
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao alterar permissao');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    setSaving(true);
    setActionError('');
    try {
      await apiPJ.delete(`/pj/team/${selectedMember.id}`);
      setShowDeleteModal(false);
      setSelectedMember(null);
      refetch();
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao remover membro');
    } finally {
      setSaving(false);
    }
  };

  const openRoleModal = (member: TeamMember) => {
    setSelectedMember(member);
    setNewRole(member.role);
    setActionError('');
    setShowRoleModal(true);
    setActionMenu(null);
  };

  const openDeleteModal = (member: TeamMember) => {
    setSelectedMember(member);
    setActionError('');
    setShowDeleteModal(true);
    setActionMenu(null);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={48} className="text-danger" />
        <p className="text-text-secondary text-lg">Erro ao carregar time</p>
        <Button variant="secondary" onClick={refetch} icon={<RefreshCw size={16} />}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Gestao do Time</h1>
          <p className="text-text-secondary text-sm mt-1">
            {members?.length ?? 0} membros na empresa
          </p>
        </div>
        <Button onClick={() => { setShowInviteModal(true); setActionError(''); }} icon={<Plus size={16} />}>
          Convidar
        </Button>
      </div>

      {/* Members List */}
      <Card padding={false}>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : !members || members.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={48} className="mx-auto text-text-tertiary mb-3" />
            <p className="text-text-secondary text-lg">Nenhum membro no time</p>
            <p className="text-text-tertiary text-sm mt-1">Convide pessoas para colaborar</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-lime-dim flex items-center justify-center">
                    <span className="text-sm font-semibold text-lime">{member.avatarInitials}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{member.name}</p>
                      {member.status === 'pending' && (
                        <Badge variant="warning" size="sm">Pendente</Badge>
                      )}
                    </div>
                    <p className="text-xs text-text-tertiary mt-0.5">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <RoleBadge role={member.role} />
                  <div className="relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === member.id ? null : member.id)}
                      className="p-1.5 rounded-control text-text-tertiary hover:text-text-primary hover:bg-surface transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {actionMenu === member.id && (
                      <div className="absolute right-0 top-full mt-1 w-48 bg-surface border border-border rounded-control shadow-lg z-10 py-1">
                        <button
                          onClick={() => openRoleModal(member)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
                        >
                          <Shield size={14} /> Alterar permissao
                        </button>
                        <button
                          onClick={() => openDeleteModal(member)}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invite Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Convidar Membro"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowInviteModal(false)}>Cancelar</Button>
            <Button onClick={handleInvite} loading={saving} disabled={!inviteEmail.trim()}>
              Enviar Convite
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="E-mail"
            type="email"
            placeholder="pessoa@empresa.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            iconLeft={<Mail size={16} />}
          />
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Permissao</label>
            <div className="space-y-2">
              {roleOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInviteRole(opt.value)}
                  className={`w-full text-left p-3 rounded-control border transition-colors ${
                    inviteRole === opt.value
                      ? 'border-lime/50 bg-lime-dim'
                      : 'border-border bg-background hover:border-border/80'
                  }`}
                >
                  <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{opt.description}</p>
                </button>
              ))}
            </div>
          </div>
          {actionError && (
            <div className="p-3 rounded-control bg-danger/10 border border-danger/20">
              <p className="text-sm text-danger">{actionError}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        title="Alterar Permissao"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowRoleModal(false)}>Cancelar</Button>
            <Button onClick={handleChangeRole} loading={saving}>Salvar</Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedMember && (
            <p className="text-sm text-text-secondary">
              Alterar permissao de <span className="text-text-primary font-medium">{selectedMember.name}</span>
            </p>
          )}
          <div className="space-y-2">
            {roleOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setNewRole(opt.value)}
                className={`w-full text-left p-3 rounded-control border transition-colors ${
                  newRole === opt.value
                    ? 'border-lime/50 bg-lime-dim'
                    : 'border-border bg-background hover:border-border/80'
                }`}
              >
                <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                <p className="text-xs text-text-tertiary mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>
          {actionError && (
            <div className="p-3 rounded-control bg-danger/10 border border-danger/20">
              <p className="text-sm text-danger">{actionError}</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Remove Member Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Remover Membro"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleRemoveMember} loading={saving}>Remover</Button>
          </>
        }
      >
        <div>
          <p className="text-text-secondary">
            Tem certeza que deseja remover{' '}
            <span className="text-text-primary font-medium">{selectedMember?.name}</span> do time?
          </p>
          <p className="text-xs text-text-tertiary mt-2">
            Esta acao nao pode ser desfeita. O membro perdera acesso imediatamente.
          </p>
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
