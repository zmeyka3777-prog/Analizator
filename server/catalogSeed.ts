// ==================== SEED КАТАЛОГОВ ====================
// Автосгенерировано из src/types/sales.types.ts и src/data/federalDistricts.ts.
// Используется db.ts для первичного заполнения пустых таблиц products /
// federal_districts / territories — чтобы админка управляла реальным каталогом,
// а аналитика читала его из БД.

export const SEED_PRODUCTS = [
  {
    "code": "apfecto",
    "name": "APFECTO EYE DROPS, SUSPENSION 0.1% 5ML №1",
    "short_name": "APFECTO",
    "price": 400,
    "quota2025": 50000,
    "budget2025": 0,
    "category": null,
    "sort_order": 0
  },
  {
    "code": "artoxan-gel",
    "name": "ARTOXAN GEL 1% 45G TUBE №1",
    "short_name": "ARTOXAN GEL",
    "price": 400,
    "quota2025": 60000,
    "budget2025": 0,
    "category": null,
    "sort_order": 1
  },
  {
    "code": "artoxan-lyof",
    "name": "ARTOXAN LYOF.POWD.FOR INJ. 20MG 3 VIAL+ 3 SOLVENT",
    "short_name": "ARTOXAN LYOF 20MG",
    "price": 650,
    "quota2025": 70000,
    "budget2025": 0,
    "category": null,
    "sort_order": 2
  },
  {
    "code": "artoxan-tablets",
    "name": "ARTOXAN TABLETS 20MG №10",
    "short_name": "ARTOXAN 20MG",
    "price": 320,
    "quota2025": 80000,
    "budget2025": 0,
    "category": null,
    "sort_order": 3
  },
  {
    "code": "clodifen",
    "name": "CLODIFEN NEURO CAPSULES №30",
    "short_name": "CLODIFEN NEURO",
    "price": 540,
    "quota2025": 65000,
    "budget2025": 0,
    "category": null,
    "sort_order": 4
  },
  {
    "code": "cocarnit",
    "name": "COCARNIT LYOF.POWD.FOR INJ. 3 VIAL + 3 SOLVENT",
    "short_name": "COCARNIT",
    "price": 740,
    "quota2025": 75000,
    "budget2025": 0,
    "category": null,
    "sort_order": 5
  },
  {
    "code": "doramycin",
    "name": "DORAMYCIN TABLETS 3,0 MIU №10",
    "short_name": "DORAMYCIN",
    "price": 1100,
    "quota2025": 40000,
    "budget2025": 0,
    "category": null,
    "sort_order": 6
  },
  {
    "code": "drastop",
    "name": "DRASTOP ADVANCE TABLETS №30",
    "short_name": "DRASTOP ADVANCE",
    "price": 1176,
    "quota2025": 35000,
    "budget2025": 0,
    "category": null,
    "sort_order": 7
  },
  {
    "code": "limenda",
    "name": "LIMENDA VAG. SUPPOSITORY 750MG/200MG №7",
    "short_name": "LIMENDA",
    "price": 750,
    "quota2025": 55000,
    "budget2025": 0,
    "category": null,
    "sort_order": 8
  },
  {
    "code": "orcipol",
    "name": "ORCIPOL TABLETS 500MG/500MG №10",
    "short_name": "ORCIPOL",
    "price": 700,
    "quota2025": 60000,
    "budget2025": 0,
    "category": null,
    "sort_order": 9
  },
  {
    "code": "ronocit",
    "name": "RONOCIT ORAL SOL. 100MG/ML 10ML №10",
    "short_name": "RONOCIT",
    "price": 1100,
    "quota2025": 45000,
    "budget2025": 0,
    "category": null,
    "sort_order": 10
  },
  {
    "code": "secnidox",
    "name": "SECNIDOX TABLETS 1000MG №2",
    "short_name": "SECNIDOX",
    "price": 750,
    "quota2025": 50000,
    "budget2025": 0,
    "category": null,
    "sort_order": 11
  }
];

export const SEED_DISTRICTS = [
  {
    "id": "pfo",
    "name": "Приволжский федеральный округ",
    "short_name": "ПФО",
    "color": "#06b6d4",
    "icon": "🌊",
    "sort_order": 0,
    "territories": [
      {
        "id": "bashkortostan",
        "name": "Республика Башкортостан",
        "budget2025": 110200,
        "sort_order": 0
      },
      {
        "id": "mariy-el",
        "name": "Республика Марий Эл",
        "budget2025": 30000,
        "sort_order": 1
      },
      {
        "id": "mordovia",
        "name": "Республика Мордовия",
        "budget2025": 34800,
        "sort_order": 2
      },
      {
        "id": "tatarstan",
        "name": "Республика Татарстан",
        "budget2025": 162400,
        "sort_order": 3
      },
      {
        "id": "udmurtia",
        "name": "Удмуртская Республика",
        "budget2025": 50000,
        "sort_order": 4
      },
      {
        "id": "chuvashia",
        "name": "Чувашская Республика",
        "budget2025": 40000,
        "sort_order": 5
      },
      {
        "id": "kirov",
        "name": "Кировская область",
        "budget2025": 45000,
        "sort_order": 6
      },
      {
        "id": "nizhny-novgorod",
        "name": "Нижегородская область",
        "budget2025": 92800,
        "sort_order": 7
      },
      {
        "id": "orenburg",
        "name": "Оренбургская область",
        "budget2025": 55000,
        "sort_order": 8
      },
      {
        "id": "penza",
        "name": "Пензенская область",
        "budget2025": 52200,
        "sort_order": 9
      },
      {
        "id": "perm-krai",
        "name": "Пермский край",
        "budget2025": 75000,
        "sort_order": 10
      },
      {
        "id": "samara",
        "name": "Самарская область",
        "budget2025": 127600,
        "sort_order": 11
      },
      {
        "id": "saratov",
        "name": "Саратовская область",
        "budget2025": 60000,
        "sort_order": 12
      },
      {
        "id": "ulyanovsk",
        "name": "Ульяновская область",
        "budget2025": 40000,
        "sort_order": 13
      }
    ]
  },
  {
    "id": "cfo",
    "name": "Центральный федеральный округ",
    "short_name": "ЦФО",
    "color": "#8b5cf6",
    "icon": "🏛️",
    "sort_order": 1,
    "territories": [
      {
        "id": "moscow-city",
        "name": "Москва",
        "budget2025": 350000,
        "sort_order": 0
      },
      {
        "id": "moscow-region",
        "name": "Московская область",
        "budget2025": 180000,
        "sort_order": 1
      },
      {
        "id": "voronezh",
        "name": "Воронежская область",
        "budget2025": 85000,
        "sort_order": 2
      },
      {
        "id": "yaroslavl",
        "name": "Ярославская область",
        "budget2025": 65000,
        "sort_order": 3
      },
      {
        "id": "tula",
        "name": "Тульская область",
        "budget2025": 60000,
        "sort_order": 4
      },
      {
        "id": "ryazan",
        "name": "Рязанская область",
        "budget2025": 50000,
        "sort_order": 5
      },
      {
        "id": "belgorod",
        "name": "Белгородская область",
        "budget2025": 48000,
        "sort_order": 6
      },
      {
        "id": "kaluga",
        "name": "Калужская область",
        "budget2025": 42000,
        "sort_order": 7
      }
    ]
  },
  {
    "id": "szfo",
    "name": "Северо-Западный федеральный округ",
    "short_name": "СЗФО",
    "color": "#3b82f6",
    "icon": "⚓",
    "sort_order": 2,
    "territories": [
      {
        "id": "spb-city",
        "name": "Санкт-Петербург",
        "budget2025": 280000,
        "sort_order": 0
      },
      {
        "id": "leningrad",
        "name": "Ленинградская область",
        "budget2025": 95000,
        "sort_order": 1
      },
      {
        "id": "murmansk",
        "name": "Мурманская область",
        "budget2025": 42000,
        "sort_order": 2
      },
      {
        "id": "arkhangelsk",
        "name": "Архангельская область",
        "budget2025": 38000,
        "sort_order": 3
      },
      {
        "id": "kaliningrad",
        "name": "Калининградская область",
        "budget2025": 35000,
        "sort_order": 4
      },
      {
        "id": "vologda",
        "name": "Вологодская область",
        "budget2025": 32000,
        "sort_order": 5
      }
    ]
  },
  {
    "id": "ufo",
    "name": "Уральский федеральный округ",
    "short_name": "УФО",
    "color": "#f59e0b",
    "icon": "⛰️",
    "sort_order": 3,
    "territories": [
      {
        "id": "sverdlovsk",
        "name": "Свердловская область",
        "budget2025": 145000,
        "sort_order": 0
      },
      {
        "id": "chelyabinsk",
        "name": "Челябинская область",
        "budget2025": 120000,
        "sort_order": 1
      },
      {
        "id": "tyumen",
        "name": "Тюменская область",
        "budget2025": 95000,
        "sort_order": 2
      },
      {
        "id": "khmao",
        "name": "Ханты-Мансийский АО",
        "budget2025": 85000,
        "sort_order": 3
      },
      {
        "id": "kurgan",
        "name": "Курганская область",
        "budget2025": 30000,
        "sort_order": 4
      }
    ]
  },
  {
    "id": "sfo",
    "name": "Сибирский федеральный округ",
    "short_name": "СФО",
    "color": "#10b981",
    "icon": "🌲",
    "sort_order": 4,
    "territories": [
      {
        "id": "krasnoyarsk",
        "name": "Красноярский край",
        "budget2025": 110000,
        "sort_order": 0
      },
      {
        "id": "novosibirsk",
        "name": "Новосибирская область",
        "budget2025": 105000,
        "sort_order": 1
      },
      {
        "id": "irkutsk",
        "name": "Иркутская область",
        "budget2025": 85000,
        "sort_order": 2
      },
      {
        "id": "kemerovo",
        "name": "Кемеровская область",
        "budget2025": 75000,
        "sort_order": 3
      },
      {
        "id": "omsk",
        "name": "Омская область",
        "budget2025": 65000,
        "sort_order": 4
      },
      {
        "id": "tomsk",
        "name": "Томская область",
        "budget2025": 42000,
        "sort_order": 5
      }
    ]
  },
  {
    "id": "yufo",
    "name": "Южный федеральный округ",
    "short_name": "ЮФО",
    "color": "#ec4899",
    "icon": "☀️",
    "sort_order": 5,
    "territories": [
      {
        "id": "krasnodar",
        "name": "Краснодарский край",
        "budget2025": 165000,
        "sort_order": 0
      },
      {
        "id": "rostov",
        "name": "Ростовская область",
        "budget2025": 125000,
        "sort_order": 1
      },
      {
        "id": "volgograd",
        "name": "Волгоградская область",
        "budget2025": 80000,
        "sort_order": 2
      },
      {
        "id": "astrakhan",
        "name": "Астраханская область",
        "budget2025": 38000,
        "sort_order": 3
      },
      {
        "id": "crimea",
        "name": "Республика Крым",
        "budget2025": 55000,
        "sort_order": 4
      },
      {
        "id": "sevastopol",
        "name": "Севастополь",
        "budget2025": 32000,
        "sort_order": 5
      }
    ]
  },
  {
    "id": "skfo",
    "name": "Северо-Кавказский федеральный округ",
    "short_name": "СКФО",
    "color": "#ef4444",
    "icon": "🏔️",
    "sort_order": 6,
    "territories": [
      {
        "id": "stavropol",
        "name": "Ставропольский край",
        "budget2025": 72000,
        "sort_order": 0
      },
      {
        "id": "dagestan",
        "name": "Республика Дагестан",
        "budget2025": 58000,
        "sort_order": 1
      },
      {
        "id": "north-ossetia",
        "name": "Республика Северная Осетия",
        "budget2025": 28000,
        "sort_order": 2
      },
      {
        "id": "kabardino-balkaria",
        "name": "Кабардино-Балкарская Республика",
        "budget2025": 25000,
        "sort_order": 3
      },
      {
        "id": "chechnya",
        "name": "Чеченская Республика",
        "budget2025": 42000,
        "sort_order": 4
      }
    ]
  },
  {
    "id": "dfo",
    "name": "Дальневосточный федеральный округ",
    "short_name": "ДФО",
    "color": "#14b8a6",
    "icon": "🌅",
    "sort_order": 7,
    "territories": [
      {
        "id": "primorsky",
        "name": "Приморский край",
        "budget2025": 95000,
        "sort_order": 0
      },
      {
        "id": "khabarovsk",
        "name": "Хабаровский край",
        "budget2025": 72000,
        "sort_order": 1
      },
      {
        "id": "sakhalin",
        "name": "Сахалинская область",
        "budget2025": 58000,
        "sort_order": 2
      },
      {
        "id": "amur",
        "name": "Амурская область",
        "budget2025": 38000,
        "sort_order": 3
      },
      {
        "id": "kamchatka",
        "name": "Камчатский край",
        "budget2025": 32000,
        "sort_order": 4
      },
      {
        "id": "yakutia",
        "name": "Республика Саха (Якутия)",
        "budget2025": 55000,
        "sort_order": 5
      }
    ]
  }
];
