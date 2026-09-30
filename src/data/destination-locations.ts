import type { DestinationLocation } from '../shared/types/domain';

/**
 * Static arrival points for the catalogue. These are destination points, not
 * user locations and are intentionally kept out of navigation telemetry.
 */
export const destinationLocations: Record<string, DestinationLocation> = {
  jardin: { lat: 5.599, lng: -75.819, arrivalLabel: 'Parque Principal de Jardín', address: 'Jardín, Antioquia' },
  jerico: { lat: 5.792, lng: -75.787, arrivalLabel: 'Parque Principal de Jericó', address: 'Jericó, Antioquia' },
  tamesis: { lat: 5.664, lng: -75.714, arrivalLabel: 'Parque Principal de Támesis', address: 'Támesis, Antioquia' },
  andes: { lat: 5.656, lng: -75.879, arrivalLabel: 'Parque Principal de Andes', address: 'Andes, Antioquia' },
  urrao: { lat: 6.316, lng: -76.134, arrivalLabel: 'Parque Principal de Urrao', address: 'Urrao, Antioquia' },
  venecia: { lat: 5.962, lng: -75.734, arrivalLabel: 'Parque Principal de Venecia', address: 'Venecia, Antioquia' },
  fredonia: { lat: 5.928, lng: -75.67, arrivalLabel: 'Parque Principal de Fredonia', address: 'Fredonia, Antioquia' },
  concordia: { lat: 6.047, lng: -75.907, arrivalLabel: 'Parque Principal de Concordia', address: 'Concordia, Antioquia' },
  hispania: { lat: 6.057, lng: -75.909, arrivalLabel: 'Parque Principal de Hispania', address: 'Hispania, Antioquia' },
  betania: { lat: 5.746, lng: -75.983, arrivalLabel: 'Parque Principal de Betania', address: 'Betania, Antioquia' },
  'ciudad-bolivar': { lat: 5.848, lng: -76.025, arrivalLabel: 'Parque Principal de Ciudad Bolívar', address: 'Ciudad Bolívar, Antioquia' },
  salgar: { lat: 5.967, lng: -75.98, arrivalLabel: 'Parque Principal de Salgar', address: 'Salgar, Antioquia' },
  caramanta: { lat: 5.55, lng: -75.64, arrivalLabel: 'Parque Principal de Caramanta', address: 'Caramanta, Antioquia' },
  tarso: { lat: 5.865, lng: -75.82, arrivalLabel: 'Parque Principal de Tarso', address: 'Tarso, Antioquia' },
  pueblorrico: { lat: 5.79, lng: -75.84, arrivalLabel: 'Parque Principal de Pueblorrico', address: 'Pueblorrico, Antioquia' },
  valparaiso: { lat: 5.615, lng: -75.625, arrivalLabel: 'Parque Principal de Valparaíso', address: 'Valparaíso, Antioquia' },
  'la-pintada': { lat: 5.748, lng: -75.606, arrivalLabel: 'Parque Principal de La Pintada', address: 'La Pintada, Antioquia' },
  'santa-barbara': { lat: 5.875, lng: -75.567, arrivalLabel: 'Parque Principal de Santa Bárbara', address: 'Santa Bárbara, Antioquia' },
  montebello: { lat: 5.916, lng: -75.53, arrivalLabel: 'Parque Principal de Montebello', address: 'Montebello, Antioquia' },
  amaga: { lat: 6.04, lng: -75.70, arrivalLabel: 'Parque Principal de Amagá', address: 'Amagá, Antioquia' },
  titiribi: { lat: 6.06, lng: -75.66, arrivalLabel: 'Parque Principal de Titiribí', address: 'Titiribí, Antioquia' },
  angelopolis: { lat: 6.115, lng: -75.715, arrivalLabel: 'Parque Principal de Angelópolis', address: 'Angelópolis, Antioquia' },
  betulia: { lat: 6.113, lng: -75.983, arrivalLabel: 'Parque Principal de Betulia', address: 'Betulia, Antioquia' },
  'sena-calatrava': {
    lat: 6.1807225,
    lng: -75.6063286,
    arrivalLabel: 'Entrada principal del SENA de Calatrava',
    address: 'SENA Calatrava, Itagüí, Antioquia',
  },
  'parque-principal-itagui': {
    lat: 6.1723858,
    lng: -75.609416,
    arrivalLabel: 'Parque Principal de Itagüí',
    address: 'Parque Principal de Itagüí, Antioquia',
  },
};
