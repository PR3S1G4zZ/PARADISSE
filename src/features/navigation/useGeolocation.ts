import { useCallback, useEffect, useRef, useState } from 'react';
import type { GeoPoint } from '../../shared/types/domain';
import { distanceM } from './route-matching';
import type { NavigationPosition } from './navigation-pose';

export type GeolocationStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unsupported';

export type GeolocationQuality = 'confiable' | 'degradada' | 'sin_senal';

export type PositionRejectionReason =
  | 'coordenadas-invalidas'
  | 'precision-baja'
  | 'timestamp-invalido'
  | 'reloj-futuro'
  | 'fix-stale'
  | 'timestamp-obsoleto'
  | 'salto-no-plausible';

export const GEOLOCATION_CONFIG = {
  maximumAgeMs: 2000,
  trustedAgeMs: 5000,
  graceAgeMs: 8000,
  timeoutMs: 15000,
  trustedAccuracyM: 50,
  maxAccuracyM: 150,
  // Algunos navegadores móviles entregan un timestamp apenas adelantado al
  // reloj de JavaScript. Se admite una ventana pequeña y luego se normaliza.
  maxFutureMs: 2000,
  maxPlausibleSpeedMps: 80,
  minimumJumpMarginM: 20,
} as const;

export interface PositionEvaluation {
  accepted: boolean;
  reason: PositionRejectionReason | null;
  distanceM: number | null;
  elapsedMs: number | null;
  maxDistanceM: number | null;
}

export interface GeolocationDiagnostics {
  positionAgeMs: number | null;
  lastAcceptedAt: number | null;
  lastRejectedAt: number | null;
  lastRejectedReason: PositionRejectionReason | null;
  lastCandidateAccuracyM: number | null;
  lastDistanceM: number | null;
  lastElapsedMs: number | null;
  speedEstimateMps: number | null;
}

const EMPTY_DIAGNOSTICS: GeolocationDiagnostics = {
  positionAgeMs: null,
  lastAcceptedAt: null,
  lastRejectedAt: null,
  lastRejectedReason: null,
  lastCandidateAccuracyM: null,
  lastDistanceM: null,
  lastElapsedMs: null,
  speedEstimateMps: null,
};

const hasValidCoordinates = (position: NavigationPosition) => Number.isFinite(position.lat)
  && position.lat >= -90
  && position.lat <= 90
  && Number.isFinite(position.lng)
  && position.lng >= -180
  && position.lng <= 180;

export function evaluatePosition(
  candidate: NavigationPosition,
  previous: NavigationPosition | null,
  now = Date.now(),
  limits: typeof GEOLOCATION_CONFIG = GEOLOCATION_CONFIG,
): PositionEvaluation {
  if (!hasValidCoordinates(candidate)) {
    return { accepted: false, reason: 'coordenadas-invalidas', distanceM: null, elapsedMs: null, maxDistanceM: null };
  }
  if (!Number.isFinite(candidate.accuracy) || candidate.accuracy < 0 || candidate.accuracy > limits.maxAccuracyM) {
    return { accepted: false, reason: 'precision-baja', distanceM: null, elapsedMs: null, maxDistanceM: null };
  }
  if (!Number.isFinite(candidate.timestamp)) {
    return { accepted: false, reason: 'timestamp-invalido', distanceM: null, elapsedMs: null, maxDistanceM: null };
  }

  const ageMs = now - candidate.timestamp;
  if (ageMs < -limits.maxFutureMs) {
    return { accepted: false, reason: 'reloj-futuro', distanceM: null, elapsedMs: null, maxDistanceM: null };
  }
  if (previous && candidate.timestamp <= previous.timestamp) {
    return { accepted: false, reason: 'timestamp-obsoleto', distanceM: null, elapsedMs: candidate.timestamp - previous.timestamp, maxDistanceM: null };
  }
  if (ageMs > limits.trustedAgeMs) {
    return { accepted: false, reason: 'fix-stale', distanceM: null, elapsedMs: previous ? candidate.timestamp - previous.timestamp : null, maxDistanceM: null };
  }

  if (!previous) {
    return { accepted: true, reason: null, distanceM: null, elapsedMs: null, maxDistanceM: null };
  }

  const elapsedMs = candidate.timestamp - previous.timestamp;
  const elapsedSeconds = Math.max(elapsedMs / 1000, 0.1);
  const reportedSpeed = Number.isFinite(candidate.speed) && (candidate.speed ?? 0) > 0 ? candidate.speed! * 3 : 0;
  const maxSpeedMps = Math.max(limits.maxPlausibleSpeedMps, reportedSpeed);
  const maxDistanceM = maxSpeedMps * elapsedSeconds
    + Math.max(limits.minimumJumpMarginM, previous.accuracy + candidate.accuracy);
  const candidateDistanceM = distanceM(previous, candidate);

  if (candidateDistanceM > maxDistanceM) {
    return { accepted: false, reason: 'salto-no-plausible', distanceM: candidateDistanceM, elapsedMs, maxDistanceM };
  }

  return { accepted: true, reason: null, distanceM: candidateDistanceM, elapsedMs, maxDistanceM };
}

export function isUsablePosition(position: NavigationPosition | null, now = Date.now()): boolean {
  if (!position) return false;
  return evaluatePosition(position, null, now).accepted;
}

export function isTrustedPosition(position: NavigationPosition | null, now = Date.now()): boolean {
  return isUsablePosition(position, now)
    && position!.accuracy <= GEOLOCATION_CONFIG.trustedAccuracyM;
}

export function estimateSpeedMps(
  distanceMValue: number | null | undefined,
  elapsedMs: number | null | undefined,
  reportedSpeedMps: number | null | undefined,
): number | null {
  if (Number.isFinite(reportedSpeedMps) && reportedSpeedMps! >= 0) return reportedSpeedMps!;
  if (!Number.isFinite(distanceMValue) || !Number.isFinite(elapsedMs) || elapsedMs! <= 0) return null;
  return distanceMValue! / (elapsedMs! / 1000);
}

function fromBrowserPosition(browserPosition: GeolocationPosition): NavigationPosition {
  const { coords } = browserPosition;
  return {
    lat: Number(coords.latitude),
    lng: Number(coords.longitude),
    accuracy: Number(coords.accuracy),
    speed: Number.isFinite(coords.speed) ? coords.speed : null,
    heading: Number.isFinite(coords.heading) ? coords.heading : null,
    timestamp: Number(browserPosition.timestamp),
  };
}

export function useGeolocation(enabled = false) {
  const [position, setPosition] = useState<NavigationPosition | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<GeolocationQuality>('sin_senal');
  const [diagnostics, setDiagnostics] = useState<GeolocationDiagnostics>(EMPTY_DIAGNOSTICS);
  const watchIdRef = useRef<number | null>(null);
  const lastAcceptedRef = useRef<NavigationPosition | null>(null);

  const markRejected = useCallback((candidate: NavigationPosition, evaluation: PositionEvaluation, now: number) => {
    const accepted = lastAcceptedRef.current;
    const positionAgeMs = accepted ? Math.max(0, now - accepted.timestamp) : null;
    setQuality(accepted && positionAgeMs != null && positionAgeMs <= GEOLOCATION_CONFIG.graceAgeMs ? 'degradada' : 'sin_senal');
    setDiagnostics((previous) => ({
      ...previous,
      positionAgeMs,
      lastRejectedAt: now,
      lastRejectedReason: evaluation.reason,
      lastCandidateAccuracyM: Number.isFinite(candidate.accuracy) ? candidate.accuracy : null,
      lastDistanceM: evaluation.distanceM,
      lastElapsedMs: evaluation.elapsedMs,
    }));
  }, []);

  const acceptBrowserPosition = useCallback((next: GeolocationPosition): NavigationPosition | null => {
    const now = Date.now();
    const browserCandidate = fromBrowserPosition(next);
    const candidate = browserCandidate.timestamp > now
      ? { ...browserCandidate, timestamp: now }
      : browserCandidate;
    const evaluation = evaluatePosition(candidate, lastAcceptedRef.current, now);
    if (!evaluation.accepted) {
      markRejected(candidate, evaluation, now);
      return null;
    }
    const speedEstimateMps = estimateSpeedMps(evaluation.distanceM, evaluation.elapsedMs, candidate.speed);
    const accepted = candidate.speed == null && speedEstimateMps != null
      ? { ...candidate, speed: speedEstimateMps }
      : candidate;
    lastAcceptedRef.current = accepted;
    setPosition(accepted);
    setStatus('ready');
    setError(null);
    setQuality(accepted.accuracy <= GEOLOCATION_CONFIG.trustedAccuracyM ? 'confiable' : 'degradada');
    setDiagnostics((previous) => ({
      ...previous,
      positionAgeMs: Math.max(0, now - accepted.timestamp),
      lastAcceptedAt: now,
      lastRejectedReason: null,
      lastCandidateAccuracyM: accepted.accuracy,
      lastDistanceM: evaluation.distanceM,
      lastElapsedMs: evaluation.elapsedMs,
      speedEstimateMps,
    }));
    return accepted;
  }, [markRejected]);

  const onError = useCallback((next: GeolocationPositionError) => {
    const now = Date.now();
    const accepted = lastAcceptedRef.current;
    const positionAgeMs = accepted ? Math.max(0, now - accepted.timestamp) : null;
    // Safari puede entregar solo el código numérico sin exponer las
    // constantes de GeolocationPositionError en el objeto del evento.
    const positionUnavailableCode = Number.isFinite(next.POSITION_UNAVAILABLE) ? next.POSITION_UNAVAILABLE : 2;
    const timeoutCode = Number.isFinite(next.TIMEOUT) ? next.TIMEOUT : 3;
    const permissionDeniedCode = Number.isFinite(next.PERMISSION_DENIED) ? next.PERMISSION_DENIED : 1;
    const transient = next.code === positionUnavailableCode || next.code === timeoutCode;
    const withinGrace = transient && positionAgeMs != null && positionAgeMs <= GEOLOCATION_CONFIG.graceAgeMs;
    setStatus('error');
    setQuality(withinGrace ? 'degradada' : 'sin_senal');
    setError(withinGrace ? null : next.code === permissionDeniedCode
      ? 'Permiso de ubicación denegado.'
      : 'No se pudo obtener una ubicación reciente.');
    setDiagnostics((previous) => ({ ...previous, positionAgeMs }));
  }, []);

  const start = useCallback(() => {
    if (watchIdRef.current !== null) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      setError('Este navegador no ofrece geolocalización.');
      return;
    }
    setStatus('loading');
    watchIdRef.current = navigator.geolocation.watchPosition(acceptBrowserPosition as PositionCallback, onError, {
      enableHighAccuracy: true,
      maximumAge: GEOLOCATION_CONFIG.maximumAgeMs,
      timeout: GEOLOCATION_CONFIG.timeoutMs,
    });
  }, [acceptBrowserPosition, onError]);

  const stop = useCallback(() => {
    if (watchIdRef.current === null || typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }, []);

  const reset = useCallback(() => {
    lastAcceptedRef.current = null;
    setPosition(null);
    setStatus('idle');
    setError(null);
    setQuality('sin_senal');
    setDiagnostics(EMPTY_DIAGNOSTICS);
  }, []);

  const requestCurrentPosition = useCallback((): Promise<NavigationPosition> => new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      reject(new Error('Este navegador no ofrece geolocalización.'));
      return;
    }
    setStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (next) => {
        const accepted = acceptBrowserPosition(next);
        if (accepted) resolve(accepted);
        else reject(new Error('La lectura GPS no tiene vigencia, precisión o desplazamiento plausibles.'));
      },
      (next) => {
        onError(next);
        reject(new Error(next.message || 'No se pudo obtener una ubicación reciente.'));
      },
      { enableHighAccuracy: true, maximumAge: GEOLOCATION_CONFIG.maximumAgeMs, timeout: GEOLOCATION_CONFIG.timeoutMs },
    );
  }), [acceptBrowserPosition, onError]);

  useEffect(() => {
    if (enabled) start();
    else stop();
    return stop;
  }, [enabled, start, stop]);

  useEffect(() => {
    if (!position) return undefined;
    const now = Date.now();
    const degradeTimer = window.setTimeout(() => {
      setQuality((current) => current === 'confiable' ? 'degradada' : current);
      setDiagnostics((previous) => ({ ...previous, positionAgeMs: Math.max(0, Date.now() - position.timestamp) }));
    }, Math.max(0, position.timestamp + GEOLOCATION_CONFIG.trustedAgeMs - now));
    const staleTimer = window.setTimeout(() => {
      setQuality('sin_senal');
      setDiagnostics((previous) => ({ ...previous, positionAgeMs: Math.max(0, Date.now() - position.timestamp) }));
    }, Math.max(0, position.timestamp + GEOLOCATION_CONFIG.graceAgeMs - now));
    return () => {
      window.clearTimeout(degradeTimer);
      window.clearTimeout(staleTimer);
    };
  }, [position]);

  const gpsConfiable = quality === 'confiable' && isTrustedPosition(position);
  const point: GeoPoint | null = position ? { lat: position.lat, lng: position.lng } : null;

  return {
    position,
    point,
    status,
    error,
    quality,
    diagnostics,
    gpsConfiable,
    start,
    stop,
    reset,
    requestCurrentPosition,
  };
}
