export interface Municipality {
  slug: string;
  name: string;
  description: string;
  imageUrl?: string;
  experiences: Experience[];
}

export type DestinationKind = 'municipality' | 'site';

export type TravelMode = 'walk' | 'car';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface DestinationLocation extends GeoPoint {
  arrivalLabel: string;
  address?: string;
  /** Optional verified road-access point for destinations outside the road network. */
  routingPoint?: GeoPoint;
}

export interface CatalogDestination {
  slug: string;
  name: string;
  kind: DestinationKind;
  description: string;
  imageUrl?: string;
  location: DestinationLocation;
  experiences: Experience[];
  municipalitySlug?: string;
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  duration?: string;
  price?: number;
}

export interface Guide {
  id: string;
  municipalitySlug: string;
  category: 'cultura-historia' | 'gastronomia' | string;
  title: string;
  description: string;
  experienceId?: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
}

export interface VisitPlan {
  favorites: string[];
  municipalities: string[];
  sites: string[];
  experiences: string[];
}
