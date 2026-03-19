#!/bin/bash
# deploy-vps.sh — деплой на VPS 85.193.86.69
# Запуск: bash scripts/deploy-vps.sh
# Требования: SSH-доступ к серверу (пароль или ключ)

set -e

VPS_HOST="85.193.86.69"
VPS_USER="root"
APP_DIR="/var/www/analizator"

echo "====== Деплой на VPS $VPS_HOST ======"

# Шаг 1: Сборка локально
echo "[1/3] Сборка frontend..."
cd "$(dirname "${BASH_SOURCE[0]}")/.."
npm run build

# Шаг 2: Деплой через SSH
echo "[2/3] Деплой на сервер..."
ssh "$VPS_USER@$VPS_HOST" << 'REMOTE'
  set -e
  cd /var/www/analizator

  echo "  → git pull..."
  git pull origin main

  echo "  → npm ci..."
  npm ci --prefer-offline 2>/dev/null || npm ci

  echo "  → npm run build..."
  npm run build

  echo "  → pm2 restart..."
  pm2 restart all 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null || echo "PM2: проверь вручную"

  echo "  → статус PM2:"
  pm2 list
REMOTE

echo "[3/3] Готово!"
echo "  Сайт: http://$VPS_HOST"
echo "  GitHub: https://github.com/zmeyka3777-prog/Analizator"
