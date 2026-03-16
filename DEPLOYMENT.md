# 🚀 Инструкция по развертыванию проекта

## 📋 Содержание
1. [Загрузка на GitHub](#загрузка-на-github)
2. [Импорт в Replit](#импорт-в-replit)
3. [Настройка и запуск](#настройка-и-запуск)
4. [Проблемы и решения](#проблемы-и-решения)

---

## 📤 Загрузка на GitHub

### Вариант 1: Через GitHub Desktop (Рекомендуется)

1. **Установите GitHub Desktop**
   - Скачайте с https://desktop.github.com/
   - Установите и авторизуйтесь

2. **Создайте репозиторий**
   - File → New Repository
   - Name: `mdlp-analytics-worldmedicine`
   - Description: `Анализатор продаж МДЛП для World Medicine`
   - Выберите папку с проектом
   - ✅ Initialize this repository with a README (снимите галочку, т.к. README уже есть)
   - Create Repository

3. **Опубликуйте на GitHub**
   - Publish Repository
   - Выберите Organization (если есть) или оставьте на личном аккаунте
   - ✅ Keep this code private (если нужен приватный репозиторий)
   - Publish Repository

### Вариант 2: Через командную строку (Git CLI)

```bash
# 1. Инициализируйте Git (если еще не сделали)
git init

# 2. Добавьте все файлы
git add .

# 3. Создайте первый коммит
git commit -m "Initial commit: MDLP Analytics Application v1.0"

# 4. Создайте репозиторий на GitHub
# Перейдите на https://github.com/new и создайте новый репозиторий
# Назовите его: mdlp-analytics-worldmedicine

# 5. Подключите удаленный репозиторий
git remote add origin https://github.com/ВАШ_USERNAME/mdlp-analytics-worldmedicine.git

# 6. Отправьте код на GitHub
git branch -M main
git push -u origin main
```

### Вариант 3: Через VS Code

1. Откройте папку проекта в VS Code
2. Нажмите на иконку Source Control (Ctrl+Shift+G)
3. Нажмите "Publish to GitHub"
4. Выберите название: `mdlp-analytics-worldmedicine`
5. Выберите приватный или публичный репозиторий
6. Confirm

---

## 🔄 Импорт в Replit

### Способ 1: Импорт из GitHub (Рекомендуется)

1. **Откройте Replit**
   - Перейдите на https://replit.com
   - Войдите в свой аккаунт

2. **Создайте новый Repl из GitHub**
   - Нажмите "+ Create Repl"
   - Выберите вкладку "Import from GitHub"
   - Вставьте URL вашего репозитория:
     ```
     https://github.com/ВАШ_USERNAME/mdlp-analytics-worldmedicine
     ```
   - Нажмите "Import from GitHub"

3. **Настройте Repl**
   - Replit автоматически определит настройки из `.replit` файла
   - Language: Node.js
   - Template: Vite

4. **Готово!** Replit автоматически установит зависимости

### Способ 2: Клонирование в существующий Repl

```bash
# В Shell терминале Replit:
git clone https://github.com/ВАШ_USERNAME/mdlp-analytics-worldmedicine.git
cd mdlp-analytics-worldmedicine
npm install
```

---

## ⚙️ Настройка и запуск

### 1. Установка зависимостей

```bash
# npm (рекомендуется для Replit)
npm install

# или pnpm (если установлен)
pnpm install
```

### 2. Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу:
- **Локально**: `http://localhost:5173`
- **Replit**: Автоматический URL (например, `https://mdlp-analytics-worldmedicine.yourname.repl.co`)

### 3. Сборка для production

```bash
npm run build
```

Собранные файлы будут в папке `dist/`

### 4. Предпросмотр production сборки

```bash
npm run preview
```

---

## 🔧 Настройки для Replit

### Файл `.replit` (уже создан)
```toml
[nix]
channel = "stable-24_05"

[deployment]
run = ["npm", "run", "dev"]
deploymentTarget = "static"
publicDir = "dist"
build = ["npm", "run", "build"]

[[ports]]
localPort = 5173
externalPort = 80
```

### Файл `replit.nix` (уже создан)
```nix
{ pkgs }: {
  deps = [
    pkgs.nodejs-18_x
    pkgs.nodePackages.npm
    pkgs.nodePackages.pnpm
  ];
}
```

---

## 🐛 Проблемы и решения

### Проблема: "Module not found" или ошибки импорта

**Решение:**
```bash
# Удалите node_modules и переустановите
rm -rf node_modules package-lock.json
npm install
```

### Проблема: Ошибки с React или Vite

**Решение:**
```bash
# Проверьте версию Node.js (должна быть 18+)
node --version

# Обновите npm
npm install -g npm@latest

# Переустановите зависимости
npm ci
```

### Проблема: Не загружается изображение для входа

**Решение:**
Изображение использует специальный Figma asset протокол. В Replit:
1. Скачайте изображение локально
2. Поместите в `src/assets/login-image.png`
3. Измените импорт в `App.tsx`:
   ```tsx
   // Вместо:
   import loginImage from 'figma:asset/...';
   
   // Используйте:
   import loginImage from '@/assets/login-image.png';
   ```

### Проблема: Replit не определяет тип проекта

**Решение:**
1. В Replit Shell выполните:
   ```bash
   npm install
   ```
2. В файле `.replit` убедитесь, что указано:
   ```toml
   run = ["npm", "run", "dev"]
   ```
3. Нажмите "Run" в Replit

### Проблема: Медленная загрузка в Replit

**Решение:**
1. Используйте Replit Boost (если доступно)
2. Оптимизируйте package.json - удалите неиспользуемые зависимости
3. Используйте production build:
   ```bash
   npm run build
   npm run preview
   ```

### Проблема: Git push отклонен

**Решение:**
```bash
# Если нужно перезаписать историю (ОСТОРОЖНО!)
git push origin main --force

# Или сначала сделайте pull
git pull origin main --rebase
git push origin main
```

---

## 📝 Чеклист развертывания

- [ ] ✅ Проект загружен на GitHub
- [ ] ✅ Репозиторий импортирован в Replit
- [ ] ✅ Зависимости установлены (`npm install`)
- [ ] ✅ Приложение запускается (`npm run dev`)
- [ ] ✅ Вход работает (используйте email с @orney.ru)
- [ ] ✅ Все 12 вкладок доступны
- [ ] ✅ Данные сохраняются в localStorage
- [ ] ✅ Адаптивный дизайн работает на мобильных

---

## 🔐 Безопасность

### Приватные данные
- **НЕ** включайте в репозиторий `.env` файлы с секретами
- **НЕ** коммитьте API ключи и пароли
- Используйте Replit Secrets для хранения чувствительных данных

### .gitignore
Убедитесь, что `.gitignore` включает:
```
node_modules/
.env
.env.local
dist/
build/
*.log
.DS_Store
```

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера (F12)
2. Проверьте логи Replit Shell
3. Убедитесь, что версия Node.js 18+
4. Обратитесь в IT-отдел World Medicine

---

## 🎉 Готово!

Ваше приложение "Анализатор продаж МДЛП" теперь развернуто и готово к использованию!

**URL в Replit**: `https://[ваш-repl-name].[ваш-username].repl.co`

**Для входа используйте:**
- Email: `любой@orney.ru`
- Пароль: `любой` (минимум 4 символа)

---

**Последнее обновление**: Январь 2026  
**Версия**: 1.0.0
