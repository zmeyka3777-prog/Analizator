# 🏗️ Структура проекта

## 📂 Общая структура

```
mdlp-analytics-worldmedicine/
├── 📄 index.html                    # HTML entry point
├── 📄 package.json                  # Зависимости и скрипты
├── 📄 vite.config.ts               # Конфигурация Vite
├── 📄 postcss.config.mjs           # Конфигурация PostCSS
├── 📄 tsconfig.json                # Конфигурация TypeScript (если есть)
│
├── 📁 src/                         # Исходный код
│   ├── 📄 main.tsx                 # Entry point приложения
│   │
│   ├── 📁 app/                     # Основное приложение
│   │   ├── 📄 App.tsx              # Главный компонент (3000+ строк)
│   │   └── 📁 components/          # Компоненты
│   │       ├── 📁 figma/           # Figma-специфичные компоненты
│   │       │   └── 📄 ImageWithFallback.tsx
│   │       └── 📁 ui/              # UI компоненты (40+ файлов)
│   │           ├── accordion.tsx
│   │           ├── alert.tsx
│   │           ├── button.tsx
│   │           ├── card.tsx
│   │           ├── checkbox.tsx
│   │           ├── dialog.tsx
│   │           ├── input.tsx
│   │           ├── select.tsx
│   │           ├── tabs.tsx
│   │           └── ... (и другие)
│   │
│   ├── 📁 styles/                  # Стили
│   │   ├── 📄 index.css            # Главный файл стилей
│   │   ├── 📄 tailwind.css         # Tailwind импорты
│   │   ├── 📄 theme.css            # Тема и токены
│   │   └── 📄 fonts.css            # Шрифты
│   │
│   └── 📁 imports/                 # Импортированные ресурсы
│       └── (SVG файлы из Figma)
│
├── 📁 public/                      # Статические файлы (если есть)
│   └── vite.svg
│
├── 📁 dist/                        # Build output (создается автоматически)
│
├── 📁 node_modules/                # Зависимости (не в Git)
│
└── 📁 guidelines/                  # Документация Figma
    └── Guidelines.md

```

---

## 📄 Ключевые файлы

### Корневые файлы

| Файл | Назначение |
|------|-----------|
| `index.html` | HTML entry point, подключает main.tsx |
| `package.json` | Зависимости, скрипты, метаданные |
| `vite.config.ts` | Конфигурация сборщика Vite |
| `postcss.config.mjs` | Конфигурация PostCSS для Tailwind |
| `.gitignore` | Игнорируемые файлы Git |
| `.replit` | Конфигурация для Replit |
| `replit.nix` | Nix окружение для Replit |
| `.env.example` | Пример переменных окружения |

### Документация

| Файл | Назначение |
|------|-----------|
| `README.md` | Основная документация проекта |
| `DEPLOYMENT.md` | Инструкция по развертыванию |
| `USER_GUIDE.md` | Руководство пользователя |
| `CHANGELOG.md` | История изменений |
| `PROJECT_STRUCTURE.md` | Структура проекта (этот файл) |
| `LICENSE` | Лицензия |
| `ATTRIBUTIONS.md` | Атрибуции и зависимости |

---

## 🔧 Исходный код

### `/src/main.tsx`
**Назначение**: Entry point React приложения
- Импортирует App компонент
- Рендерит в DOM
- Подключает глобальные стили

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import '@/styles/index.css';
```

### `/src/app/App.tsx`
**Назначение**: Главный компонент приложения (монолит)
**Размер**: ~3000+ строк
**Содержит**:
- 13 основных разделов приложения
- Все состояния (useState)
- Бизнес-логику
- Mock данные
- UI компоненты

**Структура App.tsx**:
```
1. Импорты (строки 1-50)
2. Типы и интерфейсы (50-100)
3. Mock данные (100-400)
   - drugsList
   - territoriesData
   - salesData
   - contractorsData
   - и т.д.
4. Компонент Logo (400-420)
5. Главный компонент App (420-3000+)
   - useState hooks
   - useEffect hooks
   - Обработчики событий
   - Экран входа (724-930)
   - Основное приложение (930+)
     - Сайдбар
     - 13 разделов
     - Диалоги
```

**Основные разделы в App.tsx**:
1. Upload - Загрузка файлов
2. Dashboard - Дашборд
3. DataManager - Управление данными
4. Problems - Проблемные зоны
5. Compare - Сравнение периодов
6. Territory - Территории
7. Drilldown - Детализация региона
8. ABC - ABC-анализ
9. Seasonal - Сезонность
10. Forecast - Прогнозирование
11. Contragents - Контрагенты
12. Reports - Отчеты
13. Archive - Архив отчетов

---

## 🎨 Стили

### `/src/styles/index.css`
**Главный файл стилей**
- Импортирует все остальные CSS файлы
- Глобальные стили
- Reset стили

### `/src/styles/tailwind.css`
**Tailwind CSS импорты**
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```

### `/src/styles/theme.css`
**Тема и CSS токены**
- Цветовая палитра
- Типография
- Spacing
- Shadows
- Transitions

### `/src/styles/fonts.css`
**Шрифты**
- @font-face декларации
- Импорты Google Fonts

---

## 🧩 Компоненты

### `/src/app/components/ui/`
**UI библиотека** (40+ компонентов)

**Основные компоненты**:
- `button.tsx` - Кнопки
- `input.tsx` - Поля ввода
- `select.tsx` - Выпадающие списки
- `dialog.tsx` - Модальные окна
- `card.tsx` - Карточки
- `tabs.tsx` - Вкладки
- `table.tsx` - Таблицы
- `chart.tsx` - Графики (wrapper для Recharts)
- `accordion.tsx` - Аккордеоны
- `alert.tsx` - Уведомления
- `badge.tsx` - Бейджи
- `checkbox.tsx` - Чекбоксы
- `radio-group.tsx` - Radio buttons
- `slider.tsx` - Слайдеры
- `switch.tsx` - Переключатели
- `tooltip.tsx` - Подсказки
- `dropdown-menu.tsx` - Dropdown меню
- `context-menu.tsx` - Контекстные меню
- `popover.tsx` - Поповеры
- `progress.tsx` - Прогресс-бары
- `calendar.tsx` - Календарь
- `avatar.tsx` - Аватары
- `separator.tsx` - Разделители
- `skeleton.tsx` - Skeleton loaders

**Все компоненты основаны на**:
- Radix UI (accessibility)
- Tailwind CSS (стилизация)
- class-variance-authority (варианты)

### `/src/app/components/figma/`
**Figma-специфичные компоненты**
- `ImageWithFallback.tsx` - Компонент изображения с fallback

---

## 📦 Зависимости

### Основные (dependencies)

#### UI Framework
- `react` (18.3.1) - UI библиотека
- `react-dom` (18.3.1) - React DOM

#### Стилизация
- `tailwindcss` (4.1.12) - CSS framework
- `@tailwindcss/vite` (4.1.12) - Tailwind для Vite
- `tailwind-merge` (3.2.0) - Merge Tailwind classes
- `clsx` (2.1.1) - Conditional classes

#### UI Библиотеки
- `@mui/material` (7.3.5) - Material UI
- `@mui/icons-material` (7.3.5) - Material иконки
- `@emotion/react` (11.14.0) - Emotion (для MUI)
- `@emotion/styled` (11.14.1) - Emotion styled

#### Radix UI (40+ компонентов)
- `@radix-ui/react-*` - Accessibility-friendly компоненты

#### Графики и визуализация
- `recharts` (2.15.2) - Библиотека графиков

#### Иконки
- `lucide-react` (0.487.0) - Иконки

#### Анимации
- `motion` (12.23.24) - Анимации (ex-Framer Motion)

#### Drag & Drop
- `react-dnd` (16.0.1) - Drag and drop
- `react-dnd-html5-backend` (16.0.1) - HTML5 backend

#### Формы
- `react-hook-form` (7.55.0) - Управление формами

#### Утилиты
- `date-fns` (3.6.0) - Работа с датами
- `class-variance-authority` (0.7.1) - CVA
- `cmdk` (1.1.1) - Command menu
- `sonner` (2.0.3) - Toast notifications
- `next-themes` (0.4.6) - Темы

### Dev Зависимости (devDependencies)

- `vite` (6.3.5) - Build tool
- `@vitejs/plugin-react` (4.7.0) - React plugin для Vite
- `typescript` (если используется) - TypeScript

---

## 💾 Хранилище данных

### localStorage Keys

| Key | Назначение |
|-----|-----------|
| `mdlp_current_user` | Текущий пользователь |
| `mdlp_saved_plans` | Сохраненные планы продаж |
| `mdlp_historical_data` | Исторические данные |
| `mdlp_saved_reports` | Архив отчетов |
| `mdlp_saved_data` | Комбинированные данные |

### Структура данных

#### User Profile
```typescript
interface UserProfile {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar?: string;
}
```

#### Saved Report
```typescript
interface SavedReport {
  id: string;
  name: string;
  type: string;
  filters: {
    drug: string;
    year: string;
    period: string;
  };
  timestamp: number;
  data: any;
}
```

---

## 🔀 Маршрутизация

**Тип**: Single Page Application (SPA)  
**Навигация**: Внутреннее состояние (`activeTab`)

### Основные "роуты" (вкладки):

| ID | Название | Требует данных |
|----|----------|----------------|
| `upload` | Загрузка | Нет |
| `dashboard` | Дашборд | Да |
| `datamanager` | Управление данными | Да |
| `problems` | Проблемные зоны | Да |
| `compare` | Сравнение периодов | Да |
| `territory` | Территории | Да |
| `drilldown` | Детализация региона | Да |
| `abc` | ABC-анализ | Да |
| `seasonal` | Сезонность | Да |
| `forecast` | Прогноз | Да |
| `contragents` | Контрагенты | Да |
| `reports` | Отчёты | Да |
| `archive` | Архив отчетов | Да |

---

## 🎯 State Management

**Подход**: React useState (локальное состояние)  
**Нет Redux/MobX** - все в App.tsx

### Основные состояния:

```typescript
// Навигация
const [activeTab, setActiveTab] = useState('upload');
const [navHistory, setNavHistory] = useState([]);
const [territoryPath, setTerritoryPath] = useState([]);

// Файлы и данные
const [files, setFiles] = useState([]);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [dataLoaded, setDataLoaded] = useState(false);

// Пользователь
const [currentUser, setCurrentUser] = useState(null);
const [showUserSelect, setShowUserSelect] = useState(true);

// Фильтры
const [selectedYear, setSelectedYear] = useState('2024');
const [selectedPeriod, setSelectedPeriod] = useState('year');
const [selectedDrug, setSelectedDrug] = useState('artoxan-20');

// UI
const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

// Архив
const [savedReports, setSavedReports] = useState([]);
const [showSaveReportDialog, setShowSaveReportDialog] = useState(false);
```

---

## 🚀 Build & Deploy

### Development
```bash
npm run dev
# → http://localhost:5173
```

### Production Build
```bash
npm run build
# → dist/
```

### Preview
```bash
npm run preview
# → http://localhost:4173
```

### Deployment

#### Replit
- Автоматически запускается через `.replit` конфиг
- Использует `npm run dev` для development
- Использует `npm run build` для production

#### Другие платформы
- Vercel: `vercel --prod`
- Netlify: `npm run build` → deploy `dist/`
- GitHub Pages: настроить GitHub Actions

---

## 📊 Метрики проекта

- **Общий размер**: ~5 MB (с node_modules ~300 MB)
- **Строк кода**: ~3500+
- **Компонентов**: 60+
- **Зависимостей**: 50+
- **Dev зависимостей**: 4
- **Разделов/Страниц**: 13
- **Mock данных**: ~500 записей

---

## 🔧 Конфигурация

### Vite (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
});
```

### PostCSS (`postcss.config.mjs`)
```javascript
export default {
  plugins: {
    '@tailwindcss/vite': {}
  }
};
```

---

## 📝 Соглашения о коде

### Naming Conventions
- **Компоненты**: PascalCase (`UserProfile.tsx`)
- **Файлы**: kebab-case (`user-profile.tsx`)
- **Константы**: UPPER_CASE (`MAX_FILES`)
- **Функции**: camelCase (`handleFileUpload`)

### Структура компонента
```tsx
// 1. Импорты
import React from 'react';
import { Button } from '@/components/ui/button';

// 2. Типы/Интерфейсы
interface Props {
  title: string;
}

// 3. Компонент
export function MyComponent({ title }: Props) {
  // 3.1. Состояния
  const [state, setState] = useState();
  
  // 3.2. Эффекты
  useEffect(() => {}, []);
  
  // 3.3. Обработчики
  const handleClick = () => {};
  
  // 3.4. Render
  return <div>{title}</div>;
}
```

---

## 🔐 Безопасность

### Защита данных
- Все данные в localStorage
- Email валидация
- Корпоративный домен @orney.ru
- Нет хранения паролей в открытом виде (в текущей mock версии)

### Планы на будущее
- OAuth 2.0 авторизация
- JWT токены
- Backend API с шифрованием
- HTTPS только

---

## 🐛 Известные ограничения

### Текущая версия (1.0.0)
- Mock данные (нет реального backend)
- Один монолитный компонент (App.tsx)
- Нет роутинга (SPA с внутренним состоянием)
- localStorage (ограничен размером)
- Нет real-time обновлений
- Экспорт PDF - mock функции

### Планируется исправить в v1.1.0
- Разделение на модули
- React Router
- Backend интеграция
- Real export to PDF/Excel

---

## 📞 Поддержка

При работе с проектом обращайтесь к:
- `README.md` - основная документация
- `DEPLOYMENT.md` - развертывание
- `USER_GUIDE.md` - руководство пользователя
- `CHANGELOG.md` - история изменений

**Техническая поддержка**: support@orney.ru

---

**Версия документа**: 1.0.0  
**Дата обновления**: 16 января 2026
