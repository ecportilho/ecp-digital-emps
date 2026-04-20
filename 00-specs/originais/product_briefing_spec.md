# ECP Emps — Product Briefing & Especificação Funcional

> **Versão:** 1.0  
> **Data:** 28/03/2026  
> **Status:** Em desenvolvimento  
> **Repositório:** `ecp-digital-bank-emps`

---

## 1. Visão Geral do Produto

O **ECP Emps** é um banco digital web-first para microempreendedores individuais (MEIs) e microempresas brasileiras, focado em simplificar a gestão financeira empresarial com inteligência e transparência. Faz parte do ecossistema ECP, integrando-se ao **ecp-digital-bank** (conta PF) para oferecer uma experiência unificada onde o empreendedor gerencia finanças pessoais e do negócio em um único ambiente.

O produto resolve um problema central: **MEIs e microempreendedores pagam caro por serviços bancários ruins, não conseguem separar gastos pessoais dos empresariais, e perdem horas com burocracia financeira que não gera valor para o negócio.**

A aplicação é composta por uma **API back-end** (Fastify + SQLite3) e um **front-end web SPA** (React + Vite), seguindo a mesma arquitetura e identidade visual do ecp-digital-bank. As contas PF e PJ compartilham o mesmo app, alternando entre perfis — exatamente como o Nubank faz com a conta Nu Empresas.

---

## 2. Pesquisa de Mercado

### 2.1. Cenário Competitivo — Bancos Digitais PJ no Brasil (2026)

| Player | Clientes PJ | Foco | Pix PJ gratuito | Boleto gratuito | NF-e integrada | Gestão financeira | Web Desktop |
|--------|-------------|------|-----------------|-----------------|----------------|-------------------|-------------|
| **Nubank PJ** | 15M+ | MEI, EI, LTDA | Sim (ilimitado) | Sim | Não | Básica | Parcial |
| **Cora** | 1.4M+ | PMEs (Simples) | Sim | Sim (100/mês grátis) | Sim (pago) | Cora Pro (pago) | App + CoraWeb |
| **Inter PJ** | 5M+ | MEI a grande | Sim | Sim | Não | Básica | Parcial |
| **C6 Bank PJ** | 3M+ | MEI a média | Sim | Pago | Não | Básica | Não |
| **Stone (Ton)** | 2M+ | MEI, autônomos | Integrado maquininha | Sim | Não | Integrada a vendas | Não |
| **PagBank PJ** | 8M+ | MEI, micro | Sim | Sim | Não | Básica | Parcial |
| **Conta Simples** | 200K+ | PMEs | Sim | Sim | Não | Avançada (categorias) | Sim (web) |
| **ECP Emps** | MVP | MEI, micro | Sim (ilimitado) | Sim (ilimitado) | Sim (MVP) | Inteligente + ciclo | **Sim (web-first)** |

### 2.2. Como o Nubank construiu a conta PJ

O Nubank lançou a conta PJ em 2019, inicialmente só para MEIs com sócio único. A estratégia foi:

1. **Alavancagem da base PF:** Exigiu que o empreendedor já fosse cliente PF para abrir a PJ. Isso reduziu custo de aquisição e garantiu KYC já validado.
2. **Produto mínimo:** Lançou apenas com conta + Pix + cartão débito. Crédito e boletos vieram depois.
3. **Mesma interface:** PF e PJ coexistem no mesmo app, alternando com um toggle no topo.
4. **Acesso compartilhado:** Sócios e funcionários podem ter perfis com permissões diferentes.
5. **NuTap:** Funcionalidade de maquininha no celular, eliminando hardware.
6. **Zero taxas:** Conta sem mensalidade, Pix e TED gratuitos — monetização via crédito e float.

**Limitações identificadas:** Sem gestão de fluxo de caixa, sem emissão de NF-e, sem categorização inteligente de despesas, sem integração com sistemas contábeis, web desktop extremamente limitado.

### 2.3. Lições da Cora (referência para PJ-first)

A Cora é a principal referência no segmento PJ-first brasileiro:

1. **Nasceu exclusivamente PJ:** Diferente do Nubank que adaptou PF para PJ, a Cora construiu tudo pensando nas dores do empreendedor.
2. **Gestão de cobranças:** Boletos com QR Code Pix, cobranças recorrentes, parcelamento em boleto (carnê), notificações automáticas.
3. **NF-e integrada:** Emissão de nota fiscal de serviço diretamente na plataforma, vinculada à cobrança.
4. **Programa de parceiros (Coraliados):** Contadores e consultores financeiros como canal de aquisição.
5. **Perfil de acesso contador:** Dá ao contador acesso direto à área financeira da empresa.
6. **Cora Pro:** Plano pago com automações, dashboards avançados e acesso via API.

**Números relevantes:** 1,4M de empresas clientes, 5% das PMEs do Brasil. Receita cresceu 74% de 2022 para 2023. É a SCD com maior volume de depósitos no país (BCB).

### 2.4. Gaps universais identificados

| Gap | Descrição | Oportunidade ECP Emps |
|-----|-----------|----------------------|
| **Web-first** | Nenhum concorrente PJ oferece experiência bancária completa no desktop | Dashboard financeiro empresarial nativo para 1280px+ |
| **Gestão inteligente** | Categorização de despesas inexistente ou manual | Auto-categorização de gastos PJ com IA |
| **Ciclo de faturamento** | Todos organizam por mês-calendário | Visão por ciclo de recebimento do MEI |
| **Integração PF-PJ** | Nubank faz, mas sem visão consolidada | Dashboard unificado: "quanto sobra depois do negócio e do pessoal" |
| **Separação PF/PJ** | MEIs misturam gastos pessoais e do negócio | Detecção e alerta de gastos misturados |

### 2.5. Dimensionamento do Mercado

| Métrica | Valor | Fonte |
|---------|-------|-------|
| MEIs ativos no Brasil | 16,3 milhões | Portal do Empreendedor, 2025 |
| Microempresas ativas (ME) | 7,2 milhões | IBGE/Receita Federal, 2024 |
| Total MEI + ME (público-alvo) | 23,5 milhões | Cálculo |
| % com conta PJ digital | ~35% | Estimativa Banco Central 2025 |
| % insatisfeitos com banco atual | ~48% | SEBRAE 2024 |
| **TAM** | R$ 42 bilhões | Receita potencial de serviços financeiros para MEI+ME |
| **SAM** | R$ 16,8 bilhões | 40% do TAM (digitalmente ativos, insatisfeitos) |
| **SOM** (3 anos) | R$ 84-168 milhões | 0,5-1% do SAM. 100K-200K clientes, ARPAC R$ 840/ano |

---

## 3. Público-Alvo

### 3.1. Segmento Primário — MEI (Microempreendedor Individual)

- **Perfil:** 22-45 anos, faturamento até R$ 81.000/ano
- **Atividades típicas:** Serviços (design, dev, marketing, consultoria), comércio pequeno, alimentação, beleza
- **Dores:** Mistura gastos PF/PJ, não sabe quanto o negócio realmente fatura, paga caro por serviços bancários básicos, perde tempo com burocracia de boletos e NF
- **Comportamento:** 65% usam o celular pessoal como ferramenta de trabalho, 73% não têm controle financeiro formal

### 3.2. Segmento Secundário — Microempresa (ME)

- **Perfil:** 1-5 funcionários, faturamento até R$ 360.000/ano
- **Atividades típicas:** Prestação de serviços, comércio local, e-commerce pequeno
- **Dores:** Gestão de múltiplos sócios/funcionários com acesso à conta, conciliação bancária manual, dificuldade de crédito
- **Comportamento:** 58% usam planilhas para controle financeiro, 42% não separam conta PF da PJ

---

## 4. Funcionalidades Principais (MVP)

### 4.1. Conta Digital PJ

- Abertura 100% digital com CNPJ (MEI, EI, EIRELI, LTDA, SLU)
- Saldo em tempo real com rendimento automático (CDI)
- Extrato inteligente com categorização automática de despesas
- Agência fixa: `0001` | Conta: 8 dígitos + dígito verificador (mesma lógica do PF)
- Multi-usuários com perfis de acesso (Admin, Financeiro, Visualizador)

### 4.2. Pix Empresarial

- Enviar e receber Pix ilimitado e gratuito
- Chaves Pix: CNPJ (obrigatória) + e-mail + telefone + aleatória (máx 20 chaves PJ por regulamentação BCB)
- QR Code estático e dinâmico para cobranças
- Pix Copia e Cola com valor pré-definido
- Comprovantes com dados fiscais (CNPJ emissor/receptor)

### 4.3. Emissão de Boletos

- Boletos registrados com código de barras + QR Code Pix
- Boletos avulsos, parcelados (carnê) e recorrentes
- Configuração de juros, multa e desconto por antecipação
- Notificações automáticas de cobrança (e-mail/SMS)
- Conciliação automática: boleto pago = baixa no extrato + notificação

### 4.4. Cartão Corporativo Virtual

- Cartão Visa/Mastercard virtual para compras online
- Múltiplos cartões: 1 por sócio/funcionário autorizado (máx 5 no MVP)
- Limite independente por cartão (controlado pelo admin)
- Bloqueio/desbloqueio instantâneo
- Categorização automática de compras
- Fatura empresarial com fechamento configurável (dia 5, 15 ou 25)

### 4.5. Integração PF-PJ (Ecossistema ECP)

- Toggle PF/PJ no mesmo app (mesma sessão, mesmo login)
- Dashboard consolidado: visão do saldo PF + PJ lado a lado
- Transferência instantânea entre conta PF e PJ (mesma titularidade)
- Alerta de "gasto pessoal na conta PJ" (detecção por merchant category)

### 4.6. Gestão Financeira Básica

- Dashboard com entradas vs. saídas do período
- Categorias automáticas: Fornecedores, Impostos, Aluguel, Marketing, Funcionários, Operacional, Outros
- Gráfico de fluxo de caixa (últimos 30/60/90 dias)
- Alerta de saldo baixo configurável

---

## 5. Regras de Negócio

| ID | Regra | Descrição |
|----|-------|-----------|
| RN-01 | Limite diário Pix PJ (diurno) | R$ 10.000,00 por dia (6h–22h). Configurável pelo admin até o máximo |
| RN-02 | Limite noturno Pix PJ | R$ 2.000,00 por transação (22h–6h) |
| RN-03 | Autenticação reforçada | Transações acima de R$ 5.000,00 exigem confirmação adicional |
| RN-04 | Saldo insuficiente | Pix e pagamentos bloqueados se saldo < valor |
| RN-05 | Chaves Pix PJ | Máximo 20 chaves (regulamentação BCB para PJ) |
| RN-06 | Cartão corporativo | Limite independente por cartão. Fatura fecha em dia configurável |
| RN-07 | Soft delete | Nenhum registro é deletado fisicamente |
| RN-08 | Idempotência | Toda transação possui `idempotency_key` UUID |
| RN-09 | Valores monetários | Sempre `integer` em centavos. Front-end converte para exibição |
| RN-10 | Rate limiting | Máx 20 Pix/hora por empresa (PJ tem volume maior que PF) |
| RN-11 | Multi-usuários | Admin: acesso total. Financeiro: transações + extrato. Visualizador: só leitura |
| RN-12 | Abertura de conta | Requer CNPJ ativo + CPF do responsável legal já validado no ecp-digital-bank |
| RN-13 | Transferência PF↔PJ | Instantânea e gratuita entre contas de mesma titularidade (mesmo CPF) |
| RN-14 | Boleto emitido | Validade padrão 30 dias. Juros: 1% a.m. Multa: 2%. Configurável |
| RN-15 | Comprovantes | Todo Pix e boleto gera comprovante com CNPJ, razão social e dados fiscais |

---

## 6. Personas

### P-01 — Persona Primária (MVP)

**Ana Beatriz Rodrigues, 29 anos — Designer Freelancer (MEI)**

- **CNPJ:** MEI — Design gráfico e marketing digital
- **Faturamento:** R$ 4.500/mês (variável)
- **Clientes:** 8-12 ativos por mês, todos pagam via Pix ou boleto
- **Contexto:** Trabalha 100% do computador (home office). Usa Nubank PF + conta PJ no Inter que quase não movimenta. Faz 15-20 Pix/semana. Mistura gastos pessoais e do negócio no cartão PF.
- **Frustrações:** Não sabe quanto realmente lucra por mês. Emitir boleto de cobrança é burocrático. Paga R$ 2 por boleto no Inter. Não tem visão de fluxo de caixa. A conta PJ do Inter não funciona bem no desktop.
- **Objetivos:** Separar finanças PF/PJ sem esforço. Cobrar clientes de forma profissional. Saber em tempo real o lucro do mês. Tudo pelo computador.
- **Quote:** _"Eu sei que sou MEI e deveria ter controle financeiro, mas toda vez que tento separar as coisas, desisto em 3 dias. Se o banco fizesse isso por mim, automaticamente, eu pagaria por isso."_

### P-02 — Persona Primária (MVP)

**Lucas Ferreira, 34 anos — Dono de Hamburgueria Artesanal (MEI → ME em transição)**

- **CNPJ:** MEI (prestes a desenquadrar para ME)
- **Faturamento:** R$ 7.000/mês (crescendo 15% a.m.)
- **Contexto:** 1 funcionário informal, 2 entregadores parceiros. Recebe 70% via Pix, 30% iFood. Usa PagBank PJ. Emite NF-e pelo portal da prefeitura (lento e confuso).
- **Frustrações:** Não sabe quanto gasta com fornecedores vs. quanto recebe. Conciliação do iFood com o extrato é manual. Boletos de cobrança para clientes B2B (buffets) são complicados. Cartão PJ do PagBank tem limite baixo.
- **Objetivos:** Gestão de cobranças simples (Pix + boleto). Visão de "quanto entrou vs. quanto saiu" por categoria. Cartão com limite decente para comprar insumos.
- **Quote:** _"Meu negócio tá crescendo, mas eu sinto que tô perdendo dinheiro em algum lugar. Só que não tenho tempo de sentar e fazer planilha."_

### P-03 — Persona Secundária

**Mariana e Thiago, 31 e 33 anos — Sócios de Agência de Marketing (LTDA)**

- **CNPJ:** LTDA com 2 sócios
- **Faturamento:** R$ 25.000/mês
- **Funcionários:** 3 CLT + 2 freelancers
- **Contexto:** Ambos precisam acessar a conta. Thiago cuida do financeiro, Mariana faz pagamentos pontuais a fornecedores. Usam Cora + planilha de fluxo de caixa manual.
- **Frustrações:** Cora não deixa dar acesso parcial (só leitura) para a assistente administrativa. Não conseguem separar "gastos de projeto" de "gastos fixos". Querem 2 cartões (1 para cada sócio) com limites diferentes.
- **Objetivos:** Multi-acesso com permissões. Cartões separados por sócio. Categorização automática.

---

## 7. Fluxos Principais (User Journeys)

### 7.1. Abertura de Conta PJ

1. Usuário já autenticado no ecp-digital-bank (PF)
2. Clica em "Abrir conta empresarial" → Toggle no header
3. Informa CNPJ → Consulta automática na Receita Federal (mock no MVP)
4. Confirma dados da empresa (razão social, natureza jurídica, endereço)
5. Se MEI de sócio único: aprovação imediata
6. Se LTDA/SLU: upload de contrato social (mock no MVP)
7. Conta PJ criada → Dashboard empresarial com tour guiado
8. Oferta: "Registre sua primeira chave Pix CNPJ agora"

### 7.2. Cobrança via Boleto

1. Acessa "Cobranças" → "Novo boleto"
2. Informa: cliente (nome/CNPJ/CPF), valor, vencimento, descrição
3. Configura: juros, multa, desconto por antecipação (toggle com valores padrão)
4. Preview do boleto com QR Code Pix embutido
5. Envia por e-mail ou copia link de pagamento
6. Sistema monitora: boleto pago → notificação + baixa automática no extrato
7. Se vencido: régua de cobrança automática (D+1, D+3, D+7)

### 7.3. Gestão de Cartões Corporativos

1. Admin acessa "Cartões" → "Novo cartão virtual"
2. Seleciona titular: sócio existente ou convida novo usuário (e-mail)
3. Define limite mensal do cartão individual
4. Cartão gerado instantaneamente → titular recebe por e-mail/push
5. Admin pode: ajustar limite, bloquear, cancelar a qualquer momento
6. Compras do cartão aparecem no extrato com categoria automática
7. Fatura consolidada por cartão no dia de fechamento configurado

---

## 8. Integração com o Ecossistema ECP

### 8.1. Relação com ecp-digital-bank (PF)

| Aspecto | PF (ecp-digital-bank) | PJ (ecp-digital-bank-emps) |
|---------|----------------------|---------------------------|
| Autenticação | JWT com CPF | Mesmo JWT, com campo `activeProfile: "pf" \| "pj"` |
| Banco de dados | `database.sqlite` | `database-emps.sqlite` (separado, mesmo servidor) |
| API | `localhost:3333` | `localhost:3334` (porta diferente) |
| Frontend | SPA em `localhost:5173` | SPA em `localhost:5174` ou rota `/emps` no mesmo app |
| Código compartilhado | — | Componentes UI, utils, formatters via import direto |

### 8.2. APIs compartilhadas

- **Auth:** O login é feito no ecp-digital-bank (PF). A conta PJ herda a sessão autenticada.
- **Pix:** Infra Pix compartilhada. O módulo Pix do PJ reutiliza a lógica core, adicionando campos PJ (CNPJ, razão social).
- **Transferência PF↔PJ:** API dedicada para transferência entre contas de mesma titularidade.

---

## 9. Métricas de Sucesso (MVP)

| Métrica | Meta | Como medir |
|---------|------|-----------|
| Contas PJ abertas (30 dias) | 500 | Contagem de registros `accounts` com `type = "pj"` |
| Taxa de ativação PJ | 35% | % de contas que fazem 3+ operações em 7 dias |
| Pix PJ / semana / empresa | 5+ | Média de transações Pix por empresa ativa |
| Boletos emitidos / mês | 1.000+ | Contagem de boletos com `status != cancelled` |
| Toggle PF↔PJ / sessão | 2+ | Média de switches entre perfis por sessão |
| Retenção D30 PJ | 45% | % de empresas que fazem login no dia 30 |

---

*Documento gerado para o projeto ECP Emps — v1.0*  
*Ecossistema ECP: ecp-digital-bank (PF) + ecp-digital-bank-emps (PJ)*
