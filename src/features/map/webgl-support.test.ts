import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { attachMapWebGlLifecycle, hasWebGl, resetWebGlSupportCache } from './webgl-support';

beforeEach(() => {
  resetWebGlSupportCache();
});

afterEach(() => {
  resetWebGlSupportCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const stubWebGlConstructor = (value: unknown) => {
  vi.stubGlobal('WebGLRenderingContext', value);
  Object.defineProperty(window, 'WebGLRenderingContext', {
    configurable: true,
    writable: true,
    value,
  });
};

describe('hasWebGl', () => {
  test('caches a successful probe and releases the temporary context', () => {
    const loseContext = vi.fn();
    const getExtension = vi.fn((name: string) => (
      name === 'WEBGL_lose_context' ? { loseContext } : null
    ));
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      getExtension,
    } as unknown as RenderingContext);
    stubWebGlConstructor(function WebGLRenderingContext() {});

    expect(hasWebGl()).toBe(true);
    expect(hasWebGl()).toBe(true);
    expect(getContext).toHaveBeenCalledTimes(1);
    expect(getExtension).toHaveBeenCalledWith('WEBGL_lose_context');
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  test('returns false without creating a canvas when WebGL is missing', () => {
    const createElement = vi.spyOn(document, 'createElement');
    stubWebGlConstructor(undefined);

    expect(hasWebGl()).toBe(false);
    expect(hasWebGl()).toBe(false);
    expect(createElement).not.toHaveBeenCalled();
  });

  test('does not keep a probe context when getContext throws', () => {
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('webgl unavailable');
    });
    stubWebGlConstructor(function WebGLRenderingContext() {});

    expect(hasWebGl()).toBe(false);
    expect(hasWebGl()).toBe(false);
    expect(getContext).toHaveBeenCalledTimes(1);
  });
});

describe('attachMapWebGlLifecycle', () => {
  test('prevents the default lost event and restores without remounting', () => {
    const listeners = new Map<string, (event?: { preventDefault: () => void }) => void>();
    const map = {
      on: vi.fn((type: string, listener: (event?: { preventDefault: () => void }) => void) => {
        listeners.set(type, listener);
      }),
      off: vi.fn((type: string) => {
        listeners.delete(type);
      }),
    };
    const onLost = vi.fn();
    const onRestored = vi.fn();
    const preventDefault = vi.fn();

    const detach = attachMapWebGlLifecycle(map, { onLost, onRestored });
    listeners.get('webglcontextlost')?.({ preventDefault });
    listeners.get('webglcontextrestored')?.();

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onLost).toHaveBeenCalledTimes(1);
    expect(onRestored).toHaveBeenCalledTimes(1);

    detach();
    expect(map.off).toHaveBeenCalledWith('webglcontextlost', expect.any(Function));
    expect(map.off).toHaveBeenCalledWith('webglcontextrestored', expect.any(Function));
  });
});
