import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TravelMode } from '../../shared/types/domain';
import { canApplyNavigationCamera, type NavigationMapLike } from '../map/navigation-map-runtime';
import { CAMERA_MODES, type CameraMode, type NavigationFrame } from './navigation-frame';

const EARTH_RADIUS_M = 6_371_000;

export interface NavigationCameraProfile {
  anchorRatio: number;
  lookAheadMultiplier: number;
  lookAheadMinM: number;
  lookAheadMaxM: number;
  pitchDeg: number;
  lowSpeedZoom: number;
  highSpeedZoom: number;
  highSpeedMps: number;
  cameraDeadbandDeg: number;
  maxAngularVelocityDegPerSec: number;
}

export const NAVIGATION_CAMERA_PROFILES: Record<TravelMode, NavigationCameraProfile> = {
  walk: {
    anchorRatio: 0.7,
    lookAheadMultiplier: 2,
    lookAheadMinM: 10,
    lookAheadMaxM: 35,
    pitchDeg: 35,
    lowSpeedZoom: 17.5,
    highSpeedZoom: 17.5,
    highSpeedMps: 3,
    cameraDeadbandDeg: 3,
    maxAngularVelocityDegPerSec: 90,
  },
  car: {
    anchorRatio: 0.7,
    lookAheadMultiplier: 2.5,
    lookAheadMinM: 25,
    lookAheadMaxM: 120,
    pitchDeg: 50,
    lowSpeedZoom: 17,
    highSpeedZoom: 16.2,
    highSpeedMps: 20,
    cameraDeadbandDeg: 3,
    maxAngularVelocityDegPerSec: 90,
  },
};

export interface CameraTarget {
  center: [number, number];
  bearing: number;
  pitch: number;
  zoom: number;
  anchorRatio: number;
  lookAheadM: number;
}

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

export function normalizeAngle(value: number | null | undefined): number | null {
  if (!Number.isFinite(value)) return null;
  return ((value! % 360) + 360) % 360;
}

export function circularDifference(from: number | null | undefined, to: number | null | undefined): number | null {
  const start = normalizeAngle(from);
  const end = normalizeAngle(to);
  if (start == null || end == null) return null;
  const difference = end - start;
  if (difference > 180) return difference - 360;
  if (difference < -180) return difference + 360;
  return difference;
}

export function applyCameraDeadband(
  previousBearing: number | null | undefined,
  nextBearing: number | null | undefined,
  deadbandDeg = 3,
): number | null {
  const next = normalizeAngle(nextBearing);
  const previous = normalizeAngle(previousBearing);
  if (next == null) return previous;
  if (previous == null || !Number.isFinite(deadbandDeg) || deadbandDeg < 0) return next;
  const difference = circularDifference(previous, next);
  return difference != null && Math.abs(difference) <= deadbandDeg ? previous : next;
}

export function limitAngularVelocity(
  previousBearing: number | null | undefined,
  nextBearing: number | null | undefined,
  maxAngularVelocityDegPerSec = 90,
  elapsedMs = 1000,
): number | null {
  const previous = normalizeAngle(previousBearing);
  const next = normalizeAngle(nextBearing);
  if (next == null) return previous;
  if (previous == null || !Number.isFinite(maxAngularVelocityDegPerSec) || maxAngularVelocityDegPerSec < 0) return next;
  const difference = circularDifference(previous, next);
  if (difference == null) return next;
  const limit = maxAngularVelocityDegPerSec * Math.max(0, Number.isFinite(elapsedMs) ? elapsedMs : 0) / 1000;
  if (limit === 0 || Math.abs(difference) <= limit) return next;
  return normalizeAngle(previous + Math.sign(difference) * limit);
}

function isPosition(value: unknown): value is { lat: number; lng: number } {
  if (!value || typeof value !== 'object') return false;
  const point = value as { lat?: unknown; lng?: unknown };
  return Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

/** Returns a MapLibre point [lng, lat] at a distance and bearing from a point. */
export function destinationFromBearing(
  position: { lat: number; lng: number } | null | undefined,
  bearing: number | null | undefined,
  distanceM: number,
): [number, number] | null {
  if (!isPosition(position) || !Number.isFinite(bearing) || !Number.isFinite(distanceM)) return null;
  const bearingRad = (normalizeAngle(bearing)! * Math.PI) / 180;
  const distanceRad = Math.max(0, distanceM) / EARTH_RADIUS_M;
  const lat1 = position.lat * Math.PI / 180;
  const lng1 = position.lng * Math.PI / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceRad)
      + Math.cos(lat1) * Math.sin(distanceRad) * Math.cos(bearingRad),
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(distanceRad) * Math.cos(lat1),
    Math.cos(distanceRad) - Math.sin(lat1) * Math.sin(lat2),
  );
  return [lng2 * 180 / Math.PI, lat2 * 180 / Math.PI];
}

export function cameraOffsetForAnchor(anchorRatio: number, viewportHeight: number): [number, number] {
  if (!Number.isFinite(anchorRatio) || !Number.isFinite(viewportHeight) || viewportHeight <= 0) return [0, 0];
  return [0, Math.round((clamp(anchorRatio, 0, 1) - 0.5) * viewportHeight)];
}

export function buildCameraTarget(
  frame: NavigationFrame | null,
  profile: TravelMode | NavigationCameraProfile = 'walk',
  previousBearing: number | null = null,
  previousTimestamp: number | null = null,
): CameraTarget | null {
  if (!frame || !isPosition(frame.displayPosition)) return null;
  const cameraProfile = typeof profile === 'string' ? NAVIGATION_CAMERA_PROFILES[profile] : profile;
  const speed = Number.isFinite(frame.speedEstimateMps) && frame.speedEstimateMps! >= 0
    ? frame.speedEstimateMps!
    : 0;
  const lookAheadM = clamp(
    speed * cameraProfile.lookAheadMultiplier,
    cameraProfile.lookAheadMinM,
    cameraProfile.lookAheadMaxM,
  );
  const desiredBearing = frame.cameraBearing ?? frame.arrowBearing ?? previousBearing ?? 0;
  const stableBearing = applyCameraDeadband(previousBearing, desiredBearing, cameraProfile.cameraDeadbandDeg);
  const elapsedMs = Number.isFinite(frame.timestamp) && Number.isFinite(previousTimestamp)
    ? frame.timestamp - previousTimestamp!
    : 1000;
  const bearing = limitAngularVelocity(
    previousBearing,
    stableBearing,
    cameraProfile.maxAngularVelocityDegPerSec,
    elapsedMs,
  ) ?? stableBearing ?? 0;
  const zoom = speed >= cameraProfile.highSpeedMps ? cameraProfile.highSpeedZoom : cameraProfile.lowSpeedZoom;
  return {
    center: destinationFromBearing(frame.displayPosition, bearing, lookAheadM)
      ?? [frame.displayPosition.lng, frame.displayPosition.lat],
    bearing,
    pitch: cameraProfile.pitchDeg,
    zoom,
    anchorRatio: cameraProfile.anchorRatio,
    lookAheadM,
  };
}

interface MapLike extends NavigationMapLike {
  easeTo: (options: Record<string, unknown>) => void;
}

function resolveMap(mapRef: unknown): MapLike | null {
  const candidate = mapRef && typeof mapRef === 'object' && 'current' in mapRef
    ? (mapRef as { current?: unknown }).current
    : mapRef;
  if (!candidate || typeof candidate !== 'object') return null;
  const possibleMap = 'getMap' in candidate && typeof candidate.getMap === 'function'
    ? (candidate as { getMap: () => unknown }).getMap()
    : candidate;
  if (!possibleMap || typeof possibleMap !== 'object' || !('easeTo' in possibleMap) || typeof possibleMap.easeTo !== 'function') return null;
  return possibleMap as MapLike;
}

export function isOriginalEventGesture(event: unknown): boolean {
  return Boolean(event && typeof event === 'object' && 'originalEvent' in event && (event as { originalEvent?: unknown }).originalEvent);
}

export interface NavigationCameraOptions {
  frame: NavigationFrame | null;
  profile?: TravelMode;
  active?: boolean;
  gpsConfiable?: boolean;
  initialMode?: CameraMode;
  mapRef?: unknown;
  onCameraUpdate?: (target: CameraTarget, metadata: { cameraMode: CameraMode; duration: number }) => void;
  recentringDurationMs?: number;
}

export function useNavigationCamera({
  frame,
  profile = 'walk',
  active = false,
  gpsConfiable = true,
  initialMode = CAMERA_MODES.OVERVIEW,
  mapRef = null,
  onCameraUpdate,
  recentringDurationMs = 250,
}: NavigationCameraOptions) {
  const [cameraMode, setCameraModeState] = useState<CameraMode>(() => initialMode);
  const cameraModeRef = useRef(cameraMode);
  const resumeModeRef = useRef<CameraMode>(CAMERA_MODES.FOLLOWING);
  const previousBearingRef = useRef<number | null>(null);
  const previousTimestampRef = useRef<number | null>(null);

  const updateMode = useCallback((nextMode: CameraMode) => {
    if (cameraModeRef.current === nextMode) return false;
    cameraModeRef.current = nextMode;
    setCameraModeState(nextMode);
    return true;
  }, []);

  useEffect(() => {
    if (!active) {
      updateMode(CAMERA_MODES.OVERVIEW);
      return;
    }
    if (!gpsConfiable) {
      if (cameraModeRef.current !== CAMERA_MODES.GPS_DEGRADED) {
        resumeModeRef.current = cameraModeRef.current === CAMERA_MODES.RECENTERING
          ? CAMERA_MODES.FOLLOWING
          : cameraModeRef.current;
        updateMode(CAMERA_MODES.GPS_DEGRADED);
      }
      return;
    }
    if (cameraModeRef.current === CAMERA_MODES.GPS_DEGRADED) {
      updateMode(resumeModeRef.current || CAMERA_MODES.FOLLOWING);
    } else if (cameraModeRef.current === CAMERA_MODES.OVERVIEW) {
      updateMode(CAMERA_MODES.FOLLOWING);
    }
  }, [active, gpsConfiable, updateMode]);

  const cameraTarget = useMemo(
    () => buildCameraTarget(frame, profile, null, null),
    [frame, profile],
  );

  useEffect(() => {
    if (!cameraTarget || (cameraMode !== CAMERA_MODES.FOLLOWING && cameraMode !== CAMERA_MODES.RECENTERING)) return;
    const target = buildCameraTarget(frame, profile, previousBearingRef.current, previousTimestampRef.current);
    if (!target) return;
    previousBearingRef.current = target.bearing;
    previousTimestampRef.current = Number.isFinite(frame?.timestamp) ? frame!.timestamp : previousTimestampRef.current;
    const duration = cameraMode === CAMERA_MODES.RECENTERING ? recentringDurationMs : 250;
    onCameraUpdate?.(target, { cameraMode, duration });
    const map = resolveMap(mapRef);
    if (!map || !canApplyNavigationCamera(map)) return;
    const viewportHeight = map.getContainer?.().clientHeight ?? 0;
    map.easeTo({
      center: target.center,
      bearing: target.bearing,
      pitch: target.pitch,
      zoom: target.zoom,
      offset: cameraOffsetForAnchor(target.anchorRatio, viewportHeight),
      duration,
    });
  }, [cameraMode, cameraTarget, frame, mapRef, onCameraUpdate, profile, recentringDurationMs]);

  const handleGesture = useCallback((event: unknown) => {
    if (!isOriginalEventGesture(event)) return false;
    resumeModeRef.current = CAMERA_MODES.FREE;
    updateMode(CAMERA_MODES.FREE);
    return true;
  }, [updateMode]);

  const recenter = useCallback(() => {
    if (!frame?.displayPosition) return null;
    if (gpsConfiable) resumeModeRef.current = CAMERA_MODES.FOLLOWING;
    updateMode(gpsConfiable ? CAMERA_MODES.RECENTERING : CAMERA_MODES.GPS_DEGRADED);
    const target = buildCameraTarget(frame, profile, previousBearingRef.current, previousTimestampRef.current);
    if (!target || gpsConfiable) return target;

    // GPS degradado pausa el seguimiento automático, pero el gesto explícito
    // de recentrar todavía debe llevar al usuario a la última posición útil.
    onCameraUpdate?.(target, { cameraMode: CAMERA_MODES.GPS_DEGRADED, duration: recentringDurationMs });
    const map = resolveMap(mapRef);
    if (map && canApplyNavigationCamera(map)) {
      const viewportHeight = map.getContainer?.().clientHeight ?? 0;
      map.easeTo({
        center: target.center,
        bearing: target.bearing,
        pitch: target.pitch,
        zoom: target.zoom,
        offset: cameraOffsetForAnchor(target.anchorRatio, viewportHeight),
        duration: recentringDurationMs,
      });
    }
    return target;
  }, [frame, gpsConfiable, mapRef, onCameraUpdate, profile, recentringDurationMs, updateMode]);

  const finishRecentering = useCallback(() => {
    if (cameraModeRef.current !== CAMERA_MODES.RECENTERING) return;
    updateMode(gpsConfiable ? CAMERA_MODES.FOLLOWING : CAMERA_MODES.GPS_DEGRADED);
  }, [gpsConfiable, updateMode]);

  const setCameraMode = useCallback((nextMode: CameraMode) => updateMode(nextMode), [updateMode]);

  return {
    cameraMode,
    mode: cameraMode,
    cameraTarget,
    handleGesture,
    onGesture: handleGesture,
    recenter,
    recentrar: recenter,
    finishRecentering,
    setCameraMode,
    siguiendo: cameraMode === CAMERA_MODES.FOLLOWING || cameraMode === CAMERA_MODES.RECENTERING,
    cameraPaused: cameraMode === CAMERA_MODES.FREE,
  };
}

export { CAMERA_MODES };
export const useCamaraNavegacion = useNavigationCamera;
export const calcularObjetivoCamara = buildCameraTarget;
