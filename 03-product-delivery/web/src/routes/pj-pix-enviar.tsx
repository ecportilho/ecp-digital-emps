import { useState } from 'react';
import {
  Search,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ArrowLeft,
  Info,
  Loader2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiPJ } from '../services/api-pj';
import { formatCurrency } from '../lib/formatters';

interface LookupResult {
  name: string;
  institution: string;
  key: string;
  keyType: string;
}

interface TransferResult {
  transactionId: string;
  amount: number;
  recipient: string;
  date: string;
}

type Step = 'key' | 'amount' | 'confirm' | 'success';

export default function PJPixEnviar() {
  const [step, setStep] = useState<Step>('key');
  const [pixKey, setPixKey] = useState('');
  const [lookupData, setLookupData] = useState<LookupResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [receipt, setReceipt] = useState<TransferResult | null>(null);

  const amountCents = Math.round(
    parseFloat(amountStr.replace(/\./g, '').replace(',', '.') || '0') * 100
  );

  const handleLookup = async () => {
    if (!pixKey.trim()) return;
    setLookupLoading(true);
    setLookupError('');
    try {
      const result = await apiPJ.get<LookupResult>(`/pj/pix/lookup?key=${encodeURIComponent(pixKey)}`);
      setLookupData(result);
      setStep('amount');
    } catch (err: any) {
      setLookupError(err?.message || 'Chave Pix nao encontrada');
    } finally {
      setLookupLoading(false);
    }
  };

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

  const handleTransfer = async () => {
    setTransferLoading(true);
    setTransferError('');
    try {
      const result = await apiPJ.post<TransferResult>('/pj/pix/transfer', {
        key: lookupData!.key,
        amount: amountCents,
        description,
      });
      setReceipt(result);
      setStep('success');
    } catch (err: any) {
      setTransferError(err?.message || 'Erro ao realizar transferencia');
    } finally {
      setTransferLoading(false);
    }
  };

  const resetFlow = () => {
    setStep('key');
    setPixKey('');
    setLookupData(null);
    setAmountStr('');
    setDescription('');
    setReceipt(null);
    setTransferError('');
    setLookupError('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const now = new Date();
  const isNocturnal = now.getHours() >= 20 || now.getHours() < 6;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Limits info */}
      <Card className="bg-info/5 border-info/20">
        <div className="flex items-start gap-3">
          <Info size={18} className="text-info mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="text-text-primary font-medium">Limites Pix</p>
            <p className="text-text-secondary mt-1">
              Diurno (6h-20h): <span className="text-text-primary font-medium">R$ 10.000,00</span>
            </p>
            <p className="text-text-secondary">
              Noturno (20h-6h): <span className="text-text-primary font-medium">R$ 2.000,00</span>
            </p>
            {isNocturnal && (
              <p className="text-warning mt-1 text-xs">Horario noturno ativo - limite reduzido</p>
            )}
          </div>
        </div>
      </Card>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 justify-center">
        {(['key', 'amount', 'confirm', 'success'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? 'bg-lime text-background'
                  : (['key', 'amount', 'confirm', 'success'].indexOf(step) > i)
                  ? 'bg-lime/20 text-lime'
                  : 'bg-border text-text-tertiary'
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && <div className="w-8 h-0.5 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Pix Key */}
      {step === 'key' && (
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Enviar Pix</h2>
          <div className="space-y-4">
            <Input
              label="Chave Pix"
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatoria"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              error={lookupError}
              iconLeft={<Search size={16} />}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
            />
            <Button
              onClick={handleLookup}
              loading={lookupLoading}
              disabled={!pixKey.trim()}
              className="w-full"
              icon={<ArrowRight size={16} />}
            >
              Buscar
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Amount */}
      {step === 'amount' && lookupData && (
        <Card>
          <button
            onClick={() => setStep('key')}
            className="flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary mb-4 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <div className="p-4 rounded-control bg-background mb-4">
            <p className="text-xs text-text-tertiary">Destinatario</p>
            <p className="text-sm font-medium text-text-primary mt-1">{lookupData.name}</p>
            <p className="text-xs text-text-tertiary mt-0.5">{lookupData.institution}</p>
          </div>
          <div className="space-y-4">
            <Input
              label="Valor"
              placeholder="0,00"
              value={amountStr}
              onChange={(e) => handleAmountMask(e.target.value)}
              iconLeft={<span className="text-sm text-text-tertiary">R$</span>}
              error={
                amountCents > (isNocturnal ? 200000 : 1000000)
                  ? `Valor excede o limite ${isNocturnal ? 'noturno' : 'diurno'}`
                  : undefined
              }
            />
            <Input
              label="Descricao (opcional)"
              placeholder="Ex: Pagamento fornecedor"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button
              onClick={() => setStep('confirm')}
              disabled={amountCents <= 0 || amountCents > (isNocturnal ? 200000 : 1000000)}
              className="w-full"
              icon={<ArrowRight size={16} />}
            >
              Continuar
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && lookupData && (
        <Card>
          <button
            onClick={() => setStep('amount')}
            className="flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary mb-4 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Confirmar transferencia</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-sm text-text-tertiary">Destinatario</span>
              <span className="text-sm text-text-primary font-medium">{lookupData.name}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-sm text-text-tertiary">Instituicao</span>
              <span className="text-sm text-text-primary">{lookupData.institution}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-sm text-text-tertiary">Chave Pix</span>
              <span className="text-sm text-text-primary">{lookupData.key}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-sm text-text-tertiary">Valor</span>
              <span className="text-lg font-bold text-lime">{formatCurrency(amountCents)}</span>
            </div>
            {description && (
              <div className="flex justify-between py-3 border-b border-border">
                <span className="text-sm text-text-tertiary">Descricao</span>
                <span className="text-sm text-text-primary">{description}</span>
              </div>
            )}
          </div>
          {transferError && (
            <div className="mt-4 p-3 rounded-control bg-danger/10 border border-danger/20">
              <p className="text-sm text-danger">{transferError}</p>
            </div>
          )}
          <Button
            onClick={handleTransfer}
            loading={transferLoading}
            className="w-full mt-6"
          >
            Confirmar e Enviar
          </Button>
        </Card>
      )}

      {/* Step 4: Success */}
      {step === 'success' && receipt && (
        <Card className="text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Pix enviado!</h2>
          <p className="text-text-secondary mt-1">Transferencia realizada com sucesso</p>

          <div className="mt-6 space-y-3 text-left">
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-sm text-text-tertiary">ID da transacao</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-primary font-mono">{receipt.transactionId}</span>
                <button
                  onClick={() => copyToClipboard(receipt.transactionId)}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-sm text-text-tertiary">Destinatario</span>
              <span className="text-sm text-text-primary">{receipt.recipient}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-border">
              <span className="text-sm text-text-tertiary">Valor</span>
              <span className="text-lg font-bold text-lime">{formatCurrency(receipt.amount)}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="text-sm text-text-tertiary">Data</span>
              <span className="text-sm text-text-primary">
                {new Date(receipt.date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <Button onClick={resetFlow} variant="secondary" className="w-full mt-6">
            Novo Pix
          </Button>
        </Card>
      )}
    </div>
  );
}
