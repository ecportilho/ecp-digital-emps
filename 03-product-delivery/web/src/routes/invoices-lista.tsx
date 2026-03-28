import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  MoreHorizontal,
  RefreshCw,
  AlertTriangle,
  FileText,
  Send,
  XCircle,
  Eye,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { InvoiceStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useFetch } from '../hooks/useFetch';
import { apiPJ } from '../services/api-pj';
import { formatCurrency, formatDate } from '../lib/formatters';

interface Invoice {
  id: string;
  clientName: string;
  amount: number;
  dueDate: string;
  status: string;
}

interface InvoiceSummary {
  total: { count: number; amount: number };
  paid: { count: number; amount: number };
  overdue: { count: number; amount: number };
}

const statusTabs = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'paid', label: 'Pagos' },
  { value: 'overdue', label: 'Vencidos' },
  { value: 'cancelled', label: 'Cancelados' },
];

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-border/40 rounded-control ${className}`} />;
}

export default function InvoicesLista() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  if (searchQuery) queryParams.set('search', searchQuery);
  const qs = queryParams.toString();

  const { data: invoices, loading, error, refetch } = useFetch<Invoice[]>(
    `/pj/invoices${qs ? `?${qs}` : ''}`
  );
  const { data: summary } = useFetch<InvoiceSummary>('/pj/invoices/summary');

  const handleCancel = async (id: string) => {
    try {
      await apiPJ.patch(`/pj/invoices/${id}`, { status: 'cancelled' });
      refetch();
    } catch {
      // handle error silently
    }
    setActionMenu(null);
  };

  const handleResend = async (id: string) => {
    try {
      await apiPJ.post(`/pj/invoices/${id}/resend`);
    } catch {
      // handle error silently
    }
    setActionMenu(null);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={48} className="text-danger" />
        <p className="text-text-secondary text-lg">Erro ao carregar cobrancas</p>
        <Button variant="secondary" onClick={refetch} icon={<RefreshCw size={16} />}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Cobrancas</h1>
        <Button onClick={() => navigate('/pj/cobrancas/nova')} icon={<Plus size={16} />}>
          Nova Cobranca
        </Button>
      </div>

      {/* Summary Cards */}
      {summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <p className="text-xs text-text-tertiary uppercase tracking-wider">Total Emitidos</p>
            <p className="text-xl font-bold text-text-primary mt-1">{summary.total.count}</p>
            <p className="text-sm text-text-secondary">{formatCurrency(summary.total.amount)}</p>
          </Card>
          <Card>
            <p className="text-xs text-text-tertiary uppercase tracking-wider">Pagos</p>
            <p className="text-xl font-bold text-success mt-1">{summary.paid.count}</p>
            <p className="text-sm text-text-secondary">{formatCurrency(summary.paid.amount)}</p>
          </Card>
          <Card>
            <p className="text-xs text-text-tertiary uppercase tracking-wider">Vencidos</p>
            <p className="text-xl font-bold text-danger mt-1">{summary.overdue.count}</p>
            <p className="text-sm text-text-secondary">{formatCurrency(summary.overdue.amount)}</p>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            iconLeft={<Search size={16} />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2 rounded-control text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.value
                  ? 'bg-lime-dim text-lime border border-lime/20'
                  : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card padding={false}>
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={48} className="mx-auto text-text-tertiary mb-3" />
            <p className="text-text-secondary text-lg">Nenhuma cobranca encontrada</p>
            <p className="text-text-tertiary text-sm mt-1">Emita sua primeira cobranca</p>
            <Button
              onClick={() => navigate('/pj/cobrancas/nova')}
              className="mt-4"
              icon={<Plus size={16} />}
            >
              Nova Cobranca
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Vencimento
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-text-primary">
                      {inv.clientName}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-primary">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-text-secondary">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-6 py-4">
                      <InvoiceStatusBadge status={inv.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionMenu(actionMenu === inv.id ? null : inv.id)}
                          className="p-1.5 rounded-control text-text-tertiary hover:text-text-primary hover:bg-surface transition-colors"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {actionMenu === inv.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border rounded-control shadow-lg z-10 py-1">
                            <button
                              onClick={() => { navigate(`/pj/cobrancas/${inv.id}`); setActionMenu(null); }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
                            >
                              <Eye size={14} /> Ver detalhes
                            </button>
                            {inv.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleResend(inv.id)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
                                >
                                  <Send size={14} /> Reenviar
                                </button>
                                <button
                                  onClick={() => handleCancel(inv.id)}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                                >
                                  <XCircle size={14} /> Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
