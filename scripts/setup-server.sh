#!/bin/bash
# =====================================================
# Первоначальная настройка VPS Timeweb Cloud
# Запустить ОДИН РАЗ на сервере: bash setup-server.sh
# =====================================================

set -e

echo "====== Установка Node.js 20 ======"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

echo "====== Установка nginx ======"
sudo apt-get install -y nginx

echo "====== Установка PM2 ======"
sudo npm install -g pm2

echo "====== Установка certbot (SSL) ======"
sudo apt-get install -y certbot python3-certbot-nginx

echo "====== Создание папки для логов ======"
sudo mkdir -p /var/log/analizator
sudo chown $USER:$USER /var/log/analizator

echo "====== Клонирование репозитория ======"
# Замените на ваш путь
APP_DIR="/var/www/analizator"
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR
git clone https://github.com/zmeyka3777-prog/Analizator.git $APP_DIR
cd $APP_DIR

echo "====== Установка зависимостей ======"
npm ci

echo "====== Сборка frontend ======"
npm run build

echo "====== СОЗДАЙТЕ .env ФАЙЛ ======"
echo "Скопируйте .env.example в .env и заполните реальные значения:"
echo "  cp .env.example .env"
echo "  nano .env"
echo ""
echo "После создания .env — запустите:"
echo "  pm2 start ecosystem.config.cjs"
echo "  pm2 save"
echo "  pm2 startup"
echo ""

echo "====== Настройка nginx ======"
sudo cp nginx/analizator.conf /etc/nginx/sites-available/analizator
sudo ln -sf /etc/nginx/sites-available/analizator /etc/nginx/sites-enabled/analizator
sudo rm -f /etc/nginx/sites-enabled/default
echo "Замените YOUR_DOMAIN в /etc/nginx/sites-available/analizator на ваш IP или домен"
echo "Затем: sudo nginx -t && sudo systemctl reload nginx"

echo "====== Установка завершена! ======"
