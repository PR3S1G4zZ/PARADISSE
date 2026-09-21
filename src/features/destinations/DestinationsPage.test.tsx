import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { flushLazyInteractiveMap } from '../map/flush-lazy-map';
import { DestinationsPage } from './DestinationsPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderDestinations() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <DestinationsPage />
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

test('renders the catalogue of municipalities, Itagui sites, and embedded map', async () => {
  const { container, root } = await renderDestinations();

  expect(container.querySelector('.destinations-hero__backdrop')?.getAttribute('src'))
    .toBe('/assets/destinations-hero.webp');
  expect(container.querySelectorAll('.destination-card')).toHaveLength(25);
  expect(container.querySelectorAll('.destination-card--featured')).toHaveLength(4);
  expect(container.querySelectorAll('.destination-card--compact')).toHaveLength(21);
  expect(container.querySelector('.destinations-explorer__map [data-map-mode="overview"]')).toBeTruthy();
  expect(container.querySelectorAll('.interactive-map__marker')).toHaveLength(25);
  expect(container.textContent).toMatch(/SENA de Calatrava/i);
  expect(container.textContent).toMatch(/Parque Principal de Itagüí/i);
  expect(container.textContent).toMatch(/municipios del suroeste/i);
  expect(container.textContent).toMatch(/explora el suroeste/i);

  act(() => root.unmount());
});

test('filters destinations without losing accent-insensitive matching', async () => {
  const { container, root } = await renderDestinations();
  const input = container.querySelector<HTMLInputElement>('input[type="search"]');
  expect(input).toBeTruthy();

  act(() => {
    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    nativeValueSetter?.call(input, 'JARDÍN');
    input!.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const catalogue = container.querySelector('.destination-grid');
  expect(container.querySelectorAll('.destination-card')).toHaveLength(1);
  expect(catalogue?.textContent).toMatch(/jardín/i);
  expect(catalogue?.textContent).not.toMatch(/jericó/i);

  act(() => root.unmount());
});

test('filters the catalogue to Itagui sites', async () => {
  const { container, root } = await renderDestinations();
  const filter = container.querySelector<HTMLButtonElement>('[data-destination-filter="site"]');
  expect(filter).toBeTruthy();

  act(() => filter!.click());

  expect(container.querySelectorAll('.destination-card')).toHaveLength(2);
  expect(container.textContent).toMatch(/SENA de Calatrava/i);
  expect(container.textContent).toMatch(/Parque Principal de Itagüí/i);
  expect(container.textContent).not.toMatch(/Jardín/);

  act(() => root.unmount());
});

test('persists a catalogue favorite through the existing visit-plan service', async () => {
  const { container, root } = await renderDestinations();
  const favorite = container.querySelector<HTMLButtonElement>(
    'button[aria-label="Agregar Jardín de favoritos"]',
  );
  expect(favorite).toBeTruthy();

  act(() => favorite!.click());

  const plan = JSON.parse(localStorage.getItem('paradisse.plan') ?? '{}');
  expect(plan.favorites).toEqual(['jardin']);
  expect(favorite!.getAttribute('aria-pressed')).toBe('true');

  act(() => root.unmount());
});
