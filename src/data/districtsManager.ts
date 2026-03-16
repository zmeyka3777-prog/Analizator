import { FederalDistrict, Territory, FEDERAL_DISTRICTS as DEFAULT_DISTRICTS } from './federalDistricts';

const STORAGE_KEY = 'world_medicine_districts';
const DRAFT_STORAGE_KEY = 'world_medicine_districts_draft';

export function getAllDistricts(): FederalDistrict[] {
  if (typeof window === 'undefined') return DEFAULT_DISTRICTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error('Error loading districts:', e); }
  return DEFAULT_DISTRICTS;
}

export function getDistrictsDraft(): FederalDistrict[] {
  if (typeof window === 'undefined') return getAllDistricts();
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) { console.error('Error loading districts draft:', e); }
  return getAllDistricts();
}

export function saveAllDistricts(districts: FederalDistrict[]): void {
  if (typeof window === 'undefined') return;
  try {
    const updated = districts.map(district => ({
      ...district,
      totalBudget2025: district.territories.reduce((sum, terr) => sum + terr.budget2025, 0),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) { console.error('Error saving districts:', e); }
}

export function saveDistrictsDraft(districts: FederalDistrict[]): void {
  if (typeof window === 'undefined') return;
  try {
    const updated = districts.map(district => ({
      ...district,
      totalBudget2025: district.territories.reduce((sum, terr) => sum + terr.budget2025, 0),
    }));
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) { console.error('Error saving districts draft:', e); }
}

export function publishDistrictsDraft(): boolean {
  if (typeof window === 'undefined') return false;
  try { const draft = getDistrictsDraft(); saveAllDistricts(draft); return true; } catch (e) { console.error('Error publishing districts draft:', e); return false; }
}

export function hasUnpublishedDistrictChanges(): boolean {
  if (typeof window === 'undefined') return false;
  try { return JSON.stringify(getAllDistricts()) !== JSON.stringify(getDistrictsDraft()); } catch (e) { return false; }
}

export function addDistrict(district: Omit<FederalDistrict, 'totalBudget2025'>): FederalDistrict {
  const districts = getDistrictsDraft();
  const newDistrict: FederalDistrict = {
    ...district,
    totalBudget2025: district.territories.reduce((sum, terr) => sum + terr.budget2025, 0),
  };
  districts.push(newDistrict);
  saveDistrictsDraft(districts);
  return newDistrict;
}

export function updateDistrict(id: string, updates: Partial<FederalDistrict>): FederalDistrict | null {
  const districts = getDistrictsDraft();
  const index = districts.findIndex(d => d.id === id);
  if (index === -1) return null;
  districts[index] = { ...districts[index], ...updates };
  saveDistrictsDraft(districts);
  return districts[index];
}

export function deleteDistrict(id: string): boolean {
  const districts = getDistrictsDraft();
  const filtered = districts.filter(d => d.id !== id);
  if (filtered.length === districts.length) return false;
  saveDistrictsDraft(filtered);
  return true;
}

export function addTerritory(districtId: string, territory: Territory): boolean {
  const districts = getDistrictsDraft();
  const district = districts.find(d => d.id === districtId);
  if (!district) return false;
  district.territories.push(territory);
  saveDistrictsDraft(districts);
  return true;
}

export function updateTerritory(districtId: string, territoryId: string, updates: Partial<Territory>): boolean {
  const districts = getDistrictsDraft();
  const district = districts.find(d => d.id === districtId);
  if (!district) return false;
  const territoryIndex = district.territories.findIndex(t => t.id === territoryId);
  if (territoryIndex === -1) return false;
  district.territories[territoryIndex] = { ...district.territories[territoryIndex], ...updates };
  saveDistrictsDraft(districts);
  return true;
}

export function deleteTerritory(districtId: string, territoryId: string): boolean {
  const districts = getDistrictsDraft();
  const district = districts.find(d => d.id === districtId);
  if (!district) return false;
  const initialLength = district.territories.length;
  district.territories = district.territories.filter(t => t.id !== territoryId);
  if (district.territories.length === initialLength) return false;
  saveDistrictsDraft(districts);
  return true;
}

export function resetToDefault(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DRAFT_STORAGE_KEY);
}

export function updateBudget2026(districtId: string, budget2026: number): boolean {
  const districts = getDistrictsDraft();
  const district = districts.find(d => d.id === districtId);
  if (!district) return false;
  district.totalBudget2026 = budget2026;
  saveDistrictsDraft(districts);
  return true;
}
