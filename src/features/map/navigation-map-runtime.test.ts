import { describe, expect, test, vi } from 'vitest';
import {
  canApplyNavigationCamera,
  enableMapInteractions,
  mapHasUsableViewport,
  observeNavigationMapSize,
  resizeNavigationMap,
  shouldIgnoreMapError,
  waitForNavigationStyleReady,
} from './navigation-map-runtime';

describe('navigation map runtime', () => {
  test('re-enables zoom and touch handlers after a style apply', () => {
    const scrollZoom = { enable: vi.fn() };
    const touchZoomRotate = { enable: vi.fn() };
    const dragPan = { enable: vi.fn() };

    enableMapInteractions({ scrollZoom, touchZoomRotate, dragPan });

    expect(scrollZoom.enable).toHaveBeenCalledOnce();
    expect(touchZoomRotate.enable).toHaveBeenCalledOnce();
    expect(dragPan.enable).toHaveBeenCalledOnce();
  });

  test('treats a zero-size modal canvas as unusable until resize', () => {
    expect(mapHasUsableViewport({
      getContainer: () => ({ clientHeight: 0, clientWidth: 0 }),
    })).toBe(false);
    expect(mapHasUsableViewport({
      getContainer: () => ({ clientHeight: 320, clientWidth: 480 }),
    })).toBe(true);
  });

  test('blocks follow/camera updates while the style is still loading', () => {
    expect(canApplyNavigationCamera({
      isStyleLoaded: () => false,
      getContainer: () => ({ clientHeight: 320, clientWidth: 480 }),
    })).toBe(false);
    expect(canApplyNavigationCamera({
      isStyleLoaded: () => true,
      getContainer: () => ({ clientHeight: 320, clientWidth: 480 }),
    })).toBe(true);
  });

  test('resizes the map and then re-enables handlers', () => {
    const map = {
      resize: vi.fn(),
      scrollZoom: { enable: vi.fn() },
      getContainer: () => ({ clientHeight: 320, clientWidth: 480 }),
    };

    expect(resizeNavigationMap(map)).toBe(true);
    expect(map.resize).toHaveBeenCalledOnce();
    expect(map.scrollZoom.enable).toHaveBeenCalledOnce();
  });

  test('observes the map container so a late modal layout still calls resize', () => {
    const disconnect = vi.fn();
    const container = document.createElement('div');
    const map = {
      resize: vi.fn(),
      getContainer: () => container,
    };

    const stop = observeNavigationMapSize(map, (element, onResize) => {
      expect(element).toBe(container);
      onResize();
      return disconnect;
    });

    expect(map.resize).toHaveBeenCalled();
    stop();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  test('does not mark the camera ready until the ArcGIS style finishes loading', () => {
    const listeners = new Map<string, () => void>();
    const onReady = vi.fn();
    let loaded = false;
    const map = {
      isStyleLoaded: () => loaded,
      resize: vi.fn(),
      getContainer: () => ({ clientHeight: 320, clientWidth: 480 }),
      on: vi.fn((type: string, listener: () => void) => { listeners.set(type, listener); }),
      off: vi.fn(),
    };

    const stop = waitForNavigationStyleReady(map, onReady);
    expect(onReady).not.toHaveBeenCalled();

    listeners.get('idle')?.();
    expect(onReady).not.toHaveBeenCalled();

    loaded = true;
    listeners.get('style.load')?.();
    expect(onReady).toHaveBeenCalledOnce();

    stop();
    expect(map.off).toHaveBeenCalledWith('style.load', expect.any(Function));
  });

  test('does not drop a loaded ArcGIS style on a transient tile error', () => {
    expect(shouldIgnoreMapError({ provider: 'arcgis' })).toBe(true);
    expect(shouldIgnoreMapError({ applyingStyle: true, provider: 'loading' })).toBe(true);
    expect(shouldIgnoreMapError({ contextLost: true })).toBe(true);
    expect(shouldIgnoreMapError({ provider: 'loading' })).toBe(false);
  });
});
