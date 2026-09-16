import { municipalities } from '../../data/municipalities';
import { destinationLocations } from '../../data/destination-locations';
import { featuredSites } from '../../data/featured-sites';
import type { CatalogDestination, Municipality } from '../../shared/types/domain';

const normalize = (value: string): string => value
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase();

export const listMunicipalities = (query = ''): Municipality[] =>
  municipalities.filter(({ name }) => normalize(name).includes(normalize(query)));

export const getMunicipality = (slug: string): Municipality | undefined =>
  municipalities.find((municipality) => municipality.slug === slug);

const municipalityDestinations: CatalogDestination[] = municipalities.map((municipality) => ({
  ...municipality,
  kind: 'municipality',
  location: destinationLocations[municipality.slug],
}));

export const destinations: CatalogDestination[] = [
  ...municipalityDestinations,
  ...featuredSites,
];

export const listDestinations = (
  query = '',
  kind?: CatalogDestination['kind'],
): CatalogDestination[] => {
  const normalizedQuery = normalize(query);
  return destinations.filter((destination) => {
    if (kind && destination.kind !== kind) return false;
    if (!normalizedQuery) return true;
    const searchable = normalize([
      destination.name,
      destination.description,
      destination.location.address ?? '',
      destination.location.arrivalLabel,
    ].join(' '));
    return searchable.includes(normalizedQuery);
  });
};

export const getDestination = (slug: string): CatalogDestination | undefined =>
  destinations.find((destination) => destination.slug === slug);
