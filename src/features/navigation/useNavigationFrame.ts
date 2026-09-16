import { useEffect, useState } from 'react';
import type { NavigationPose } from './navigation-pose';
import {
  createNavigationFrame,
  type CameraMode,
  type NavigationFrame,
  type NavigationFrameMetrics,
} from './navigation-frame';

export function useNavigationFrame(
  pose: NavigationPose | null,
  cameraMode: CameraMode | string = 'OVERVIEW',
  metrics: NavigationFrameMetrics = {},
) {
  const [frame, setFrame] = useState<NavigationFrame | null>(() => createNavigationFrame(pose, cameraMode, metrics));

  useEffect(() => {
    if (typeof requestAnimationFrame !== 'function') {
      setFrame(createNavigationFrame(pose, cameraMode, metrics));
      return undefined;
    }
    const frameId = requestAnimationFrame(() => setFrame(createNavigationFrame(pose, cameraMode, metrics)));
    return () => cancelAnimationFrame(frameId);
  }, [cameraMode, metrics.deviationM, metrics.progressM, metrics.remainingM, pose]);

  return frame;
}
