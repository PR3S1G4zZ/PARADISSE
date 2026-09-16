import type { RouteStep } from '../../shared/lib/api';

export function activeRouteInstruction(
  steps: readonly RouteStep[],
  progressM: number | null | undefined,
): string | null {
  if (!Number.isFinite(progressM) || steps.length === 0) return null;
  let accumulatedM = 0;
  for (const step of steps) {
    accumulatedM += Math.max(0, Number(step.distanciaM) || 0);
    if (progressM! <= accumulatedM || step === steps.at(-1)) return step.texto || null;
  }
  return steps.at(-1)?.texto || null;
}
