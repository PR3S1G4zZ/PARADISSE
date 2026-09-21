import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { MapErrorBoundary } from './MapErrorBoundary';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('WebGL exploded');
  return <div data-map-ok="true">mapa recuperado</div>;
}

function renderBoundary(shouldThrow: boolean) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <section>
        <h1>Destinos</h1>
        <MapErrorBoundary mode="overview">
          <Boom shouldThrow={shouldThrow} />
        </MapErrorBoundary>
      </section>,
    );
  });

  return { container, root };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

test('shows a recoverable OSM fallback instead of blanking the page', () => {
  const { container, root } = renderBoundary(true);

  try {
    expect(container.textContent).toMatch(/destinos/i);
    expect(container.querySelector('[data-map-error="true"]')).toBeTruthy();
    expect(container.querySelector('[data-map-action="retry"]')).toBeTruthy();
    expect(container.textContent).toMatch(/el mapa no se pudo mostrar/i);
    expect(container.textContent).toMatch(/openstreetmap/i);
    expect(container.querySelector('[data-map-ok]')).toBeNull();
  } finally {
    act(() => root.unmount());
  }
});

test('retries the map tree after a crash', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const crash = { current: true };

  function RecoverableMap() {
    if (crash.current) throw new Error('WebGL exploded');
    return <div data-map-ok="true">mapa recuperado</div>;
  }

  act(() => {
    root.render(
      <MapErrorBoundary mode="navigation">
        <RecoverableMap />
      </MapErrorBoundary>,
    );
  });

  expect(container.querySelector('[data-map-error="true"]')).toBeTruthy();

  crash.current = false;
  act(() => {
    container.querySelector<HTMLButtonElement>('[data-map-action="retry"]')!.click();
  });

  expect(container.querySelector('[data-map-ok="true"]')).toBeTruthy();
  expect(container.textContent).toMatch(/mapa recuperado/i);
  expect(container.querySelector('[data-map-error]')).toBeNull();

  act(() => root.unmount());
});
