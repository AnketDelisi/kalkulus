import rawCountries from './abroadCountries2023.json';
import { AbroadCountryData } from '../types/election';

export const ABROAD_COUNTRIES_2023 = rawCountries as AbroadCountryData[];

export const ABROAD_COUNTRY_BY_ID: Record<string, AbroadCountryData> = Object.fromEntries(
  ABROAD_COUNTRIES_2023.map((c) => [c.id, c])
);
