#!/usr/bin/env bash
# ============================================================================
#  ECP Digital Emps — Instalador VPS
#  Ubuntu 22.04+ | Bash 5+
#
#  USO:
#    scp deploy-vps.sh root@191.101.78.38:/root/deploy-emps.sh
#    ssh root@191.101.78.38
#    chmod +x /root/deploy-emps.sh && bash /root/deploy-emps.sh
# ============================================================================

set -euo pipefail

DOMAIN="emps.ecportilho.com"
APP_NAME="ecp-digital-emps"
REPO_DIR="/opt/ecp-digital-emps"
APP_DIR="/opt/ecp-digital-emps-app"
REPO_URL="https://github.com/ecportilho/ecp-digital-emps.git"
APP_PORT=3334
NODE_VERSION="20"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; MAGENTA='\033[0;35m'; CYAN='\033[0;36m'
BOLD='\033[1m'; NC='\033[0m'

banner() { echo ""; echo -e "${MAGENTA}====================================================================${NC}"; echo -e "${BOLD}${MAGENTA}  $1${NC}"; echo -e "${MAGENTA}====================================================================${NC}"; echo ""; }
step()   { echo ""; echo -e "  ${BOLD}${CYAN}[$1]${NC} ${BOLD}$2${NC}"; echo -e "  ${BLUE}$(printf '%0.s-' {1..60})${NC}"; }
info()   { echo -e "      ${BLUE}INFO${NC}  $1"; }
ok()     { echo -e "      ${GREEN}OK${NC}    $1"; }
warn()   { echo -e "      ${YELLOW}AVISO${NC} $1"; }
fail()   { echo -e "      ${RED}ERRO${NC}  $1"; }

ask_yes_no() {
    local prompt="$1" default="${2:-s}" yn
    if [ "$default" = "s" ]; then read -rp "      $prompt [S/n]: " yn; yn="${yn:-s}"
    else read -rp "      $prompt [s/N]: " yn; yn="${yn:-n}"; fi
    case "$yn" in [sS]|[yY]) return 0 ;; *) return 1 ;; esac
}
ask_input() {
    local prompt="$1" default="${2:-}" value
    if [ -n "$default" ]; then read -rp "      $prompt [$default]: " value; echo "${value:-$default}"
    else read -rp "      $prompt: " value; echo "$value"; fi
}

# ============================================================================
banner "ECP Digital Emps — Instalador VPS"
echo -e "  ${BOLD}Dominio:${NC}  https://${DOMAIN}"
echo -e "  ${BOLD}Porta:${NC}    ${APP_PORT}"
echo ""

[ "$(id -u)" -ne 0 ] && { fail "Execute como root."; exit 1; }

# ============================================================================
step "1/12" "Coletar informacoes"

CERTBOT_EMAIL=$(ask_input "Email SSL (Let's Encrypt)" "ecportilho@gmail.com")
JWT_SECRET=$(ask_input "JWT Secret (IGUAL ao ecp-digital-bank)" "")
[ -z "$JWT_SECRET" ] && { JWT_SECRET=$(openssl rand -hex 32); warn "JWT gerado novo (nao compartilhara sessao com bank)"; }
PAY_WEBHOOK_SECRET=$(ask_input "Webhook secret do ECP Pay" "ecp-pay-webhook-secret-dev")
PAY_API_KEY=$(ask_input "API Key no ECP Pay" "ecp-emps-dev-key")

echo ""; info "Repo: ${REPO_URL}"; info "JWT: ${JWT_SECRET:0:10}..."; echo ""
ask_yes_no "Prosseguir?" || { warn "Cancelado."; exit 0; }

# ============================================================================
step "2/12" "Instalar dependencias do sistema"

apt update -qq && apt upgrade -y -qq
apt install -y -qq build-essential python3 curl git > /dev/null 2>&1
ok "Pacotes base"

if ! command -v node &>/dev/null || [ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt "$NODE_VERSION" ]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash - > /dev/null 2>&1
    apt install -y -qq nodejs > /dev/null 2>&1
fi
ok "Node.js $(node -v)"

command -v pm2 &>/dev/null || npm install -g pm2 > /dev/null 2>&1
ok "PM2 $(pm2 -v)"

command -v tsx &>/dev/null || npm install -g tsx > /dev/null 2>&1
TSX_PATH=$(which tsx)
ok "tsx em ${TSX_PATH}"

command -v nginx &>/dev/null || { apt install -y -qq nginx > /dev/null 2>&1; systemctl enable nginx > /dev/null 2>&1; systemctl start nginx; }
ok "Nginx"

command -v certbot &>/dev/null || apt install -y -qq certbot python3-certbot-nginx > /dev/null 2>&1
ok "Certbot"

# ============================================================================
step "3/12" "Clonar repositorio"

if [ -d "$REPO_DIR/.git" ]; then
    cd "$REPO_DIR"; git fetch origin; git reset --hard origin/main 2>/dev/null || git reset --hard origin/master
    ok "Atualizado"
else
    git clone "$REPO_URL" "$REPO_DIR"
    ok "Clonado"
fi

# ============================================================================
step "4/12" "Copiar para producao"

mkdir -p "$APP_DIR"
cp -r "$REPO_DIR/03-product-delivery/server" "$APP_DIR/"
cp -r "$REPO_DIR/03-product-delivery/web" "$APP_DIR/"
cp "$REPO_DIR/03-product-delivery/package.json" "$APP_DIR/"
cp "$REPO_DIR/03-product-delivery/package-lock.json" "$APP_DIR/" 2>/dev/null || true
cp "$REPO_DIR/03-product-delivery/tsconfig.base.json" "$APP_DIR/" 2>/dev/null || true

# Garantir tsconfig.base.json existe
if [ ! -f "$APP_DIR/tsconfig.base.json" ]; then
    cat > "$APP_DIR/tsconfig.base.json" << 'TSB'
{"compilerOptions":{"target":"ES2022","module":"ESNext","moduleResolution":"bundler","strict":true,"esModuleInterop":true,"skipLibCheck":true,"forceConsistentCasingInFileNames":true,"resolveJsonModule":true,"isolatedModules":true,"jsx":"react-jsx"}}
TSB
    info "tsconfig.base.json criado"
fi

# Garantir vite-env.d.ts existe
if [ ! -f "$APP_DIR/web/src/vite-env.d.ts" ]; then
    echo '/// <reference types="vite/client" />' > "$APP_DIR/web/src/vite-env.d.ts"
    info "vite-env.d.ts criado"
fi

ok "Arquivos copiados"

# ============================================================================
step "5/12" "Instalar dependencias"

cd "$APP_DIR/server"
npm install 2>&1 | tail -3
ok "Server"

if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
    ok "better-sqlite3 OK"
else
    warn "Recompilando better-sqlite3..."; npm rebuild better-sqlite3 2>&1 | tail -3
fi

cd "$APP_DIR/web"
npm install 2>&1 | tail -3
ok "Web"

# ============================================================================
step "6/12" "Build do frontend"

cd "$APP_DIR/web"
npx vite build 2>&1 | tail -5

[ ! -f "$APP_DIR/web/dist/index.html" ] && { fail "Build falhou!"; exit 1; }

# Verificar se localhost ficou no build
if grep -q "localhost:3334" "$APP_DIR/web/dist/assets/"*.js 2>/dev/null; then
    warn "localhost encontrado no build — limpando e refazendo..."
    rm -rf dist node_modules/.vite
    npx vite build --force 2>&1 | tail -3
fi

ok "Frontend em web/dist/"

# ============================================================================
step "7/12" "Configurar .env"

if [ -f "$APP_DIR/.env" ]; then
    warn ".env ja existe — mantendo"
else
    cat > "$APP_DIR/.env" << ENVFILE
# ECP Digital Emps — PRODUCAO ($(date '+%Y-%m-%d %H:%M'))
PORT=${APP_PORT}
HOST=127.0.0.1
NODE_ENV=production
LOG_LEVEL=info
JWT_SECRET=${JWT_SECRET}
DATABASE_PATH=./database-emps.sqlite
CORS_ORIGIN=https://${DOMAIN}
PF_API_URL=http://127.0.0.1:3333
ECP_PAY_URL=http://127.0.0.1:3335
ECP_PAY_API_KEY=${PAY_API_KEY}
ECP_PAY_WEBHOOK_SECRET=${PAY_WEBHOOK_SECRET}
VITE_API_URL=https://${DOMAIN}
VITE_PF_APP_URL=https://bank.ecportilho.com
ENVFILE
    cp "$APP_DIR/.env" "$APP_DIR/server/.env"
    chmod 600 "$APP_DIR/.env" "$APP_DIR/server/.env"
    ok ".env criado"
fi

# ============================================================================
step "8/12" "Banco de dados"

SKIP_SEED=""
if [ -f "$APP_DIR/database-emps.sqlite" ]; then
    if ask_yes_no "Banco ja existe. Recriar?" "n"; then
        rm -f "$APP_DIR/database-emps.sqlite" "$APP_DIR/database-emps.sqlite-wal" "$APP_DIR/database-emps.sqlite-shm"
    else
        warn "Mantendo banco existente"; SKIP_SEED=1
    fi
fi

if [ -z "$SKIP_SEED" ]; then
    cd "$APP_DIR"
    info "Migrations..."
    $TSX_PATH server/src/database/migrations/run.ts 2>&1 | tail -3
    ok "Migrations"

    info "Seed..."
    $TSX_PATH server/src/database/seed.ts 2>&1 | tail -5
    ok "Seed completo"
fi

# ============================================================================
step "9/12" "PM2"

pm2 delete "$APP_NAME" 2>/dev/null || true

echo "module.exports={apps:[{name:'ecp-digital-emps',script:'${TSX_PATH}',args:'server/src/server.ts',cwd:'${APP_DIR}',instances:1,exec_mode:'fork',env_production:{NODE_ENV:'production',PORT:${APP_PORT},HOST:'127.0.0.1'},max_memory_restart:'512M',max_restarts:10,min_uptime:'10s',restart_delay:4000,cron_restart:'0 4 * * *'}]};" > "$APP_DIR/ecosystem.config.cjs"

cd "$APP_DIR"
NODE_ENV=production pm2 start ecosystem.config.cjs --env production

sleep 5
if pm2 pid "$APP_NAME" > /dev/null 2>&1; then
    ok "Online"
else
    fail "Nao iniciou!"; pm2 logs "$APP_NAME" --lines 15 --nostream; exit 1
fi

pm2 save > /dev/null 2>&1
pm2 startup systemd -u root --hp /root > /dev/null 2>&1 || true
ok "PM2 configurado"

# ============================================================================
step "10/12" "Nginx"

tee /etc/nginx/sites-available/ecp-digital-emps > /dev/null << 'NGX'
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

    location /.well-known/acme-challenge/ { root /var/www/html; }

    location /webhooks/ {
        proxy_pass http://ecp_emps_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
    }

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

    location /assets/ {
        alias /opt/ecp-digital-emps-app/web/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location / {
        root /opt/ecp-digital-emps-app/web/dist;
        try_files $uri $uri/ /index.html;
    }

    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    access_log /var/log/nginx/ecp-digital-emps-access.log;
    error_log /var/log/nginx/ecp-digital-emps-error.log;
}
NGX

ln -sf /etc/nginx/sites-available/ecp-digital-emps /etc/nginx/sites-enabled/

if nginx -t 2>&1 | grep -q "successful"; then
    systemctl reload nginx; ok "Nginx OK"
else
    fail "Nginx config invalida!"; nginx -t; exit 1
fi

# ============================================================================
step "11/12" "SSL (Let's Encrypt)"

SKIP_SSL=""
RESOLVED_IP=$(dig +short "$DOMAIN" 2>/dev/null | head -1)
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")

if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
    ok "DNS: ${DOMAIN} -> ${RESOLVED_IP}"
else
    warn "DNS: '${RESOLVED_IP}' vs servidor '${SERVER_IP}'"
    ask_yes_no "Tentar SSL mesmo assim?" "n" || SKIP_SSL=1
fi

if [ -z "$SKIP_SSL" ]; then
    if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
        ok "Certificado ja existe"
    else
        certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$CERTBOT_EMAIL"
        [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ] && ok "SSL gerado" || { fail "SSL falhou"; SKIP_SSL=1; }
    fi
fi

# ============================================================================
step "12/12" "Verificacao final"

ERRORS=0

pm2 pid "$APP_NAME" > /dev/null 2>&1 && ok "PM2: online" || { fail "PM2: offline"; ERRORS=$((ERRORS+1)); }

H=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/health" 2>/dev/null || echo "000")
[ "$H" = "200" ] && ok "API: porta ${APP_PORT}" || {
    A=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/auth/pj/me" 2>/dev/null || echo "000")
    [ "$A" = "401" ] && ok "API: porta ${APP_PORT} (auth funcional)" || { fail "API: sem resposta"; ERRORS=$((ERRORS+1)); }
}

[ -f "$APP_DIR/database-emps.sqlite" ] && ok "Banco: $(du -h "$APP_DIR/database-emps.sqlite" | cut -f1)" || { fail "Banco: nao encontrado"; ERRORS=$((ERRORS+1)); }
[ -f "$APP_DIR/web/dist/index.html" ] && ok "Frontend: build OK" || { fail "Frontend: sem build"; ERRORS=$((ERRORS+1)); }
systemctl is-active --quiet nginx && ok "Nginx: rodando" || { fail "Nginx: parado"; ERRORS=$((ERRORS+1)); }

grep -q "localhost:3334" "$APP_DIR/web/dist/assets/"*.js 2>/dev/null && { fail "Frontend: localhost no build!"; ERRORS=$((ERRORS+1)); } || ok "Frontend: sem localhost"

# ============================================================================
banner "Resultado"

[ "$ERRORS" -eq 0 ] && echo -e "  ${GREEN}${BOLD}INSTALACAO OK!${NC}" || echo -e "  ${YELLOW}${BOLD}INSTALACAO COM ${ERRORS} PROBLEMA(S)${NC}"

echo ""
echo -e "  ${BOLD}Acesse:${NC}  ${GREEN}https://${DOMAIN}${NC}"
echo ""
echo -e "  ${BOLD}Logins de teste:${NC}"
echo -e "    financeiro@pastaefogo.com.br     / Senha@123  (Pasta & Fogo)"
echo -e "    financeiro@brasaelenha.com.br     / Senha@123  (Brasa & Lenha)"
echo -e "    contato@sushiwave.com.br          / Senha@123  (Sushi Wave)"
echo -e "    pagar@burgerlab.com.br            / Senha@123  (Burger Lab)"
echo ""
echo -e "  ${BOLD}Comandos:${NC}"
echo -e "    pm2 logs ecp-digital-emps          # Logs"
echo -e "    pm2 reload ecp-digital-emps        # Reiniciar"
echo ""
echo -e "  ${BOLD}Redeploy:${NC}"
echo -e "    cd ${REPO_DIR} && git pull origin main"
echo -e "    cp -r 03-product-delivery/server ${APP_DIR}/"
echo -e "    cp -r 03-product-delivery/web/src ${APP_DIR}/web/"
echo -e "    cd ${APP_DIR}/web && npx vite build"
echo -e "    pm2 reload ecp-digital-emps"
echo ""
