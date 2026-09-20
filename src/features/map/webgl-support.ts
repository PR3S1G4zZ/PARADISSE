type WebGlContextEventLike = {
  preventDefault?: () => void;
  originalEvent?: { preventDefault?: () => void };
};

export type MapWebGlEvented = {
  on: (type: string, listener: (event?: WebGlContextEventLike) => void) => unknown;
  off: (type: string, listener: (event?: WebGlContextEventLike) => void) => unknown;
};

let cachedSupport: boolean | undefined;

const preventContextLossDefault = (event?: WebGlContextEventLike) => {
  event?.originalEvent?.preventDefault?.();
  event?.preventDefault?.();
};

const loseProbeContext = (gl: WebGLRenderingContext) => {
  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // Probe leftovers must never throw into a React render.
  }
};

export function resetWebGlSupportCache() {
  cachedSupport = undefined;
}

/**
 * Detects WebGL once per page lifetime and immediately releases the probe
 * context so navigation re-renders cannot exhaust the browser's context budget.
 */
const environmentHasWebGlConstructor = () => (
  typeof globalThis.WebGLRenderingContext !== 'undefined'
  || (typeof window !== 'undefined' && typeof window.WebGLRenderingContext !== 'undefined')
);

export function hasWebGl(): boolean {
  if (cachedSupport !== undefined) return cachedSupport;
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (!environmentHasWebGlConstructor()) {
    cachedSupport = false;
    return cachedSupport;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = (
      canvas.getContext('webgl')
      || canvas.getContext('experimental-webgl')
    ) as WebGLRenderingContext | null;
    cachedSupport = Boolean(gl);
    if (gl) loseProbeContext(gl);
    return cachedSupport;
  } catch {
    cachedSupport = false;
    return cachedSupport;
  }
}

/**
 * Keeps the MapLibre instance mounted across GPU resets and asks the browser
 * to restore the context instead of leaving the beige empty style visible.
 */
export function attachMapWebGlLifecycle(
  map: MapWebGlEvented,
  handlers: { onLost: () => void; onRestored: () => void },
): () => void {
  const onLost = (event?: WebGlContextEventLike) => {
    preventContextLossDefault(event);
    handlers.onLost();
  };
  const onRestored = () => {
    handlers.onRestored();
  };

  map.on('webglcontextlost', onLost);
  map.on('webglcontextrestored', onRestored);

  return () => {
    map.off('webglcontextlost', onLost);
    map.off('webglcontextrestored', onRestored);
  };
}
