import type { Municipality } from '../shared/types/domain';

export type DestinationFactIcon = 'calendar' | 'cloud' | 'compass' | 'map' | 'mountain' | 'people' | 'road';

export interface DestinationFact {
  label: string;
  value: string;
  icon: DestinationFactIcon;
}

export interface DestinationLandmark {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
}

export interface DestinationDetails {
  heroLead: string;
  overview: string;
  facts: DestinationFact[];
  landmarks: DestinationLandmark[];
}

const curatedDetails: Record<string, DestinationDetails> = {
  jardin: {
    heroLead: 'El pueblo más hermoso y colorido de Antioquia.',
    overview: 'Jardín es un encantador municipio del Suroeste Antioqueño, reconocido por su arquitectura colorida, su gente amable y su conexión con la naturaleza. Es el destino ideal para quienes buscan tranquilidad, aventura y cultura.',
    facts: [
      { label: 'Fundación', value: '23 de mayo de 1863', icon: 'calendar' },
      { label: 'Altitud', value: '1750 m s. n. m.', icon: 'mountain' },
      { label: 'Clima', value: 'Entre 12 °C y 22 °C', icon: 'cloud' },
      { label: 'Gentilicio', value: 'Jardineño, -a', icon: 'people' },
      { label: 'Distancia', value: 'A 135 kilómetros por carretera', icon: 'road' },
      { label: 'Cómo llegar', value: 'A 3 horas de Medellín en bus o carro', icon: 'compass' },
    ],
    landmarks: [
      {
        id: 'cueva-del-esplendor',
        name: 'Cueva del Esplendor',
        description: 'Déjate sorprender por una majestuosa cascada que cae dentro de una cueva, creando uno de los paisajes más mágicos de Antioquia.',
        imageUrl: '/assets/context-154.webp',
      },
      {
        id: 'basilica-menor',
        name: 'Basílica Menor de la Inmaculada Concepción',
        description: 'Admira el templo más emblemático de Jardín, símbolo de su historia, fe y tradición.',
        imageUrl: '/assets/jardin.webp',
      },
      {
        id: 'charco-corazon',
        name: 'Charco Corazón',
        description: 'Relájate en un rincón natural de aguas cristalinas rodeado de imponentes montañas y vegetación.',
        imageUrl: '/assets/figma-tamesis.webp',
      },
      {
        id: 'mirador-cristo-rey',
        name: 'Mirador Cristo Rey',
        description: 'Contempla una vista panorámica inolvidable de Jardín y enamórate de sus paisajes coloridos desde las alturas.',
        imageUrl: '/assets/figma-jardin.webp',
      },
    ],
  },
  jerico: {
    heroLead: 'Cuna de cultura, fe y tradición antioqueña.',
    overview: 'Jericó nos enseña a valorar nuestras raíces, nuestra cultura y la belleza de las cosas simples. Un lugar que inspira tranquilidad, orgullo y amor por nuestra tierra.',
    facts: [
      { label: 'Gentilicio', value: 'Jericoano, -a', icon: 'people' },
      { label: 'Región', value: 'Suroeste Antioqueño', icon: 'map' },
      { label: 'Experiencias', value: 'Cultura, fe y tradición', icon: 'compass' },
    ],
    landmarks: [
      {
        id: 'cristo-redentor-jerico',
        name: 'Cristo Redentor de Jericó',
        description: 'Sube al mirador y descubre una vista amplia del pueblo y las montañas que lo rodean.',
        imageUrl: '/assets/figma-jerico.webp',
      },
      {
        id: 'parque-principal-jerico',
        name: 'Parque Principal de Jericó',
        description: 'Camina por el corazón del municipio y reconoce sus fachadas, historias y tradiciones.',
        imageUrl: '/assets/destination-jerico.webp',
      },
    ],
  },
};

const fallbackLandmarkImages = [
  '/assets/figma-concordia-waterfall.webp',
  '/assets/figma-andes.webp',
  '/assets/figma-tamesis.webp',
  '/assets/destination-jardin.webp',
];

export function getDestinationDetails(municipality: Municipality): DestinationDetails {
  const curated = curatedDetails[municipality.slug];
  if (curated) return curated;

  const landmarks = municipality.experiences.map((experience, index) => ({
    id: experience.id,
    name: experience.title,
    description: experience.description,
    imageUrl: municipality.imageUrl ?? fallbackLandmarkImages[index % fallbackLandmarkImages.length],
  }));

  return {
    heroLead: municipality.description,
    overview: municipality.description,
    facts: [
      { label: 'Región', value: 'Suroeste Antioqueño', icon: 'map' },
      { label: 'Experiencias', value: `${municipality.experiences.length} disponibles`, icon: 'compass' },
      { label: 'Plan de visita', value: 'A tu ritmo', icon: 'calendar' },
    ],
    landmarks,
  };
}
