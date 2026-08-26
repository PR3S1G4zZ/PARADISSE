export type GuideCategory = 'cultura-historia' | 'gastronomia';

export interface GuideExperience {
  id: string;
  municipalitySlug: string;
  category: GuideCategory;
  title: string;
  description: string;
  imageUrl: string;
  duration: string;
  price: number;
}

export const guides: GuideExperience[] = [
  {
    id: 'jardin-cultura-basílica', municipalitySlug: 'jardin', category: 'cultura-historia',
    title: 'Historias de la plaza y la basílica',
    description: 'Camina entre balcones coloridos y conoce las historias que hicieron de Jardín un pueblo único.',
    imageUrl: 'https://images.unsplash.com/photo-1531058020387-3be344556be6?auto=format&fit=crop&w=900&q=85',
    duration: '2 horas', price: 55000,
  },
  {
    id: 'jardin-cultura-artesanos', municipalitySlug: 'jardin', category: 'cultura-historia',
    title: 'Oficios vivos del Suroeste',
    description: 'Visita talleres locales y descubre cómo se conservan las manos artesanas de la región.',
    imageUrl: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=85',
    duration: '3 horas', price: 75000,
  },
  {
    id: 'jardin-cultura-cafe', municipalitySlug: 'jardin', category: 'cultura-historia',
    title: 'Café y memoria campesina',
    description: 'Escucha relatos de familias cafeteras mientras aprendes a reconocer los sabores de origen.',
    imageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=85',
    duration: '2 horas', price: 65000,
  },
  {
    id: 'jardin-gastro-trucha', municipalitySlug: 'jardin', category: 'gastronomia',
    title: 'Trucha de río a la mesa',
    description: 'Conoce una cocina familiar y disfruta una receta local preparada con ingredientes frescos.',
    imageUrl: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?auto=format&fit=crop&w=900&q=85',
    duration: '2 horas', price: 85000,
  },
  {
    id: 'jardin-gastro-panela', municipalitySlug: 'jardin', category: 'gastronomia',
    title: 'Dulces, café y panela',
    description: 'Prueba dulces tradicionales y aprende el viaje de la caña hasta la mesa campesina.',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=85',
    duration: '90 minutos', price: 50000,
  },
  {
    id: 'jardin-gastro-mercado', municipalitySlug: 'jardin', category: 'gastronomia',
    title: 'Sabores del mercado local',
    description: 'Recorre el mercado con un anfitrión local y arma una degustación de productos del territorio.',
    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=85',
    duration: '2 horas', price: 60000,
  },
];

export const getGuides = (municipalitySlug: string, category: GuideCategory): GuideExperience[] =>
  guides.filter((guide) => guide.municipalitySlug === municipalitySlug && guide.category === category);
