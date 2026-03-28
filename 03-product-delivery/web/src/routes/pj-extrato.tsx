import { useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  FileText,
  CreditCard,
  ArrowLeftRight,
  RefreshCw,
  AlertTriangle,
  Search,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useFetch } from '../hooks/useFetch';
import { apiPJ } from '../services/api-pj';
import { formatCurrency, formatDate } from '../lib/formatters';

interface Transaction {
  id: string;
  description: string;
  counterpart: string;
  category: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string;
}

interface TransactionsResponse {
  balance: number;
  transactions: Transaction[];
  nextCursor: string | null;
}

const periodOptions = [
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: '60 dias', value: '60' },
  { label: '90 dias', value: '90' },
];

const categoryConfig: Record<string, { label: string; icon: typeof Zap; variant: 'success' | 'danger' | 'info' | 'warning' | 'neutral' }> = {
  pix_received: { label: 'Pix Recebido', icon: Zap, variant: 'success' },
  pix_sent: { label: 'Pix Enviado', icon: Zap, variant: 'danger' },
  boleto_paid: { label: 'Boleto Pago', icon: FileText, variant: 'warning' },
  card_purchase: { label: 'Compra Cartao', icon: CreditCard, variant: 'info' },
  transfer_pf: { label: 'Transferencia PF', icon: ArrowLeftRight, variant: 'neutral' },
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-border/40 rounded-control ${className}`} />;
}

export default function PJExtrato() {
  const [period, setPeriod] = useState('30');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const { data, loading, error, refetch } = useFetch<TransactionsResponse>(
    `/pj/transactions?period=${period}`
  );

  // Sync initial data
  if (data && !initialized) {
    setTransactions(data.transactions);
    setCursor(data.nextCursor);
    setInitialized(true);
  }

  // Reset when period changes
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    setTransactions([]);
    setCursor(null);
    setInitialized(false);
  };

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = await apiPJ.get<TransactionsResponse>(
        `/pj/transactions?period=${period}&cursor=${cursor}`
      );
      setTransactions((prev) => [...prev, ...result.transactions]);
      setCursor(result.nextCursor);
    } catch {
      // keep existing data
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, period, loadingMore]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={48} className="text-danger" />
        <p className="text-text-secondary text-lg">Erro ao carregar extrato</p>
        <Button variant="secondary" onClick={refetch} icon={<RefreshCw size={16} />}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const displayTransactions = initialized ? transactions : [];
  const balance = data?.balance ?? 0;

  return (
    <div className="space-y-6">
      {/* Balance */}
      <Card>
        <p className="text-text-tertiary text-xs uppercase tracking-wider">Saldo atual</p>
        {loading ? (
          <Skeleton className="h-8 w-48 mt-2" />
        ) : (
          <p className="text-2xl font-bold text-lime mt-1">{formatCurrency(balance)}</p>
        )}
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {periodOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handlePeriodChange(opt.value)}
            className={`px-4 py-2 rounded-control text-sm font-medium transition-colors ${
              period === opt.value
                ? 'bg-lime-dim text-lime border border-lime/20'
                : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <Card padding={false}>
        <div className="p-6 pb-0">
          <CardHeader title="Transacoes" subtitle={`Ultimos ${period} dias`} />
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : displayTransactions.length === 0 ? (
          <div className="py-16 text-center">
            <Search size={40} className="mx-auto text-text-tertiary mb-3" />
            <p className="text-text-secondary">Nenhuma transacao encontrada</p>
            <p className="text-text-tertiary text-sm mt-1">Tente alterar o periodo de busca</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {displayTransactions.map((tx) => {
                const cat = categoryConfig[tx.category] || {
                  label: tx.category,
                  icon: ArrowLeftRight,
                  variant: 'neutral' as const,
                };
                const IconComp = cat.icon;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between px-6 py-4 hover:bg-background/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-control flex items-center justify-center ${
                        tx.type === 'credit' ? 'bg-success/10' : 'bg-danger/10'
                      }`}>
                        <IconComp size={18} className={tx.type === 'credit' ? 'text-success' : 'text-danger'} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={cat.variant} size="sm">{cat.label}</Badge>
                          {tx.counterpart && (
                            <span className="text-xs text-text-tertiary">{tx.counterpart}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        tx.type === 'credit' ? 'text-success' : 'text-danger'
                      }`}>
                        {tx.type === 'credit' ? '+' : '-'} {formatCurrency(Math.abs(tx.amount))}
                      </p>
                      <p className="text-xs text-text-tertiary mt-0.5">{formatDate(tx.date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {cursor && (
              <div className="p-6 pt-4 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={loadMore}
                  loading={loadingMore}
                  icon={loadingMore ? undefined : <Loader2 size={16} />}
                >
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
