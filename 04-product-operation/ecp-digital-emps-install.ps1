# ============================================================================
#  ECP Emps v1.0  -  Script de Instalacao Completo (sem Git/GitHub)
#  Banco Digital PJ para MEIs e Microempresas
#  Windows 11 | PowerShell 5.1+
#  Executar: PowerShell -ExecutionPolicy Bypass -File .\ecp-digital-emps-install.ps1
# ============================================================================

# --- Configuracao ---
$ErrorActionPreference = "Continue"
$HOST_API = "http://localhost:3334"
$HOST_WEB = "http://localhost:5175"

# --- Cores e formatacao ---
function Write-Banner($text) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
    Write-Host ""
}

function Write-Step($number, $text) {
    Write-Host ""
    Write-Host "  [$number] $text" -ForegroundColor White -BackgroundColor DarkBlue
    Write-Host ("  " + ("-" * 60)) -ForegroundColor DarkGray
}

function Write-SubStep($text) {
    Write-Host "      > $text" -ForegroundColor Gray
}

function Write-Ok($text) {
    Write-Host "      [OK] $text" -ForegroundColor Green
}

function Write-Fail($text) {
    Write-Host "      [FALHA] $text" -ForegroundColor Red
}

function Write-Warn($text) {
    Write-Host "      [AVISO] $text" -ForegroundColor Yellow
}

function Write-Info($text) {
    Write-Host "      [INFO] $text" -ForegroundColor DarkCyan
}

function Pause-Step($message) {
    Write-Host ""
    Write-Host "  >> $message" -ForegroundColor Yellow
    Write-Host "     Pressione ENTER para continuar ou Ctrl+C para abortar..." -ForegroundColor DarkYellow
    Read-Host
}

function Test-Command($cmd) {
    try {
        $null = Get-Command $cmd -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ============================================================================
#  INICIO
# ============================================================================

Clear-Host
Write-Banner "ECP Emps v1.0  -  Instalacao Completa"
Write-Host "  Produto:   Banco Digital PJ para MEIs e Microempresas" -ForegroundColor Gray
Write-Host "  Sistema:   Windows 11 + PowerShell" -ForegroundColor Gray
Write-Host "  Stack:     Node.js + Fastify 5 + SQLite3 + React 18 + Vite 5.4" -ForegroundColor Gray
Write-Host "  API:       $HOST_API" -ForegroundColor Gray
Write-Host "  Frontend:  $HOST_WEB" -ForegroundColor Gray
Write-Host "  Data:      $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
Write-Host ""

# --- Detectar diretorio do projeto ---
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# O script esta em 04-product-operation, o delivery esta em 03-product-delivery
$PROJECT_DIR = "$projectRoot\03-product-delivery"

if (-not (Test-Path "$PROJECT_DIR\package.json")) {
    # Tentar caminho padrao
    $PROJECT_DIR = "C:\Users\$env:USERNAME\projetos_git\ecp-digital-emps\03-product-delivery"
}

Write-Host "  Projeto:   $PROJECT_DIR" -ForegroundColor Gray

if (-not (Test-Path "$PROJECT_DIR\package.json")) {
    Write-Fail "Diretorio do projeto nao encontrado em: $PROJECT_DIR"
    Write-Host "     Verifique o caminho e tente novamente." -ForegroundColor Red
    exit 1
}

Set-Location $PROJECT_DIR
Write-Ok "Diretorio do projeto localizado"
Write-Host ""

# ============================================================================
#  FASE 1  -  VERIFICACAO DE PRE-REQUISITOS
# ============================================================================

Write-Banner "FASE 1 / 6  -  Verificacao de Pre-requisitos"

$prereqOk = $true

# --- 1.1 Node.js ---
Write-Step "1.1" "Node.js (requerido: >= 18)"

if (Test-Command "node") {
    $nodeVersion = (node --version 2>$null)
    Write-SubStep "Versao encontrada: $nodeVersion"

    $major = [int]($nodeVersion -replace 'v','').Split('.')[0]
    if ($major -ge 18) {
        Write-Ok "Node.js $nodeVersion  -  compativel"
    } else {
        Write-Fail "Node.js $nodeVersion  -  versao muito antiga (minimo: 18)"
        $prereqOk = $false
    }
} else {
    Write-Fail "Node.js nao encontrado no PATH"
    Write-Info "Instale com: winget install OpenJS.NodeJS.LTS"
    $prereqOk = $false
}

# --- 1.2 npm ---
Write-Step "1.2" "npm"

if (Test-Command "npm") {
    $npmVersion = (npm --version 2>$null)
    Write-Ok "npm $npmVersion"
} else {
    Write-Fail "npm nao encontrado (deveria vir com o Node.js)"
    $prereqOk = $false
}

# --- 1.3 Python ---
Write-Step "1.3" "Python 3 (requerido para compilar better-sqlite3)"

$pythonCmd = $null
if (Test-Command "python") {
    $pyVer = (python --version 2>$null)
    if ($pyVer -match "Python 3") {
        $pythonCmd = "python"
        Write-Ok "$pyVer"
    }
}
if (-not $pythonCmd -and (Test-Command "python3")) {
    $pyVer = (python3 --version 2>$null)
    if ($pyVer -match "Python 3") {
        $pythonCmd = "python3"
        Write-Ok "$pyVer"
    }
}
if (-not $pythonCmd) {
    Write-Fail "Python 3 nao encontrado no PATH"
    Write-Info "Instale com: winget install Python.Python.3.12"
    Write-Info "Marque 'Add Python to PATH' durante a instalacao"
    $prereqOk = $false
}

# --- 1.4 Visual Studio Build Tools ---
Write-Step "1.4" "Visual Studio Build Tools (compilador C++ para better-sqlite3)"

$vsInstalls = @(
    @{ Year = "2026"; InternalVer = "18"; Editions = @("BuildTools","Professional","Community","Enterprise") },
    @{ Year = "2022"; InternalVer = "2022"; Editions = @("BuildTools","Professional","Community","Enterprise") }
)
$detectedVsYear = $null
$detectedVsPath = $null

foreach ($vs in $vsInstalls) {
    foreach ($edition in $vs.Editions) {
        $p86 = "C:\Program Files (x86)\Microsoft Visual Studio\$($vs.InternalVer)\$edition"
        $p64 = "C:\Program Files\Microsoft Visual Studio\$($vs.InternalVer)\$edition"
        if (Test-Path $p86) { $detectedVsYear = $vs.Year; $detectedVsPath = $p86; break }
        if (Test-Path $p64) { $detectedVsYear = $vs.Year; $detectedVsPath = $p64; break }
    }
    if ($detectedVsYear) { break }
}

if ($detectedVsYear) {
    Write-Ok "Visual Studio $detectedVsYear encontrado em: $detectedVsPath"
    $msbuildPath = Get-ChildItem -Path $detectedVsPath -Recurse -Filter "MSBuild.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($msbuildPath) {
        Write-Ok "MSBuild encontrado: $($msbuildPath.DirectoryName)"
    } else {
        Write-Warn "MSBuild nao localizado - workload C++ pode nao estar instalado"
        Write-Info "Abra o Visual Studio Installer e instale 'Desktop development with C++'"
    }
} else {
    Write-Warn "Visual Studio Build Tools nao encontrado no caminho padrao"
    Write-Info "Instale com: winget install Microsoft.VisualStudio.2022.BuildTools"
    Write-Info "Depois instale o workload 'Desktop development with C++'"
}

# --- 1.5 npm config ---
Write-Step "1.5" "Configuracao do npm (msvs_version)"

$targetMsvs = if ($detectedVsYear) { $detectedVsYear } else { "2022" }
$currentMsvs = (npm config get msvs_version 2>$null)
if ($currentMsvs -eq $targetMsvs) {
    Write-Ok "npm msvs_version ja configurado: $targetMsvs"
} else {
    Write-SubStep "Configurando npm msvs_version = $targetMsvs..."
    npm config set msvs_version $targetMsvs 2>$null
    Write-Ok "npm msvs_version configurado para $targetMsvs"
}

if ($pythonCmd) {
    Write-SubStep "Configurando npm python = $pythonCmd..."
    npm config set python $pythonCmd 2>$null
    Write-Ok "npm python configurado para $pythonCmd"
}

# --- 1.6 Estrutura do projeto ---
Write-Step "1.6" "Estrutura do projeto ECP Emps"

$requiredFiles = @(
    "package.json",
    "server\package.json",
    "web\package.json",
    "server\src\server.ts",
    "server\src\app.ts",
    "server\src\database\connection.ts",
    "server\src\database\migrations\001-initial.sql",
    "server\src\database\seed.ts",
    "server\src\shared\utils\cnpj.ts",
    "server\src\shared\utils\boleto.ts",
    "server\src\shared\middleware\rbac.ts",
    "web\src\App.tsx",
    "web\vite.config.ts",
    "web\src\components\layout\SidebarPJ.tsx",
    "web\src\components\layout\ProfileSwitcher.tsx"
)

$missingFiles = @()
foreach ($f in $requiredFiles) {
    if (Test-Path "$PROJECT_DIR\$f") {
        Write-SubStep "$f"
    } else {
        Write-Fail "Arquivo nao encontrado: $f"
        $missingFiles += $f
    }
}

if ($missingFiles.Count -eq 0) {
    Write-Ok "Todos os $($requiredFiles.Count) arquivos criticos presentes"
} else {
    Write-Fail "$($missingFiles.Count) arquivo(s) faltando  -  o projeto pode estar incompleto"
    $prereqOk = $false
}

# --- Resumo pre-requisitos ---
Write-Host ""
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkCyan
if ($prereqOk) {
    Write-Host "  RESULTADO: Todos os pre-requisitos atendidos" -ForegroundColor Green
} else {
    Write-Host "  RESULTADO: Ha pre-requisitos pendentes (veja acima)" -ForegroundColor Red
    Write-Host "  Corrija os itens marcados [FALHA] e execute o script novamente." -ForegroundColor Yellow
}
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkCyan

Pause-Step "Revise os pre-requisitos acima"

if (-not $prereqOk) {
    Write-Warn "Pre-requisitos nao atendidos. Deseja continuar mesmo assim? (S/N)"
    $resp = Read-Host "  Resposta"
    if ($resp -notmatch "^[sS]") {
        Write-Host "  Instalacao cancelada pelo usuario." -ForegroundColor Yellow
        exit 1
    }
}

# ============================================================================
#  FASE 2  -  INSTALACAO DE DEPENDENCIAS
# ============================================================================

Write-Banner "FASE 2 / 6  -  Instalacao de Dependencias"

# --- 2.1 Raiz ---
Write-Step "2.1" "Dependencias da raiz (concurrently)"
Write-SubStep "Executando: npm install"
Write-Host ""

Set-Location $PROJECT_DIR
npm install 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }

Write-Host ""
if (Test-Path "$PROJECT_DIR\node_modules\concurrently") {
    Write-Ok "concurrently instalado"
} else {
    Write-Fail "concurrently nao encontrado em node_modules"
}

# --- 2.2 Server ---
Write-Step "2.2" "Dependencias do server (Fastify 5, better-sqlite3, bcryptjs, Zod, etc.)"
Write-SubStep "Executando: npm install (server/)"
Write-Warn "Este passo compila better-sqlite3 com node-gyp  -  pode levar 1-2 min"

Set-Location "$PROJECT_DIR\server"

# Node 22+ requer better-sqlite3 >= 11.x
if ($major -ge 22) {
    Write-SubStep "Node.js $major detectado - verificando versao do better-sqlite3..."
    $serverPkgPath = "$PROJECT_DIR\server\package.json"
    $serverPkgJson = Get-Content $serverPkgPath -Raw | ConvertFrom-Json
    $bsqliteVer = $serverPkgJson.dependencies.'better-sqlite3'
    if ($bsqliteVer) {
        $bsqliteVerNum = $bsqliteVer -replace '[^0-9\.]',''
        $bsqliteMajor = [int]($bsqliteVerNum.Split('.')[0])
        if ($bsqliteMajor -lt 11) {
            Write-Warn "better-sqlite3 $bsqliteVer incompativel com Node $major - atualizando para ^11.0.0..."
            $serverPkgRaw = Get-Content $serverPkgPath -Raw
            $serverPkgRaw = $serverPkgRaw -replace '"better-sqlite3"\s*:\s*"[^"]+"', '"better-sqlite3": "^11.0.0"'
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            [System.IO.File]::WriteAllText($serverPkgPath, $serverPkgRaw, $utf8NoBom)
            Write-Ok "server/package.json atualizado: better-sqlite3 -> ^11.0.0"

            if (Test-Path "node_modules\better-sqlite3") {
                Remove-Item "node_modules\better-sqlite3" -Recurse -Force -ErrorAction SilentlyContinue
                Write-SubStep "Build antigo do better-sqlite3 removido"
            }
            if (Test-Path "package-lock.json") {
                Remove-Item "package-lock.json" -Force -ErrorAction SilentlyContinue
                Write-SubStep "package-lock.json do server removido para forcar resolucao correta"
            }
        } else {
            Write-Ok "better-sqlite3 $bsqliteVer compativel com Node $major"
        }
    }
}
Write-Host ""

npm install 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
Write-Host ""

$serverChecks = @(
    @{ name = "better-sqlite3 (binario nativo)"; path = "node_modules\better-sqlite3\build\Release\better_sqlite3.node" },
    @{ name = "fastify";                          path = "node_modules\fastify" },
    @{ name = "@fastify/cors";                    path = "node_modules\@fastify\cors" },
    @{ name = "@fastify/helmet";                  path = "node_modules\@fastify\helmet" },
    @{ name = "bcryptjs";                         path = "node_modules\bcryptjs" },
    @{ name = "jsonwebtoken";                     path = "node_modules\jsonwebtoken" },
    @{ name = "zod";                              path = "node_modules\zod" },
    @{ name = "uuid";                             path = "node_modules\uuid" },
    @{ name = "tsx";                              path = "node_modules\tsx" },
    @{ name = "typescript";                       path = "node_modules\typescript" }
)

$serverOk = $true
foreach ($check in $serverChecks) {
    if (Test-Path $check.path) {
        Write-Ok $check.name
    } else {
        Write-Fail "$($check.name)  -  nao encontrado"
        $serverOk = $false
    }
}

if (-not $serverOk) {
    Write-Fail "Algumas dependencias do server nao foram instaladas corretamente"
    Write-Info "Verifique os erros acima. Problema mais comum: node-gyp sem Build Tools C++"
}

# --- 2.3 Web ---
Write-Step "2.3" "Dependencias do web (React 18, Vite 5.4, Tailwind, Lucide, etc.)"
Write-SubStep "Executando: npm install (web/)"
Write-Host ""

Set-Location "$PROJECT_DIR\web"
npm install 2>&1 | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
Write-Host ""

$webChecks = @(
    @{ name = "react";            path = "node_modules\react" },
    @{ name = "react-dom";        path = "node_modules\react-dom" },
    @{ name = "react-router-dom"; path = "node_modules\react-router-dom" },
    @{ name = "vite";             path = "node_modules\vite" },
    @{ name = "tailwindcss";      path = "node_modules\tailwindcss" },
    @{ name = "lucide-react";     path = "node_modules\lucide-react" },
    @{ name = "typescript";       path = "node_modules\typescript" }
)

$webOk = $true
foreach ($check in $webChecks) {
    if (Test-Path $check.path) {
        Write-Ok $check.name
    } else {
        Write-Fail "$($check.name)  -  nao encontrado"
        $webOk = $false
    }
}

Set-Location $PROJECT_DIR

# --- Resumo ---
Write-Host ""
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkCyan
Write-Host "  node_modules raiz:   $(if (Test-Path 'node_modules') { 'OK' } else { 'FALHA' })" -ForegroundColor $(if (Test-Path 'node_modules') { 'Green' } else { 'Red' })
Write-Host "  node_modules server: $(if (Test-Path 'server\node_modules') { 'OK' } else { 'FALHA' })" -ForegroundColor $(if (Test-Path 'server\node_modules') { 'Green' } else { 'Red' })
Write-Host "  node_modules web:    $(if (Test-Path 'web\node_modules') { 'OK' } else { 'FALHA' })" -ForegroundColor $(if (Test-Path 'web\node_modules') { 'Green' } else { 'Red' })
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkCyan

Pause-Step "Revise a instalacao de dependencias"

# ============================================================================
#  FASE 3  -  CONFIGURACAO DE AMBIENTE
# ============================================================================

Write-Banner "FASE 3 / 6  -  Configuracao de Ambiente"

Write-Step "3.1" "Arquivo .env"

$envFile = "$PROJECT_DIR\.env"

if (Test-Path $envFile) {
    Write-Warn "Arquivo .env ja existe  -  mantendo o existente"
    Write-SubStep "Conteudo atual:"
    Get-Content $envFile | ForEach-Object { Write-Host "      | $_" -ForegroundColor DarkGray }
} else {
    Write-SubStep "Criando .env com valores de desenvolvimento..."

    $envContent = @"
# ECP Emps  -  Variaveis de Ambiente (Desenvolvimento)
# Gerado automaticamente pelo script de instalacao em $(Get-Date -Format 'yyyy-MM-dd HH:mm')

# Servidor
PORT=3334
HOST=0.0.0.0
NODE_ENV=development
LOG_LEVEL=info

# JWT (MESMA chave do ecp-digital-bank para compartilhar sessao PF-PJ)
JWT_SECRET=ecp-digital-bank-dev-secret-mude-em-producao

# Banco de Dados PJ
DATABASE_PATH=./database-emps.sqlite

# CORS
CORS_ORIGIN=http://localhost:5175

# Referencia ao ecp-digital-bank (PF) para integracao
PF_API_URL=http://localhost:3333

# Front-end
VITE_API_URL=http://localhost:3334
VITE_PF_APP_URL=http://localhost:5173
"@

    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($envFile, $envContent, $utf8NoBom)
    Write-Ok "Arquivo .env criado"
    Write-SubStep "Conteudo:"
    Get-Content $envFile | ForEach-Object { Write-Host "      | $_" -ForegroundColor DarkGray }
}

Write-Host ""
Write-Step "3.2" "Resumo da configuracao"
Write-Info "API:      $HOST_API (Fastify 5 + SQLite3)"
Write-Info "Frontend: $HOST_WEB (React 18 + Vite + Tailwind)"
Write-Info "Banco:    database-emps.sqlite (arquivo local, WAL mode)"
Write-Info "JWT:      Compartilhado com ecp-digital-bank (mesma secret)"
Write-Info "Proxy:    Vite redireciona /api/* para a API automaticamente"

Write-Host ""
Write-Host "  Ecossistema ECP  -  Portas:" -ForegroundColor Cyan
Write-Host "    ecp-digital-bank (PF):  API 3333 | Web 5173" -ForegroundColor Gray
Write-Host "    ecp-digital-food:       API 3000 | Web 5174" -ForegroundColor Gray
Write-Host "    ecp-digital-emps (PJ):  API 3334 | Web 5175" -ForegroundColor Green

# ============================================================================
#  FASE 4  -  BANCO DE DADOS
# ============================================================================

Write-Banner "FASE 4 / 6  -  Banco de Dados (SQLite3)"

# --- 4.1 Verificar banco existente ---
Write-Step "4.1" "Verificar banco existente"

$dbFile = "$PROJECT_DIR\server\database-emps.sqlite"
if (Test-Path $dbFile) {
    $dbSize = [math]::Round((Get-Item $dbFile).Length / 1KB, 1)
    Write-Warn "Banco ja existe ($dbSize KB)"
    Write-Host ""
    Write-Host "      Deseja recriar o banco do zero? (S/N)" -ForegroundColor Yellow
    $resp = Read-Host "      Resposta"
    if ($resp -match "^[sS]") {
        Write-SubStep "Removendo banco existente..."
        Remove-Item "$PROJECT_DIR\server\database-emps.sqlite" -ErrorAction SilentlyContinue
        Remove-Item "$PROJECT_DIR\server\database-emps.sqlite-wal" -ErrorAction SilentlyContinue
        Remove-Item "$PROJECT_DIR\server\database-emps.sqlite-shm" -ErrorAction SilentlyContinue
        # Tambem verificar na raiz do delivery
        Remove-Item "$PROJECT_DIR\database-emps.sqlite" -ErrorAction SilentlyContinue
        Remove-Item "$PROJECT_DIR\database-emps.sqlite-wal" -ErrorAction SilentlyContinue
        Remove-Item "$PROJECT_DIR\database-emps.sqlite-shm" -ErrorAction SilentlyContinue
        Write-Ok "Banco removido"
    } else {
        Write-Info "Mantendo banco existente"
    }
} else {
    Write-Info "Nenhum banco existente  -  sera criado agora"
}

# --- 4.2 Migrations ---
Write-Step "4.2" "Executar migrations (12 tabelas + 22 indices)"
Write-SubStep "Executando: npm run db:migrate"
Write-Host ""

Set-Location $PROJECT_DIR
$migrateOutput = npm run db:migrate 2>&1
$migrateOutput | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
Write-Host ""

# Verificar se o banco foi criado em algum dos caminhos possiveis
$dbFound = $false
$dbPaths = @("$PROJECT_DIR\server\database-emps.sqlite", "$PROJECT_DIR\database-emps.sqlite")
foreach ($p in $dbPaths) {
    if (Test-Path $p) {
        $dbSize = [math]::Round((Get-Item $p).Length / 1KB, 1)
        Write-Ok "Banco criado: $p ($dbSize KB)"
        $dbFound = $true
        break
    }
}

if (-not $dbFound) {
    Write-Warn "Banco nao localizado nos caminhos esperados  -  verifique os logs acima"
}

# --- 4.3 Seed ---
Write-Step "4.3" "Popular banco com dados de demonstracao (seed)"
Write-SubStep "Executando: npm run db:seed"
Write-SubStep "Criando 7 empresas PJ (1 design studio + 6 restaurantes FoodFlow)"
Write-Host ""

Set-Location $PROJECT_DIR
$seedOutput = npm run db:seed 2>&1
$seedOutput | ForEach-Object { Write-Host "      $_" -ForegroundColor DarkGray }
Write-Host ""

$seedOutputStr = $seedOutput -join "`n"
if ($seedOutputStr -match "seeded successfully|seed.*success|Done") {
    Write-Ok "Seed executado com sucesso"
} else {
    Write-Warn "Verifique a saida acima  -  seed pode ter falhado"
}

Write-Host ""
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkCyan
Write-Host "  EMPRESAS PJ CRIADAS (7 total)" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "  Empresa                  Dono                        Email" -ForegroundColor DarkGray
Write-Host "  AB Design Studio         Marina Silva                marina@email.com" -ForegroundColor White
Write-Host "  Pasta & Fogo             Carlos Eduardo Mendes       carlos.mendes@email.com" -ForegroundColor White
Write-Host "  Sushi Wave               Aisha Oliveira Santos       aisha.santos@email.com" -ForegroundColor White
Write-Host "  Burger Lab               Roberto Yukio Tanaka        roberto.tanaka@email.com" -ForegroundColor White
Write-Host "  Green Bowl Co.           Francisca das Chagas Lima   francisca.lima@email.com" -ForegroundColor White
Write-Host "  Pizza Club 24h           Lucas Gabriel Ndongo        lucas.ndongo@email.com" -ForegroundColor White
Write-Host "  Brasa & Lenha            Patricia Werneck de Souza   patricia.werneck@email.com" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "  Senha (todas): Senha@123" -ForegroundColor Yellow
Write-Host "  (Mesmos usuarios e senhas do ecp-digital-bank PF)" -ForegroundColor DarkGray
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkCyan

Pause-Step "Banco de dados configurado  -  revise os dados acima"

# ============================================================================
#  FASE 5  -  SUBIR A APLICACAO
# ============================================================================

Write-Banner "FASE 5 / 6  -  Subir a Aplicacao"

# --- Verificar portas ---
Write-Step "5.1" "Verificar portas disponiveis"

$port3334 = netstat -ano 2>$null | Select-String ":3334\s" | Select-String "LISTENING"
$port5175 = netstat -ano 2>$null | Select-String ":5175\s" | Select-String "LISTENING"

if ($port3334) {
    Write-Warn "Porta 3334 ja esta em uso!"
    Write-SubStep ($port3334 | Out-String).Trim()
    Write-Info "Mate o processo ou altere PORT no .env"
} else {
    Write-Ok "Porta 3334 disponivel (API)"
}

if ($port5175) {
    Write-Warn "Porta 5175 ja esta em uso!"
    Write-SubStep ($port5175 | Out-String).Trim()
} else {
    Write-Ok "Porta 5175 disponivel (Frontend)"
}

# --- Iniciar servidor ---
Write-Step "5.2" "Iniciando API Fastify (porta 3334)"
Write-SubStep "Executando: npm run dev:server (em background)"

Set-Location $PROJECT_DIR
$serverJob = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c","npm","run","dev:server" `
    -WorkingDirectory $PROJECT_DIR `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput "$PROJECT_DIR\server-stdout.log" `
    -RedirectStandardError "$PROJECT_DIR\server-stderr.log"

Write-SubStep "Processo iniciado (PID: $($serverJob.Id))"
Write-SubStep "Aguardando API ficar pronta..."

$apiReady = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    Write-Host "`r      Tentativa $i/30..." -NoNewline -ForegroundColor DarkGray
    try {
        $health = Invoke-RestMethod "$HOST_API/health" -TimeoutSec 2 -ErrorAction Stop
        if ($health.status -eq "ok") {
            $apiReady = $true
            break
        }
    } catch {}
}
Write-Host ""

if ($apiReady) {
    Write-Ok "API Fastify rodando em $HOST_API"
    Write-Ok "Health check: status = ok"
} else {
    Write-Fail "API nao respondeu em 30 segundos"
    if (Test-Path "$PROJECT_DIR\server-stderr.log") {
        $errLog = Get-Content "$PROJECT_DIR\server-stderr.log" -Raw -ErrorAction SilentlyContinue
        if ($errLog) {
            Write-SubStep "Ultimas linhas do log de erro:"
            ($errLog -split "`n" | Select-Object -Last 10) | ForEach-Object { Write-Host "      | $_" -ForegroundColor Red }
        }
    }
    Write-Info "Verifique os logs: Get-Content server-stderr.log"
}

# --- Iniciar frontend ---
Write-Step "5.3" "Iniciando Frontend Vite (porta 5175)"
Write-SubStep "Executando: npm run dev:web (em background)"

$webJob = Start-Process -FilePath "cmd.exe" `
    -ArgumentList "/c","npm","run","dev:web" `
    -WorkingDirectory $PROJECT_DIR `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput "$PROJECT_DIR\web-stdout.log" `
    -RedirectStandardError "$PROJECT_DIR\web-stderr.log"

Write-SubStep "Processo iniciado (PID: $($webJob.Id))"
Write-SubStep "Aguardando frontend ficar pronto..."

$webReady = $false
for ($i = 1; $i -le 30; $i++) {
    Start-Sleep -Seconds 1
    Write-Host "`r      Tentativa $i/30..." -NoNewline -ForegroundColor DarkGray
    try {
        $null = Invoke-WebRequest "$HOST_WEB" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        $webReady = $true
        break
    } catch {}
}
Write-Host ""

if ($webReady) {
    Write-Ok "Frontend Vite rodando em $HOST_WEB"
} else {
    Write-Warn "Frontend nao respondeu em 30 segundos  -  pode estar compilando"
    Write-Info "Verifique: Get-Content web-stdout.log"
}

# --- Resumo ---
Write-Host ""
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkCyan
Write-Host "  API:      $HOST_API $(if ($apiReady) { '[ ONLINE ]' } else { '[ OFFLINE ]' })" -ForegroundColor $(if ($apiReady) { 'Green' } else { 'Red' })
Write-Host "  Frontend: $HOST_WEB $(if ($webReady) { '[ ONLINE ]' } else { '[ AGUARDANDO ]' })" -ForegroundColor $(if ($webReady) { 'Green' } else { 'Yellow' })
Write-Host "  API PID:  $($serverJob.Id)" -ForegroundColor Gray
Write-Host "  Web PID:  $($webJob.Id)" -ForegroundColor Gray
Write-Host ("  " + ("=" * 60)) -ForegroundColor DarkCyan

Pause-Step "Aplicacao iniciada  -  revise o status acima"

# ============================================================================
#  FASE 6  -  SMOKE TEST
# ============================================================================

Write-Banner "FASE 6 / 6  -  Smoke Test (Validacao Completa)"

$passed = 0
$failed = 0
$total = 8

function Test-Endpoint($name, $scriptBlock) {
    try {
        $result = & $scriptBlock
        if ($result) {
            Write-Ok $name
            return $true
        } else {
            Write-Fail $name
            return $false
        }
    } catch {
        Write-Fail "$name  -  $($_.Exception.Message)"
        return $false
    }
}

# --- 6.1 Health ---
Write-Step "6.1" "Health Check da API PJ"
if (Test-Endpoint "GET /health" {
    $r = Invoke-RestMethod "$HOST_API/health" -TimeoutSec 5 -ErrorAction Stop
    Write-SubStep "status: $($r.status) | service: $($r.service)"
    return $r.status -eq "ok"
}) { $passed++ } else { $failed++ }

# --- 6.2 Companies ---
Write-Step "6.2" "Empresas PJ"
if (Test-Endpoint "GET /companies/me (sem auth - espera 401)" {
    try {
        $null = Invoke-RestMethod "$HOST_API/companies/me" -TimeoutSec 5 -ErrorAction Stop
        return $false
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-SubStep "Status: $status (401 = auth funcionando)"
        return $status -eq 401
    }
}) { $passed++ } else { $failed++ }

# --- 6.3 PJ Dashboard ---
Write-Step "6.3" "Dashboard PJ (endpoint agregado)"
if (Test-Endpoint "GET /pj/dashboard (sem auth - espera 401)" {
    try {
        $null = Invoke-RestMethod "$HOST_API/pj/dashboard" -TimeoutSec 5 -ErrorAction Stop
        return $false
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-SubStep "Status: $status (RBAC protegendo endpoints PJ)"
        return $status -eq 401
    }
}) { $passed++ } else { $failed++ }

# --- 6.4 Pix PJ ---
Write-Step "6.4" "Pix PJ"
if (Test-Endpoint "GET /pj/pix/keys (sem auth - espera 401)" {
    try {
        $null = Invoke-RestMethod "$HOST_API/pj/pix/keys" -TimeoutSec 5 -ErrorAction Stop
        return $false
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-SubStep "Status: $status"
        return $status -eq 401
    }
}) { $passed++ } else { $failed++ }

# --- 6.5 Invoices ---
Write-Step "6.5" "Cobrancas (Boletos)"
if (Test-Endpoint "GET /pj/invoices (sem auth - espera 401)" {
    try {
        $null = Invoke-RestMethod "$HOST_API/pj/invoices" -TimeoutSec 5 -ErrorAction Stop
        return $false
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-SubStep "Status: $status"
        return $status -eq 401
    }
}) { $passed++ } else { $failed++ }

# --- 6.6 Corporate Cards ---
Write-Step "6.6" "Cartoes Corporativos"
if (Test-Endpoint "GET /pj/cards (sem auth - espera 401)" {
    try {
        $null = Invoke-RestMethod "$HOST_API/pj/cards" -TimeoutSec 5 -ErrorAction Stop
        return $false
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-SubStep "Status: $status"
        return $status -eq 401
    }
}) { $passed++ } else { $failed++ }

# --- 6.7 Team ---
Write-Step "6.7" "Gestao de Time (RBAC)"
if (Test-Endpoint "GET /pj/team (sem auth - espera 401)" {
    try {
        $null = Invoke-RestMethod "$HOST_API/pj/team" -TimeoutSec 5 -ErrorAction Stop
        return $false
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
        Write-SubStep "Status: $status (todos endpoints PJ protegidos por RBAC)"
        return $status -eq 401
    }
}) { $passed++ } else { $failed++ }

# --- 6.8 Frontend ---
Write-Step "6.8" "Frontend React SPA"
if (Test-Endpoint "GET $HOST_WEB" {
    $r = Invoke-WebRequest "$HOST_WEB" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-SubStep "Status: $($r.StatusCode) | Tamanho: $($r.Content.Length) bytes"
    return $r.StatusCode -eq 200
}) { $passed++ } else { $failed++ }

# ============================================================================
#  RESULTADO FINAL
# ============================================================================

Write-Host ""
Write-Host ""
Write-Banner "RESULTADO FINAL"

Write-Host "  Smoke Test: $passed/$total testes passaram" -ForegroundColor $(if ($failed -eq 0) { 'Green' } elseif ($failed -le 2) { 'Yellow' } else { 'Red' })
Write-Host ""

if ($failed -eq 0) {
    Write-Host "  ============================================" -ForegroundColor Green
    Write-Host "  INSTALACAO CONCLUIDA COM SUCESSO!" -ForegroundColor Green
    Write-Host "  ============================================" -ForegroundColor Green
} else {
    Write-Host "  ============================================" -ForegroundColor Yellow
    Write-Host "  INSTALACAO CONCLUIDA COM $failed FALHA(S)" -ForegroundColor Yellow
    Write-Host "  ============================================" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Acesse a aplicacao:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    Frontend:  $HOST_WEB" -ForegroundColor White
Write-Host "    API:       $HOST_API" -ForegroundColor White
Write-Host "    Health:    $HOST_API/health" -ForegroundColor White
Write-Host ""
Write-Host "  Empresas PJ de teste (todas com senha: Senha@123):" -ForegroundColor Cyan
Write-Host ""
Write-Host "    marina@email.com            AB Design Studio" -ForegroundColor White
Write-Host "    carlos.mendes@email.com     Pasta & Fogo" -ForegroundColor White
Write-Host "    aisha.santos@email.com      Sushi Wave" -ForegroundColor White
Write-Host "    roberto.tanaka@email.com    Burger Lab" -ForegroundColor White
Write-Host "    francisca.lima@email.com    Green Bowl Co." -ForegroundColor White
Write-Host "    lucas.ndongo@email.com      Pizza Club 24h" -ForegroundColor White
Write-Host "    patricia.werneck@email.com  Brasa & Lenha" -ForegroundColor White
Write-Host ""
Write-Host "  Ecossistema ECP (3 apps sem colisao de portas):" -ForegroundColor Cyan
Write-Host ""
Write-Host "    ecp-digital-bank (PF):  API 3333 | Web 5173" -ForegroundColor Gray
Write-Host "    ecp-digital-food:       API 3000 | Web 5174" -ForegroundColor Gray
Write-Host "    ecp-digital-emps (PJ):  API 3334 | Web 5175  <-- este" -ForegroundColor Green
Write-Host ""
Write-Host "  Processos em execucao:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    API PID:   $($serverJob.Id)" -ForegroundColor Gray
Write-Host "    Web PID:   $($webJob.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Para parar:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    Stop-Process -Id $($serverJob.Id),$($webJob.Id) -Force" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Logs:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    Get-Content server-stdout.log -Tail 20" -ForegroundColor Gray
Write-Host "    Get-Content web-stdout.log -Tail 20" -ForegroundColor Gray
Write-Host ""

# Abrir no browser
Write-Host "  Deseja abrir o frontend no navegador? (S/N)" -ForegroundColor Yellow
$resp = Read-Host "  Resposta"
if ($resp -match "^[sS]") {
    Start-Process "$HOST_WEB"
    Write-Host ""
    Write-Ok "Navegador aberto em $HOST_WEB"
}

# Limpar logs temporarios
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor DarkCyan
Write-Host "  ECP Emps instalado. Bom desenvolvimento!" -ForegroundColor Cyan
Write-Host ("=" * 70) -ForegroundColor DarkCyan
Write-Host ""
