import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { useGeolocation } from './useGeolocation';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;
let success: PositionCallback | undefined;
let failure: PositionErrorCallback | undefined;

function Harness() {
  const gps = useGeolocation(true);
  return (
    <div>
      <button
        type="button"
        data-reset
        onClick={() => {
          if ('reset' in gps && typeof gps.reset === 'function') gps.reset();
        }}
      >
        Reiniciar GPS
      </button>
      <output data-quality>{gps.quality}</output>
      <output data-lat>{gps.position?.lat ?? ''}</output>
      <output data-reason>{gps.diagnostics.lastRejectedReason ?? ''}</output>
      <output data-trusted>{String(gps.gpsConfiable)}</output>
    </div>
  );
}

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  success = undefined;
  failure = undefined;
  Reflect.deleteProperty(navigator, 'geolocation');
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.replaceChildren();
});

describe('useGeolocation hook', () => {
  test('uses the conservative browser options and retains the last accepted fix after an outlier', () => {
    const watchPosition = vi.fn((nextSuccess: PositionCallback) => {
      success = nextSuccess;
      return 9;
    });
    const clearWatch = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { watchPosition, clearWatch },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root!.render(<Harness />));
    expect(watchPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), expect.objectContaining({
      maximumAge: 2000,
      timeout: 15000,
      enableHighAccuracy: true,
    }));

    const firstTimestamp = Date.now() - 1000;
    act(() => success?.({
      coords: { latitude: 6.17, longitude: -75.61, accuracy: 8, speed: null, heading: null },
      timestamp: firstTimestamp,
    } as GeolocationPosition));
    expect(container.querySelector('[data-quality]')?.textContent).toBe('confiable');
    expect(container.querySelector('[data-lat]')?.textContent).toBe('6.17');

    act(() => success?.({
      coords: { latitude: 6.172, longitude: -75.61, accuracy: 5, speed: null, heading: null },
      timestamp: Date.now(),
    } as GeolocationPosition));
    expect(container.querySelector('[data-quality]')?.textContent).toBe('degradada');
    expect(container.querySelector('[data-lat]')?.textContent).toBe('6.17');
    expect(container.querySelector('[data-reason]')?.textContent).toBe('salto-no-plausible');
  });

  test('downgrades quality after the trusted-age and grace windows without clearing the last fix', () => {
    vi.useFakeTimers();
    let nextSuccess: PositionCallback | undefined;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((callback: PositionCallback) => {
          nextSuccess = callback;
          return 11;
        }),
        clearWatch: vi.fn(),
      },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root!.render(<Harness />));
    const timestamp = Date.now();
    act(() => nextSuccess?.({
      coords: { latitude: 6.17, longitude: -75.61, accuracy: 8, speed: 0, heading: null },
      timestamp,
    } as GeolocationPosition));
    expect(container.querySelector('[data-quality]')?.textContent).toBe('confiable');

    act(() => vi.advanceTimersByTime(5000));
    expect(container.querySelector('[data-quality]')?.textContent).toBe('degradada');
    act(() => vi.advanceTimersByTime(3000));
    expect(container.querySelector('[data-quality]')?.textContent).toBe('sin_senal');
    expect(container.querySelector('[data-lat]')?.textContent).toBe('6.17');
  });

  test('clears a prior session fix before a new live navigation starts', () => {
    let nextSuccess: PositionCallback | undefined;
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((callback: PositionCallback) => {
          nextSuccess = callback;
          return 12;
        }),
        clearWatch: vi.fn(),
      },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root!.render(<Harness />));
    act(() => nextSuccess?.({
      coords: { latitude: 6.17, longitude: -75.61, accuracy: 8, speed: 0, heading: null },
      timestamp: Date.now(),
    } as GeolocationPosition));
    expect(container.querySelector('[data-lat]')?.textContent).toBe('6.17');

    act(() => container.querySelector<HTMLButtonElement>('[data-reset]')!.click());
    expect(container.querySelector('[data-lat]')?.textContent).toBe('');
    expect(container.querySelector('[data-quality]')?.textContent).toBe('sin_senal');
  });

  test('keeps the last accepted fix when iOS reports a transient unavailable position', () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((onSuccess: PositionCallback, onFailure: PositionErrorCallback) => {
          success = onSuccess;
          failure = onFailure;
          return 13;
        }),
        clearWatch: vi.fn(),
      },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root!.render(<Harness />));
    act(() => success?.({
      coords: { latitude: 6.17, longitude: -75.61, accuracy: 8, speed: 0, heading: null },
      timestamp: Date.now(),
    } as GeolocationPosition));
    act(() => failure?.({ code: 2, message: 'Position unavailable' } as GeolocationPositionError));

    expect(container.querySelector('[data-quality]')?.textContent).toBe('degradada');
    expect(container.querySelector('[data-lat]')?.textContent).toBe('6.17');
  });

  test('retains a fresh moderate-accuracy mobile fix as degraded instead of discarding it', () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((onSuccess: PositionCallback) => {
          success = onSuccess;
          return 14;
        }),
        clearWatch: vi.fn(),
      },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root!.render(<Harness />));
    act(() => success?.({
      coords: { latitude: 6.17, longitude: -75.61, accuracy: 80, speed: 0, heading: null },
      timestamp: Date.now(),
    } as GeolocationPosition));

    expect(container.querySelector('[data-quality]')?.textContent).toBe('degradada');
    expect(container.querySelector('[data-trusted]')?.textContent).toBe('false');
    expect(container.querySelector('[data-lat]')?.textContent).toBe('6.17');
  });
});
