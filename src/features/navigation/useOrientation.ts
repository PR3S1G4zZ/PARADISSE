import { useCallback, useEffect, useRef, useState } from 'react';

export type OrientationPermission = 'unknown' | 'granted' | 'denied' | 'not-required';
export type OrientationQuality = 'fresh' | 'stale' | 'unavailable';

export interface OrientationReading {
  absolute?: boolean;
  alpha?: number | null;
  webkitCompassHeading?: number | null;
}

interface OrientationWindow extends Window {
  DeviceOrientationEvent?: typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
}

const ORIENTATION_EMIT_INTERVAL_MS = 100;
const ORIENTATION_MAX_AGE_MS = 1500;

const normalizeHeading = (value: number): number => ((value % 360) + 360) % 360;

/**
 * Converts one browser orientation event into a compass heading.
 *
 * iOS exposes `webkitCompassHeading` as a compass value already. For the
 * standard event we only accept absolute readings; relative alpha values are
 * not reliable enough to drive a navigation arrow.
 */
export function readOrientationHeading(
  event: OrientationReading,
  screenAngle = 0,
): number | null {
  if (Number.isFinite(event.webkitCompassHeading)) {
    return normalizeHeading(event.webkitCompassHeading as number);
  }
  if (event.absolute !== true || !Number.isFinite(event.alpha)) return null;
  return normalizeHeading(360 - (event.alpha as number) + screenAngle);
}

const circularInterpolate = (from: number | null, to: number, factor = 0.28): number => {
  if (from == null || !Number.isFinite(from)) return normalizeHeading(to);
  const delta = ((to - from + 540) % 360) - 180;
  return normalizeHeading(from + delta * factor);
};

export function useOrientation(enabled = false) {
  const [heading, setHeading] = useState<number | null>(null);
  const [permission, setPermission] = useState<OrientationPermission>('unknown');
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [quality, setQuality] = useState<OrientationQuality>('unavailable');
  const smoothHeadingRef = useRef<number | null>(null);
  const lastEmitRef = useRef<number | null>(null);

  const readHeading = useCallback((event: DeviceOrientationEvent) => {
    const screenAngle = typeof screen !== 'undefined' && screen.orientation && Number.isFinite(screen.orientation.angle)
      ? screen.orientation.angle
      : 0;
    const candidate = readOrientationHeading({
      absolute: event.absolute,
      alpha: event.alpha,
      webkitCompassHeading: (event as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading,
    }, screenAngle);
    if (candidate == null) return;
    const now = Date.now();
    if (lastEmitRef.current != null && now - lastEmitRef.current < ORIENTATION_EMIT_INTERVAL_MS) return;
    lastEmitRef.current = now;
    smoothHeadingRef.current = circularInterpolate(smoothHeadingRef.current, candidate);
    setHeading(smoothHeadingRef.current);
    setLastUpdate(now);
    setQuality('fresh');
  }, []);

  const activate = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const orientationWindow = window as OrientationWindow;
    const requestPermission = orientationWindow.DeviceOrientationEvent?.requestPermission;
    if (requestPermission) {
      const result = await requestPermission();
      setPermission(result);
      return;
    }
    setPermission('not-required');
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const orientationWindow = window as OrientationWindow;
    if (!orientationWindow.DeviceOrientationEvent) {
      setPermission('denied');
      setQuality('unavailable');
      return undefined;
    }
    const requestPermission = orientationWindow.DeviceOrientationEvent.requestPermission;
    if (!requestPermission && permission === 'unknown') {
      setPermission('not-required');
      return undefined;
    }
    if (permission !== 'granted' && permission !== 'not-required') return undefined;

    const eventName: 'deviceorientationabsolute' | 'deviceorientation' = 'ondeviceorientationabsolute' in window
      ? 'deviceorientationabsolute'
      : 'deviceorientation';
    window.addEventListener(eventName, readHeading as EventListener);
    return () => {
      window.removeEventListener(eventName, readHeading as EventListener);
    };
  }, [enabled, permission, readHeading]);

  useEffect(() => {
    if (!enabled || lastUpdate == null) return undefined;
    const timer = window.setInterval(() => {
      if (Date.now() - lastUpdate > ORIENTATION_MAX_AGE_MS) setQuality('stale');
    }, ORIENTATION_MAX_AGE_MS);
    return () => window.clearInterval(timer);
  }, [enabled, lastUpdate]);

  useEffect(() => {
    if (!enabled) {
      setQuality('unavailable');
    }
  }, [enabled]);

  return {
    heading,
    permission,
    lastUpdate,
    quality,
    activate,
  };
}
