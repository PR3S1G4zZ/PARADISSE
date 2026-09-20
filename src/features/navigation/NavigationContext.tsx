import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import type { CatalogDestination, GeoPoint, TravelMode } from '../../shared/types/domain';
import { rutasApi, type ResolvedRoute } from '../../shared/lib/api';
import { routingPointFor, toRoutePoint } from '../../shared/lib/route-request';
import { createNavigationPoseEstimator, type NavigationPose, type NavigationPosition } from './navigation-pose';
import { createRouteMatcher, prepareRoute, type RouteMatch } from './route-matching';
import { isTrustedPosition, isUsablePosition, useGeolocation } from './useGeolocation';
import { useOrientation } from './useOrientation';
import { useWakeLock } from './useWakeLock';
import { CAMERA_MODES, type NavigationFrame } from './navigation-frame';
import { useNavigationFrame } from './useNavigationFrame';
import { activeRouteInstruction } from './route-instructions';

export type NavigationStatus =
  | 'idle'
  | 'locating'
  | 'routing'
  | 'preview'
  | 'navigating'
  | 'confirming-deviation'
  | 'gps-degraded'
  | 'recalculating'
  | 'arrived'
  | 'error';

export interface NavigationProgress {
  progressM: number;
  remainingM: number;
  totalM: number;
  deviationM: number;
  segmentIndex: number;
  percentage: number;
}

export interface NavigationContextValue {
  destination: CatalogDestination | null;
  route: ResolvedRoute | null;
  mode: TravelMode;
  status: NavigationStatus;
  error: string | null;
  position: NavigationPosition | null;
  gpsConfiable: boolean;
  gpsQuality: ReturnType<typeof useGeolocation>['quality'];
  gpsDiagnostics: ReturnType<typeof useGeolocation>['diagnostics'];
  gpsStatus: ReturnType<typeof useGeolocation>['status'];
  gpsError: string | null;
  pose: NavigationPose | null;
  matching: RouteMatch | null;
  progress: NavigationProgress | null;
  frame: NavigationFrame | null;
  instruction: string | null;
  voiceActive: boolean;
  setVoiceActive: (active: boolean) => void;
  orientation: ReturnType<typeof useOrientation>;
  wakeLock: ReturnType<typeof useWakeLock>;
  startRoute: (destination: CatalogDestination, mode: TravelMode, originOverride?: GeoPoint) => Promise<void>;
  stopRoute: () => void;
  recalculateNow: () => Promise<void>;
}

export const NavegacionContext = createContext<NavigationContextValue | null>(null);

export function useNavegacion(): NavigationContextValue {
  const context = useContext(NavegacionContext);
  if (!context) throw new Error('useNavegacion debe usarse dentro de NavegacionProvider.');
  return context;
}

export const safeNavigationError = (error: unknown) => {
  if (!(error instanceof Error)) return 'No se pudo preparar la navegación.';
  const status = typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as Error & { status?: number }).status)
    : null;
  if (status === 502) return 'Ruta no disponible en este momento. Intenta de nuevo más tarde.';
  return error.message.includes('fetch') || error.message.includes('API HTTP')
    ? 'No se pudo contactar el servicio de rutas.'
    : error.message;
};

export function NavegacionProvider({ children }: PropsWithChildren) {
  const [destination, setDestination] = useState<CatalogDestination | null>(null);
  const [route, setRoute] = useState<ResolvedRoute | null>(null);
  const [mode, setMode] = useState<TravelMode>('walk');
  const [status, setStatus] = useState<NavigationStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewPosition, setPreviewPosition] = useState<NavigationPosition | null>(null);
  const [routeStartPosition, setRouteStartPosition] = useState<NavigationPosition | null>(null);
  const [pose, setPose] = useState<NavigationPose | null>(null);
  const [matching, setMatching] = useState<RouteMatch | null>(null);
  const [voiceActive, setVoiceActive] = useState(true);
  const [liveEnabled, setLiveEnabled] = useState(false);
  const [lastInstruction, setLastInstruction] = useState<string | null>(null);
  const geo = useGeolocation(liveEnabled);
  const orientation = useOrientation(liveEnabled);
  const wakeLock = useWakeLock(liveEnabled && (status === 'navigating' || status === 'confirming-deviation' || status === 'recalculating'));
  const matcherRef = useRef<ReturnType<typeof createRouteMatcher> | null>(null);
  const estimatorRef = useRef(createNavigationPoseEstimator({ profile: 'walk' }));
  const currentPositionRef = useRef<NavigationPosition | null>(null);
  const poseRef = useRef<NavigationPose | null>(null);
  const recalculateInFlightRef = useRef(false);
  const lastRecalculationRef = useRef(0);
  const offRouteReadingsRef = useRef(0);

  // El primer fix usado para resolver la ruta debe seguir disponible aunque
  // el watchPosition tarde en entregar su siguiente lectura.
  const currentPosition = liveEnabled ? geo.position ?? routeStartPosition : previewPosition;
  useEffect(() => {
    currentPositionRef.current = currentPosition;
  }, [currentPosition]);

  const applyRoute = useCallback((resolvedRoute: ResolvedRoute, selectedMode: TravelMode) => {
    setRoute(resolvedRoute);
    matcherRef.current = createRouteMatcher(prepareRoute(resolvedRoute.puntos), { profile: selectedMode });
    estimatorRef.current = createNavigationPoseEstimator({ profile: selectedMode });
    offRouteReadingsRef.current = 0;
  }, []);

  const recalculateNow = useCallback(async () => {
    const target = destination;
    const origin = currentPositionRef.current;
    const now = Date.now();
    if (
      !target
      || !origin
      || (liveEnabled && geo.quality !== 'confiable')
      || recalculateInFlightRef.current
      || now - lastRecalculationRef.current < 15000
    ) return;
    recalculateInFlightRef.current = true;
    lastRecalculationRef.current = now;
    setStatus('recalculating');
    setError(null);
    try {
      const resolvedRoute = await rutasApi.resolver(
        toRoutePoint(origin),
        routingPointFor(target),
        mode,
        target.name,
      );
      applyRoute(resolvedRoute, mode);
      setStatus(liveEnabled ? 'navigating' : 'preview');
    } catch (nextError) {
      setStatus('error');
      setError(safeNavigationError(nextError));
    } finally {
      recalculateInFlightRef.current = false;
    }
  }, [applyRoute, destination, geo.quality, liveEnabled, mode]);

  const startRoute = useCallback(async (
    nextDestination: CatalogDestination,
    nextMode: TravelMode,
    originOverride?: GeoPoint,
  ) => {
    // Debe ejecutarse sin esperar geolocalización ni routing para conservar la
    // activación del gesto en Safari/iOS.
    if (!originOverride) void orientation.activate();
    lastRecalculationRef.current = 0;
    setDestination(nextDestination);
    setMode(nextMode);
    setRoute(null);
    setPose(null);
    poseRef.current = null;
    setMatching(null);
    setLastInstruction(null);
    setRouteStartPosition(null);
    setError(null);
    setStatus(originOverride ? 'routing' : 'locating');
    setPreviewPosition(originOverride ? {
      ...originOverride,
      accuracy: 1,
      speed: null,
      heading: null,
      timestamp: Date.now(),
    } : null);
    setLiveEnabled(!originOverride);

    try {
      let origin: NavigationPosition;
      if (originOverride) {
        origin = {
          ...originOverride,
          accuracy: 1,
          speed: null,
          heading: null,
          timestamp: Date.now(),
        };
      } else {
        setStatus('locating');
        origin = isTrustedPosition(geo.position) ? geo.position! : await geo.requestCurrentPosition();
        if (!isUsablePosition(origin)) throw new Error('La ubicación no tiene precisión suficiente para iniciar la ruta.');
        setRouteStartPosition(origin);
      }
      const resolvedRoute = await rutasApi.resolver(
        toRoutePoint(origin),
        routingPointFor(nextDestination),
        nextMode,
        nextDestination.name,
      );
      applyRoute(resolvedRoute, nextMode);
      currentPositionRef.current = origin;
      setStatus(originOverride ? 'preview' : 'navigating');
    } catch (nextError) {
      setLiveEnabled(false);
      setRouteStartPosition(null);
      setStatus('error');
      setError(safeNavigationError(nextError));
      throw nextError;
    }
  }, [applyRoute, geo, orientation]);

  const stopRoute = useCallback(() => {
    setLiveEnabled(false);
    setDestination(null);
    setRoute(null);
    setPreviewPosition(null);
    setRouteStartPosition(null);
    setPose(null);
    poseRef.current = null;
    setMatching(null);
    setLastInstruction(null);
    setStatus('idle');
    setError(null);
    geo.reset();
    matcherRef.current = null;
    offRouteReadingsRef.current = 0;
  }, [geo]);

  useEffect(() => {
    if (!route || !currentPosition || !matcherRef.current) return;
    if (liveEnabled && !geo.gpsConfiable) return;
    const nextMatching = matcherRef.current.match(currentPosition);
    const nextPose = estimatorRef.current.estimate({
      position: currentPosition,
      matching: nextMatching,
      previousPose: poseRef.current,
      compassHeading: orientation.heading,
      compassTimestamp: orientation.lastUpdate,
      compassPermission: orientation.permission,
      now: Date.now(),
    });
    poseRef.current = nextPose;
    setMatching(nextMatching);
    setPose(nextPose);
    if (nextMatching.remainingM <= 25 && status !== 'arrived') {
      setStatus('arrived');
      setLiveEnabled(false);
      return;
    }
    if (!liveEnabled || !['navigating', 'confirming-deviation', 'gps-degraded'].includes(status)) return;
    if (geo.quality !== 'confiable') return;
    const deviationThreshold = Math.max(45, currentPosition.accuracy + 10);
    if (nextMatching.deviationM > deviationThreshold) {
      offRouteReadingsRef.current += 1;
      if (offRouteReadingsRef.current < 3 && status !== 'confirming-deviation') setStatus('confirming-deviation');
    } else {
      offRouteReadingsRef.current = 0;
      if (status === 'confirming-deviation') setStatus('navigating');
    }
    if (
      offRouteReadingsRef.current >= 3
      && Date.now() - lastRecalculationRef.current >= 15000
    ) {
      offRouteReadingsRef.current = 0;
      void recalculateNow();
    }
  }, [currentPosition, geo.gpsConfiable, geo.quality, liveEnabled, orientation.heading, orientation.lastUpdate, orientation.permission, recalculateNow, route, status]);

  useEffect(() => {
    if (!liveEnabled || !route || status === 'arrived' || status === 'error') return;
    if (!geo.gpsConfiable && ['navigating', 'confirming-deviation'].includes(status)) setStatus('gps-degraded');
    if (geo.gpsConfiable && status === 'gps-degraded') setStatus('navigating');
  }, [geo.gpsConfiable, liveEnabled, route, status]);

  const instruction = useMemo(
    () => activeRouteInstruction(route?.pasos ?? [], matching?.progressM),
    [matching?.progressM, route?.pasos],
  );
  useEffect(() => {
    if (!voiceActive || !instruction || instruction === lastInstruction || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(instruction));
    setLastInstruction(instruction);
  }, [instruction, lastInstruction, voiceActive]);

  const progress = useMemo<NavigationProgress | null>(() => {
    if (!matching || !route) return null;
    const totalM = Math.max(route.distanciaM, prepareRoute(route.puntos).totalM);
    return {
      progressM: matching.progressM,
      remainingM: matching.remainingM,
      totalM,
      deviationM: matching.deviationM,
      segmentIndex: matching.segmentIndex,
      percentage: totalM > 0 ? Math.min(100, matching.progressM / totalM * 100) : 0,
    };
  }, [matching, route]);

  const frame = useNavigationFrame(
    pose,
    !liveEnabled
      ? CAMERA_MODES.OVERVIEW
      : status === 'gps-degraded'
        ? CAMERA_MODES.GPS_DEGRADED
        : CAMERA_MODES.FOLLOWING,
    progress
      ? {
        progressM: progress.progressM,
        remainingM: progress.remainingM,
        deviationM: progress.deviationM,
      }
      : undefined,
  );

  const value = useMemo<NavigationContextValue>(() => ({
    destination,
    route,
    mode,
    status,
    error,
    position: currentPosition,
    gpsConfiable: geo.gpsConfiable,
    gpsQuality: geo.quality,
    gpsDiagnostics: geo.diagnostics,
    gpsStatus: geo.status,
    gpsError: geo.error,
    pose,
    matching,
    progress,
    frame,
    instruction,
    voiceActive,
    setVoiceActive,
    orientation,
    wakeLock,
    startRoute,
    stopRoute,
    recalculateNow,
  }), [currentPosition, destination, error, frame, geo.diagnostics, geo.error, geo.gpsConfiable, geo.quality, geo.status, instruction, matching, mode, pose, progress, recalculateNow, route, startRoute, status, stopRoute, voiceActive, wakeLock, orientation]);

  return <NavegacionContext.Provider value={value}>{children}</NavegacionContext.Provider>;
}

export const NavigationProvider = NavegacionProvider;
