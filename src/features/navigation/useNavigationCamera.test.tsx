import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { CAMERA_MODES, type NavigationFrame } from './navigation-frame';
import { useNavigationCamera } from './useNavigationCamera';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const frame: NavigationFrame = {
  rawPosition: { lat: 6.17, lng: -75.61 },
  displayPosition: { lat: 6.17, lng: -75.61 },
  cameraPosition: { lat: 6.17, lng: -75.61 },
  positionSource: 'matched',
  accuracyM: 8,
  displayOffsetM: 0,
  arrowBearing: 90,
  cameraBearing: 90,
  speedEstimateMps: 1,
  cameraMode: CAMERA_MODES.FOLLOWING,
  progressM: 40,
  remainingM: 460,
  deviationM: 3,
  timestamp: Date.now(),
};

let root: Root | undefined;
let mapRef: { current: { easeTo: ReturnType<typeof vi.fn>; getContainer: () => HTMLElement } };

function Harness({ gpsConfiable = true }: { gpsConfiable?: boolean }) {
  const camera = useNavigationCamera({
    frame,
    active: true,
    gpsConfiable,
    mapRef,
  });
  return (
    <div>
      <output data-mode>{camera.cameraMode}</output>
      <button type="button" data-gesture onClick={() => camera.handleGesture({ originalEvent: {} })}>Gesto</button>
      <button type="button" data-recenter onClick={() => camera.recenter()}>Recentrar</button>
    </div>
  );
}

beforeEach(() => {
  mapRef = {
    current: {
      easeTo: vi.fn(),
      getContainer: () => ({ clientHeight: 800, clientWidth: 400 } as HTMLElement),
    },
  };
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.replaceChildren();
});

function renderCamera(props: { gpsConfiable?: boolean } = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => { root!.render(<Harness {...props} />); });
  return container;
}

test('changes to FREE only for a user gesture and recenters back onto the route', () => {
  const container = renderCamera();

  expect(container.querySelector('[data-mode]')?.textContent).toBe(CAMERA_MODES.FOLLOWING);
  act(() => { container.querySelector<HTMLButtonElement>('[data-gesture]')!.click(); });
  expect(container.querySelector('[data-mode]')?.textContent).toBe(CAMERA_MODES.FREE);
  act(() => { container.querySelector<HTMLButtonElement>('[data-recenter]')!.click(); });
  expect(container.querySelector('[data-mode]')?.textContent).toBe(CAMERA_MODES.RECENTERING);
  expect(mapRef.current.easeTo).toHaveBeenCalled();
});

test('animates following camera updates instead of jumping on every GPS fix', () => {
  renderCamera();

  expect(mapRef.current.easeTo).toHaveBeenCalledWith(expect.objectContaining({
    duration: expect.any(Number),
  }));
  expect(mapRef.current.easeTo.mock.calls.at(-1)?.[0].duration).toBeGreaterThan(0);
});

test('pauses following when live GPS becomes unreliable', () => {
  const container = renderCamera({ gpsConfiable: false });

  expect(container.querySelector('[data-mode]')?.textContent).toBe(CAMERA_MODES.GPS_DEGRADED);
  expect(mapRef.current.easeTo).not.toHaveBeenCalled();
});

test('recenters once on the last known position while GPS is degraded', () => {
  const container = renderCamera({ gpsConfiable: false });

  expect(mapRef.current.easeTo).not.toHaveBeenCalled();
  act(() => { container.querySelector<HTMLButtonElement>('[data-recenter]')!.click(); });

  expect(container.querySelector('[data-mode]')?.textContent).toBe(CAMERA_MODES.GPS_DEGRADED);
  expect(mapRef.current.easeTo).toHaveBeenCalledWith(expect.objectContaining({
    center: expect.any(Array),
    duration: expect.any(Number),
  }));
  expect(mapRef.current.easeTo).toHaveBeenCalledTimes(1);
});

test('does not ease the camera while the tracking map has no usable viewport', () => {
  mapRef = {
    current: {
      easeTo: vi.fn(),
      getContainer: () => ({ clientHeight: 0, clientWidth: 0 } as HTMLElement),
    },
  };

  renderCamera();

  expect(mapRef.current.easeTo).not.toHaveBeenCalled();
});

test('does not re-enable automatic following after a degraded one-shot recenter', () => {
  const container = renderCamera();
  act(() => { container.querySelector<HTMLButtonElement>('[data-gesture]')!.click(); });
  expect(container.querySelector('[data-mode]')?.textContent).toBe(CAMERA_MODES.FREE);

  act(() => { root!.render(<Harness gpsConfiable={false} />); });
  expect(container.querySelector('[data-mode]')?.textContent).toBe(CAMERA_MODES.GPS_DEGRADED);
  mapRef.current.easeTo.mockClear();

  act(() => { container.querySelector<HTMLButtonElement>('[data-recenter]')!.click(); });
  expect(mapRef.current.easeTo).toHaveBeenCalledTimes(1);
  act(() => { root!.render(<Harness gpsConfiable />); });

  expect(container.querySelector('[data-mode]')?.textContent).toBe(CAMERA_MODES.FREE);
});
