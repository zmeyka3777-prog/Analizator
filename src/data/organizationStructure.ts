import { FEDERAL_DISTRICTS } from './federalDistricts';

export interface DistrictOrganization {
  districtId: string;
  regionalManagerId: string;
  territories: TerritoryOrganization[];
}

export interface TerritoryOrganization {
  territoryId: string;
  territorialManagerId: string;
  medrepIds: string[];
}

export const ORGANIZATION_STRUCTURE: DistrictOrganization[] = [
  {
    districtId: 'pfo',
    regionalManagerId: 'emp003',
    territories: [
      { territoryId: 'tatarstan', territorialManagerId: 'emp003', medrepIds: ['emp001', 'emp002'] },
      { territoryId: 'samara', territorialManagerId: 'emp006', medrepIds: ['emp004', 'emp005'] },
      { territoryId: 'bashkortostan', territorialManagerId: 'emp009', medrepIds: ['emp007', 'emp008'] },
      { territoryId: 'nizhny-novgorod', territorialManagerId: 'emp012', medrepIds: ['emp010', 'emp011'] },
      { territoryId: 'penza', territorialManagerId: 'emp003', medrepIds: ['emp013', 'emp014'] },
      { territoryId: 'mordovia', territorialManagerId: 'emp016', medrepIds: ['emp015'] },
    ],
  },
  {
    districtId: 'cfo',
    regionalManagerId: 'rm_cfo_001',
    territories: [
      { territoryId: 'moscow-city', territorialManagerId: 'tm_moscow_001', medrepIds: ['mr_moscow_001', 'mr_moscow_002', 'mr_moscow_003'] },
      { territoryId: 'moscow-region', territorialManagerId: 'tm_mosobl_001', medrepIds: ['mr_mosobl_001', 'mr_mosobl_002'] },
      { territoryId: 'voronezh', territorialManagerId: 'tm_voronezh_001', medrepIds: ['mr_voronezh_001'] },
    ],
  },
  {
    districtId: 'szfo',
    regionalManagerId: 'rm_szfo_001',
    territories: [
      { territoryId: 'spb-city', territorialManagerId: 'tm_spb_001', medrepIds: ['mr_spb_001', 'mr_spb_002'] },
      { territoryId: 'leningrad', territorialManagerId: 'tm_leningrad_001', medrepIds: ['mr_leningrad_001'] },
    ],
  },
  {
    districtId: 'ufo',
    regionalManagerId: 'rm_ufo_001',
    territories: [
      { territoryId: 'sverdlovsk', territorialManagerId: 'tm_sverdlovsk_001', medrepIds: ['mr_sverdlovsk_001', 'mr_sverdlovsk_002'] },
      { territoryId: 'chelyabinsk', territorialManagerId: 'tm_chelyabinsk_001', medrepIds: ['mr_chelyabinsk_001'] },
    ],
  },
  {
    districtId: 'sfo',
    regionalManagerId: 'rm_sfo_001',
    territories: [
      { territoryId: 'krasnoyarsk', territorialManagerId: 'tm_krasnoyarsk_001', medrepIds: ['mr_krasnoyarsk_001'] },
      { territoryId: 'novosibirsk', territorialManagerId: 'tm_novosibirsk_001', medrepIds: ['mr_novosibirsk_001', 'mr_novosibirsk_002'] },
    ],
  },
  {
    districtId: 'yufo',
    regionalManagerId: 'rm_yufo_001',
    territories: [
      { territoryId: 'krasnodar', territorialManagerId: 'tm_krasnodar_001', medrepIds: ['mr_krasnodar_001', 'mr_krasnodar_002'] },
      { territoryId: 'rostov', territorialManagerId: 'tm_rostov_001', medrepIds: ['mr_rostov_001'] },
    ],
  },
  {
    districtId: 'skfo',
    regionalManagerId: 'rm_skfo_001',
    territories: [
      { territoryId: 'stavropol', territorialManagerId: 'tm_stavropol_001', medrepIds: ['mr_stavropol_001'] },
      { territoryId: 'dagestan', territorialManagerId: 'tm_dagestan_001', medrepIds: ['mr_dagestan_001'] },
    ],
  },
  {
    districtId: 'dfo',
    regionalManagerId: 'rm_dfo_001',
    territories: [
      { territoryId: 'primorsky', territorialManagerId: 'tm_primorsky_001', medrepIds: ['mr_primorsky_001'] },
      { territoryId: 'khabarovsk', territorialManagerId: 'tm_khabarovsk_001', medrepIds: ['mr_khabarovsk_001'] },
    ],
  },
];

export const getDistrictOrganization = (districtId: string): DistrictOrganization | undefined => {
  return ORGANIZATION_STRUCTURE.find(d => d.districtId === districtId);
};

export const getTerritoryOrganization = (districtId: string, territoryId: string): TerritoryOrganization | undefined => {
  const district = getDistrictOrganization(districtId);
  return district?.territories.find(t => t.territoryId === territoryId);
};

export const getDistrictTerritories = (districtId: string): TerritoryOrganization[] => {
  const district = getDistrictOrganization(districtId);
  return district?.territories || [];
};

export const getFederalDistrictData = (districtId: string) => {
  return FEDERAL_DISTRICTS.find(d => d.id === districtId);
};
