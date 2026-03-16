# MDLP Analytics - World Medicine

## Overview
MDLP Analytics is a pharmaceutical sales analytics application designed to analyze MDLP data, providing 12 functional modules including data upload, interactive dashboards, data management, and various analytical tools. It focuses on the Volga Federal District with granular drill-down capabilities for strategic decision-making. The system also integrates with and transforms MDLP data for World Medicine (WM) Russia analytics, offering a unified view of pharmaceutical sales. The project aims to provide deep insights for business vision, market potential, and project ambitions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
-   **Framework**: React 18 with TypeScript and Vite.
-   **Styling**: Tailwind CSS 4.0 with a Zaha Hadid-inspired futuristic theme, utilizing glass-morphism effects and gradients.
-   **UI Components**: Radix UI primitives wrapped with shadcn/ui, `lucide-react` for icons.
-   **Charts/Visualization**: Recharts library for various chart types.
-   **Animation**: Framer Motion.

### Backend
-   **API Server**: Express.js.
-   **Database**: PostgreSQL with Drizzle ORM.
-   **Authentication**: Email-based registration, JWT for API security, bcrypt for password hashing.
-   **Data Handling**: Supports import/export for Excel, CSV, JSON; report archiving; historical data with edit-locking; dynamic data structures derived from uploaded files.
-   **File Parsing**: SheetJS (xlsx) and PapaParse (csv) with automatic column recognition for MDLP data, including extended columns like `disposalType`, `federalDistrict`, and `receiverType`. Custom column mapping for varied file formats.
-   **Large File Processing**: Files > 1 MB are processed server-side. **Chunked upload** splits files into 5 MB chunks on frontend, sends sequentially via `/api/files/upload-init` + `/api/files/upload-chunk` endpoints. Server reassembles chunks, then streams CSV with COPY FROM STDIN directly into `raw_sales_rows` PostgreSQL table. After streaming, SQL GROUP BY aggregation produces analytics. Raw rows cleaned up after processing. No in-memory accumulation. Supports files up to 700 MB. Sequential upload queue prevents race conditions. Errors logged to `/home/runner/workspace/upload-errors.log`. Individual chunk retry (3 attempts) with exponential backoff. Old busboy single-upload endpoint preserved as fallback.
-   **SQL Aggregation**: `server/sqlAggregator.ts` replaces in-memory IncrementalAggregator for upload flow. Runs GROUP BY queries on `raw_sales_rows` to build AggregatedData JSON. Year=9999 explicitly filtered out during aggregation.
-   **Multi-File Per Year**: Supports uploading multiple files for the same year (e.g., one file per drug). `mergeAggregatedData()` in `sqlAggregator.ts` merges all aggregated arrays (drugSales, regionSales, contragentSales, monthlySales, combinedData, disposalTypeSales, territoryHierarchy, drugAnalytics, contragentAnalytics) by summing values for matching keys. Forecasts in combinedData are stripped before merge and recomputed after. Each compact row stores its `uploadId` for per-upload tracking.
-   **CompactRows Merging**: When uploading a new file, compactRows (year=9999 record) are APPENDED to existing compact rows (not replaced by year). Each row includes `uploadId` field. Delete upload filters out compact rows by `uploadId` and re-aggregates yearly_sales_data from remaining rows. Legacy rows without `uploadId` fall back to year-based deletion.
-   **Proportional Disposal Type Filtering**: When compactRows are absent (legacy data), disposal type filtering uses a proportional approach — calculates the ratio of selected types' sales to total from `disposalTypeSales` per year, then applies this ratio to all aggregates (monthly, regional, drug, contragent, federal district). Per-year ratios applied to `combinedData`, global weighted ratio to other aggregates. When files are re-uploaded, compactRows are created and exact filtering takes over.
-   **AI Integration**: Replit AI Integrations (OpenAI-compatible API) for generating Russian-language analytical comments.
-   **DB Connection Resilience**: `pool.on('error')` handler prevents crashes on connection drops. Circuit breaker (2 failures threshold, 120s cooldown) protects all queries via `safeQuery()`. `withDbRetry()` used ONLY for 3 critical write operations (COPY processing, SQL aggregation, yearly_sales_data save) with maxRetries:1 and 60s delay. All SELECT/read queries use `safeQuery()` — fail fast with 503, no retries. Pool max: 3 connections (optimized for 2GB RAM Timeweb). `/api/health` endpoint returns DB status from in-memory state only (no DB query). Frontend polls health every 30s and shows amber warning banner when DB is unavailable.
-   **Compact Rows Cache**: `compactRowsCache` in `tabDataRoutes.ts` caches loaded compact rows per user (3-minute TTL). First filtered tab request loads ~885K rows (~63s for large users), subsequent tabs hit cache instantly. Invalidated on upload/delete via `invalidateUserCache()`. Keyed by userId — no cross-user leak.
-   **Unified Filter Synchronization**: All 13 tabs (MDLP: dashboard, forecast, territories, seasonal, abc, drilldown, contragents, compare, percapita, peremployee; WM: wm-dashboard, wm-districts, wm-products) receive and apply general filters (years, regions, drugs, disposalTypes, federalDistricts, contractorGroups, month) from the top filter panel. Frontend `App.tsx` always sends general filters for all tabs (no conditional WM exclusion). Backend endpoints use `parseFilters()` + `applyFilters()` + `loadCompactRowsIfNeeded()` for exact filtering from compact rows. WM endpoints use `filtersActive` flag to switch between filtered vs unfiltered data sources for territory hierarchy and drug sales.

### Application Structure
-   Centralized `App.tsx` for main SPA logic.
-   Dedicated `src/types/index.ts` for TypeScript interfaces.
-   Path aliases for improved module resolution.
-   State managed primarily with React hooks (`useState`, `useCallback`).
-   Session persistence for authentication via `localStorage`.
-   `SharedDataContext` for unified data storage and transformation between MDLP and WM Russia systems.

### Key Features
-   **Dynamic Data**: Territorial, drug, and contragent data are dynamically derived from uploaded MDLP files.
-   **Multi-Year Analysis & Advanced Filtering**: Supports combining data across multiple years and offers multi-select filters.
-   **AI-Powered Insights**: AI generates analytical comments for sales forecasts.
-   **Data Security**: Implements JWT authentication, input sanitization (Zod, `sanitize-html`), SQL injection protection, rate limiting, and security headers (Helmet.js).
-   **WM Russia Integration**: Transforms MDLP data for WM Russia analytics, including region mapping, real-time data synchronization, and completion tracking for 12 WM products across 8 Federal Districts. Features hierarchical drill-down for districts. WM month filter uses dual-mode approach: exact filtering from compactRows when available, proportional fallback from monthlySales ratios when compactRows are absent (scales all aggregates by month's share of annual total). Mixed mode combines both for different years. If no data exists for selected month+year, returns empty results. **Territory Hierarchy Enrichment**: `enrichTerritoryHierarchy()` in `tabDataRoutes.ts` auto-reconstructs missing `drugSales` per FD/region, `contragentCount`, and `children` from `drugAnalytics.regionSales` and `contragentSales` when data is lost after reaggregation. Uses `FD_REGION_KEYWORDS` mapping (8 FDs with keyword patterns) to match regions to federal districts. Called during `loadAggregatedData` for each year and merged data. Known limitation: region children (cities) can only be reconstructed from `th.cities` if present; otherwise requires file re-upload.
-   **District Analytics**: Extracts and visualizes municipal and city districts from MDLP data for drill-down analysis.
-   **Contractor Analytics**: Interactive pie charts and detailed views for contractor groups.
-   **Period Comparisons**: Dynamic year-to-year, quarterly, and monthly sales comparisons with KPI cards.
-   **Forecasting**: Dynamic sales forecasts with smart extrapolation and AI-generated comments.
-   **Weekly Analysis**: Real calendar-based weekly breakdowns using `day` field extracted from documentDate during file upload. Week-of-month computed as CASE (days 1-7=week 1, 8-14=week 2, etc., up to week 5). `weeklySales` array format: `{month, week, drug, quantity, amount}`. Backend aggregation in `buildYearAggregation` and `reaggregateFromCompactRows`. API returns `weeklySalesPerYear` per year. Frontend `getWeeklyBreakdown` uses real data when available, falls back to proportional distribution for old uploads without day data (shows amber notice). Уп./₽ toggle for packages vs rubles display. Sorts by monetary totals in ₽ mode. Alerts for drugs with >10% declining growth.
-   **Drug & Region Plans**: Supports monthly sales targets per drug and region with completion tracking.
-   **Report Generation**: Provides 9 types of reports (monthly, territorial, drug-specific, forecast, etc.) with Excel and PDF export.
-   **Upload History Management**: Tracks all file uploads in `upload_history` table with filename, date, row count, year period, and active/inactive status. Users can view, toggle, and delete uploads from the "История загрузок" tab. Toggle "Исключить из анализа" now fully recalculates yearly_sales_data from only active uploads' compact rows. Duplicate file protection: upload-init and busboy endpoints create upload_history record with status 'processing' immediately at init; duplicate check blocks uploads with same filename in 'success' OR 'processing' status. On success, record updated to 'success'; on error, updated to 'error'. Stale 'processing' records (>30 min) auto-cleaned to 'error' on server startup. Fallback INSERT if UPDATE finds 0 rows.
-   **Clear Queue**: The "Очистить очередь" button on the upload screen only clears the file selection queue (UI-only), does NOT delete anything from the database. Database deletion is exclusively through the "История загрузок" tab per-file delete buttons.
-   **Region & Drug Normalization**: Shared `normalizeRegionName()` in `server/utils/normalizeRegion.ts` applied during CSV parsing (fileProcessor), population data loading, and percapita/peremployee comparison. Handles abbreviations (Респ.→Республика, обл.→область, кр.→край), stuck words, and NBSP. `normalizeDrugName()` trims whitespace, removes NBSP, capitalizes first letter.
-   **Packages-to-Money Dual Display**: MDLP Dashboard displays both packages AND rubles simultaneously (no toggle). Backend provides `drugSalesPerYear` and `monthlyDrugSales` in `/dashboard` endpoint for accurate rubles computation. KPI card "Всего продаж" shows packages + rubles side-by-side with per-year breakdown (year, packages, rubles, auto-detected period, % dynamics). Two side-by-side bar charts show monthly dynamics in packages (left) and rubles (right) with year overlays. Two side-by-side pie charts show drug share in packages (left) and rubles (right), top-10 + "Остальные". Price conversion via `drug_prices` table in Timeweb DB. `convertDrugBreakdownToRubles()` and `formatDual()` helpers in `src/lib/priceUtils.ts`. Known limitation: per-year drug breakdowns use unfiltered data; tab-level filters don't affect KPI breakdown (main use case is unfiltered view).
-   **Delete All Data**: "Удалить все данные" button in upload history tab deletes all upload_history and yearly_sales_data for current user. Single-file delete also cleans orphaned yearly_sales_data when no files remain for a year.

## External Dependencies

### Frontend Libraries
-   `@radix-ui/*`: Headless UI primitives.
-   `lucide-react`: Icon library.
-   `class-variance-authority`, `clsx`, `tailwind-merge`: For className composition.
-   `recharts`: Charting library.
-   `react-hook-form`: Form management.
-   `date-fns`: Date utility library.
-   `framer-motion`: Animation library.
-   `zod`: Schema validation.

### Backend Libraries
-   `express`: Web framework.
-   `drizzle-orm`, `pg`: ORM for PostgreSQL.
-   `bcryptjs`: Password hashing.
-   `jsonwebtoken`: JWT for authentication.
-   `helmet`: Security headers.
-   `express-rate-limit`: Rate limiting middleware.
-   `@replit/ai-integrations`: For AI capabilities (OpenAI-compatible).

### Data Parsing Libraries
-   `xlsx` (SheetJS): Excel file parsing.
-   `papaparse`: CSV file parsing.
-   `sanitize-html`: HTML sanitization.