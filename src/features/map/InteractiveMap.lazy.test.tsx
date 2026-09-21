import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test } from 'vitest';
import type { CatalogDestination } from '../../shared/types/domain';
import { flushLazyInteractiveMap } from './flush-lazy-map';
import { InteractiveMap } from './InteractiveMap';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const destinations: CatalogDestination[] = [
  {
    slug: 'jardin',
    name: 'Jardín',
    kind: 'municipality',
    description: '',
    experiences: [],
    location: { lat: 6.17, lng: -75.61, arrivalLabel: 'Jardín' },
  },
];

function renderLazyMap() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <InteractiveMap destinations={destinations} mode="overview" />
      </MemoryRouter>,
    );
  });

  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});

test('keeps the map layout while the heavy chunk is pending', () => {
  const { container, root } = renderLazyMap();

  try {
    const surface = container.querySelector('.interactive-map');
    expect(surface).toBeTruthy();
    expect(surface?.getAttribute('data-map-mode')).toBe('overview');
    expect(surface?.classList.contains('interactive-map--loading')
      || container.querySelector('[data-map-mode="overview"]')).toBeTruthy();
  } finally {
    act(() => root.unmount());
  }
});

test('renders the lazy map entry after the MapLibre chunk loads', async () => {
  const { container, root } = renderLazyMap();

  try {
    await act(async () => {
      await flushLazyInteractiveMap();
    });

    expect(container.querySelector('[data-map-mode="overview"]')).toBeTruthy();
    expect(container.querySelector('[data-map-state="loading"]')).toBeNull();
    expect(container.querySelector('.interactive-map__marker')).toBeTruthy();
    expect(container.textContent).toMatch(/jardín/i);
  } finally {
    act(() => root.unmount());
  }
});
