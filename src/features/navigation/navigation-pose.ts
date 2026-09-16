import type { GeoPoint, TravelMode } from '../../shared/types/domain';
import type { RouteMatch } from './route-matching';

export type BearingSource = 'gps' | 'derived' | 'route-tangent' | 'compass' | 'held';
export type PositionSource = 'raw' | 'matched' | 'held';

export interface NavigationPosition extends GeoPoint {
  accuracy: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

export interface NavigationPose {
  rawPosition: GeoPoint;
  matchedPosition: GeoPoint | null;
  targetPosition: GeoPoint;
  movementBearing: number | null;
  arrowBearing: number | null;
  cameraBearing: number | null;
  speedEstimateMps: number | null;
  accuracyM: number;
  routeSegmentIndex: number | null;
  confidence: 'high' | 'medium' | 'low';
  isMoving: boolean;
  isOffRoute: boolean;
  bearingSource: BearingSource;
  positionSource: PositionSource;
  timestamp: number;
}

const COMPASS_MAX_AGE_MS = 1500;
const MOVING_SPEED_MPS = 0.5;
const HEADING_SMOOTHING_FACTOR = 0.35;

const normalizeBearing = (value: number): number => ((value % 360) + 360) % 360;

const smoothBearing = (previous: number | null | undefined, next: number, factor = HEADING_SMOOTHING_FACTOR): number => {
  if (previous == null || !Number.isFinite(previous)) return normalizeBearing(next);
  const delta = ((next - previous + 540) % 360) - 180;
  return normalizeBearing(previous + delta * factor);
};

const hasFreshCompass = ({
  heading,
  timestamp,
  permission,
  now,
}: {
  heading?: number | null;
  timestamp?: number | null;
  permission?: string;
  now: number;
}): boolean => {
  if (!Number.isFinite(heading) || !Number.isFinite(timestamp) || !Number.isFinite(now)) return false;
  if (permission !== 'granted' && permission !== 'not-required') return false;
  const age = now - (timestamp as number);
  return age >= 0 && age <= COMPASS_MAX_AGE_MS;
};

export function createNavigationPoseEstimator({ profile: _profile = 'walk' }: { profile?: TravelMode } = {}) {
  return {
    estimate({
      position,
      matching,
      previousPose,
      compassHeading,
      compassTimestamp,
      compassPermission,
      now = Date.now(),
    }: {
      position: NavigationPosition;
      matching: RouteMatch;
      previousPose?: NavigationPose | null;
      compassHeading?: number | null;
      compassTimestamp?: number | null;
      compassPermission?: string;
      now?: number;
    }): NavigationPose {
      const moving = Number.isFinite(position.speed) && (position.speed ?? 0) >= MOVING_SPEED_MPS;
      const gpsBearing = moving && Number.isFinite(position.heading) ? normalizeBearing(position.heading!) : null;
      const cameraBearing = gpsBearing ?? matching.tangentBearing ?? previousPose?.cameraBearing ?? null;
      const compassIsFresh = hasFreshCompass({
        heading: compassHeading,
        timestamp: compassTimestamp,
        permission: compassPermission,
        now,
      });
      const compassCanDriveArrow = compassIsFresh && (!moving || gpsBearing == null);
      const desiredArrow = gpsBearing
        ?? (compassCanDriveArrow ? compassHeading : null)
        ?? matching.tangentBearing
        ?? previousPose?.arrowBearing
        ?? null;
      const arrowBearing = desiredArrow == null
        ? null
        : smoothBearing(previousPose?.arrowBearing, desiredArrow);
      const bearingSource: BearingSource = gpsBearing != null
        ? 'gps'
        : compassCanDriveArrow
          ? 'compass'
          : matching.tangentBearing != null
            ? 'route-tangent'
            : previousPose ? 'held' : 'derived';
      const targetPosition = matching.matchedPosition ?? matching.rawPosition;
      return {
        rawPosition: matching.rawPosition,
        matchedPosition: matching.matchedPosition
          ? { lat: matching.matchedPosition[0], lng: matching.matchedPosition[1] }
          : null,
        targetPosition: Array.isArray(targetPosition)
          ? { lat: targetPosition[0], lng: targetPosition[1] }
          : targetPosition,
        movementBearing: gpsBearing ?? matching.tangentBearing,
        arrowBearing,
        cameraBearing,
        speedEstimateMps: position.speed,
        accuracyM: position.accuracy,
        routeSegmentIndex: matching.segmentIndex,
        confidence: position.accuracy <= 20 ? 'high' : position.accuracy <= 35 ? 'medium' : 'low',
        isMoving: moving,
        isOffRoute: matching.positionSource === 'raw',
        bearingSource,
        positionSource: matching.positionSource,
        timestamp: position.timestamp,
      };
    },
  };
}
