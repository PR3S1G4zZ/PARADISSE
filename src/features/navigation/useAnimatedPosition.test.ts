import { describe, expect, test } from 'vitest';
import { interpolatePosition } from './useAnimatedPosition';

describe('animated navigation position', () => {
  test('interpolates latitude and longitude without changing the target data', () => {
    const from = { lat: 6.17, lng: -75.61 };
    const to = { lat: 6.171, lng: -75.609 };

    expect(interpolatePosition(from, to, 0.5).lat).toBeCloseTo(6.1705, 10);
    expect(interpolatePosition(from, to, 0.5).lng).toBeCloseTo(-75.6095, 10);
    expect(to).toEqual({ lat: 6.171, lng: -75.609 });
  });

  test('clamps progress outside the animation interval', () => {
    const from = { lat: 6.17, lng: -75.61 };
    const to = { lat: 6.171, lng: -75.609 };

    expect(interpolatePosition(from, to, -1)).toEqual(from);
    expect(interpolatePosition(from, to, 2)).toEqual(to);
  });
});
