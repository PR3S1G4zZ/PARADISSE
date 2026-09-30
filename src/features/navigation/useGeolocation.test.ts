import { describe, expect, test } from 'vitest';
import { evaluatePosition, estimateSpeedMps, GEOLOCATION_CONFIG } from './useGeolocation';
import type { NavigationPosition } from './navigation-pose';

const NOW = 100_000;

const makePosition = (overrides: Partial<NavigationPosition> = {}): NavigationPosition => ({
  lat: 6.17,
  lng: -75.61,
  accuracy: 8,
  speed: null,
  heading: null,
  timestamp: NOW - 1000,
  ...overrides,
});

describe('geolocation acceptance', () => {
  test('accepts a fresh valid reading', () => {
    expect(evaluatePosition(makePosition(), null, NOW)).toMatchObject({
      accepted: true,
      reason: null,
    });
  });

  test('rejects a reading older than the trusted age', () => {
    expect(evaluatePosition(makePosition({ timestamp: NOW - 6000 }), null, NOW)).toMatchObject({
      accepted: false,
      reason: 'fix-stale',
    });
  });

  test('rejects coordinates and accuracy outside the browser contract', () => {
    expect(evaluatePosition(makePosition({ lat: 91 }), null, NOW).reason).toBe('coordenadas-invalidas');
    expect(evaluatePosition(makePosition({ accuracy: 51 }), null, NOW).reason).toBe('precision-baja');
  });

  test('accepts an approximate fix only under the route-start accuracy limit', () => {
    const startLimits = { ...GEOLOCATION_CONFIG, maxAccuracyM: GEOLOCATION_CONFIG.startMaxAccuracyM };

    expect(evaluatePosition(makePosition({ accuracy: 120 }), null, NOW).reason).toBe('precision-baja');
    expect(evaluatePosition(makePosition({ accuracy: 120 }), null, NOW, startLimits).accepted).toBe(true);
    expect(evaluatePosition(makePosition({ accuracy: 250 }), null, NOW, startLimits).reason).toBe('precision-baja');
  });

  test('rejects a timestamp that moves backwards or too far into the future', () => {
    const previous = makePosition({ timestamp: NOW - 2000 });

    expect(evaluatePosition(makePosition({ timestamp: NOW - 3000 }), previous, NOW).reason)
      .toBe('timestamp-obsoleto');
    expect(evaluatePosition(makePosition({ timestamp: NOW + 31_000 }), previous, NOW).reason)
      .toBe('reloj-futuro');
  });

  test('accepts a small future skew from a mobile browser clock', () => {
    expect(evaluatePosition(makePosition({ timestamp: NOW + 1_000 }), null, NOW)).toMatchObject({
      accepted: true,
      reason: null,
    });
  });

  test('rejects an implausible GPS jump instead of moving the user hundreds of metres', () => {
    const previous = makePosition({ timestamp: NOW - 1000 });
    const next = makePosition({ lat: 6.172, timestamp: NOW, accuracy: 5 });

    expect(evaluatePosition(next, previous, NOW)).toMatchObject({
      accepted: false,
      reason: 'salto-no-plausible',
    });
  });

  test('derives speed only from accepted raw fixes when the browser omits it', () => {
    expect(estimateSpeedMps(30, 10_000, null)).toBe(3);
    expect(estimateSpeedMps(30, 10_000, 1.5)).toBe(1.5);
    expect(estimateSpeedMps(null, null, null)).toBeNull();
  });
});
