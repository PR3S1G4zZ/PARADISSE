import { describe, expect, test } from 'vitest';
import { createNavigationPoseEstimator } from './navigation-pose';
import { createNavigationFrame, createProvisionalNavigationFrame } from './navigation-frame';
import { createRouteMatcher, prepareRoute } from './route-matching';
import { buildCameraTarget, destinationFromBearing } from './useNavigationCamera';

const route = prepareRoute([
  [6.170000, -75.610000],
  [6.170000, -75.609000],
  [6.171000, -75.609000],
]);

const position = {
  lat: 6.170000,
  lng: -75.609500,
  accuracy: 8,
  speed: 1.2,
  heading: 90,
  timestamp: Date.now(),
};

describe('navigation core', () => {
  test('matches a live position to route progress without replacing raw GPS data', () => {
    const matcher = createRouteMatcher(route, { profile: 'walk' });
    const match = matcher.match(position);

    expect(match.positionSource).toBe('matched');
    expect(match.deviationM).toBeLessThan(10);
    expect(match.progressM).toBeGreaterThan(0);
    expect(match.rawPosition).toEqual({ lat: position.lat, lng: position.lng });
  });

  test('uses the route tangent as camera bearing when movement heading is unavailable', () => {
    const matcher = createRouteMatcher(route, { profile: 'walk' });
    const match = matcher.match({ ...position, heading: null, speed: null });
    const pose = createNavigationPoseEstimator({ profile: 'walk' }).estimate({
      position: { ...position, heading: null, speed: null },
      matching: match,
    });

    expect(pose.cameraBearing).toBeCloseTo(90, 0);
    expect(pose.bearingSource).toBe('route-tangent');
  });

  test('publishes one display position for marker and camera consumers', () => {
    const matcher = createRouteMatcher(route, { profile: 'walk' });
    const match = matcher.match(position);
    const pose = createNavigationPoseEstimator({ profile: 'walk' }).estimate({ position, matching: match });
    const frame = createNavigationFrame(pose, 'FOLLOWING');

    expect(frame).not.toBeNull();
    if (!frame) throw new Error('Expected a navigation frame.');
    expect(frame.displayPosition).toEqual(pose.targetPosition);
    expect(frame.cameraPosition).toEqual(frame.displayPosition);
    expect(frame.rawPosition).toEqual(pose.rawPosition);
    expect(frame.positionSource).toBe(pose.positionSource);
    expect(frame.accuracyM).toBe(position.accuracy);
    expect(frame.displayOffsetM).toBeGreaterThanOrEqual(0);
    expect(frame.cameraMode).toBe('FOLLOWING');
  });

  test('keeps the accepted route-start fix visible while matching is pending', () => {
    const frame = createProvisionalNavigationFrame({
      lat: 6.171,
      lng: -75.612,
      accuracy: 12,
      speed: null,
      heading: null,
      timestamp: 1000,
    }, 'FOLLOWING');

    expect(frame).toMatchObject({
      rawPosition: { lat: 6.171, lng: -75.612 },
      displayPosition: { lat: 6.171, lng: -75.612 },
      cameraPosition: { lat: 6.171, lng: -75.612 },
      positionSource: 'raw',
      accuracyM: 12,
    });
  });

  test('holds raw position outside the conservative walking corridor', () => {
    const matcher = createRouteMatcher(route, { profile: 'walk' });
    const match = matcher.match({ ...position, lng: -75.608, accuracy: 5 });

    expect(match.positionSource).toBe('raw');
    expect(match.matchedPosition).toBeNull();
    expect(match.deviationM).toBeGreaterThan(30);
  });

  test('uses the calibrated camera profile and keeps look-ahead in MapLibre order', () => {
    const matcher = createRouteMatcher(route, { profile: 'walk' });
    const match = matcher.match(position);
    const pose = createNavigationPoseEstimator({ profile: 'walk' }).estimate({ position, matching: match });
    const frame = createNavigationFrame(pose, 'FOLLOWING');

    expect(frame).not.toBeNull();
    if (!frame) throw new Error('Expected a navigation frame.');
    expect(buildCameraTarget(frame, 'walk')?.pitch).toBe(35);
    expect(buildCameraTarget(frame, 'car')?.pitch).toBe(50);
    expect(destinationFromBearing({ lat: 6.17, lng: -75.61 }, 90, 100)?.[0]).toBeGreaterThan(-75.61);
  });

  test('does not jump to a later segment when the route passes near itself', () => {
    const metersToDegrees = 1 / 111320;
    const points: Array<[number, number]> = [];
    for (let index = 0; index <= 70; index += 1) {
      points.push([index * 5 * metersToDegrees, 0]);
    }
    points.push([0, 33 * metersToDegrees]);
    const matcher = createRouteMatcher(prepareRoute(points), { profile: 'walk' });

    matcher.match({ lat: 0, lng: 0, accuracy: 5, speed: 1, timestamp: 1000 });
    const match = matcher.match({ lat: 0, lng: 35 * metersToDegrees, accuracy: 5, speed: 1, timestamp: 2000 });

    expect(match.progressM).toBeLessThan(50);
    expect(match.segmentIndex).toBeLessThan(65);
  });

  test('holds progress when an accepted fix implies an impossible forward jump', () => {
    const matcher = createRouteMatcher(prepareRoute([
      [6.17, -75.61],
      [6.175, -75.61],
    ]), { profile: 'walk' });

    const first = matcher.match({ lat: 6.1701, lng: -75.61, accuracy: 5, speed: 1, timestamp: 1000 });
    const second = matcher.match({ lat: 6.173, lng: -75.61, accuracy: 5, speed: 1, timestamp: 2000 });

    expect(second.progressM).toBeCloseTo(first.progressM, 0);
    expect(second.positionSource).toBe('held');
  });

  test('holds small backward jitter instead of making the route progress decrease', () => {
    const matcher = createRouteMatcher(prepareRoute([
      [6.17, -75.61],
      [6.175, -75.61],
    ]), { profile: 'walk' });

    const first = matcher.match({ lat: 6.172, lng: -75.61, accuracy: 5, speed: 1, timestamp: 1000 });
    const second = matcher.match({ lat: 6.1719, lng: -75.61, accuracy: 5, speed: 1, timestamp: 2000 });

    expect(second.progressM).toBeCloseTo(first.progressM, 0);
    expect(second.positionSource).toBe('held');
  });

  test('ignores a matcher reading whose timestamp is not newer than the last one', () => {
    const matcher = createRouteMatcher(prepareRoute([
      [6.17, -75.61],
      [6.175, -75.61],
    ]), { profile: 'walk' });

    const first = matcher.match({ lat: 6.171, lng: -75.61, accuracy: 5, speed: 1, timestamp: 1000 });
    const stale = matcher.match({ lat: 6.174, lng: -75.61, accuracy: 5, speed: 1, timestamp: 900 });

    expect(stale.progressM).toBeCloseTo(first.progressM, 0);
    expect(stale.positionSource).toBe('held');
  });

  test('reports arrival from logical route progress near the final point', () => {
    const matcher = createRouteMatcher(route, { profile: 'walk' });
    const match = matcher.match({
      lat: 6.171,
      lng: -75.609,
      accuracy: 5,
      speed: 0,
      timestamp: 1000,
    });

    expect(match.remainingM).toBeLessThan(1);
    expect(match.progressM).toBeCloseTo(route.totalM, 3);
  });

  test('smooths the arrow while keeping the movement bearing as the camera bearing', () => {
    const matcher = createRouteMatcher(route, { profile: 'walk' });
    const estimator = createNavigationPoseEstimator({ profile: 'walk' });
    const previousPosition = { ...position, heading: 0, timestamp: 1000 };
    const previousPose = estimator.estimate({
      position: previousPosition,
      matching: matcher.match(previousPosition),
    });
    const nextPosition = { ...position, heading: 90, timestamp: 2000 };
    const nextPose = estimator.estimate({
      position: nextPosition,
      matching: matcher.match(nextPosition),
      previousPose,
      compassHeading: 180,
      compassTimestamp: 2000,
      compassPermission: 'granted',
      now: 2000,
    });

    expect(nextPose.cameraBearing).toBe(90);
    expect(nextPose.arrowBearing).toBeGreaterThan(0);
    expect(nextPose.arrowBearing).toBeLessThan(90);
    expect(nextPose.bearingSource).toBe('gps');
  });

  test('uses only a fresh authorized compass heading while stationary', () => {
    const matcher = createRouteMatcher(route, { profile: 'walk' });
    const estimator = createNavigationPoseEstimator({ profile: 'walk' });
    const stationary = { ...position, speed: 0, heading: null, timestamp: 2000 };
    const matching = matcher.match(stationary);

    const fresh = estimator.estimate({
      position: stationary,
      matching,
      compassHeading: 180,
      compassTimestamp: 1900,
      compassPermission: 'granted',
      now: 2000,
    });
    const stale = estimator.estimate({
      position: stationary,
      matching,
      compassHeading: 180,
      compassTimestamp: 0,
      compassPermission: 'granted',
      now: 2000,
    });

    expect(fresh.arrowBearing).toBe(180);
    expect(fresh.bearingSource).toBe('compass');
    expect(stale.bearingSource).toBe('route-tangent');
  });
});
