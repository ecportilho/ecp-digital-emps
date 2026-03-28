import { useState } from 'react';
import {
  QrCode,
  Copy,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiPJ } from '../services/api-pj';
import { useFetch } from '../hooks/useFetch';
import { Badge } from '../components/ui/Badge';

interface PixKey {
  id: string;
  type: string;
  value: string;
}

interface QrCodeResult {
  qrCode: string;
  copyPasteCode: string;
  expiresAt: string;
}

export default function PJPixReceber() {
  const { data: keys, loading: keysLoading } = useFetch<PixKey[]>('/pj/pix/keys');
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [amountStr, setAmountStr] = useState('');
  const [qrResult, setQrResult] = useState<QrCodeResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [copied, setCopied] = useState(false);

  const amountCents = Math.round(
    parseFloat(amountStr.replace(/\./g, '').replace(',', '.') || '0') * 100
  );

  const handleAmountMask = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (!cleaned) {
      setAmountStr('');
      return;
    }
    const num = parseInt(cleaned, 10) / 100;
    setAmountStr(
      num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  };

  const generateQr = async () => {
    if (!selectedKey) return;
    setGenerating(true);
    setGenError('');
    try {
      const result = await apiPJ.post<QrCodeResult>('/pj/pix/qrcode', {
        keyId: selectedKey,
        amount: amountCents > 0 ? amountCents : undefined,
      });
      setQrResult(result);
    } catch (err: any) {
      setGenError(err?.message || 'Erro ao gerar QR Code');
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = () => {
    if (qrResult) {
      navigator.clipboard.writeText(qrResult.copyPasteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const keyTypeLabels: Record<string, string> = {
    cnpj: 'CNPJ',
    email: 'Email',
    phone: 'Telefone',
    random: 'Aleatoria',
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Receber Pix</h1>

      {/* Select Pix Key */}
      <Card>
        <CardHeader title="Selecione a chave Pix" />
        {keysLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-border/40 rounded-control h-14" />
            ))}
          </div>
        ) : !keys || keys.length === 0 ? (
          <div className="py-8 text-center">
            <QrCode size={40} className="mx-auto text-text-tertiary mb-3" />
            <p className="text-text-secondary">Nenhuma chave Pix cadastrada</p>
            <p className="text-text-tertiary text-sm mt-1">Cadastre uma chave para receber pagamentos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <button
                key={key.id}
                onClick={() => setSelectedKey(key.id)}
                className={`w-full flex items-center justify-between p-4 rounded-control border transition-colors ${
                  selectedKey === key.id
                    ? 'border-lime/50 bg-lime-dim'
                    : 'border-border hover:border-border/80 bg-background'
                }`}
              >
                <div className="text-left">
                  <p className="text-sm font-medium text-text-primary">{key.value}</p>
                  <Badge variant={key.type === 'cnpj' ? 'lime' : 'neutral'} size="sm">
                    {keyTypeLabels[key.type] || key.type}
                  </Badge>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedKey === key.id ? 'border-lime' : 'border-border'
                }`}>
                  {selectedKey === key.id && <div className="w-2.5 h-2.5 rounded-full bg-lime" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Amount (optional) */}
      <Card>
        <CardHeader title="Valor (opcional)" subtitle="Deixe vazio para QR Code aberto" />
        <Input
          placeholder="0,00"
          value={amountStr}
          onChange={(e) => handleAmountMask(e.target.value)}
          iconLeft={<span className="text-sm text-text-tertiary">R$</span>}
        />
      </Card>

      {/* Generate Button */}
      <Button
        onClick={generateQr}
        disabled={!selectedKey || generating}
        loading={generating}
        className="w-full"
        size="lg"
      >
        Gerar QR Code
      </Button>

      {genError && (
        <div className="p-4 rounded-control bg-danger/10 border border-danger/20">
          <p className="text-sm text-danger">{genError}</p>
        </div>
      )}

      {/* QR Code Result */}
      {qrResult && (
        <Card className="text-center">
          <div className="w-48 h-48 mx-auto bg-white rounded-card flex items-center justify-center mb-4">
            {/* QR Code placeholder - in real app would render the actual QR */}
            <div className="text-center">
              <QrCode size={120} className="text-background mx-auto" />
            </div>
          </div>

          {amountCents > 0 && (
            <p className="text-lg font-bold text-lime mb-2">
              {(amountCents / 100).toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
          )}

          <div className="mt-4">
            <p className="text-xs text-text-tertiary mb-2">Pix Copia e Cola</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-control bg-background text-xs text-text-secondary font-mono truncate">
                {qrResult.copyPasteCode}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={copyCode}
                icon={copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </div>

          <p className="text-xs text-text-tertiary mt-4">
            Expira em {new Date(qrResult.expiresAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </Card>
      )}
    </div>
  );
}
