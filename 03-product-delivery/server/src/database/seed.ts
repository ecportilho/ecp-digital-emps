import { getDatabase, closeDatabase } from './connection.js';
import { generateId } from '../shared/utils/uuid.js';
import { generateBarcode, generateDigitableLine } from '../shared/utils/boleto.js';
import bcrypt from 'bcryptjs';

/**
 * Seed data for ECP Emps (PJ)
 *
 * Users and passwords are synchronized with:
 * - ecp-digital-bank (PF): same user IDs, emails, CPFs, password = Senha@123
 * - ecp-digital-food: restaurants map to PJ companies here
 *
 * Mapping: each FoodFlow restaurant owner is a bank PF user who also has a PJ account.
 */

// ─── Shared user IDs (same as ecp-digital-bank PF) ────────────────────────
// These IDs must match the PF system so JWT session sharing works.
// In the real system these come from the PF database; here we use deterministic UUIDs.
const USERS = {
  marina:    { id: 'usr-marina-00000000-0000-0000-000000000001',    name: 'Marina Silva',                cpf: '12345678900',  email: 'marina@email.com',            phone: '+5511999887766' },
  carlos:    { id: 'usr-carlos-00000000-0000-0000-000000000002',    name: 'Carlos Eduardo Mendes',       cpf: '98765432100',  email: 'carlos.mendes@email.com',     phone: '+5521988776655' },
  aisha:     { id: 'usr-aisha-000000000-0000-0000-000000000003',    name: 'Aisha Oliveira Santos',       cpf: '11223344556',  email: 'aisha.santos@email.com',      phone: '+5531977665544' },
  roberto:   { id: 'usr-roberto-0000000-0000-0000-000000000004',    name: 'Roberto Yukio Tanaka',        cpf: '33445566778',  email: 'roberto.tanaka@email.com',    phone: '+5511955443322' },
  francisca: { id: 'usr-francisca-00000-0000-0000-000000000005',    name: 'Francisca das Chagas Lima',   cpf: '55667788990',  email: 'francisca.lima@email.com',    phone: '+5585966554433' },
  lucas:     { id: 'usr-lucas-00000000-0000-0000-000000000006',     name: 'Lucas Gabriel Ndongo',        cpf: '22334455667',  email: 'lucas.ndongo@email.com',      phone: '+5541944332211' },
  patricia:  { id: 'usr-patricia-0000000-0000-0000-000000000007',   name: 'Patricia Werneck de Souza',   cpf: '44556677889',  email: 'patricia.werneck@email.com',  phone: '+5548933221100' },
} as const;

// ─── Companies (7 total: 1 design studio + 6 FoodFlow restaurants) ─────────
interface CompanySeed {
  id: string;
  owner: typeof USERS[keyof typeof USERS];
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  natureza: string;
  endereco: object;
  balance: number; // centavos
  accountNumber: string;
  pixKeys: Array<{ type: string; value: string }>;
}

const COMPANIES: CompanySeed[] = [
  // ── Original: AB Design Studio (Marina) ──
  {
    id: generateId(),
    owner: USERS.marina,
    cnpj: '12345678000195',
    razaoSocial: 'AB Design Studio LTDA',
    nomeFantasia: 'AB Design Studio',
    natureza: 'mei',
    endereco: { logradouro: 'Rua das Flores', numero: '123', complemento: 'Sala 4', bairro: 'Centro', cidade: 'São Paulo', uf: 'SP', cep: '01001-000' },
    balance: 875000,
    accountNumber: '12345678-9',
    pixKeys: [
      { type: 'cnpj', value: '12345678000195' },
      { type: 'email', value: 'financeiro@abdesign.com.br' },
      { type: 'random', value: generateId() },
    ],
  },
  // ── FoodFlow restaurants as PJ companies ──
  {
    id: generateId(),
    owner: USERS.carlos,
    cnpj: '34567890000112',
    razaoSocial: 'Pasta & Fogo Restaurante LTDA',
    nomeFantasia: 'Pasta & Fogo',
    natureza: 'mei',
    endereco: { logradouro: 'Rua Itália', numero: '456', complemento: '', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP', cep: '01310-100' },
    balance: 2345600,
    accountNumber: '20000001-0',
    pixKeys: [
      { type: 'cnpj', value: '34567890000112' },
      { type: 'email', value: 'financeiro@pastaefogo.com.br' },
    ],
  },
  {
    id: generateId(),
    owner: USERS.aisha,
    cnpj: '45678901000123',
    razaoSocial: 'Sushi Wave Gastronomia LTDA',
    nomeFantasia: 'Sushi Wave',
    natureza: 'mei',
    endereco: { logradouro: 'Rua Japão', numero: '789', complemento: 'Loja 2', bairro: 'Liberdade', cidade: 'São Paulo', uf: 'SP', cep: '01508-010' },
    balance: 1876500,
    accountNumber: '20000002-1',
    pixKeys: [
      { type: 'cnpj', value: '45678901000123' },
      { type: 'email', value: 'contato@sushiwave.com.br' },
    ],
  },
  {
    id: generateId(),
    owner: USERS.roberto,
    cnpj: '56789012000134',
    razaoSocial: 'Burger Lab Alimentação EIRELI',
    nomeFantasia: 'Burger Lab',
    natureza: 'ei',
    endereco: { logradouro: 'Av. Paulista', numero: '1000', complemento: 'Térreo', bairro: 'Bela Vista', cidade: 'São Paulo', uf: 'SP', cep: '01310-200' },
    balance: 3567800,
    accountNumber: '20000003-2',
    pixKeys: [
      { type: 'cnpj', value: '56789012000134' },
      { type: 'email', value: 'pagar@burgerlab.com.br' },
      { type: 'phone', value: '+5511955443322' },
    ],
  },
  {
    id: generateId(),
    owner: USERS.francisca,
    cnpj: '67890123000145',
    razaoSocial: 'Green Bowl Alimentação Saudável ME',
    nomeFantasia: 'Green Bowl Co.',
    natureza: 'mei',
    endereco: { logradouro: 'Rua Oscar Freire', numero: '320', complemento: '', bairro: 'Jardins', cidade: 'São Paulo', uf: 'SP', cep: '01426-001' },
    balance: 985400,
    accountNumber: '20000004-3',
    pixKeys: [
      { type: 'cnpj', value: '67890123000145' },
      { type: 'email', value: 'financeiro@greenbowl.com.br' },
    ],
  },
  {
    id: generateId(),
    owner: USERS.lucas,
    cnpj: '78901234000156',
    razaoSocial: 'Pizza Club 24h Pizzaria LTDA',
    nomeFantasia: 'Pizza Club 24h',
    natureza: 'ltda',
    endereco: { logradouro: 'Rua Augusta', numero: '1500', complemento: 'Loja 3', bairro: 'Consolação', cidade: 'São Paulo', uf: 'SP', cep: '01304-001' },
    balance: 4521000,
    accountNumber: '20000005-4',
    pixKeys: [
      { type: 'cnpj', value: '78901234000156' },
      { type: 'email', value: 'contato@pizzaclub24h.com.br' },
      { type: 'phone', value: '+5541944332211' },
    ],
  },
  {
    id: generateId(),
    owner: USERS.patricia,
    cnpj: '89012345000167',
    razaoSocial: 'Brasa & Lenha Churrascaria ME',
    nomeFantasia: 'Brasa & Lenha',
    natureza: 'mei',
    endereco: { logradouro: 'Av. Santo Amaro', numero: '2200', complemento: '', bairro: 'Santo Amaro', cidade: 'São Paulo', uf: 'SP', cep: '04556-100' },
    balance: 5234700,
    accountNumber: '20000006-5',
    pixKeys: [
      { type: 'cnpj', value: '89012345000167' },
      { type: 'email', value: 'financeiro@brasaelenha.com.br' },
    ],
  },
];

// ─── Restaurant-specific transaction templates ─────────────────────────────
function getRestaurantTransactions(companyName: string): Array<{
  type: string; category: string; amount: number; dir: string; desc: string; cpName: string; cpDoc: string;
}> {
  return [
    { type: 'credit', category: 'pix_received', amount: 125000, dir: 'in', desc: `Pix recebido - Pedido #1042`, cpName: 'João da Silva', cpDoc: '11122233344' },
    { type: 'credit', category: 'pix_received', amount: 89900, dir: 'in', desc: `Pix recebido - Pedido #1043`, cpName: 'Fernanda Costa', cpDoc: '22233344455' },
    { type: 'credit', category: 'pix_received', amount: 156000, dir: 'in', desc: `Pix recebido - Pedido #1044`, cpName: 'Ricardo Almeida', cpDoc: '33344455566' },
    { type: 'credit', category: 'pix_received', amount: 210000, dir: 'in', desc: `Pix recebido - FoodFlow repasse semanal`, cpName: 'FoodFlow Pagamentos LTDA', cpDoc: '11223344000155' },
    { type: 'debit', category: 'pix_sent', amount: 350000, dir: 'out', desc: 'Pagamento fornecedor - Alimentos', cpName: 'Distribuidora Sabor LTDA', cpDoc: '55667788000199' },
    { type: 'debit', category: 'pix_sent', amount: 89000, dir: 'out', desc: 'Pagamento fornecedor - Embalagens', cpName: 'Embalagens Express ME', cpDoc: '66778899000100' },
    { type: 'debit', category: 'pix_sent', amount: 45000, dir: 'out', desc: 'Conta de energia', cpName: 'Enel São Paulo', cpDoc: '02558157000162' },
    { type: 'debit', category: 'pix_sent', amount: 32000, dir: 'out', desc: 'Conta de gás', cpName: 'Comgás', cpDoc: '61856571000117' },
    { type: 'debit', category: 'tax', amount: 67000, dir: 'out', desc: `DAS Simples - ${companyName}`, cpName: 'Receita Federal', cpDoc: '' },
    { type: 'credit', category: 'boleto_received', amount: 450000, dir: 'in', desc: 'Boleto pago - Evento corporativo', cpName: 'Empresa ABC LTDA', cpDoc: '99887766000155' },
    { type: 'debit', category: 'card_purchase', amount: 15900, dir: 'out', desc: 'iFood Ads - Campanha mensal', cpName: 'iFood', cpDoc: '14380200000121' },
    { type: 'debit', category: 'pix_sent', amount: 180000, dir: 'out', desc: 'Aluguel do ponto comercial', cpName: 'Imobiliária Centro LTDA', cpDoc: '44556677000188' },
    { type: 'credit', category: 'transfer_pf', amount: 100000, dir: 'in', desc: 'Transferência PF → PJ (aporte)', cpName: `${companyName} (PF)`, cpDoc: '' },
    { type: 'debit', category: 'transfer_pf', amount: 200000, dir: 'out', desc: 'Transferência PJ → PF (pró-labore)', cpName: `${companyName} (PF)`, cpDoc: '' },
  ];
}

// ─── Invoice templates for restaurants ─────────────────────────────────────
function getRestaurantInvoices(companyName: string): Array<{
  customer: string; doc: string; email: string; amount: number; due: string; status: string; paidAmount: number | null;
}> {
  return [
    { customer: 'Empresa ABC LTDA', doc: '99887766000155', email: 'compras@empresaabc.com.br', amount: 450000, due: '2026-03-20', status: 'paid', paidAmount: 450000 },
    { customer: 'Escritório Moderno LTDA', doc: '88776655000144', email: 'adm@escritoriomoderno.com', amount: 280000, due: '2026-03-25', status: 'paid', paidAmount: 280000 },
    { customer: 'Tech Corp SA', doc: '77665544000133', email: 'eventos@techcorp.com', amount: 520000, due: '2026-04-05', status: 'pending', paidAmount: null },
    { customer: 'Startup Hub ME', doc: '66554433000122', email: 'admin@startuphub.co', amount: 185000, due: '2026-03-10', status: 'overdue', paidAmount: null },
  ];
}

function seed(): void {
  const db = getDatabase();

  const existing = db.prepare('SELECT COUNT(*) as count FROM companies').get() as { count: number };
  if (existing.count > 0) {
    console.info('[seed] Database already seeded. Skipping.');
    closeDatabase();
    return;
  }

  console.info('[seed] Seeding database with 7 companies (1 design studio + 6 FoodFlow restaurants)...');

  db.transaction(() => {
    for (const company of COMPANIES) {
      const accountId = generateId();
      const ownerMemberId = generateId();

      // ── Company ──
      db.prepare(`
        INSERT INTO companies (id, owner_user_id, cnpj, razao_social, nome_fantasia, natureza_juridica, endereco, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        company.id, company.owner.id, company.cnpj,
        company.razaoSocial, company.nomeFantasia, company.natureza,
        JSON.stringify(company.endereco), 'active'
      );

      // ── PJ Account ──
      db.prepare(`
        INSERT INTO pj_accounts (id, company_id, agency, number, balance, daily_transfer_limit, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(accountId, company.id, '0001', company.accountNumber, company.balance, 1000000, 'active');

      // ── Owner as team member (Admin) ──
      db.prepare(`
        INSERT INTO team_members (id, company_id, user_id, role, name, email, status, accepted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(ownerMemberId, company.id, company.owner.id, 'admin', company.owner.name, company.owner.email, 'active');

      // ── Pix keys ──
      for (const key of company.pixKeys) {
        db.prepare(`
          INSERT INTO pj_pix_keys (id, company_id, account_id, type, value, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(generateId(), company.id, accountId, key.type, key.value, 'active');
      }

      // ── Corporate card (one per company) ──
      const cardId = generateId();
      const last4 = String(Math.floor(1000 + Math.random() * 9000));
      const hashedCard = bcrypt.hashSync(`5432109876540000${last4}`, 10);
      const usedCents = Math.floor(50000 + Math.random() * 200000);
      db.prepare(`
        INSERT INTO corporate_cards (id, company_id, account_id, holder_id, card_number, last4, card_holder, card_expiry, limit_cents, used_cents, due_day, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(cardId, company.id, accountId, ownerMemberId, hashedCard, last4, company.owner.name.toUpperCase(), '12/2028', 500000, usedCents, 25, 'active');

      // ── Corporate invoice ──
      db.prepare(`
        INSERT INTO corporate_invoices (id, card_id, reference_month, total_cents, due_date, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(generateId(), cardId, '2026-03', usedCents, '2026-04-25', 'open');

      // ── Card purchases ──
      const purchases = [
        { desc: 'iFood Ads', merchant: 'iFood', category: 'marketing', amount: 15900 },
        { desc: 'Material descartável', merchant: 'Kalunga', category: 'supplies', amount: 8500 },
        { desc: 'Conta telefone', merchant: 'Vivo', category: 'telecom', amount: 12900 },
      ];
      for (const p of purchases) {
        db.prepare(`
          INSERT INTO corporate_card_purchases (id, card_id, company_id, description, merchant_name, merchant_category, amount, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(generateId(), cardId, company.id, p.desc, p.merchant, p.category, p.amount, 'completed');
      }

      // ── Invoices (boletos) ──
      const isDesignStudio = company.cnpj === '12345678000195';
      const invoices = isDesignStudio
        ? [
            { customer: 'Tech Solutions LTDA', doc: '98765432000188', email: 'financeiro@techsol.com.br', amount: 350000, due: '2026-03-15', status: 'paid', paidAmount: 350000 },
            { customer: 'Maria Santos ME', doc: '11222333000144', email: 'maria@santos.com.br', amount: 150000, due: '2026-03-20', status: 'paid', paidAmount: 150000 },
            { customer: 'Carlos Ferreira', doc: '12345678901', email: 'carlos@email.com', amount: 250000, due: '2026-02-28', status: 'overdue', paidAmount: null },
            { customer: 'Nova Mídia Digital', doc: '55667788000199', email: 'pagar@novamidia.com.br', amount: 480000, due: '2026-04-10', status: 'pending', paidAmount: null },
            { customer: 'Startup XYZ LTDA', doc: '99887766000155', email: 'fin@startupxyz.io', amount: 120000, due: '2026-04-15', status: 'pending', paidAmount: null },
          ]
        : getRestaurantInvoices(company.nomeFantasia);

      for (const inv of invoices) {
        const barcode = generateBarcode(inv.amount, inv.due);
        const digitableLine = generateDigitableLine(barcode);
        db.prepare(`
          INSERT INTO invoices (id, company_id, account_id, operator_id, customer_name, customer_document, customer_email, amount, due_date, description, barcode, digitable_line, status, paid_at, paid_amount, notification_sent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          generateId(), company.id, accountId, company.owner.id,
          inv.customer, inv.doc, inv.email, inv.amount, inv.due,
          isDesignStudio ? `Serviços de design - ${inv.customer}` : `Serviço de alimentação - ${inv.customer}`,
          barcode, digitableLine, inv.status,
          inv.status === 'paid' ? '2026-03-18T10:30:00Z' : null,
          inv.paidAmount, inv.status === 'paid' ? 1 : 0
        );
      }

      // ── Transactions ──
      const txs = isDesignStudio
        ? [
            { type: 'credit', category: 'pix_received', amount: 350000, dir: 'in', desc: 'Pix recebido - Tech Solutions', cpName: 'Tech Solutions LTDA', cpDoc: '98765432000188' },
            { type: 'debit', category: 'pix_sent', amount: 85000, dir: 'out', desc: 'Pix enviado - Fornecedor gráfica', cpName: 'Gráfica Express', cpDoc: '44556677000122' },
            { type: 'credit', category: 'boleto_received', amount: 150000, dir: 'in', desc: 'Boleto pago - Maria Santos', cpName: 'Maria Santos ME', cpDoc: '11222333000144' },
            { type: 'debit', category: 'card_purchase', amount: 28900, dir: 'out', desc: 'Adobe Creative Cloud', cpName: 'Adobe Systems', cpDoc: '' },
            { type: 'credit', category: 'pix_received', amount: 250000, dir: 'in', desc: 'Pix recebido - Cliente avulso', cpName: 'Pedro Almeida', cpDoc: '98765432100' },
            { type: 'debit', category: 'pix_sent', amount: 120000, dir: 'out', desc: 'Pagamento fornecedor papel', cpName: 'Papelaria Central LTDA', cpDoc: '33445566000177' },
            { type: 'credit', category: 'transfer_pf', amount: 500000, dir: 'in', desc: 'Transferência PF → PJ', cpName: 'Marina Silva (PF)', cpDoc: '12345678900' },
            { type: 'debit', category: 'tax', amount: 32000, dir: 'out', desc: 'DAS MEI - Março/2026', cpName: 'Receita Federal', cpDoc: '' },
            { type: 'credit', category: 'pix_received', amount: 180000, dir: 'in', desc: 'Pix recebido - Projeto branding', cpName: 'Café & Cia LTDA', cpDoc: '77889900000111' },
            { type: 'debit', category: 'transfer_pf', amount: 200000, dir: 'out', desc: 'Transferência PJ → PF', cpName: 'Marina Silva (PF)', cpDoc: '12345678900' },
          ]
        : getRestaurantTransactions(company.owner.name);

      let runningBalance = company.balance;
      for (const tx of txs) {
        if (tx.dir === 'in') {
          runningBalance += tx.amount;
        } else {
          runningBalance -= tx.amount;
        }
        db.prepare(`
          INSERT INTO pj_transactions (id, account_id, operator_id, type, category, amount, balance_after, direction, description, counterpart_name, counterpart_document, reference_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          generateId(), accountId, company.owner.id,
          tx.type, tx.category, tx.amount, runningBalance, tx.dir,
          tx.desc, tx.cpName, tx.cpDoc, generateId(), 'completed'
        );
      }

      // ── Notifications ──
      const notifications = [
        { title: 'Bem-vindo ao ECP Emps!', body: `Sua conta PJ ${company.nomeFantasia} está ativa.`, type: 'system' },
        { title: 'Pix recebido', body: `Você recebeu um Pix de R$ 1.250,00`, type: 'transaction' },
        { title: 'DAS disponível', body: `O boleto do DAS de Março/2026 está disponível`, type: 'system' },
      ];
      for (const n of notifications) {
        db.prepare(`
          INSERT INTO pj_notifications (id, company_id, user_id, title, body, type, is_read)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(generateId(), company.id, null, n.title, n.body, n.type, 0);
      }

      // ── Audit log ──
      db.prepare(`
        INSERT INTO pj_audit_logs (id, company_id, user_id, action, resource, resource_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(generateId(), company.id, company.owner.id, 'create_company', 'company', company.id, JSON.stringify({ cnpj: company.cnpj }));

      console.info(`  ✓ ${company.nomeFantasia} (${company.cnpj}) — owner: ${company.owner.name}`);
    }
  })();

  closeDatabase();
  console.info(`[seed] Done. ${COMPANIES.length} companies seeded successfully.`);
  console.info('[seed] Mapping FoodFlow restaurants → ECP Emps PJ:');
  console.info('  Pasta & Fogo     → Carlos Eduardo Mendes  (carlos.mendes@email.com)');
  console.info('  Sushi Wave       → Aisha Oliveira Santos  (aisha.santos@email.com)');
  console.info('  Burger Lab       → Roberto Yukio Tanaka   (roberto.tanaka@email.com)');
  console.info('  Green Bowl Co.   → Francisca das Chagas   (francisca.lima@email.com)');
  console.info('  Pizza Club 24h   → Lucas Gabriel Ndongo   (lucas.ndongo@email.com)');
  console.info('  Brasa & Lenha    → Patricia Werneck       (patricia.werneck@email.com)');
}

seed();
