# 🎯 Шпаргалка по Git командам

Быстрый справочник по основным Git командам для работы с проектом.

---

## 🚀 Первая загрузка на GitHub

### Инициализация и первый коммит
```bash
# 1. Инициализация Git
git init

# 2. Добавить все файлы
git add .

# 3. Первый коммит
git commit -m "Initial commit: MDLP Analytics v1.0.0"

# 4. Добавить remote (замените YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/mdlp-analytics-worldmedicine.git

# 5. Переименовать ветку в main
git branch -M main

# 6. Отправить на GitHub
git push -u origin main
```

---

## 📝 Ежедневная работа

### Проверка статуса
```bash
# Посмотреть изменения
git status

# Посмотреть diff
git diff

# Посмотреть diff конкретного файла
git diff src/app/App.tsx
```

### Добавление изменений
```bash
# Добавить все изменения
git add .

# Добавить конкретный файл
git add src/app/App.tsx

# Добавить все файлы в папке
git add src/app/

# Добавить только измененные файлы (не новые)
git add -u
```

### Коммит
```bash
# Обычный коммит
git commit -m "Исправлена ошибка в фильтре препаратов"

# Коммит с подробным описанием
git commit -m "Добавлен раздел экспорта данных" -m "
- Реализован экспорт в Excel
- Добавлен экспорт в CSV
- Добавлена история операций
"

# Изменить последний коммит
git commit --amend -m "Новое сообщение"

# Добавить файлы к последнему коммиту
git add forgotten_file.tsx
git commit --amend --no-edit
```

### Push на GitHub
```bash
# Отправить изменения
git push

# Первый push новой ветки
git push -u origin feature-branch

# Принудительный push (ОСТОРОЖНО!)
git push --force
```

---

## 🌿 Работа с ветками

### Создание и переключение
```bash
# Создать новую ветку
git branch feature-new-dashboard

# Переключиться на ветку
git checkout feature-new-dashboard

# Создать и сразу переключиться
git checkout -b feature-new-dashboard

# Посмотреть все ветки
git branch

# Посмотреть все ветки (включая remote)
git branch -a
```

### Слияние веток
```bash
# Переключиться на main
git checkout main

# Слить feature ветку в main
git merge feature-new-dashboard

# Удалить ветку после слияния
git branch -d feature-new-dashboard

# Принудительное удаление ветки
git branch -D feature-new-dashboard
```

### Удаление remote ветки
```bash
# Удалить ветку на GitHub
git push origin --delete feature-old-branch
```

---

## 🔄 Обновление из GitHub

### Pull изменений
```bash
# Скачать и применить изменения
git pull

# Pull конкретной ветки
git pull origin main

# Pull с rebase
git pull --rebase
```

### Fetch изменений
```bash
# Скачать изменения без применения
git fetch

# Посмотреть изменения
git log origin/main

# Применить изменения
git merge origin/main
```

---

## 📜 История и логи

### Просмотр истории
```bash
# Показать все коммиты
git log

# Краткий лог (одна строка на коммит)
git log --oneline

# Последние 5 коммитов
git log -5

# С графом веток
git log --graph --oneline --all

# Изменения конкретного файла
git log src/app/App.tsx

# Поиск по сообщению коммита
git log --grep="фильтр"

# Коммиты за последние 7 дней
git log --since="7 days ago"
```

### Детали коммита
```bash
# Показать изменения в коммите
git show <commit-hash>

# Показать файлы в коммите
git show --name-only <commit-hash>
```

---

## ↩️ Отмена изменений

### Отмена локальных изменений
```bash
# Отменить изменения в файле
git checkout -- src/app/App.tsx

# Отменить все локальные изменения
git checkout -- .

# Удалить неотслеживаемые файлы
git clean -fd

# Предпросмотр удаления
git clean -n
```

### Отмена staged изменений
```bash
# Убрать файл из staging
git reset HEAD src/app/App.tsx

# Убрать все файлы из staging
git reset HEAD
```

### Отмена коммитов
```bash
# Отменить последний коммит (сохранить изменения)
git reset --soft HEAD~1

# Отменить последний коммит (удалить изменения)
git reset --hard HEAD~1

# Отменить последние 3 коммита
git reset --hard HEAD~3

# Вернуться к конкретному коммиту
git reset --hard <commit-hash>
```

### Revert (безопасная отмена)
```bash
# Создать новый коммит, отменяющий изменения
git revert <commit-hash>

# Revert нескольких коммитов
git revert <commit1> <commit2>
```

---

## 🔍 Stash (временное хранилище)

### Сохранение работы
```bash
# Сохранить текущие изменения
git stash

# Сохранить с описанием
git stash save "Работа над фильтрами"

# Включить неотслеживаемые файлы
git stash -u

# Посмотреть список stash
git stash list
```

### Восстановление работы
```bash
# Применить последний stash
git stash apply

# Применить конкретный stash
git stash apply stash@{0}

# Применить и удалить stash
git stash pop

# Удалить stash
git stash drop stash@{0}

# Удалить все stash
git stash clear
```

---

## 🏷️ Теги (Версии)

### Создание тегов
```bash
# Легковесный тег
git tag v1.0.0

# Аннотированный тег (рекомендуется)
git tag -a v1.0.0 -m "Release version 1.0.0"

# Тег на конкретный коммит
git tag -a v0.9.0 <commit-hash> -m "Beta version"

# Посмотреть все теги
git tag

# Посмотреть теги с паттерном
git tag -l "v1.*"
```

### Отправка тегов
```bash
# Отправить конкретный тег
git push origin v1.0.0

# Отправить все теги
git push origin --tags
```

### Удаление тегов
```bash
# Удалить локальный тег
git tag -d v1.0.0

# Удалить remote тег
git push origin --delete v1.0.0
```

---

## 🔧 Настройка Git

### Конфигурация пользователя
```bash
# Имя пользователя (глобально)
git config --global user.name "Ваше Имя"

# Email (глобально)
git config --global user.email "your.email@orney.ru"

# Для конкретного репозитория (без --global)
git config user.name "Другое Имя"
git config user.email "other@orney.ru"
```

### Полезные настройки
```bash
# Цветной вывод
git config --global color.ui auto

# Редактор по умолчанию
git config --global core.editor "code --wait"  # VS Code
git config --global core.editor "nano"         # Nano

# Алиасы (сокращения команд)
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'

# Посмотреть все настройки
git config --list

# Посмотреть конкретную настройку
git config user.name
```

---

## 🐛 Решение проблем

### Конфликты при merge
```bash
# 1. Попытка merge
git merge feature-branch

# 2. Увидите конфликты
git status

# 3. Откройте файлы с конфликтами, исправьте
# Ищите маркеры:
# <<<<<<< HEAD
# ваш код
# =======
# их код
# >>>>>>> feature-branch

# 4. После исправления
git add .
git commit -m "Разрешены конфликты при merge"

# Отменить merge
git merge --abort
```

### Синхронизация с GitHub
```bash
# Если ваша локальная версия отстает
git pull --rebase origin main

# Если есть конфликты, разрешите их, затем
git rebase --continue

# Отменить rebase
git rebase --abort
```

### Забыли .gitignore
```bash
# Если уже закоммитили node_modules
git rm -r --cached node_modules
git commit -m "Удален node_modules из Git"
git push
```

### Изменить URL remote
```bash
# Посмотреть текущий URL
git remote -v

# Изменить URL
git remote set-url origin https://github.com/NEW_USERNAME/new-repo.git

# Проверить
git remote -v
```

---

## 📊 Полезные команды

### Информация о репозитории
```bash
# Размер репозитория
git count-objects -vH

# Статистика коммитов
git shortlog -sn

# Авторы
git shortlog -sn --all --no-merges

# Самые измененные файлы
git log --all --pretty=format: --name-only | sort | uniq -c | sort -rg | head -10
```

### Очистка
```bash
# Удалить все локальные ветки, кроме main
git branch | grep -v "main" | xargs git branch -D

# Очистить старые ветки с remote
git remote prune origin

# Сборка мусора
git gc
```

---

## 🎯 Типичные сценарии

### Новая фича
```bash
# 1. Создать ветку
git checkout -b feature-export-pdf

# 2. Работать, коммитить
git add .
git commit -m "Добавлен экспорт в PDF"

# 3. Отправить на GitHub
git push -u origin feature-export-pdf

# 4. Создать Pull Request на GitHub

# 5. После одобрения, смержить и удалить
git checkout main
git merge feature-export-pdf
git branch -d feature-export-pdf
git push origin --delete feature-export-pdf
```

### Исправление бага
```bash
# 1. Создать hotfix ветку
git checkout -b hotfix-filter-bug

# 2. Исправить, коммитить
git add src/app/App.tsx
git commit -m "Исправлен баг в фильтре препаратов"

# 3. Смержить в main
git checkout main
git merge hotfix-filter-bug

# 4. Отправить и удалить
git push
git branch -d hotfix-filter-bug
```

### Релиз новой версии
```bash
# 1. Обновить CHANGELOG.md
# 2. Обновить версию в package.json

# 3. Коммит
git add .
git commit -m "Release v1.1.0"

# 4. Создать тег
git tag -a v1.1.0 -m "Release version 1.1.0"

# 5. Отправить
git push && git push --tags
```

---

## 📚 Дополнительные ресурсы

- **Git Documentation**: https://git-scm.com/doc
- **GitHub Guides**: https://guides.github.com
- **Interactive Tutorial**: https://learngitbranching.js.org
- **Git Cheat Sheet**: https://education.github.com/git-cheat-sheet-education.pdf

---

## 💡 Советы

1. **Коммитьте часто** - маленькие коммиты лучше больших
2. **Пишите понятные сообщения** - будущее вы скажет спасибо
3. **Используйте ветки** - не работайте напрямую в main
4. **Pull перед Push** - избегайте конфликтов
5. **Проверяйте .gitignore** - не коммитьте лишнее
6. **Делайте бэкапы** - GitHub это бэкап, но не единственный

---

**Версия документа**: 1.0.0  
**Дата обновления**: 16 января 2026
