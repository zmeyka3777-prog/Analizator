const ABBREVIATION_MAP: [RegExp, string][] = [
  [/\bРесп\.\s*/gi, 'Республика '],
  [/\bобл\.\s*/gi, 'область '],
  [/\bкр\.\s*/gi, 'край '],
  [/\bг\.\s+/gi, ''],
  [/\bАО\b/g, 'автономный округ'],
  [/\bа\.о\.\s*/gi, 'автономный округ '],
];

export function normalizeRegionName(raw: string): string {
  if (!raw) return '';
  let name = raw.trim();

  name = name.replace(/\u00A0/g, ' ');

  if (name.includes('(с НАО)') || name.includes('(с ХМАО и ЯНАО)')) {
    return '';
  }

  name = name.replace(/\s*без НАО/, '');
  name = name.replace(/\s*без ХМАО и ЯНАО/, '');
  name = name.replace('[a]', '');

  if (name === 'Ханты-Мансийский АО-Югра' || name === 'Ханты-Мансийский АО — Югра') {
    return 'Ханты-Мансийский автономный округ — Югра';
  }

  for (const [pattern, replacement] of ABBREVIATION_MAP) {
    name = name.replace(pattern, replacement);
  }

  name = name.replace(/([а-яё])([А-ЯЁ])/g, '$1 $2');

  const lowerWords = ['область', 'край', 'округ', 'автономный', 'республика'];
  for (const word of lowerWords) {
    const regex = new RegExp(`([а-яёА-ЯЁ])${word}`, 'g');
    name = name.replace(regex, (match, prev) => {
      if (prev === ' ') return match;
      return `${prev} ${word}`;
    });
  }

  name = name.replace('Марий Эл', '%%MARIYEL%%');
  name = name.replace(/([а-яё])([А-ЯЁ])/g, '$1 $2');
  name = name.replace('%%MARIYEL%%', 'Марий Эл');

  name = name.replace(/\s{2,}/g, ' ').trim();

  return name;
}

export function normalizeRegionForComparison(name: string): string {
  return normalizeRegionName(name).toLowerCase().replace(/\s+/g, ' ').trim();
}

export function normalizeDrugName(raw: string): string {
  if (!raw) return '';
  let name = raw.trim();
  name = name.replace(/\u00A0/g, ' ');
  name = name.replace(/\s{2,}/g, ' ');
  if (name.length > 0) {
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  return name;
}
