import { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Mail,
  Link,
  FileText,
  QrCode,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiPJ } from '../services/api-pj';
import { formatCurrency } from '../lib/formatters';

interface InvoiceResult {
  id: string;
  barcode: string;
  pixCode: string;
  link: string;
}

type Step = 'client' | 'options' | 'success';

export default function InvoicesNovo() {
  const [step, setStep] = useState<Step>('client');

  // Step 1 fields
  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  // Step 2 fields
  const [juros, setJuros] = useState(false);
  const [multa, setMulta] = useState(false);
  const [desconto, setDesconto] = useState(false);

  // Result
  const [result, setResult] = useState<InvoiceResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState('');

  const amountCents = Math.round(
    parseFloat(amountStr.replace(/\./g, '').replace(',', '.') || '0') * 100
  );

  const handleAmountMask = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, '');
    if (!cleaned) { setAmountStr(''); return; }
    const num = parseInt(cleaned, 10) / 100;
    setAmountStr(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleDocMask = (value: string) => {
    let stripped = value.replace(/\D/g, '').substring(0, 14);
    if (stripped.length <= 11) {
      stripped = stripped
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
      stripped = stripped
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    setClientDoc(stripped);
  };

  const step1Valid = clientName.trim() && clientDoc.trim() && amountCents > 0 && dueDate;

  const handleCreate = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const body = {
        clientName,
        clientDocument: clientDoc.replace(/\D/g, ''),
        clientEmail: clientEmail || undefined,
        amount: amountCents,
        dueDate,
        description: description || undefined,
        juros: juros ? 1 : 0,
        multa: multa ? 2 : 0,
        desconto: desconto ? 5 : 0,
      };
      const res = await apiPJ.post<InvoiceResult>('/pj/invoices', body);
      setResult(res);
      setStep('success');
    } catch (err: any) {
      setSaveError(err?.message || 'Erro ao emitir cobranca');
    } finally {
      setSaving(false);
    }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const resetFlow = () => {
    setStep('client');
    setClientName('');
    setClientDoc('');
    setClientEmail('');
    setAmountStr('');
    setDueDate('');
    setDescription('');
    setJuros(false);
    setMulta(false);
    setDesconto(false);
    setResult(null);
    setSaveError('');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Nova Cobranca</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 justify-center">
        {(['client', 'options', 'success'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? 'bg-lime text-background'
                  : (['client', 'options', 'success'].indexOf(step) > i)
                  ? 'bg-lime/20 text-lime'
                  : 'bg-border text-text-tertiary'
              }`}
            >
              {i + 1}
            </div>
            {i < 2 && <div className="w-8 h-0.5 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Client & Amount */}
      {step === 'client' && (
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Dados da Cobranca</h2>
          <div className="space-y-4">
            <Input
              label="Nome do cliente"
              placeholder="Nome completo ou razao social"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <Input
              label="CPF/CNPJ"
              placeholder="000.000.000-00 ou 00.000.000/0000-00"
              value={clientDoc}
              onChange={(e) => handleDocMask(e.target.value)}
            />
            <Input
              label="E-mail (opcional)"
              placeholder="cliente@email.com"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
            <Input
              label="Valor"
              placeholder="0,00"
              value={amountStr}
              onChange={(e) => handleAmountMask(e.target.value)}
              iconLeft={<span className="text-sm text-text-tertiary">R$</span>}
            />
            <Input
              label="Data de vencimento"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <Input
              label="Descricao (opcional)"
              placeholder="Ex: Servico de consultoria"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button
              onClick={() => setStep('options')}
              disabled={!step1Valid}
              className="w-full"
              icon={<ArrowRight size={16} />}
            >
              Continuar
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Options & Preview */}
      {step === 'options' && (
        <Card>
          <button
            onClick={() => setStep('client')}
            className="flex items-center gap-1 text-sm text-text-tertiary hover:text-text-primary mb-4 transition-colors"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Opcoes e Preview</h2>

          {/* Toggles */}
          <div className="space-y-3 mb-6">
            <label className="flex items-center justify-between p-4 rounded-control bg-background cursor-pointer">
              <div>
                <p className="text-sm font-medium text-text-primary">Juros de mora</p>
                <p className="text-xs text-text-tertiary">1% ao mes apos vencimento</p>
              </div>
              <div
                onClick={() => setJuros(!juros)}
                className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${juros ? 'bg-lime' : 'bg-border'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${juros ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </div>
            </label>
            <label className="flex items-center justify-between p-4 rounded-control bg-background cursor-pointer">
              <div>
                <p className="text-sm font-medium text-text-primary">Multa por atraso</p>
                <p className="text-xs text-text-tertiary">2% sobre o valor</p>
              </div>
              <div
                onClick={() => setMulta(!multa)}
                className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${multa ? 'bg-lime' : 'bg-border'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${multa ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </div>
            </label>
            <label className="flex items-center justify-between p-4 rounded-control bg-background cursor-pointer">
              <div>
                <p className="text-sm font-medium text-text-primary">Desconto para pagamento antecipado</p>
                <p className="text-xs text-text-tertiary">5% ate 3 dias antes</p>
              </div>
              <div
                onClick={() => setDesconto(!desconto)}
                className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${desconto ? 'bg-lime' : 'bg-border'}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${desconto ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
              </div>
            </label>
          </div>

          {/* Preview */}
          <div className="p-4 rounded-control border border-border bg-secondary-bg">
            <p className="text-xs text-text-tertiary uppercase tracking-wider mb-3">Preview do boleto</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-tertiary">Cliente</span>
                <span className="text-text-primary">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Documento</span>
                <span className="text-text-primary">{clientDoc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Valor</span>
                <span className="text-lime font-semibold">{formatCurrency(amountCents)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-tertiary">Vencimento</span>
                <span className="text-text-primary">
                  {new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
              {juros && <div className="flex justify-between"><span className="text-text-tertiary">Juros</span><span className="text-text-secondary">1% a.m.</span></div>}
              {multa && <div className="flex justify-between"><span className="text-text-tertiary">Multa</span><span className="text-text-secondary">2%</span></div>}
              {desconto && <div className="flex justify-between"><span className="text-text-tertiary">Desconto</span><span className="text-text-secondary">5%</span></div>}
            </div>

            {/* Barcode placeholder */}
            <div className="mt-4 p-3 rounded-control bg-background flex items-center justify-center gap-2">
              <FileText size={16} className="text-text-tertiary" />
              <span className="text-xs text-text-tertiary font-mono">||||| |||| ||||| |||| ||||| |||| ||||| ||||</span>
            </div>

            {/* QR Pix placeholder */}
            <div className="mt-2 flex items-center justify-center gap-2 py-2">
              <QrCode size={14} className="text-text-tertiary" />
              <span className="text-xs text-text-tertiary">QR Code Pix disponivel apos emissao</span>
            </div>
          </div>

          {saveError && (
            <div className="mt-4 p-3 rounded-control bg-danger/10 border border-danger/20">
              <p className="text-sm text-danger">{saveError}</p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              onClick={handleCreate}
              loading={saving}
              className="flex-1"
            >
              Emitir Cobranca
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Success */}
      {step === 'success' && result && (
        <Card className="text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Cobranca emitida!</h2>
          <p className="text-text-secondary mt-1">O boleto foi gerado com sucesso</p>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 rounded-control bg-background text-xs text-text-secondary font-mono truncate text-left">
                {result.barcode}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => copyText(result.barcode, 'barcode')}
                icon={<Copy size={14} />}
              >
                {copied === 'barcode' ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>

            <div className="flex gap-3">
              {clientEmail && (
                <Button
                  variant="secondary"
                  className="flex-1"
                  icon={<Mail size={16} />}
                  onClick={() => {/* would trigger email send */}}
                >
                  Enviar por e-mail
                </Button>
              )}
              <Button
                variant="secondary"
                className="flex-1"
                icon={<Link size={16} />}
                onClick={() => copyText(result.link, 'link')}
              >
                {copied === 'link' ? 'Link copiado!' : 'Copiar link'}
              </Button>
            </div>
          </div>

          <Button onClick={resetFlow} variant="secondary" className="w-full mt-6">
            Nova Cobranca
          </Button>
        </Card>
      )}
    </div>
  );
}
