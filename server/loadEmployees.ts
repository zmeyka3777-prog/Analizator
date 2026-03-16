import pg from 'pg';
import { safeQuery } from './db';

interface Employee {
  name: string;
  role: 'Директор' | 'РМ' | 'ТМ' | 'МП';
  managerName: string;
  regions: string[];
}

const EMPLOYEES: Employee[] = [
  { name: 'Субботина Елена', role: 'Директор', managerName: '', regions: [] },

  { name: 'Оруджов Али Илгар Оглы', role: 'РМ', managerName: 'Оруджов Али', regions: ['Москва', 'Московская область', 'Республика Башкортостан', 'Пермский край', 'Оренбургская область'] },
  { name: 'Алешкова Наталья', role: 'ТМ', managerName: 'Оруджов Али', regions: [] },
  { name: 'Пушкина Людмила', role: 'ТМ', managerName: 'Оруджов Али', regions: [] },
  { name: 'Абдулаева Айсел', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Каиргалиева Радмила', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Мустафаева Сабина', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Омарова Насипли', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Татарникова Ирина', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Воробей Татьяна', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Исмаилов Хаял', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Кутлыева Гулрух', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Гусейнов Турал', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Зозуля Олеся', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Катырева Яна', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Людная Виктория', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Мансуров Арсен', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Матвеева Наталья Юрьевна', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Нагиева Аиша', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Нигматов Ильмир', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Пономарева Любовь Валерьевна', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Потапенко Жанна', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Сафиуллина Наиля', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Старухина Елена', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Шафикова Дина Иршатовна', role: 'МП', managerName: 'Оруджов Али', regions: [] },
  { name: 'Эмриева Сати', role: 'МП', managerName: 'Оруджов Али', regions: [] },

  { name: 'Самадова Лейла', role: 'РМ', managerName: 'Самадова Лейла', regions: ['Белгородская область', 'Брянская область', 'Владимирская область', 'Воронежская область', 'Ивановская область', 'Калужская область', 'Костромская область', 'Курская область', 'Липецкая область', 'Орловская область', 'Рязанская область', 'Смоленская область', 'Тамбовская область', 'Тверская область', 'Тульская область', 'Ярославская область', 'Республика Карелия', 'Республика Коми', 'Архангельская область', 'Вологодская область', 'Калининградская область', 'Ленинградская область', 'Мурманская область', 'Новгородская область', 'Псковская область', 'Санкт-Петербург', 'Ненецкий автономный округ', 'Республика Дагестан', 'Республика Ингушетия', 'Кабардино-Балкарская Республика', 'Карачаево-Черкесская Республика', 'Республика Северная Осетия — Алания', 'Чеченская Республика', 'Ставропольский край'] },
  { name: 'Разуваев Александр Александрович', role: 'ТМ', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Данилова Екатерина', role: 'ТМ', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Шадова Дина Алиевна', role: 'ТМ', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Кучко Алла', role: 'ТМ', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Беневоленская Наталья Викторовна', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Бобыкина Светлана Юрьевна', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Гурбанова Анжела', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Кулакова Яна', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Макеева Наталья', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Максимова Юлия', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Монахова Мария', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Драгунова Инна', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Исаева Марина', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Ганбарова Айнур', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Залесская Яна', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Хвиюзов Михаил', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Ковалкина Алеся', role: 'МП', managerName: 'Самадова Лейла', regions: [] },
  { name: 'Марюхин Алексей', role: 'МП', managerName: 'Самадова Лейла', regions: [] },

  { name: 'Сонин Сергей Валерьевич', role: 'РМ', managerName: 'Сонин Сергей', regions: ['Республика Марий Эл', 'Республика Мордовия', 'Республика Татарстан', 'Удмуртская Республика', 'Чувашская Республика', 'Кировская область', 'Нижегородская область', 'Пензенская область', 'Самарская область', 'Саратовская область', 'Ульяновская область'] },
  { name: 'Косых Ирина Николаевна', role: 'ТМ', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Кузнецова Ольга Николаевна', role: 'ТМ', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Малина Евгения', role: 'ТМ', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Парфенова Лилия Александровна', role: 'ТМ', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Пшеницына Оксана Викторовна', role: 'ТМ', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Верхорубова Екатерина', role: 'МП', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Жмылева Валерия', role: 'МП', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Коровина Наталья', role: 'МП', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Косых Анна Михайловна', role: 'МП', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Логинова Наталья', role: 'МП', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Шакурова Раиля', role: 'МП', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Шестакова Марина Вадимовна', role: 'МП', managerName: 'Сонин Сергей', regions: [] },
  { name: 'Ялакова Алима', role: 'МП', managerName: 'Сонин Сергей', regions: [] },

  { name: 'Аббасов Эльмир Фаххрадин Оглы', role: 'РМ', managerName: 'Аббасов Эльмир', regions: ['Республика Адыгея', 'Краснодарский край', 'Ростовская область'] },
  { name: 'Варламова Анна Дмитриевна', role: 'ТМ', managerName: 'Аббасов Эльмир', regions: [] },
  { name: 'Сабанова Алина Хасановна', role: 'ТМ', managerName: 'Аббасов Эльмир', regions: [] },
  { name: 'Бекишева Фаина', role: 'МП', managerName: 'Аббасов Эльмир', regions: [] },
  { name: 'Варламов Роман', role: 'МП', managerName: 'Аббасов Эльмир', regions: [] },
  { name: 'Голубова Ирина', role: 'МП', managerName: 'Аббасов Эльмир', regions: [] },
  { name: 'Евстифеева Ольга Дмитриевна', role: 'МП', managerName: 'Аббасов Эльмир', regions: [] },
  { name: 'Козуев Кенже', role: 'МП', managerName: 'Аббасов Эльмир', regions: [] },
  { name: 'Новикова Олеся Валерьевна', role: 'МП', managerName: 'Аббасов Эльмир', regions: [] },
  { name: 'Филиппова Елена Геннадиевна', role: 'МП', managerName: 'Аббасов Эльмир', regions: [] },

  { name: 'Мильченко Михаил Валентинович', role: 'РМ', managerName: 'Мильченко Михаил', regions: ['Республика Саха (Якутия)', 'Камчатский край', 'Приморский край', 'Хабаровский край', 'Амурская область', 'Магаданская область', 'Сахалинская область', 'Еврейская автономная область', 'Чукотский автономный округ', 'Республика Алтай', 'Республика Бурятия', 'Республика Тыва', 'Республика Хакасия', 'Алтайский край', 'Забайкальский край', 'Красноярский край', 'Иркутская область', 'Кемеровская область', 'Новосибирская область', 'Омская область', 'Томская область'] },
  { name: 'Тоболина Алла Фридриховна', role: 'ТМ', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Федина Жанна', role: 'ТМ', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Бикбаева Зульфия Якубовна', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Болотова Светлана Станиславовна', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Бормотова Елена', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Булантаева Наталья', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Вымятнина Елена', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Дробот Наталья', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Курманалина Алия', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Лунева Анастасия Сергеевна', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Марьясова Ирина', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Степанова Оксана Николаевна', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },
  { name: 'Сыртланова Асия', role: 'МП', managerName: 'Мильченко Михаил', regions: [] },

  { name: 'Тагиева Самира Юсиф Кызы', role: 'РМ', managerName: 'Тагиева Самира', regions: ['Курганская область', 'Свердловская область', 'Тюменская область', 'Челябинская область', 'Ханты-Мансийский автономный округ — Югра', 'Ямало-Ненецкий автономный округ'] },
  { name: 'Акылбекова Нурайым', role: 'МП', managerName: 'Тагиева Самира', regions: [] },
  { name: 'Антонова Светлана Николаевна', role: 'МП', managerName: 'Тагиева Самира', regions: [] },
  { name: 'Галкина Татьяна Владимировна', role: 'МП', managerName: 'Тагиева Самира', regions: [] },
  { name: 'Кулик Галина Борисовна', role: 'МП', managerName: 'Тагиева Самира', regions: [] },
  { name: 'Никитина Ирина Александровна', role: 'МП', managerName: 'Тагиева Самира', regions: [] },
  { name: 'Тулина Елена', role: 'МП', managerName: 'Тагиева Самира', regions: [] },

  { name: 'Штефанова Оксана Евгеньевна', role: 'РМ', managerName: 'Штефанова Оксана', regions: ['Республика Калмыкия', 'Астраханская область', 'Волгоградская область'] },
  { name: 'Гуров Алексей', role: 'МП', managerName: 'Штефанова Оксана', regions: [] },
  { name: 'Щербаченко Сергей', role: 'МП', managerName: 'Штефанова Оксана', regions: [] },

  { name: 'Гусейн Ульви', role: 'РМ', managerName: 'Гусейн Ульви', regions: ['Республика Крым', 'Севастополь'] },
  { name: 'Гасанова Тамара Андреевна', role: 'МП', managerName: 'Гусейн Ульви', regions: [] },
  { name: 'Радаева Елена', role: 'МП', managerName: 'Гусейн Ульви', regions: [] },
];

export async function loadEmployeesData(pool: pg.Pool): Promise<void> {
  try {
    const colCheck = await safeQuery(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema='world_medicine' AND table_name='employees_data'
    `);
    const cols = colCheck.rows.map((r: any) => r.column_name);
    if (!cols.includes('employee_name') || !cols.includes('role')) {
      console.log('[Employees] Пересоздание таблицы employees_data (старая структура)');
      await safeQuery('DROP TABLE IF EXISTS world_medicine.employees_data');
      await safeQuery(`
        CREATE TABLE world_medicine.employees_data (
          id SERIAL PRIMARY KEY,
          employee_name VARCHAR(500) NOT NULL,
          role VARCHAR(50) NOT NULL,
          manager_name VARCHAR(500),
          regions TEXT
        )
      `);
    }

    const existing = await safeQuery('SELECT COUNT(*) as cnt FROM world_medicine.employees_data');
    if (parseInt(existing.rows[0].cnt) > 0) {
      console.log(`[Employees] Данные уже загружены (${existing.rows[0].cnt} записей), пропускаем`);
      return;
    }

    let inserted = 0;
    for (const emp of EMPLOYEES) {
      const regionsStr = emp.regions.length > 0 ? emp.regions.join('|') : null;
      await safeQuery(
        'INSERT INTO world_medicine.employees_data (employee_name, role, manager_name, regions) VALUES ($1, $2, $3, $4)',
        [emp.name, emp.role, emp.managerName, regionsStr]
      );
      inserted++;
    }

    const counts = await safeQuery(`
      SELECT role, COUNT(*) as cnt FROM world_medicine.employees_data GROUP BY role ORDER BY role
    `);
    console.log(`[Employees] Загружено ${inserted} сотрудников:`);
    for (const r of counts.rows) {
      console.log(`  ${r.role}: ${r.cnt}`);
    }
  } catch (error: any) {
    console.error('[Employees] Ошибка загрузки:', error.message);
  }
}
