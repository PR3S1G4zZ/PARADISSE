import { describe, expect, test } from 'vitest';
import { activeRouteInstruction } from './route-instructions';

const steps = [
  { texto: 'Inicia el recorrido.', distanciaM: 20, duracionMin: 1 },
  { texto: 'Gira a la derecha.', distanciaM: 30, duracionMin: 2 },
  { texto: 'Has llegado.', distanciaM: 0, duracionMin: 0 },
];

describe('active route instruction', () => {
  test('selects the step containing the accumulated progress', () => {
    expect(activeRouteInstruction(steps, 0)).toBe('Inicia el recorrido.');
    expect(activeRouteInstruction(steps, 20.1)).toBe('Gira a la derecha.');
    expect(activeRouteInstruction(steps, 500)).toBe('Has llegado.');
  });

  test('returns null for an empty or invalid progress state', () => {
    expect(activeRouteInstruction([], 0)).toBeNull();
    expect(activeRouteInstruction(steps, Number.NaN)).toBeNull();
  });
});
