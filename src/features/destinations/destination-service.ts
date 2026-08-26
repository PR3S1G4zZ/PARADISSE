import { municipalities } from '../../data/municipalities';
import type { Municipality } from '../../shared/types/domain';

const normalize = (value: string): string => value
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase();

export const listMunicipalities = (query = ''): Municipality[] =>
  municipalities.filter(({ name }) => normalize(name).includes(normalize(query)));

export const getMunicipality = (slug: string): Municipality | undefined =>
  municipalities.find((municipality) => municipality.slug === slug);
