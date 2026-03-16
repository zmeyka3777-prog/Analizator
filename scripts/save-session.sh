#!/bin/bash
# save-session.sh — автосохранение прогресса в GitHub
# Использование: bash scripts/save-session.sh "описание изменений"

set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# Сообщение коммита
MESSAGE="${1:-Auto-save session $(date '+%Y-%m-%d %H:%M')}"

# Настройка git (если не настроен)
git config user.email "zmeyka3777@gmail.com" 2>/dev/null || true
git config user.name "zmeyka3777-prog" 2>/dev/null || true

# Проверяем есть ли что коммитить
if git diff --quiet && git diff --staged --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "[save-session] Нет изменений для сохранения."
  exit 0
fi

# Добавляем файлы (исключая .env и секреты)
git add -A -- \
  ':!.env' \
  ':!.env.*' \
  ':!*.pem' \
  ':!*.key' \
  ':!secrets.*'

# Коммит
git commit -m "$MESSAGE

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

# Пуш
git push origin main

echo "[save-session] Успешно сохранено: $MESSAGE"
