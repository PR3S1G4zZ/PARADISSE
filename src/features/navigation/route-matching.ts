import type { GeoPoint, TravelMode } from '../../shared/types/domain';

export type RoutePoint = [number, number];

export interface PreparedRoute {
  points: RoutePoint[];
  segments: Array<{ start: RoutePoint; end: RoutePoint; lengthM: number; bearing: number }>;
  cumulativeM: number[];
  totalM: number;
}

export interface RouteMatch {
  rawPosition: GeoPoint;
  projection: RoutePoint;
  matchedPosition: RoutePoint | null;
  positionSource: 'raw' | 'matched' | 'held';
  segmentIndex: number;
  progressM: number;
  remainingM: number;
  deviationM: number;
  tangentBearing: number | null;
  corridorM: number;
}

const EARTH_RADIUS_M = 6_371_000;

type Coordinate = GeoPoint | RoutePoint;

const asPoint = (value: Coordinate): RoutePoint => Array.isArray(value)
  ? value
  : [value.lat, value.lng];

export function distanceM(first: Coordinate, second: Coordinate): number {
  const firstPoint = asPoint(first);
  const secondPoint = asPoint(second);
  const lat1 = firstPoint[0] * Math.PI / 180;
  const lat2 = secondPoint[0] * Math.PI / 180;
  const deltaLat = (secondPoint[0] - firstPoint[0]) * Math.PI / 180;
  const deltaLng = (secondPoint[1] - firstPoint[1]) * Math.PI / 180;
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function bearingDegrees(first: RoutePoint, second: RoutePoint): number {
  const lat1 = first[0] * Math.PI / 180;
  const lat2 = second[0] * Math.PI / 180;
  const deltaLng = (second[1] - first[1]) * Math.PI / 180;
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2)
    - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function prepareRoute(points: RoutePoint[]): PreparedRoute {
  const safePoints = points.filter((point) => point.length >= 2 && point.every(Number.isFinite));
  const segments = safePoints.slice(0, -1).map((start, index) => {
    const end = safePoints[index + 1];
    return { start, end, lengthM: distanceM(start, end), bearing: bearingDegrees(start, end) };
  });
  const cumulativeM = [0];
  for (const segment of segments) cumulativeM.push(cumulativeM.at(-1)! + segment.lengthM);
  return { points: safePoints, segments, cumulativeM, totalM: cumulativeM.at(-1) ?? 0 };
}

function projectOnSegment(position: GeoPoint, start: RoutePoint, end: RoutePoint): { point: RoutePoint; ratio: number } {
  const latitudeScale = Math.max(0.2, Math.cos(position.lat * Math.PI / 180));
  const x = (position.lng - start[1]) * 111_320 * latitudeScale;
  const y = (position.lat - start[0]) * 111_320;
  const endX = (end[1] - start[1]) * 111_320 * latitudeScale;
  const endY = (end[0] - start[0]) * 111_320;
  const lengthSquared = endX ** 2 + endY ** 2;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, (x * endX + y * endY) / lengthSquared));
  return {
    ratio,
    point: [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio],
  };
}

function corridorFor(profile: TravelMode, accuracy: number): number {
  if (profile === 'walk') return Math.min(30, Math.max(10, accuracy * 1.25));
  return Math.min(60, Math.max(15, accuracy * 1.5));
}

export function createRouteMatcher(route: PreparedRoute, { profile = 'walk' }: { profile?: TravelMode } = {}) {
  let lastSegmentIndex = 0;
  let lastProgressM: number | null = null;
  let lastTimestamp: number | null = null;
  let lastPosition: (GeoPoint & { accuracy?: number; speed?: number | null; timestamp?: number }) | null = null;
  let lastMatchedPosition: RoutePoint | null = null;

  const search = (position: GeoPoint, start: number, end: number) => {
    let best = {
      deviationM: Infinity,
      segmentIndex: Math.max(0, Math.min(start, route.segments.length - 1)),
      projection: route.points[0] ?? [position.lat, position.lng] as RoutePoint,
      ratio: 0,
    };
    for (let index = Math.max(0, start); index < Math.min(end, route.segments.length); index += 1) {
      const segment = route.segments[index];
      const candidate = projectOnSegment(position, segment.start, segment.end);
      const deviationM = distanceM([position.lat, position.lng], candidate.point);
      if (deviationM < best.deviationM) best = { deviationM, segmentIndex: index, projection: candidate.point, ratio: candidate.ratio };
    }
    return best;
  };

  return {
    match(position: GeoPoint & { accuracy?: number; speed?: number | null; heading?: number | null; timestamp?: number }): RouteMatch {
      const accuracy = Number.isFinite(position.accuracy) ? position.accuracy! : 20;
      const corridorM = corridorFor(profile, accuracy);
      const localStart = Math.max(0, Math.min(lastSegmentIndex - 3, Math.max(0, route.segments.length - 1)));
      const localEnd = Math.min(route.segments.length, localStart + 60);
      let best = search(position, localStart, localEnd);
      if (best.deviationM > Math.max(30, corridorM)) {
        const global = search(position, 0, route.segments.length);
        if (global.deviationM < best.deviationM) best = global;
      }

      const candidateSegment = route.segments[best.segmentIndex];
      const candidateProgressM = Math.min(
        route.totalM,
        (route.cumulativeM[best.segmentIndex] ?? 0) + (candidateSegment?.lengthM ?? 0) * best.ratio,
      );
      const matched = best.deviationM <= corridorM;

      const elapsedMs = lastPosition && Number.isFinite(position.timestamp) && Number.isFinite(lastPosition.timestamp)
        ? position.timestamp! - lastPosition.timestamp!
        : null;
      const staleReading = lastTimestamp != null
        && (!Number.isFinite(position.timestamp) || position.timestamp! <= lastTimestamp);
      const forwardJumpM = lastProgressM == null ? 0 : candidateProgressM - lastProgressM;
      const backwardM = lastProgressM == null ? 0 : lastProgressM - candidateProgressM;
      const maxSpeedMps = Math.max(
        profile === 'walk' ? 8 : 80,
        Number.isFinite(position.speed) && (position.speed ?? 0) > 0 ? position.speed! * 3 : 0,
      );
      const maxForwardM = elapsedMs != null && elapsedMs > 0
        ? maxSpeedMps * Math.max(elapsedMs / 1000, 0.1) + Math.max(20, (lastPosition?.accuracy ?? 0) + accuracy)
        : Infinity;
      const backwardToleranceM = Math.max(15, accuracy * 2, (lastPosition?.accuracy ?? 0) * 2);
      const holdProgress = lastProgressM != null && (
        staleReading
        || !matched
        || (backwardM > 0 && backwardM <= backwardToleranceM)
        || forwardJumpM > maxForwardM
      );

      const progressM = holdProgress ? lastProgressM! : (matched || lastProgressM == null ? candidateProgressM : lastProgressM);
      const segmentIndex = holdProgress ? lastSegmentIndex : (matched ? best.segmentIndex : lastSegmentIndex);
      const holdMatchedPosition = Boolean(matched && holdProgress && lastMatchedPosition);
      const matchedPosition = holdMatchedPosition
        ? lastMatchedPosition
        : matched ? best.projection : null;
      const positionSource: RouteMatch['positionSource'] = holdMatchedPosition
        ? 'held'
        : matched ? 'matched' : 'raw';
      const effectiveSegmentIndex = holdMatchedPosition ? lastSegmentIndex : matched ? best.segmentIndex : lastSegmentIndex;
      const effectiveSegment = route.segments[effectiveSegmentIndex];

      if (matched && !holdProgress) {
        lastSegmentIndex = best.segmentIndex;
        lastProgressM = candidateProgressM;
        lastMatchedPosition = best.projection;
      } else if (lastProgressM == null) {
        lastProgressM = matched ? candidateProgressM : 0;
        lastSegmentIndex = matched ? best.segmentIndex : 0;
      }
      if (Number.isFinite(position.timestamp) && (lastTimestamp == null || position.timestamp! > lastTimestamp)) {
        lastTimestamp = position.timestamp!;
        lastPosition = position;
      }

      return {
        rawPosition: { lat: position.lat, lng: position.lng },
        projection: best.projection,
        matchedPosition,
        positionSource,
        segmentIndex,
        progressM,
        remainingM: Math.max(0, route.totalM - progressM),
        deviationM: best.deviationM,
        tangentBearing: effectiveSegment?.bearing ?? candidateSegment?.bearing ?? null,
        corridorM,
      };
    },
  };
}
