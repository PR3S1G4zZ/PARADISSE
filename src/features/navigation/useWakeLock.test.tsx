import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { useWakeLock } from './useWakeLock';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

function Harness({ enabled = true }: { enabled?: boolean }) {
  const wakeLock = useWakeLock(enabled);
  return <output data-status={wakeLock.status}>{wakeLock.status}</output>;
}

beforeEach(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  Reflect.deleteProperty(navigator, 'wakeLock');
  vi.restoreAllMocks();
});

describe('useWakeLock', () => {
  test('marks external releases and reacquires the screen lock on visibility recovery', async () => {
    const listeners = new Map<string, EventListener>();
    const sentinel = {
      released: false,
      addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
      release: vi.fn(async () => { sentinel.released = true; }),
    };
    const request = vi.fn(async () => {
      sentinel.released = false;
      return sentinel as unknown as WakeLockSentinel;
    });
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request },
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<Harness />);
      await Promise.resolve();
    });
    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('active');

    await act(async () => {
      listeners.get('release')?.(new Event('release'));
      await Promise.resolve();
    });
    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('released');

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('active');
  });

  test('exposes unsupported when the browser has no screen wake lock', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root!.render(<Harness />);
      await Promise.resolve();
    });

    expect(container.querySelector('[data-status]')?.getAttribute('data-status')).toBe('unsupported');
  });
});
