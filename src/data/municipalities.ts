import type { Municipality } from '../shared/types/domain';

export const municipalities: Municipality[] = [
  {
    slug: 'jardin',
    name: 'Jardín',
    description: 'Balcones floridos, café de origen y caminos que se abren entre montañas verdes.',
    imageUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1200&q=85',
    experiences: [
      { id: 'jardin-cafe', title: 'Ruta de café de origen', description: 'Conoce una finca cafetera y termina con una cata guiada.', duration: '3 horas', price: 95000 },
      { id: 'jardin-gallito', title: 'Sendero del Gallito de Roca', description: 'Avistamiento responsable de una de las aves más queridas del Suroeste.', duration: '2 horas', price: 65000 },
    ],
  },
  {
    slug: 'jerico',
    name: 'Jericó',
    description: 'Un pueblo de artes, historias y miradores que conserva el pulso sereno de Antioquia.',
    imageUrl: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=85',
    experiences: [
      { id: 'jerico-cuero', title: 'Taller de oficio en cuero', description: 'Comparte con artesanos locales y crea una pieza para llevar.', duration: '2 horas', price: 80000 },
      { id: 'jerico-mirador', title: 'Atardecer en el mirador', description: 'Caminata suave con una vista amplia del cañón del río Cauca.', duration: '2 horas', price: 45000 },
    ],
  },
  {
    slug: 'tamesis',
    name: 'Támesis',
    description: 'Petroglifos, ríos y montañas para quienes viajan con curiosidad y paso lento.',
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85',
    experiences: [
      { id: 'tamesis-petroglifos', title: 'Camino de petroglifos', description: 'Recorre vestigios ancestrales acompañado por un intérprete local.', duration: '3 horas', price: 70000 },
      { id: 'tamesis-rio', title: 'Baño de río y picnic', description: 'Una pausa fresca en las aguas claras del Suroeste.', duration: '4 horas', price: 75000 },
    ],
  },
  {
    slug: 'andes',
    name: 'Andes',
    description: 'Café, mulas y una plaza viva: una puerta cálida a la tradición arriera.',
    imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
    experiences: [
      { id: 'andes-arrieria', title: 'Memorias de arriería', description: 'Escucha relatos de camino y descubre el oficio que conectó la región.', duration: '2 horas', price: 55000 },
      { id: 'andes-cafe', title: 'Desayuno campesino', description: 'Sabores de finca servidos con café recién tostado.', duration: '90 minutos', price: 42000 },
    ],
  },
  {
    slug: 'urrao',
    name: 'Urrao',
    description: 'Naturaleza poderosa, aves endémicas y aire limpio entre los Andes occidentales.',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=85',
    experiences: [
      { id: 'urrao-pajaro', title: 'Avistamiento de aves', description: 'Salida de madrugada para buscar especies únicas del territorio.', duration: '4 horas', price: 120000 },
      { id: 'urrao-cascada', title: 'Caminata de cascadas', description: 'Senderos de bosque húmedo y pozos para detenerse a contemplar.', duration: '5 horas', price: 110000 },
    ],
  },
  {
    slug: 'venecia',
    name: 'Venecia',
    description: 'Una pirámide natural, cafetales y pueblos que invitan a mirar el paisaje sin prisa.',
    imageUrl: 'https://images.unsplash.com/photo-1464822759844-d150baec0494?auto=format&fit=crop&w=1200&q=85',
    experiences: [
      { id: 'venecia-cerro', title: 'Amanecer en Cerro Tusa', description: 'Ascenso acompañado para apreciar uno de los perfiles más singulares de Colombia.', duration: '5 horas', price: 130000 },
      { id: 'venecia-cafetal', title: 'Tarde entre cafetales', description: 'Un recorrido tranquilo por cultivos y sabores de temporada.', duration: '3 horas', price: 70000 },
    ],
  },
  {
    slug: 'fredonia',
    name: 'Fredonia',
    description: 'Laderas cafeteras, patrimonio republicano y conversaciones que saben a panela.',
    imageUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=85',
    experiences: [
      { id: 'fredonia-cacao', title: 'Del cacao a la mesa', description: 'Prueba procesos artesanales y prepara una bebida de chocolate.', duration: '2 horas', price: 60000 },
      { id: 'fredonia-plaza', title: 'Historias de la plaza', description: 'Un paseo guiado por fachadas y memorias del municipio.', duration: '90 minutos', price: 35000 },
    ],
  },
  {
    slug: 'concordia',
    name: 'Concordia',
    description: 'Montañas de café, tradición campesina y horizontes que cambian con cada curva.',
    imageUrl: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=85',
    experiences: [
      { id: 'concordia-cafe', title: 'Cosecha por un día', description: 'Vive el ritmo de una finca y aprende a seleccionar café maduro.', duration: '4 horas', price: 90000 },
      { id: 'concordia-sendero', title: 'Sendero de niebla', description: 'Una caminata de interpretación de flora en las montañas cafeteras.', duration: '3 horas', price: 70000 },
    ],
  },
];
