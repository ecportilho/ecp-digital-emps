import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Plus,
  Lock,
  Unlock,
  Settings,
  AlertTriangle,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useFetch } from '../hooks/useFetch';
import { apiPJ } from '../services/api-pj';
import { formatCurrency } from '../lib/formatters';

interface CardItem {
  id: string;
  last4: string;
  cardHolder: string;
  holderName?: string;
  companyName?: string;
  limitCents: number;
  usedCents: number;
  availableCents: number;
  status: 'active' | 'blocked';
  type?: 'virtual' | 'physical';
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-border/40 rounded-control ${className}`} />;
}

export default function CartoesLista() {
  const navigate = useNavigate();
  const { data: cards, loading, error, refetch } = useFetch<CardItem[]>('/pj/cards');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [newHolderName, setNewHolderName] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newType, setNewType] = useState<'virtual' | 'physical'>('virtual');
  const [limitStr, setLimitStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleAmountMask = (value: string, setter: (v: string) => void) => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (!cleaned) { setter(''); return; }
    const num = parseInt(cleaned, 10) / 100;
    setter(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const parseCents = (str: string) =>
    Math.round(parseFloat(str.replace(/\./g, '').replace(',', '.') || '0') * 100);

  const handleCreateCard = async () => {
    setSaving(true);
    setActionError('');
    try {
      await apiPJ.post('/pj/cards', {
        holderId: newHolderName,
        limitCents: parseCents(newLimit),
        dueDay: 25,
      });
      setShowNewModal(false);
      setNewHolderName('');
      setNewLimit('');
      refetch();
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao criar cartao');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBlock = async (card: CardItem) => {
    try {
      await apiPJ.patch(`/pj/cards/${card.id}`, {
        status: card.status === 'active' ? 'blocked' : 'active',
      });
      refetch();
    } catch {
      // silently handle
    }
  };

  const handleAdjustLimit = async () => {
    if (!selectedCard) return;
    setSaving(true);
    setActionError('');
    try {
      await apiPJ.patch(`/pj/cards/${selectedCard.id}`, {
        limitCents: parseCents(limitStr),
      });
      setShowLimitModal(false);
      setSelectedCard(null);
      refetch();
    } catch (err: any) {
      setActionError(err?.message || 'Erro ao ajustar limite');
    } finally {
      setSaving(false);
    }
  };

  const openLimitModal = (card: CardItem) => {
    setSelectedCard(card);
    setLimitStr((card.limitCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
    setActionError('');
    setShowLimitModal(true);
  };

  const getUsagePercent = (used: number, limit: number) => {
    if (limit === 0) return 0;
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 80) return 'bg-danger';
    if (percent >= 50) return 'bg-warning';
    return 'bg-success';
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={48} className="text-danger" />
        <p className="text-text-secondary text-lg">Erro ao carregar cartoes</p>
        <Button variant="secondary" onClick={refetch} icon={<RefreshCw size={16} />}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Cartoes Corporativos</h1>
        <Button onClick={() => { setShowNewModal(true); setActionError(''); }} icon={<Plus size={16} />}>
          Novo Cartao
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : !cards || cards.length === 0 ? (
        <Card className="py-16 text-center">
          <CreditCard size={48} className="mx-auto text-text-tertiary mb-3" />
          <p className="text-text-secondary text-lg">Nenhum cartao corporativo</p>
          <p className="text-text-tertiary text-sm mt-1">Crie seu primeiro cartao para a equipe</p>
          <Button
            onClick={() => setShowNewModal(true)}
            className="mt-4"
            icon={<Plus size={16} />}
          >
            Novo Cartao
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => {
            const usagePercent = getUsagePercent(card.usedCents, card.limitCents);
            const usageColor = getUsageColor(usagePercent);
            return (
              <div key={card.id} className="space-y-4">
                {/* Card visual */}
                <div className="relative overflow-hidden rounded-card p-6 bg-gradient-to-br from-lime/20 via-lime/5 to-background border border-lime/10">
                  {card.status === 'blocked' && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center z-10">
                      <Badge variant="danger">Bloqueado</Badge>
                    </div>
                  )}
                  <div className="flex items-start justify-between mb-8">
                    <CreditCard size={28} className="text-lime" />
                    <Badge variant={card.type === 'virtual' ? 'info' : 'neutral'} size="sm">
                      {card.type === 'virtual' ? 'Virtual' : 'Fisico'}
                    </Badge>
                  </div>
                  <p className="text-xl font-mono text-text-primary tracking-widest mb-4">
                    **** **** **** {card.last4}
                  </p>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-xs text-text-tertiary">Titular</p>
                      <p className="text-sm font-medium text-text-primary">{card.cardHolder}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-tertiary">Empresa</p>
                      <p className="text-sm text-text-secondary">{card.companyName}</p>
                    </div>
                  </div>
                </div>

                {/* Usage bar */}
                <Card>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-text-secondary">Limite utilizado</p>
                    <p className="text-sm font-medium text-text-primary">
                      {formatCurrency(card.usedCents)} / {formatCurrency(card.limitCents)}
                    </p>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-border">
                    <div
                      className={`h-2.5 rounded-full transition-all ${usageColor}`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-tertiary mt-1.5">
                    {usagePercent.toFixed(0)}% utilizado - Disponivel: {formatCurrency(card.limitCents - card.usedCents)}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/pj/cartoes/${card.id}/fatura`)}
                      icon={<Eye size={14} />}
                    >
                      Fatura
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleBlock(card)}
                      icon={card.status === 'active' ? <Lock size={14} /> : <Unlock size={14} />}
                    >
                      {card.status === 'active' ? 'Bloquear' : 'Desbloquear'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openLimitModal(card)}
                      icon={<Settings size={14} />}
                    >
                      Limite
                    </Button>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* New Card Modal */}
      <Modal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        title="Novo Cartao Corporativo"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateCard} loading={saving} disabled={!newHolderName.trim() || !newLimit}>
              Criar Cartao
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nome do titular"
            placeholder="Nome completo"
            value={newHolderName}
            onChange={(e) => setNewHolderName(e.target.value)}
          />
          <Input
            label="Limite"
            placeholder="0,00"
            value={newLimit}
            onChange={(e) => handleAmountMask(e.target.value, setNewLimit)}
            iconLeft={<span className="text-sm text-text-tertiary">R$</span>}
          />
          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['virtual', 'physical'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setNewType(type)}
                  className={`p-3 rounded-control border text-sm font-medium transition-colors ${
                    newType === type
                      ? 'border-lime/50 bg-lime-dim text-lime'
                      : 'border-border bg-background text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {type === 'virtual' ? 'Virtual' : 'Fisico'}
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

      {/* Adjust Limit Modal */}
      <Modal
        isOpen={showLimitModal}
        onClose={() => setShowLimitModal(false)}
        title="Ajustar Limite"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLimitModal(false)}>Cancelar</Button>
            <Button onClick={handleAdjustLimit} loading={saving}>Salvar</Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedCard && (
            <p className="text-sm text-text-secondary">
              Cartao **** {selectedCard.last4} - {selectedCard.cardHolder}
            </p>
          )}
          <Input
            label="Novo limite"
            placeholder="0,00"
            value={limitStr}
            onChange={(e) => handleAmountMask(e.target.value, setLimitStr)}
            iconLeft={<span className="text-sm text-text-tertiary">R$</span>}
          />
          {actionError && (
            <div className="p-3 rounded-control bg-danger/10 border border-danger/20">
              <p className="text-sm text-danger">{actionError}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
