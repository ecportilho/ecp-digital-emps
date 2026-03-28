import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  QrCode,
  FileText,
  Send,
  XCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { InvoiceStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useFetch } from '../hooks/useFetch';
import { apiPJ } from '../services/api-pj';
import { formatCurrency, formatDate, formatDocument } from '../lib/formatters';
import { useState } from 'react';

interface InvoiceDetail {
  id: string;
  clientName: string;
  clientDocument: string;
  clientEmail: string;
  amount: number;
  dueDate: string;
  status: string;
  description: string;
  barcode: string;
  pixCode: string;
  juros: number;
  multa: number;
  desconto: number;
  createdAt: string;
  timeline: {
    event: string;
    date: string;
    description: string;
  }[];
}

const timelineIcons: Record<string, typeof Clock> = {
  created: FileText,
  sent: Send,
  viewed: CheckCircle2,
  paid: CheckCircle2,
  overdue: AlertTriangle,
  cancelled: XCircle,
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-border/40 rounded-control ${className}`} />;
}

export default function InvoicesDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, loading, error, refetch } = useFetch<InvoiceDetail>(`/pj/invoices/${id}`);
  const [copied, setCopied] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await apiPJ.patch(`/pj/invoices/${id}`, { status: 'cancelled' });
      refetch();
    } catch {
      // silently handle
    } finally {
      setActionLoading(false);
    }
  };

  const handleResend = async () => {
    setActionLoading(true);
    try {
      await apiPJ.post(`/pj/invoices/${id}/resend`);
    } catch {
      // silently handle
    } finally {
      setActionLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle size={48} className="text-danger" />
        <p className="text-text-secondary text-lg">Erro ao carregar cobranca</p>
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

  if (!invoice) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pj/cobrancas')}
            className="p-2 rounded-control text-text-tertiary hover:text-text-primary hover:bg-surface transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Cobranca #{invoice.id.slice(0, 8)}</h1>
            <div className="mt-1">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>
        {invoice.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleResend}
              loading={actionLoading}
              icon={<Send size={14} />}
            >
              Reenviar
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancel}
              loading={actionLoading}
              icon={<XCircle size={14} />}
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>

      {/* Invoice Details */}
      <Card>
        <CardHeader title="Detalhes" />
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-tertiary">Cliente</span>
            <span className="text-sm text-text-primary font-medium">{invoice.clientName}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-tertiary">Documento</span>
            <span className="text-sm text-text-primary">{formatDocument(invoice.clientDocument)}</span>
          </div>
          {invoice.clientEmail && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-text-tertiary">E-mail</span>
              <span className="text-sm text-text-primary">{invoice.clientEmail}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-tertiary">Valor</span>
            <span className="text-lg font-bold text-lime">{formatCurrency(invoice.amount)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-text-tertiary">Vencimento</span>
            <span className="text-sm text-text-primary">{formatDate(invoice.dueDate)}</span>
          </div>
          {invoice.description && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-text-tertiary">Descricao</span>
              <span className="text-sm text-text-primary">{invoice.description}</span>
            </div>
          )}
          {invoice.juros > 0 && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-text-tertiary">Juros</span>
              <span className="text-sm text-text-secondary">{invoice.juros}% a.m.</span>
            </div>
          )}
          {invoice.multa > 0 && (
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-text-tertiary">Multa</span>
              <span className="text-sm text-text-secondary">{invoice.multa}%</span>
            </div>
          )}
          {invoice.desconto > 0 && (
            <div className="flex justify-between py-2">
              <span className="text-sm text-text-tertiary">Desconto antecipado</span>
              <span className="text-sm text-text-secondary">{invoice.desconto}%</span>
            </div>
          )}
        </div>
      </Card>

      {/* Barcode & QR */}
      <Card>
        <CardHeader title="Pagamento" />
        {/* Barcode */}
        <div className="mb-4">
          <p className="text-xs text-text-tertiary mb-2">Codigo de barras</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 rounded-control bg-background text-xs text-text-secondary font-mono truncate">
              {invoice.barcode}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => copyText(invoice.barcode, 'barcode')}
              icon={<Copy size={14} />}
            >
              {copied === 'barcode' ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
        </div>

        {/* QR Code */}
        <div>
          <p className="text-xs text-text-tertiary mb-2">QR Code Pix</p>
          <div className="flex items-center gap-4">
            <div className="w-32 h-32 bg-white rounded-control flex items-center justify-center shrink-0">
              <QrCode size={80} className="text-background" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 rounded-control bg-background text-xs text-text-secondary font-mono truncate">
                  {invoice.pixCode}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyText(invoice.pixCode, 'pix')}
                  icon={<Copy size={14} />}
                >
                  {copied === 'pix' ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader title="Historico" />
        <div className="space-y-0">
          {invoice.timeline.map((event, index) => {
            const Icon = timelineIcons[event.event] || Clock;
            const isLast = index === invoice.timeline.length - 1;
            return (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-text-tertiary" />
                  </div>
                  {!isLast && <div className="w-px h-full bg-border min-h-[24px]" />}
                </div>
                <div className="pb-6">
                  <p className="text-sm font-medium text-text-primary">{event.description}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {new Date(event.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
