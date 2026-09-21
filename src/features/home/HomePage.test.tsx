import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { flushLazyInteractiveMap } from '../map/flush-lazy-map';
import { HomePage } from './HomePage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderHome() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
  });

  await act(async () => {
    await flushLazyInteractiveMap();
  });

  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});

test('gives featured destinations a meaningful location action', async () => {
  const { container, root } = await renderHome();

  try {
    const featuredLinks = container.querySelectorAll<HTMLAnchorElement>(
      '.home-destination-card--featured .home-destination-card__pin',
    );

    expect(featuredLinks).toHaveLength(4);
    expect(featuredLinks[1].getAttribute('aria-label')).toBe('Ver detalles de Jericó');
    expect(featuredLinks[1].querySelector('svg.home-destination-card__pin-icon')).toBeTruthy();
    expect(featuredLinks[1].getAttribute('href')).toBe('/destinos/jerico');

    const compactLink = container.querySelector<HTMLAnchorElement>(
      '.home-destination-card--compact a',
    );
    expect(compactLink?.getAttribute('aria-label')).toBe('Planear visita en Urrao');
  } finally {
    act(() => root.unmount());
  }
});

test('embeds the overview map with municipalities and requested Itagui sites', async () => {
  const { container, root } = await renderHome();

  try {
    expect(container.querySelector('.home-map [data-map-mode="overview"]')).toBeTruthy();
    expect(container.querySelectorAll('.home-map .interactive-map__marker')).toHaveLength(10);
    expect(container.textContent).toMatch(/SENA de Calatrava/i);
    expect(container.textContent).toMatch(/Parque Principal de Itagüí/i);
  } finally {
    act(() => root.unmount());
  }
});
