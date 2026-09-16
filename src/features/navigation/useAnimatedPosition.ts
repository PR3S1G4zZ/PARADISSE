import { useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '../../shared/types/domain';

export function interpolatePosition(from: GeoPoint, to: GeoPoint, progress: number): GeoPoint {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  return {
    lat: from.lat + (to.lat - from.lat) * clamped,
    lng: from.lng + (to.lng - from.lng) * clamped,
  };
}

/** Smooths only the visual marker; route progress continues to use real fixes. */
export function useAnimatedPosition(target: GeoPoint | null | undefined, durationMs = 350): GeoPoint | null {
  const [displayed, setDisplayed] = useState<GeoPoint | null>(target ?? null);
  const displayedRef = useRef<GeoPoint | null>(target ?? null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (animationRef.current != null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (!target) {
      displayedRef.current = null;
      setDisplayed(null);
      return undefined;
    }

    const origin = displayedRef.current ?? target;
    if (origin.lat === target.lat && origin.lng === target.lng) {
      displayedRef.current = target;
      setDisplayed(target);
      return undefined;
    }

    if (typeof requestAnimationFrame !== 'function' || durationMs <= 0) {
      displayedRef.current = target;
      setDisplayed(target);
      return undefined;
    }

    let startedAt: number | null = null;
    const step = (timestamp: number) => {
      if (startedAt == null) startedAt = timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / durationMs);
      const next = interpolatePosition(origin, target, progress);
      displayedRef.current = next;
      setDisplayed(next);
      if (progress < 1) animationRef.current = requestAnimationFrame(step);
      else animationRef.current = null;
    };

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current != null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [durationMs, target?.lat, target?.lng]);

  return target ? displayed ?? target : null;
}
