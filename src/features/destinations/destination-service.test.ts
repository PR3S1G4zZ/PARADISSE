import {
  getDestination,
  getMunicipality,
  listDestinations,
  listMunicipalities,
} from './destination-service';

test('finds Jardín without treating case as significant', () => {
  expect(listMunicipalities('JARDÍN').map(({ slug }) => slug)).toContain('jardin');
});

test('exposes the complete Suroeste catalogue', () => {
  expect(listMunicipalities()).toHaveLength(23);
});

test('returns undefined for an absent municipality', () => {
  expect(getMunicipality('ausente')).toBeUndefined();
});

test('exposes the unified catalogue with the two requested Itagui sites', () => {
  const destinations = listDestinations();

  expect(destinations).toHaveLength(25);
  expect(destinations.filter(({ kind }) => kind === 'municipality')).toHaveLength(23);
  expect(destinations.filter(({ kind }) => kind === 'site').map(({ slug }) => slug)).toEqual([
    'sena-calatrava',
    'parque-principal-itagui',
  ]);
});

test('resolves site destinations with routable arrival points', () => {
  expect(getDestination('sena-calatrava')).toMatchObject({
    kind: 'site',
    name: 'SENA de Calatrava',
    location: {
      lat: expect.any(Number),
      lng: expect.any(Number),
      arrivalLabel: expect.any(String),
    },
  });
});

test('filters the unified catalogue by destination kind and accent-insensitive query', () => {
  expect(listDestinations('ITAGÜÍ', 'site').map(({ slug }) => slug)).toEqual([
    'sena-calatrava',
    'parque-principal-itagui',
  ]);
  expect(listDestinations('', 'municipality')).toHaveLength(23);
});
