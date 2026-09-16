import { createStorageAdapter } from './storage';

test('returns fallback and recovers from malformed JSON', () => {
  localStorage.setItem('broken', '{');
  expect(createStorageAdapter().get('broken', [])).toEqual([]);
});
