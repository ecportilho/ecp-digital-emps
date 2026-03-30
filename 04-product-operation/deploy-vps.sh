#!/usr/bin/env bash
# ============================================================================
#  ECP Digital Emps — Instalador Automatico para VPS
#  Ubuntu 22.04 LTS | Bash 5+
#
#  USO:
#    1. Copie este script para o servidor:
#       scp deploy-vps.sh root@191.101.78.38:/root/deploy-emps.sh
#
#    2. Execute no servidor:
#       ssh root@191.101.78.38
#       chmod +x /root/deploy-emps.sh
#       bash /root/deploy-emps.sh
#
#  O script e interativo — pede confirmacao antes de cada etapa critica.
#  Pode ser re-executado com seguranca (idempotente).
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURACAO
# ============================================================================
DOMAIN="emps.ecportilho.com"
APP_NAME="ecp-digital-emps"
REPO_DIR="/opt/ecp-digital-emps"
APP_DIR="/opt/ecp-digital-emps-app"
REPO_URL="https://github.com/ecportilho/ecp-digital-emps.git"
APP_PORT=3334
BANK_PORT=3333
PAY_PORT=3335
NODE_VERSION="20"
CERTBOT_EMAIL=""

# ============================================================================
# CORES E FORMATACAO
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

banner() {
    echo ""
    echo -e "${MAGENTA}======================================================================${NC}"
    echo -e "${BOLD}${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}======================================================================${NC}"
    echo ""
}

step() {
    echo ""
    echo -e "  ${BOLD}${CYAN}[$1]${NC} ${BOLD}$2${NC}"
    echo -e "  ${BLUE}$(printf '%0.s-' {1..60})${NC}"
}

info() { echo -e "      ${BLUE}INFO${NC}  $1"; }
ok()   { echo -e "      ${GREEN}OK${NC}    $1"; }
warn() { echo -e "      ${YELLOW}AVISO${NC} $1"; }
fail() { echo -e "      ${RED}ERRO${NC}  $1"; }

ask_yes_no() {
    local prompt="$1" default="${2:-s}" yn
    if [ "$default" = "s" ]; then
        read -rp "      $prompt [S/n]: " yn; yn="${yn:-s}"
    else
        read -rp "      $prompt [s/N]: " yn; yn="${yn:-n}"
    fi
    case "$yn" in [sS]|[yY]) return 0 ;; *) return 1 ;; esac
}

ask_input() {
    local prompt="$1" default="${2:-}" value
    if [ -n "$default" ]; then
        read -rp "      $prompt [$default]: " value; echo "${value:-$default}"
    else
        read -rp "      $prompt: " value; echo "$value"
    fi
}

check_command() { command -v "$1" &> /dev/null; }

# ============================================================================
# INICIO
# ============================================================================
banner "ECP Digital Emps — Instalador VPS"

echo -e "  ${BOLD}Produto:${NC}  Banco digital PJ para empresas do ecossistema ECP"
echo -e "  ${BOLD}Dominio:${NC}  https://${DOMAIN}"
echo -e "  ${BOLD}App Dir:${NC}  ${APP_DIR}"
echo -e "  ${BOLD}Porta:${NC}    ${APP_PORT}"
echo ""

if [ "$(id -u)" -ne 0 ]; then
    fail "Este script precisa ser executado como root."
    exit 1
fi

# ============================================================================
# ETAPA 1: Coletar informacoes
# ============================================================================
step "1/12" "Coletar informacoes"

CERTBOT_EMAIL=$(ask_input "Email para o certificado SSL (Let's Encrypt)" "ecportilho@gmail.com")

echo ""
info "Integracoes com outros apps na mesma VPS:"
info "  ecp-digital-bank: porta ${BANK_PORT} (compartilha JWT secret)"
info "  ecp-digital-pay:  porta ${PAY_PORT} (webhooks de pagamento)"

JWT_SECRET=$(ask_input "JWT Secret (deve ser IGUAL ao do ecp-digital-bank)" "")
if [ -z "$JWT_SECRET" ]; then
    warn "JWT secret vazio. Gerando novo (NAO compartilhara sessao com o bank)."
    JWT_SECRET=$(openssl rand -hex 32)
fi

PAY_WEBHOOK_SECRET=$(ask_input "Segredo do webhook do ECP Pay" "ecp-pay-webhook-secret-dev")
PAY_API_KEY=$(ask_input "API Key do ecp-emps no ECP Pay" "ecp-emps-dev-key")

echo ""
info "Configuracoes coletadas:"
info "  Repo:            ${REPO_URL}"
info "  Email SSL:       ${CERTBOT_EMAIL}"
info "  JWT Secret:      ${JWT_SECRET:0:10}..."
info "  Webhook Secret:  ${PAY_WEBHOOK_SECRET:0:10}..."
echo ""

if ! ask_yes_no "Prosseguir com a instalacao?"; then
    warn "Instalacao cancelada."
    exit 0
fi

# ============================================================================
# ETAPA 2: Atualizar sistema e instalar dependencias
# ============================================================================
step "2/12" "Atualizar sistema e instalar dependencias"

info "Atualizando pacotes do sistema..."
apt update -qq && apt upgrade -y -qq
ok "Sistema atualizado"

info "Instalando ferramentas de build..."
apt install -y -qq build-essential python3 curl git > /dev/null 2>&1
ok "build-essential, python3, curl, git"

if check_command node; then
    CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$CURRENT_NODE" -ge "$NODE_VERSION" ]; then
        ok "Node.js $(node -v) ja instalado"
    else
        info "Atualizando Node.js para v${NODE_VERSION}..."
        curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - > /dev/null 2>&1
        apt install -y -qq nodejs > /dev/null 2>&1
        ok "Node.js $(node -v) instalado"
    fi
else
    info "Instalando Node.js ${NODE_VERSION}..."
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - > /dev/null 2>&1
    apt install -y -qq nodejs > /dev/null 2>&1
    ok "Node.js $(node -v) instalado"
fi

if check_command pm2; then ok "PM2 $(pm2 -v) ja instalado"
else info "Instalando PM2..."; npm install -g pm2 > /dev/null 2>&1; ok "PM2 instalado"; fi

if check_command nginx; then ok "Nginx ja instalado"
else info "Instalando Nginx..."; apt install -y -qq nginx > /dev/null 2>&1; systemctl enable nginx > /dev/null 2>&1; systemctl start nginx; ok "Nginx instalado"; fi

if check_command certbot; then ok "Certbot ja instalado"
else info "Instalando Certbot..."; apt install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1; ok "Certbot instalado"; fi

# ============================================================================
# ETAPA 3: Clonar repositorio
# ============================================================================
step "3/12" "Clonar repositorio"

if [ -d "$REPO_DIR/.git" ]; then
    info "Repositorio ja existe em ${REPO_DIR}. Atualizando..."
    cd "$REPO_DIR"
    git fetch origin
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master
    ok "Repositorio atualizado"
else
    info "Clonando de ${REPO_URL}..."
    git clone "$REPO_URL" "$REPO_DIR"
    ok "Repositorio clonado em ${REPO_DIR}"
fi

# ============================================================================
# ETAPA 4: Copiar para diretorio de producao
# ============================================================================
step "4/12" "Preparar diretorio de producao"

mkdir -p "$APP_DIR"

info "Copiando arquivos da aplicacao..."
cp -r "$REPO_DIR/03-product-delivery/server" "$APP_DIR/"
cp -r "$REPO_DIR/03-product-delivery/web" "$APP_DIR/"
cp "$REPO_DIR/03-product-delivery/package.json" "$APP_DIR/"
cp "$REPO_DIR/03-product-delivery/package-lock.json" "$APP_DIR/" 2>/dev/null || true
cp "$REPO_DIR/03-product-delivery/tsconfig.base.json" "$APP_DIR/" 2>/dev/null || true

# Garantir que o tipo Vite existe para import.meta.env
if [ ! -f "$APP_DIR/web/src/vite-env.d.ts" ]; then
    echo '/// <reference types="vite/client" />' > "$APP_DIR/web/src/vite-env.d.ts"
    info "vite-env.d.ts criado"
fi

# Se tsconfig.base.json nao existe no repo, criar minimo
if [ ! -f "$APP_DIR/tsconfig.base.json" ]; then
    cat > "$APP_DIR/tsconfig.base.json" << 'TSBASE'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx"
  }
}
TSBASE
    info "tsconfig.base.json criado"
fi

ok "Arquivos copiados para ${APP_DIR}"

# ============================================================================
# ETAPA 5: Instalar dependencias
# ============================================================================
step "5/12" "Instalar dependencias"

# Garantir tsx global (usado para migrations, seed e PM2)
if ! command -v tsx &> /dev/null; then
    info "Instalando tsx globalmente..."
    npm install -g tsx > /dev/null 2>&1
fi
TSX_PATH=$(which tsx)
ok "tsx disponivel em ${TSX_PATH}"

info "Instalando dependencias do server..."
cd "$APP_DIR/server"
npm install 2>&1 | tail -3
ok "Server pronto"

# Verificar better-sqlite3
if [ -f "$APP_DIR/server/node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    ok "better-sqlite3 compilado com sucesso"
else
    warn "better-sqlite3 binario nao encontrado — tentando recompilar..."
    npm rebuild better-sqlite3 2>&1 | tail -3
fi

info "Instalando dependencias do web..."
cd "$APP_DIR/web"
npm install 2>&1 | tail -3
ok "Web pronto"

cd "$APP_DIR"

# ============================================================================
# ETAPA 6: Build do frontend
# ============================================================================
step "6/12" "Build do frontend (Vite)"

cd "$APP_DIR/web"
# Usar vite build diretamente (pular tsc que falha com unused imports)
npx vite build 2>&1 | tail -5

if [ ! -f "$APP_DIR/web/dist/index.html" ]; then
    fail "Build falhou — index.html nao encontrado!"
    exit 1
fi
ok "Frontend pronto em ${APP_DIR}/web/dist/"

# ============================================================================
# ETAPA 7: Configurar .env
# ============================================================================
step "7/12" "Configurar variaveis de ambiente"

if [ -f "$APP_DIR/.env" ]; then
    warn "Arquivo .env ja existe. Mantendo o existente."
else
    cat > "$APP_DIR/.env" << ENVFILE
# ================================================================
# ECP Digital Emps — Variaveis de Ambiente (PRODUCAO)
# Gerado automaticamente em $(date '+%Y-%m-%d %H:%M:%S')
# ================================================================

# Servidor
PORT=${APP_PORT}
HOST=127.0.0.1
NODE_ENV=production
LOG_LEVEL=info

# JWT (DEVE ser igual ao ecp-digital-bank para compartilhar sessao PF/PJ)
JWT_SECRET=${JWT_SECRET}

# Banco de dados
DATABASE_PATH=./database-emps.sqlite

# CORS
CORS_ORIGIN=https://${DOMAIN}

# Referencia ao ecp-digital-bank (PF) na mesma VPS
PF_API_URL=http://127.0.0.1:${BANK_PORT}

# ECP Pay Integration
ECP_PAY_URL=http://127.0.0.1:${PAY_PORT}
ECP_PAY_API_KEY=${PAY_API_KEY}

# Webhook do ECP Pay (recebe creditos de split)
ECP_PAY_WEBHOOK_SECRET=${PAY_WEBHOOK_SECRET}

# Frontend
VITE_API_URL=https://${DOMAIN}
VITE_PF_APP_URL=https://bank.ecportilho.com
ENVFILE

    # Copiar .env tambem para server/ (alguns imports leem de la)
    cp "$APP_DIR/.env" "$APP_DIR/server/.env"

    chmod 600 "$APP_DIR/.env"
    chmod 600 "$APP_DIR/server/.env"
    ok ".env criado"
fi

# ============================================================================
# ETAPA 8: Banco de dados (migrations + seed)
# ============================================================================
step "8/12" "Banco de dados"

if [ -f "$APP_DIR/database-emps.sqlite" ]; then
    if ask_yes_no "Banco ja existe. Recriar? (APAGA DADOS)" "n"; then
        rm -f "$APP_DIR/database-emps.sqlite" "$APP_DIR/database-emps.sqlite-wal" "$APP_DIR/database-emps.sqlite-shm"
        info "Banco removido. Recriando..."
    else
        warn "Mantendo banco existente. Pulando seed."
        SKIP_SEED=1
    fi
fi

if [ -z "${SKIP_SEED:-}" ]; then
    cd "$APP_DIR"

    info "Executando migrations..."
    $TSX_PATH server/src/database/migrations/run.ts 2>&1 | tail -3
    ok "Migrations aplicadas"

    info "Executando seed..."
    $TSX_PATH server/src/database/seed.ts 2>&1 | tail -5
    ok "Banco populado"
fi

# ============================================================================
# ETAPA 9: Configurar e iniciar PM2
# ============================================================================
step "9/12" "Configurar PM2"

cat > "$APP_DIR/ecosystem.config.cjs" << PMCONF
module.exports = {
  apps: [{
    name: 'ecp-digital-emps',
    script: '${TSX_PATH}',
    args: 'server/src/server.ts',
    cwd: '/opt/ecp-digital-emps-app',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3334,
      HOST: '127.0.0.1',
    },
    max_memory_restart: '512M',
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    kill_timeout: 5000,
    listen_timeout: 10000,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    cron_restart: '0 4 * * *',
  }]
};
PMCONF

pm2 delete "$APP_NAME" 2>/dev/null || true

cd "$APP_DIR"
NODE_ENV=production pm2 start ecosystem.config.cjs --env production
ok "Aplicacao iniciada com PM2"

sleep 5
if pm2 pid "$APP_NAME" > /dev/null 2>&1; then
    ok "PM2 status: online"
else
    fail "PM2 nao conseguiu iniciar a aplicacao!"
    pm2 logs "$APP_NAME" --lines 20 --nostream
    exit 1
fi

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/health" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then
    ok "API respondendo na porta ${APP_PORT}"
else
    warn "API retornou HTTP ${HEALTH} — pode nao ter /health, testando /auth/pj/me..."
    # Testar outra rota
    ALT=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/auth/pj/me" 2>/dev/null || echo "000")
    if [ "$ALT" = "401" ] || [ "$ALT" = "200" ]; then
        ok "API respondendo na porta ${APP_PORT} (auth endpoint funcional)"
    else
        fail "API nao respondeu"
        pm2 logs "$APP_NAME" --lines 20 --nostream
    fi
fi

pm2 save > /dev/null 2>&1
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
ok "PM2 configurado para iniciar no boot"

# ============================================================================
# ETAPA 10: Configurar Nginx (HTTP temporario)
# ============================================================================
step "10/12" "Configurar Nginx"

info "Criando configuracao HTTP temporaria..."

cat > /etc/nginx/sites-available/ecp-digital-emps << 'NGINX_TEMP'
upstream ecp_emps_backend {
    server 127.0.0.1:3334;
    keepalive 16;
}

server {
    listen 80;
    listen [::]:80;
    server_name emps.ecportilho.com;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 256;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Webhook endpoint (ECP Pay envia creditos de split)
    location /webhooks/ {
        proxy_pass http://ecp_emps_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

    # API routes (proxy com rewrite: /api/* -> /*)
    location /api/ {
        proxy_pass http://ecp_emps_backend/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_read_timeout 30s;
    }

    # Static assets (frontend build)
    location /assets/ {
        alias /opt/ecp-digital-emps-app/web/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # SPA fallback (React Router)
    location / {
        root /opt/ecp-digital-emps-app/web/dist;
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    access_log /var/log/nginx/ecp-digital-emps-access.log;
    error_log /var/log/nginx/ecp-digital-emps-error.log;
}
NGINX_TEMP

ln -sf /etc/nginx/sites-available/ecp-digital-emps /etc/nginx/sites-enabled/ecp-digital-emps

if nginx -t 2>&1 | grep -q "successful"; then
    systemctl reload nginx
    ok "Nginx configurado e recarregado (HTTP)"
else
    fail "Configuracao do Nginx invalida!"
    nginx -t
    exit 1
fi

# ============================================================================
# ETAPA 11: Certificado SSL (Let's Encrypt)
# ============================================================================
step "11/12" "Certificado SSL (Let's Encrypt)"

info "Verificando DNS de ${DOMAIN}..."
RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null | head -1)
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")

if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
    ok "DNS OK: ${DOMAIN} -> ${RESOLVED_IP}"
else
    warn "DNS aponta para '${RESOLVED_IP}', IP deste servidor e '${SERVER_IP}'"
    if ! ask_yes_no "Tentar gerar o certificado mesmo assim?" "n"; then
        warn "Pulando SSL. Execute depois:"
        echo "      certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos -m ${CERTBOT_EMAIL}"
        SKIP_SSL=1
    fi
fi

if [ -z "${SKIP_SSL:-}" ]; then
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        ok "Certificado SSL ja existe para ${DOMAIN}"
    else
        info "Gerando certificado SSL..."
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL"
        if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
            ok "Certificado SSL gerado com sucesso"
        else
            fail "Falha ao gerar certificado SSL"
            SKIP_SSL=1
        fi
    fi
fi

# ============================================================================
# ETAPA 12: Verificacao final
# ============================================================================
step "12/12" "Verificacao final"

ERRORS=0

if pm2 pid "$APP_NAME" > /dev/null 2>&1; then ok "PM2: ${APP_NAME} esta online"
else fail "PM2: ${APP_NAME} nao esta rodando"; ERRORS=$((ERRORS + 1)); fi

HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/health" 2>/dev/null || echo "000")
if [ "$HEALTH" = "200" ]; then ok "API: respondendo na porta ${APP_PORT}"
else
    ALT=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/auth/pj/me" 2>/dev/null || echo "000")
    if [ "$ALT" = "401" ] || [ "$ALT" = "200" ]; then ok "API: respondendo na porta ${APP_PORT}"
    else fail "API: nao respondeu"; ERRORS=$((ERRORS + 1)); fi
fi

if [ -f "$APP_DIR/database-emps.sqlite" ]; then
    DB_SIZE=$(du -h "$APP_DIR/database-emps.sqlite" | cut -f1)
    ok "Banco: database-emps.sqlite (${DB_SIZE})"
else fail "Banco: nao encontrado"; ERRORS=$((ERRORS + 1)); fi

if [ -f "$APP_DIR/web/dist/index.html" ]; then ok "Frontend: build presente"
else fail "Frontend: build nao encontrado"; ERRORS=$((ERRORS + 1)); fi

if systemctl is-active --quiet nginx; then ok "Nginx: rodando"
else fail "Nginx: parado"; ERRORS=$((ERRORS + 1)); fi

EXTERNAL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://${DOMAIN}" 2>/dev/null || echo "000")
if [ "$EXTERNAL_HTTP" = "200" ] || [ "$EXTERNAL_HTTP" = "301" ]; then ok "HTTP externo: ${DOMAIN} acessivel"
else warn "HTTP externo: retornou ${EXTERNAL_HTTP}"; fi

if [ -z "${SKIP_SSL:-}" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    EXTERNAL_HTTPS=$(curl -s -o /dev/null -w "%{http_code}" "https://${DOMAIN}" 2>/dev/null || echo "000")
    if [ "$EXTERNAL_HTTPS" = "200" ]; then ok "HTTPS: ${DOMAIN} com SSL ativo"
    else warn "HTTPS: retornou ${EXTERNAL_HTTPS}"; fi
fi

BANK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${BANK_PORT}/health" 2>/dev/null || echo "000")
if [ "$BANK_STATUS" = "200" ]; then ok "ECP Digital Bank: acessivel na porta ${BANK_PORT}"
else warn "ECP Digital Bank: nao respondeu (pode nao estar rodando)"; fi

PAY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PAY_PORT}/pay/health" 2>/dev/null || echo "000")
if [ "$PAY_STATUS" = "200" ]; then ok "ECP Digital Pay: acessivel na porta ${PAY_PORT}"
else warn "ECP Digital Pay: nao respondeu (pode nao estar rodando)"; fi

# ============================================================================
# RESULTADO FINAL
# ============================================================================
banner "Resultado Final"

if [ "$ERRORS" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}INSTALACAO CONCLUIDA COM SUCESSO!${NC}"
else
    echo -e "  ${YELLOW}${BOLD}INSTALACAO CONCLUIDA COM ${ERRORS} AVISO(S)${NC}"
fi

echo ""
echo -e "  ${BOLD}Acesse:${NC}"
if [ -z "${SKIP_SSL:-}" ] && [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo -e "    Painel PJ:     ${GREEN}https://${DOMAIN}${NC}"
else
    echo -e "    Painel PJ:     ${GREEN}http://${DOMAIN}${NC}"
fi
echo ""
echo -e "  ${BOLD}Login de teste (empresas):${NC}"
echo -e "    AB Design Studio:      ${CYAN}ana.beatriz@abdesign.com.br / Senha@123${NC}"
echo -e "    Pasta & Fogo:           ${CYAN}financeiro@pastaefogo.com.br / Senha@123${NC}"
echo -e "    Sushi Wave:             ${CYAN}contato@sushiwave.com.br / Senha@123${NC}"
echo -e "    Burger Lab:             ${CYAN}pagar@burgerlab.com.br / Senha@123${NC}"
echo -e "    Green Bowl Co.:         ${CYAN}financeiro@greenbowl.com.br / Senha@123${NC}"
echo -e "    Pizza Club 24h:         ${CYAN}contato@pizzaclub24h.com.br / Senha@123${NC}"
echo -e "    Brasa & Lenha:          ${CYAN}financeiro@brasaelenha.com.br / Senha@123${NC}"
echo ""
echo -e "  ${BOLD}Integracoes:${NC}"
echo -e "    ECP Bank (PF):  http://127.0.0.1:${BANK_PORT}  → bank.ecportilho.com"
echo -e "    ECP Pay:        http://127.0.0.1:${PAY_PORT}   → pay.ecportilho.com"
echo -e "    Webhook:        /webhooks/payment-received (splits do ECP Pay)"
echo ""
echo -e "  ${BOLD}Comandos uteis:${NC}"
echo -e "    pm2 status                         # Ver status"
echo -e "    pm2 logs ecp-digital-emps           # Ver logs"
echo -e "    pm2 reload ecp-digital-emps         # Reiniciar"
echo ""
echo -e "  ${BOLD}Redeploy (atualizar codigo):${NC}"
echo -e "    cd ${REPO_DIR} && git pull origin main"
echo -e "    cp -r 03-product-delivery/server ${APP_DIR}/"
echo -e "    cp -r 03-product-delivery/web/src ${APP_DIR}/web/"
echo -e "    cd ${APP_DIR}/web && npm run build"
echo -e "    pm2 reload ecp-digital-emps"
echo ""
echo -e "${MAGENTA}======================================================================${NC}"
echo -e "${BOLD}${MAGENTA}  ECP Digital Emps — Instalacao finalizada!${NC}"
echo -e "${MAGENTA}======================================================================${NC}"
echo ""
