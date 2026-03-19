#!/bin/bash
# save-session.sh — автосохранение прогресса в GitHub + ведение журнала
# Использование: bash scripts/save-session.sh "описание изменений"
# Запускается автоматически Stop-хуком Claude Code

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

MESSAGE="${1:-Auto-save session $(date '+%Y-%m-%d %H:%M')}"

# Настройка git
git config user.email "zmeyka3777@gmail.com" 2>/dev/null || true
git config user.name "zmeyka3777-prog" 2>/dev/null || true

# ---- Обновляем LAST_SESSION.md ----
LAST_SESSION_FILE="$REPO_DIR/docs/LAST_SESSION.md"
TIMESTAMP="$(date '+%Y-%m-%d %H:%M')"

# Собираем список изменённых файлов
MODIFIED_FILES="$(git diff --name-only 2>/dev/null)"
STAGED_FILES="$(git diff --staged --name-only 2>/dev/null)"
UNTRACKED_FILES="$(git ls-files --others --exclude-standard 2>/dev/null)"
ALL_CHANGED="$(echo -e "$MODIFIED_FILES\n$STAGED_FILES\n$UNTRACKED_FILES" | sort -u | grep -v '^$' || echo 'нет изменений')"

# Последние 5 коммитов
RECENT_COMMITS="$(git log --oneline -5 2>/dev/null || echo 'нет коммитов')"

cat > "$LAST_SESSION_FILE" << EOF
# Последняя сессия Claude Code

**Дата:** $TIMESTAMP
**Сообщение:** $MESSAGE

## Изменённые файлы в этой сессии

\`\`\`
$ALL_CHANGED
\`\`\`

## Последние 5 коммитов

\`\`\`
$RECENT_COMMITS
\`\`\`

## Для нового Claude (инструкции)

1. Прочитай `CLAUDE.md` — полный контекст проекта
2. Прочитай `docs/SESSION_LOG.md` — что делали последнюю сессию
3. Прочитай `docs/ERRORS_LOG.md` — известные ошибки и как их избегать
4. Проверь эту страницу — какие файлы менялись

## Быстрый старт для нового Claude

\`\`\`bash
# Запуск frontend
npm run dev

# Запуск backend
npm run server
\`\`\`

**Демо-аккаунты (password123):**
- director@orney.ru — кабинет директора (главный, светлая тема, AppLayout)
- admin@orney.ru — панель администратора
- manager.pfo@orney.ru — региональный менеджер
- tm.samara@orney.ru — территориальный менеджер
- shestakova@orney.ru — медпред
EOF

echo "[save-session] Обновлён docs/LAST_SESSION.md"

# ---- Проверяем есть ли что коммитить ----
if git diff --quiet && git diff --staged --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "[save-session] Нет изменений для сохранения."
  exit 0
fi

# ---- Добавляем файлы (исключая секреты) ----
git add -A -- \
  ':!.env' \
  ':!.env.*' \
  ':!*.pem' \
  ':!*.key' \
  ':!secrets.*'

# ---- Коммит ----
git commit -m "$MESSAGE

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

# ---- Пуш ----
git push origin main

echo "[save-session] ✓ Успешно сохранено: $MESSAGE"
echo "[save-session] GitHub: https://github.com/zmeyka3777-prog/Analizator"
