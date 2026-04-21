import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Send,
  QrCode,
  ArrowLeftRight,
  CreditCard,
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useFetch } from '../hooks/useFetch';
import { formatCurrency, formatDate, formatCnpj } from '../lib/formatters';

interface DashboardData {
  company: {
    nomeFantasia: string;
    cnpj: string;
  };
  balance: number;
  cashFlow: {
    date: string;
    inflow: number;
    outflow: number;
  }[];
  invoiceSummary: {
    pending: { count: number; amount: number };
    paid: { count: number; amount: number };
    overdue: { count: number; amount: number };
  };
  recentTransactions: {
    id: string;
    description: string;
    category: string;
    amount: number;
    type: 'credit' | 'debit';
    date: string;
  }[];
}

const categoryLabels: Record<string, string> = {
  pix_received: 'Pix Recebido',
  pix_sent: 'Pix Enviado',
  boleto_paid: 'Boleto Pago',
  card_purchase: 'Compra Cartao',
  transfer_pf: 'Transferencia PF',
};

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-border/40 rounded-control ${className}`} />
  );
}

export default function PJDashboard() {
  const [balanceVisible, setBalanceVisible] = useState(true);
  const { data, loading, error, refetch } = useFetch<DashboardData>('/pj/dashboard');
  const navigate = useNavigate();

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={48} className="text-danger" />
        <p className="text-text-secondary text-lg">Erro ao carregar dashboard</p>
        <p className="text-text-tertiary text-sm">{error}</p>
        <Button variant="secondary" onClick={refetch} icon={<RefreshCw size={16} />}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const dashboard = data!;
  const maxCashFlow = Math.max(
    ...dashboard.cashFlow.map((d) => Math.max(d.inflow, d.outflow)),
    1
  );

  const quickActions = [
    { label: 'Enviar Pix', icon: Send, route: '/pj/pix/enviar' },
    { label: 'Cobrar', icon: QrCode, route: '/pj/cobrancas/nova' },
    { label: 'Transferir PF/PJ', icon: ArrowLeftRight, route: '/pj/pix/enviar' },
    { label: 'Novo Cartao', icon: CreditCard, route: '/pj/cartoes' },
  ];

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-surface to-secondary-bg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-text-secondary text-sm">{dashboard.company.nomeFantasia}</p>
            <p className="text-text-tertiary text-xs mt-0.5">
              CNPJ {formatCnpj(dashboard.company.cnpj)}
            </p>
          </div>
          <button
            onClick={() => setBalanceVisible(!balanceVisible)}
            className="p-2 rounded-control text-text-tertiary hover:text-text-primary hover:bg-surface transition-colors"
            aria-label={balanceVisible ? 'Ocultar saldo' : 'Mostrar saldo'}
          >
            {balanceVisible ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
        </div>
        <div className="mt-4">
          <p className="text-text-tertiary text-xs uppercase tracking-wider">Saldo disponivel</p>
          <p className="text-3xl font-bold text-lime mt-1">
            {balanceVisible ? formatCurrency(dashboard.balance) : 'R$ ••••••'}
          </p>
          {(() => {
            // CDI 12% a.a. (valor de referencia 2026) → ~0.0457% ao dia util.
            // Estimativa diaria de rendimento: saldo * taxa_diaria.
            // Mostramos apenas se o saldo for positivo e nao estivermos ocultando valores.
            const CDI_ANNUAL = 0.12;
            const DAILY_RATE = Math.pow(1 + CDI_ANNUAL, 1 / 252) - 1;
            const dailyYield = Math.round(dashboard.balance * DAILY_RATE);
            if (!balanceVisible) {
              return (
                <p className="text-xs text-success mt-1 flex items-center gap-1">
                  <TrendingUp size={12} />
                  Rendendo 100% CDI
                </p>
              );
            }
            if (dailyYield <= 0) {
              return (
                <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
                  <TrendingUp size={12} />
                  Rendimento 100% CDI — comeca quando houver saldo
                </p>
              );
            }
            return (
              <p className="text-xs text-success mt-1 flex items-center gap-1">
                <TrendingUp size={12} />
                Rendendo 100% CDI — aprox. {formatCurrency(dailyYield)}/dia util
              </p>
            );
          })()}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.label}
            className="cursor-pointer hover:border-lime/30 transition-colors group"
            onClick={() => navigate(action.route)}
          >
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="w-12 h-12 rounded-control bg-lime-dim flex items-center justify-center group-hover:bg-lime/20 transition-colors">
                <action.icon size={22} className="text-lime" />
              </div>
              <span className="text-sm font-medium text-text-primary">{action.label}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cash Flow Chart */}
        <Card>
          <CardHeader title="Fluxo de Caixa" subtitle="Ultimos 7 dias" />
          <div className="flex items-end gap-3 h-48">
            {dashboard.cashFlow.map((day) => {
              const inflowH = (day.inflow / maxCashFlow) * 100;
              const outflowH = (day.outflow / maxCashFlow) * 100;
              const dayLabel = new Date(day.date).toLocaleDateString('pt-BR', { weekday: 'short' });
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-1 w-full h-36">
                    <div
                      className="flex-1 bg-success/30 rounded-t-sm transition-all"
                      style={{ height: `${Math.max(inflowH, 4)}%` }}
                      title={`Entrada: ${formatCurrency(day.inflow)}`}
                    />
                    <div
                      className="flex-1 bg-danger/30 rounded-t-sm transition-all"
                      style={{ height: `${Math.max(outflowH, 4)}%` }}
                      title={`Saida: ${formatCurrency(day.outflow)}`}
                    />
                  </div>
                  <span className="text-[10px] text-text-tertiary capitalize">{dayLabel}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-success/30" />
              <span className="text-xs text-text-tertiary">Entradas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-danger/30" />
              <span className="text-xs text-text-tertiary">Saidas</span>
            </div>
          </div>
        </Card>

        {/* Invoice Summary */}
        <Card>
          <CardHeader title="Cobrancas" subtitle="Resumo geral" />
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-control bg-background">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-control bg-warning/10 flex items-center justify-center">
                  <Clock size={18} className="text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Pendentes</p>
                  <p className="text-xs text-text-tertiary">{dashboard.invoiceSummary.pending.count} cobrancas</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-warning">
                {formatCurrency(dashboard.invoiceSummary.pending.amount)}
              </p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-control bg-background">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-control bg-success/10 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Pagos</p>
                  <p className="text-xs text-text-tertiary">{dashboard.invoiceSummary.paid.count} cobrancas</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-success">
                {formatCurrency(dashboard.invoiceSummary.paid.amount)}
              </p>
            </div>
            <div className="flex items-center justify-between p-4 rounded-control bg-background">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-control bg-danger/10 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-danger" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Vencidos</p>
                  <p className="text-xs text-text-tertiary">{dashboard.invoiceSummary.overdue.count} cobrancas</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-danger">
                {formatCurrency(dashboard.invoiceSummary.overdue.amount)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader
          title="Transacoes Recentes"
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('/pj/extrato')}>
              Ver todas
            </Button>
          }
        />
        {dashboard.recentTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <FileText size={40} className="mx-auto text-text-tertiary mb-3" />
            <p className="text-text-secondary">Nenhuma transacao recente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {dashboard.recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 rounded-control hover:bg-background transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-control flex items-center justify-center ${tx.type === 'credit' ? 'bg-success/10' : 'bg-danger/10'}`}>
                    {tx.type === 'credit' ? (
                      <TrendingUp size={16} className="text-success" />
                    ) : (
                      <TrendingDown size={16} className="text-danger" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant={tx.type === 'credit' ? 'success' : 'neutral'} size="sm">
                        {categoryLabels[tx.category] || tx.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                    {tx.type === 'credit' ? '+' : '-'} {formatCurrency(Math.abs(tx.amount))}
                  </p>
                  <p className="text-xs text-text-tertiary">{formatDate(tx.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
