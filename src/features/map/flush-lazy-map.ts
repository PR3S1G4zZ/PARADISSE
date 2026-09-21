/** Resolves the heavy map chunk so tests can commit past React.lazy + Suspense. */
export async function flushLazyInteractiveMap() {
  await import('./InteractiveMapView');
}
