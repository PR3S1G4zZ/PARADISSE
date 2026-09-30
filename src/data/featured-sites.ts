import type { CatalogDestination } from '../shared/types/domain';
import { destinationLocations } from './destination-locations';

export const featuredSites: CatalogDestination[] = [
  {
    slug: 'sena-calatrava',
    name: 'SENA de Calatrava',
    kind: 'site',
    description: 'Un punto de referencia para aprender, encontrarse y conectar con Itagüí.',
    imageUrl: '/assets/figma-hero-bus.webp',
    location: destinationLocations['sena-calatrava'],
    experiences: [],
    municipalitySlug: 'itagui',
  },
  {
    slug: 'parque-principal-itagui',
    name: 'Parque Principal de Itagüí',
    kind: 'site',
    description: 'El corazón urbano de Itagüí para comenzar un recorrido por la ciudad.',
    imageUrl: '/assets/destinations-hero.webp',
    location: destinationLocations['parque-principal-itagui'],
    experiences: [],
    municipalitySlug: 'itagui',
  },
];
