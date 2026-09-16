import type { GeoPoint } from '../../shared/types/domain';
import type { NavigationPose, NavigationPosition } from './navigation-pose';
import { distanceM } from './route-matching';

export const CAMERA_MODES = {
  OVERVIEW: 'OVERVIEW',
  FOLLOWING: 'FOLLOWING',
  FREE: 'FREE',
  RECENTERING: 'RECENTERING',
  GPS_DEGRADED: 'GPS_DEGRADED',
} as const;

export type CameraMode = typeof CAMERA_MODES[keyof typeof CAMERA_MODES];

export interface NavigationFrame {
  rawPosition: GeoPoint;
  displayPosition: GeoPoint;
  cameraPosition: GeoPoint;
  positionSource: 'raw' | 'matched' | 'held' | 'interpolated';
  accuracyM: number;
  displayOffsetM: number;
  arrowBearing: number | null;
  cameraBearing: number | null;
  speedEstimateMps: number | null;
  cameraMode: CameraMode | string;
  progressM: number | null;
  remainingM: number | null;
  deviationM: number | null;
  timestamp: number;
}

export interface NavigationFrameMetrics {
  progressM?: number | null;
  remainingM?: number | null;
  deviationM?: number | null;
}

export function createNavigationFrame(
  pose: NavigationPose | null,
  cameraMode: CameraMode | string = CAMERA_MODES.OVERVIEW,
  metrics: NavigationFrameMetrics = {},
): NavigationFrame | null {
  if (!pose) return null;
  return {
    rawPosition: pose.rawPosition,
    displayPosition: pose.targetPosition,
    cameraPosition: pose.targetPosition,
    positionSource: pose.positionSource,
    accuracyM: pose.accuracyM,
    displayOffsetM: distanceM(pose.rawPosition, pose.targetPosition),
    arrowBearing: pose.arrowBearing,
    cameraBearing: pose.cameraBearing,
    speedEstimateMps: pose.speedEstimateMps,
    cameraMode,
    progressM: metrics.progressM ?? null,
    remainingM: metrics.remainingM ?? null,
    deviationM: metrics.deviationM ?? null,
    timestamp: pose.timestamp,
  };
}

/**
 * Keeps the accepted fix that started a route visible during the brief gap
 * before route matching and animation produce a full pose.
 */
export function createProvisionalNavigationFrame(
  position: NavigationPosition | null,
  cameraMode: CameraMode | string = CAMERA_MODES.FOLLOWING,
): NavigationFrame | null {
  if (!position) return null;
  const point = { lat: position.lat, lng: position.lng };
  const bearing = Number.isFinite(position.heading) ? position.heading : null;
  return {
    rawPosition: point,
    displayPosition: point,
    cameraPosition: point,
    positionSource: 'raw',
    accuracyM: position.accuracy,
    displayOffsetM: 0,
    arrowBearing: bearing,
    cameraBearing: bearing,
    speedEstimateMps: position.speed,
    cameraMode,
    progressM: null,
    remainingM: null,
    deviationM: null,
    timestamp: position.timestamp,
  };
}
