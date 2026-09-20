import { describe, expect, test } from 'vitest';
import { getDestination } from '../../features/destinations/destination-service';
import {
  INVALID_MANUAL_ORIGIN,
  parseManualOrigin,
  routeRequestBody,
  routingPointFor,
} from './route-request';

describe('manual origin parsing', () => {
  test('rejects empty fields instead of coercing them to Null Island', () => {
    expect(parseManualOrigin('', '')).toEqual({ ok: false, error: INVALID_MANUAL_ORIGIN });
    expect(parseManualOrigin('   ', '-75.610000')).toEqual({ ok: false, error: INVALID_MANUAL_ORIGIN });
    expect(Number('')).toBe(0);
  });

  test('accepts the QA pair for Parque Principal de Itagüí', () => {
    expect(parseManualOrigin('6.170000', '-75.610000')).toEqual({
      ok: true,
      origin: { lat: 6.17, lng: -75.61 },
    });
  });

  test('accepts a lat,lng pair pasted into the latitude field', () => {
    expect(parseManualOrigin('6.170000, -75.610000', '')).toEqual({
      ok: true,
      origin: { lat: 6.17, lng: -75.61 },
    });
  });
});

describe('route request body', () => {
  test('strips catalogue metadata so destino matches the backend contract', () => {
    const destination = getDestination('parque-principal-itagui')!;

    expect(routeRequestBody(
      { lat: 6.17, lng: -75.61 },
      routingPointFor(destination),
      'car',
      destination.name,
    )).toEqual({
      origen: { lat: 6.17, lng: -75.61 },
      destino: { lat: 6.1723858, lng: -75.609416 },
      modo: 'car',
      nombreDestino: 'Parque Principal de Itagüí',
    });
    expect(destination.location).toMatchObject({
      arrivalLabel: expect.any(String),
      address: expect.any(String),
    });
  });
});
