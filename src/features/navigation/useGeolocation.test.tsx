import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { GEOLOCATION_CONFIG, useGeolocation, type StartPosition } from './useGeolocation';

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
});

describe('useGeolocation route start', () => {
  let gps: ReturnType<typeof useGeolocation> | undefined;
  let clearWatch: ReturnType<typeof vi.fn>;

  function StartHarness() {
    gps = useGeolocation(false);
    return <output data-lat>{gps.position?.lat ?? ''}</output>;
  }

  const fix = (accuracy: number, timestamp = Date.now()) => ({
    coords: { latitude: 6.1575, longitude: -75.6436, accuracy, speed: null, heading: null },
    timestamp,
  } as GeolocationPosition);

  const mountAndRequest = () => {
    vi.useFakeTimers();
    clearWatch = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((onSuccess: PositionCallback, onFailure: PositionErrorCallback) => {
          success = onSuccess;
          failure = onFailure;
          return 31;
        }),
        clearWatch,
      },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<StartHarness />));
    let outcome: Promise<StartPosition | Error> | undefined;
    act(() => {
      outcome = gps!.requestStartPosition().catch((error: Error) => error);
    });
    return { container, outcome: () => outcome! };
  };

  test('resolves immediately with a precise fix and stores it as the live position', async () => {
    const { container, outcome } = mountAndRequest();

    act(() => success?.(fix(12)));

    await expect(outcome()).resolves.toMatchObject({ approximate: false, position: { accuracy: 12 } });
    expect(container.querySelector('[data-lat]')?.textContent).toBe('6.1575');
    expect(clearWatch).toHaveBeenCalledWith(31);
  });

  test('waits the refine window and then uses the best approximate fix without storing it', async () => {
    const { container, outcome } = mountAndRequest();

    act(() => success?.(fix(180, Date.now() - 1000)));
    act(() => success?.(fix(120, Date.now())));
    act(() => vi.advanceTimersByTime(GEOLOCATION_CONFIG.startRefineMs));

    await expect(outcome()).resolves.toMatchObject({ approximate: true, position: { accuracy: 120 } });
    expect(container.querySelector('[data-lat]')?.textContent).toBe('');
    expect(clearWatch).toHaveBeenCalledWith(31);
  });

  test('prefers a precise fix that arrives during the refine window', async () => {
    const { outcome } = mountAndRequest();

    act(() => success?.(fix(150)));
    act(() => vi.advanceTimersByTime(3000));
    act(() => success?.(fix(15)));

    await expect(outcome()).resolves.toMatchObject({ approximate: false, position: { accuracy: 15 } });
  });

  test('fails with the measured accuracy when every fix is beyond the start limit', async () => {
    const { outcome } = mountAndRequest();

    act(() => success?.(fix(350)));
    act(() => vi.advanceTimersByTime(GEOLOCATION_CONFIG.startRefineMs));

    const result = await outcome();
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toMatch(/muy imprecisa \(±350 m\)/);
  });

  test('fails immediately when location permission is denied', async () => {
    const { outcome } = mountAndRequest();

    act(() => failure?.({ code: 1, message: 'User denied Geolocation' } as GeolocationPositionError));

    const result = await outcome();
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Permiso de ubicación denegado.');
  });

  test('tolerates a transient error and still uses a later fix', async () => {
    const { outcome } = mountAndRequest();

    act(() => failure?.({ code: 2, message: 'Position unavailable' } as GeolocationPositionError));
    act(() => success?.(fix(20)));

    await expect(outcome()).resolves.toMatchObject({ approximate: false });
  });
});

describe('useGeolocation duplicate readings', () => {
  test('a repeated timestamp does not downgrade a healthy GPS to degraded', () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        watchPosition: vi.fn((onSuccess: PositionCallback) => {
          success = onSuccess;
          return 41;
        }),
        clearWatch: vi.fn(),
      },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root!.render(<Harness />));

    const timestamp = Date.now();
    const reading = {
      coords: { latitude: 6.17, longitude: -75.61, accuracy: 8, speed: null, heading: null },
      timestamp,
    } as GeolocationPosition;
    act(() => success?.(reading));
    act(() => success?.(reading));

    expect(container.querySelector('[data-quality]')?.textContent).toBe('confiable');
  });
});
