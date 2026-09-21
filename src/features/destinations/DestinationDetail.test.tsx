import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { flushLazyInteractiveMap } from '../map/flush-lazy-map';
import { DestinationPage } from './DestinationPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderDestination(slug = 'jardin') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[`/destinos/${slug}`]}>
        <Routes>
          <Route path="/destinos/:slug" element={<DestinationPage />} />
          <Route path="/destinos" element={<h1>Destinos</h1>} />
        </Routes>
      </MemoryRouter>,
    );
  });

  await act(async () => {
    await flushLazyInteractiveMap();
  });

  return { container, root };
}

afterEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
});

test('renders the detailed destination hierarchy from the Figma screen', async () => {
  const { container, root } = await renderDestination();

  expect(container.querySelector('.destination-detail-page')).toBeTruthy();
  expect(container.querySelector('.destination-detail__hero')).toBeTruthy();
  expect(container.querySelector('.destination-detail__hero h1')?.textContent).toMatch(/Jardín/i);
  expect(container.textContent).toMatch(/bienvenido a/i);
  expect(container.textContent).toMatch(/sobre jardín/i);
  expect(container.textContent).toMatch(/altitud/i);
  expect(container.textContent).toMatch(/1750 m s\. n\. m\./i);
  expect(container.textContent).toMatch(/lugares turísticos destacados/i);
  expect(container.querySelectorAll('.destination-landmark-card')).toHaveLength(4);
  expect(container.querySelector('.destination-detail__map [data-map-mode="detail"]')).toBeTruthy();
  expect(container.querySelector('.destination-detail__map .interactive-map__marker')).toBeTruthy();

  act(() => root.unmount());
});

test('renders the requested Itagui site through the shared destination detail route', async () => {
  const { container, root } = await renderDestination('sena-calatrava');

  expect(container.querySelector('.destination-detail__hero h1')?.textContent)
    .toBe('SENA de Calatrava');
  expect(container.querySelector('.destination-detail__map [data-map-mode="detail"]')).toBeTruthy();
  expect(container.querySelector('.destination-route-button')).toBeTruthy();
  expect(container.textContent).toMatch(/itagüí/i);

  act(() => root.unmount());
});

test('keeps the detail navigation and planning actions discoverable', async () => {
  const { container, root } = await renderDestination();

  const backLink = container.querySelector<HTMLAnchorElement>('.destination-detail__back');
  expect(backLink?.getAttribute('href')).toBe('/destinos');
  expect(container.querySelector('.tourism-plans')).toBeTruthy();
  expect(container.querySelector('button.visit-cta')?.textContent).toMatch(/planear esta visita/i);
  expect(container.querySelectorAll('.experience-card')).toHaveLength(2);

  act(() => root.unmount());
});
