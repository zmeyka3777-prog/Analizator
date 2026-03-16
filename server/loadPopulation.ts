import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { normalizeRegionName } from './utils/normalizeRegion';
import { safeQuery } from './db';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SKIP_ROWS = new Set([
  'ПФО', 'ДВФО', 'СФО', 'УФО', 'ЦФО', 'СЗФО', 'СКФО', 'ЮФО', 'ДФО',
  'Волгоград+Астрахань', 'КБР+КЧР+СО+ЧР', 'Краснодар', 'Крым, Севастополь',
  'Мск+МО', 'Ростов', 'Ставрополь', 'Уфа+Пермь', 'Общий итог', 'Дагестан',
]);

const MANAGER_MAP: Record<string, string[]> = {
  'Оруджов Али': ['Московская область', 'Москва', 'Республика Башкортостан', 'Пермский край', 'Оренбургская область'],
  'Самадова Лейла': ['Белгородская область', 'Брянская область', 'Владимирская область', 'Воронежская область', 'Ивановская область', 'Калужская область', 'Костромская область', 'Курская область', 'Липецкая область', 'Орловская область', 'Рязанская область', 'Смоленская область', 'Тамбовская область', 'Тверская область', 'Тульская область', 'Ярославская область', 'Республика Карелия', 'Республика Коми', 'Архангельская область', 'Вологодская область', 'Калининградская область', 'Ленинградская область', 'Мурманская область', 'Новгородская область', 'Псковская область', 'Санкт-Петербург', 'Ненецкий автономный округ'],
  'Мильченко Михаил': ['Республика Саха (Якутия)', 'Камчатский край', 'Приморский край', 'Хабаровский край', 'Амурская область', 'Магаданская область', 'Сахалинская область', 'Еврейская автономная область', 'Чукотский автономный округ', 'Республика Алтай', 'Республика Бурятия', 'Республика Тыва', 'Республика Хакасия', 'Алтайский край', 'Забайкальский край', 'Красноярский край', 'Иркутская область', 'Кемеровская область', 'Новосибирская область', 'Омская область', 'Томская область'],
  'Сонин Сергей': ['Республика Марий Эл', 'Республика Мордовия', 'Республика Татарстан', 'Удмуртская Республика', 'Чувашская Республика', 'Кировская область', 'Нижегородская область', 'Пензенская область', 'Самарская область', 'Саратовская область', 'Ульяновская область'],
  'Тагиева Самира': ['Курганская область', 'Свердловская область', 'Тюменская область', 'Челябинская область', 'Ханты-Мансийский автономный округ — Югра', 'Ямало-Ненецкий автономный округ'],
  'Аббасов Эльмир': ['Республика Адыгея', 'Краснодарский край', 'Ростовская область', 'Республика Дагестан', 'Республика Ингушетия', 'Кабардино-Балкарская Республика', 'Карачаево-Черкесская Республика', 'Республика Северная Осетия — Алания', 'Чеченская Республика', 'Ставропольский край'],
  'Штефанова Оксана': ['Республика Калмыкия', 'Астраханская область', 'Волгоградская область'],
  'Гусейн Ульви': ['Республика Крым', 'Севастополь'],
};

const FEDERAL_DISTRICT_MAP: Record<string, string[]> = {
  'Центральный федеральный округ': ['Белгородская', 'Брянская', 'Владимирская', 'Воронежская', 'Ивановская', 'Калужская', 'Костромская', 'Курская', 'Липецкая', 'Московская', 'Орловская', 'Рязанская', 'Смоленская', 'Тамбовская', 'Тверская', 'Тульская', 'Ярославская', 'Москва'],
  'Северо-Западный федеральный округ': ['Карелия', 'Коми', 'Архангельская', 'Вологодская', 'Калининградская', 'Ленинградская', 'Мурманская', 'Новгородская', 'Псковская', 'Санкт-Петербург', 'Ненецкий'],
  'Южный федеральный округ': ['Адыгея', 'Калмыкия', 'Крым', 'Краснодарский', 'Астраханская', 'Волгоградская', 'Ростовская', 'Севастополь'],
  'Северо-Кавказский федеральный округ': ['Дагестан', 'Ингушетия', 'Кабардино-Балкарская', 'Карачаево-Черкесская', 'Северная Осетия', 'Чеченская', 'Ставропольский'],
  'Приволжский федеральный округ': ['Башкортостан', 'Марий Эл', 'Мордовия', 'Татарстан', 'Удмуртская', 'Чувашская', 'Пермский', 'Кировская', 'Нижегородская', 'Оренбургская', 'Пензенская', 'Самарская', 'Саратовская', 'Ульяновская'],
  'Уральский федеральный округ': ['Курганская', 'Свердловская', 'Тюменская', 'Челябинская', 'Ханты-Мансийский', 'Ямало-Ненецкий'],
  'Сибирский федеральный округ': ['Алтай', 'Бурятия', 'Тыва', 'Хакасия', 'Алтайский', 'Забайкальский', 'Красноярский', 'Иркутская', 'Кемеровская', 'Новосибирская', 'Омская', 'Томская'],
  'Дальневосточный федеральный округ': ['Саха', 'Камчатский', 'Приморский', 'Хабаровский', 'Амурская', 'Магаданская', 'Сахалинская', 'Еврейская', 'Чукотский'],
};

// normalizeRegionName imported from ./utils/normalizeRegion

function findFederalDistrict(regionName: string): string | null {
  let bestMatch: { district: string; length: number } | null = null;
  for (const [district, keywords] of Object.entries(FEDERAL_DISTRICT_MAP)) {
    for (const keyword of keywords) {
      if (regionName.includes(keyword)) {
        if (!bestMatch || keyword.length > bestMatch.length) {
          bestMatch = { district, length: keyword.length };
        }
      }
    }
  }
  return bestMatch ? bestMatch.district : null;
}

function findManager(regionName: string): string | null {
  for (const [manager, regions] of Object.entries(MANAGER_MAP)) {
    if (regions.includes(regionName)) {
      return manager;
    }
  }
  return null;
}

export async function loadPopulationData(pool: pg.Pool): Promise<void> {
  try {
    const checkResult = await safeQuery('SELECT COUNT(*) as cnt FROM world_medicine.population_data');
    const count = parseInt(checkResult.rows[0].cnt, 10);
    if (count > 0) {
      console.log(`[Population] Таблица population_data уже содержит ${count} записей, пропускаем загрузку`);
      return;
    }

    const xlsxPath = path.join(__dirname, '..', 'attached_assets', 'население_2024_1770494474675.xlsx');
    const workbook = XLSX.readFile(xlsxPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    let inserted = 0;
    let skipped = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue;

      const rawName = String(row[0]).trim();
      const population = Number(row[1]);

      if (SKIP_ROWS.has(rawName)) {
        skipped++;
        continue;
      }

      const normalized = normalizeRegionName(rawName);
      if (!normalized) {
        skipped++;
        continue;
      }

      const federalDistrict = findFederalDistrict(normalized);
      const manager = findManager(normalized);

      await safeQuery(
        'INSERT INTO world_medicine.population_data (region_name, population, federal_district, manager_name) VALUES ($1, $2, $3, $4)',
        [normalized, population, federalDistrict, manager]
      );

      console.log(`[Population] Добавлен: ${normalized} | Население: ${population} | ФО: ${federalDistrict || 'не определён'} | Менеджер: ${manager || 'не назначен'}`);
      inserted++;
    }

    console.log(`[Population] Загрузка завершена: добавлено ${inserted}, пропущено ${skipped}`);
  } catch (err: any) {
    console.error('[Population] Ошибка загрузки данных:', err.message);
  }
}
