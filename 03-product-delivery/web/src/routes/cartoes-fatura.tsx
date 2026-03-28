import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CreditCard,
  ShoppingBag,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useFetch } from '../hooks/useFetch';
import { formatCurrency, formatDate } from '../lib/formatters';

interface CardInvoice {
  cardId: string;
  last4: string;
  holderName: string;
  total: number;
  dueDate: string;
  closingDate: string;
  status: 'open' | 'closed' | 'paid';
}

interface Purchase {
  id: string;
  merchant: string;
  category: string;
  amount: number;
  date: string;
  installment?: string;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-border/40 rounded-control ${className}`} />;
}

const categoryLabels: Record<string, string> = {
  food: 'Alimentacao',
  transport: 'Transporte',
  software: 'Software',
  office: 'Escritorio',
  travel: 'Viagem',
  marketing: 'Marketing',
  other: 'Outros',
};

export default function CartoesFatura() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: invoice, loading: invoiceLoading, error: invoiceError, refetch: refetchInvoice } =
    useFetch<CardInvoice>(`/pj/cards/${id}/invoice`);
  const { data: purchases, loading: purchasesLoading, error: purchasesError, refetch: refetchPurchases } =
    useFetch<Purchase[]>(`/pj/cards/${id}/purchases`);

  const hasError = invoiceError || purchasesError;

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={48} className="text-danger" />
        <p className="text-text-secondary text-lg">Erro ao carregar fatura</p>
        <Button
          variant="secondary"
          onClick={() => { refetchInvoice(); refetchPurchases(); }}
          icon={<RefreshCw size={16} />}
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/pj/cartoes')}
          className="p-2 rounded-control text-text-tertiary hover:text-text-primary hover:bg-surface transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Fatura do Cartao</h1>
          {invoice && (
            <p className="text-text-secondary text-sm mt-0.5">
              **** {invoice.last4} - {invoice.holderName}
            </p>
          )}
        </div>
      </div>

      {/* Invoice Summary */}
      {invoiceLoading ? (
        <Skeleton className="h-40" />
      ) : invoice ? (
        <Card className="bg-gradient-to-br from-surface to-secondary-bg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CreditCard size={24} className="text-lime" />
              <Badge
                variant={
                  invoice.status === 'paid' ? 'success' :
                  invoice.status === 'closed' ? 'warning' : 'info'
                }
              >
                {invoice.status === 'paid' ? 'Paga' :
                 invoice.status === 'closed' ? 'Fechada' : 'Aberta'}
              </Badge>
            </div>
          </div>

          <p className="text-3xl font-bold text-lime">{formatCurrency(invoice.total)}</p>

          <div className="flex gap-6 mt-4">
            <div>
              <p className="text-xs text-text-tertiary">Fechamento</p>
              <p className="text-sm text-text-primary">{formatDate(invoice.closingDate)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Vencimento</p>
              <p className="text-sm text-text-primary">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Purchases */}
      <Card padding={false}>
        <div className="p-6 pb-0">
          <CardHeader title="Compras" subtitle="Lancamentos da fatura atual" />
        </div>

        {purchasesLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !purchases || purchases.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag size={40} className="mx-auto text-text-tertiary mb-3" />
            <p className="text-text-secondary">Nenhuma compra nesta fatura</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {purchases.map((purchase) => (
              <div
                key={purchase.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-background/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-control bg-lime-dim flex items-center justify-center">
                    <ShoppingBag size={18} className="text-lime" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">{purchase.merchant}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="neutral" size="sm">
                        {categoryLabels[purchase.category] || purchase.category}
                      </Badge>
                      {purchase.installment && (
                        <span className="text-xs text-text-tertiary">{purchase.installment}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-danger">
                    - {formatCurrency(purchase.amount)}
                  </p>
                  <p className="text-xs text-text-tertiary mt-0.5">{formatDate(purchase.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
