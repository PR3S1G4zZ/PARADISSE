export interface Municipality {
  slug: string;
  name: string;
  description: string;
  imageUrl?: string;
  experiences: Experience[];
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
  experiences: string[];
}
