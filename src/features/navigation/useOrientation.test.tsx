import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { readOrientationHeading, useOrientation } from './useOrientation';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

function Harness() {
  const orientation = useOrientation(true);
  return (
    <div>
      <output data-heading>{orientation.heading ?? ''}</output>
      <button type="button" data-activate onClick={() => void orientation.activate()}>Activar</button>
    </div>
  );
}

beforeEach(() => {
  Object.defineProperty(window, 'DeviceOrientationEvent', {
    configurable: true,
    value: function DeviceOrientationEvent() {},
  });
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  Reflect.deleteProperty(window, 'DeviceOrientationEvent');
  Reflect.deleteProperty(window, 'ondeviceorientationabsolute');
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('device orientation', () => {
  test('accepts an absolute heading and compensates the screen angle', () => {
    expect(readOrientationHeading({ absolute: true, alpha: 270 }, 90)).toBe(180);
    expect(readOrientationHeading({ absolute: false, alpha: 270 }, 90)).toBeNull();
    expect(readOrientationHeading({ webkitCompassHeading: 12 }, 0)).toBe(12);
  });

  test('subscribes to one orientation event instead of processing both frames', () => {
    Object.defineProperty(window, 'ondeviceorientationabsolute', { configurable: true, value: null });
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => root!.render(<Harness />));

    const added = addSpy.mock.calls.filter(([type]) => type === 'deviceorientation' || type === 'deviceorientationabsolute');
    const removed = removeSpy.mock.calls.filter(([type]) => type === 'deviceorientation' || type === 'deviceorientationabsolute');
    expect(added.at(-1)?.[0]).toBe('deviceorientationabsolute');
    expect(added.length - removed.length).toBe(1);
  });

  test('requests device permission from the explicit activation action', async () => {
    const requestPermission = vi.fn(async () => 'granted' as const);
    const OrientationEvent = Object.assign(function DeviceOrientationEvent() {}, { requestPermission });
    Object.defineProperty(window, 'DeviceOrientationEvent', { configurable: true, value: OrientationEvent });
    const addSpy = vi.spyOn(window, 'addEventListener');
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<Harness />);
      await Promise.resolve();
    });
    expect(requestPermission).not.toHaveBeenCalled();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-activate]')!.click();
      await Promise.resolve();
    });

    expect(requestPermission).toHaveBeenCalledOnce();
    expect(addSpy.mock.calls.some(([type]) => type === 'deviceorientation')).toBe(true);
  });
});
