import { getMunicipality, listMunicipalities } from './destination-service';

test('finds Jardín without treating case as significant', () => {
  expect(listMunicipalities('JARDÍN').map(({ slug }) => slug)).toContain('jardin');
});

test('returns undefined for an absent municipality', () => {
  expect(getMunicipality('ausente')).toBeUndefined();
});
