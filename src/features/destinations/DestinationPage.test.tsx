import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { flushLazyInteractiveMap } from '../map/flush-lazy-map';
import { NavegacionProvider } from '../navigation/NavigationContext';
import { DestinationPage } from './DestinationPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderDestination(slug = 'jardin') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[`/destinos/${slug}`]}>
        <NavegacionProvider>
          <Routes>
            <Route path="/destinos/:slug" element={<DestinationPage />} />
            <Route path="/destinos" element={<h1>Catálogo de destinos</h1>} />
            <Route path="/guias/jardin/cultura-historia" element={<h1>Guía de cultura e historia</h1>} />
            <Route path="/pago" element={<h1>Pagar visita</h1>} />
          </Routes>
        </NavegacionProvider>
      </MemoryRouter>,
    );
  });

  await act(async () => {
    await flushLazyInteractiveMap();
  });

  return { container, root };
}

function buttonNamed(container: HTMLElement, name: RegExp): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => name.test(candidate.textContent ?? ''));
  if (!button) throw new Error(`Unable to find button matching ${name}`);
  return button;
}

function linkNamed(container: HTMLElement, name: RegExp): HTMLAnchorElement {
  const link = Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .find((candidate) => name.test(candidate.textContent ?? ''));
  if (!link) throw new Error(`Unable to find link matching ${name}`);
  return link;
}

afterEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
});

test('persists the municipality before continuing to checkout', async () => {
  const { container, root } = await renderDestination();

  act(() => {
    buttonNamed(container, /planear esta visita/i).click();
  });

  const plan = JSON.parse(localStorage.getItem('paradisse.plan') ?? '{}');
  expect(plan.municipalities).toEqual(['jardin']);
  expect(container.textContent).toMatch(/pagar visita/i);
  act(() => root.unmount());
});

test('adds a destination experience and shows that it is already in the plan', async () => {
  const { container, root } = await renderDestination();
  const card = Array.from(container.querySelectorAll<HTMLElement>('.experience-card'))
    .find((candidate) => /ruta de café de origen/i.test(candidate.textContent ?? ''));

  expect(card).toBeTruthy();
  const addButton = buttonNamed(card!, /añadir al plan/i);

  act(() => {
    addButton.click();
  });

  const plan = JSON.parse(localStorage.getItem('paradisse.plan') ?? '{}');
  expect(plan.experiences).toEqual(['jardin-cafe']);
  expect(buttonNamed(card!, /agregada al plan/i).disabled).toBe(true);
  act(() => root.unmount());
});

test('publishes only guide categories that have data for the destination', async () => {
  const { container, root } = await renderDestination();
  const guideHrefs = Array.from(container.querySelectorAll<HTMLAnchorElement>('.guide-links a'))
    .map((link) => link.getAttribute('href'));

  expect(guideHrefs).toEqual(['/guias/jardin/cultura-historia', '/guias/jardin/gastronomia']);
  expect(container.textContent).not.toMatch(/naturaleza y aventura/i);
  act(() => root.unmount());
});

test('does not expose empty guide routes for a destination without guides', async () => {
  const { container, root } = await renderDestination('jerico');

  expect(container.querySelectorAll('.guide-links a')).toHaveLength(0);
  expect(container.textContent).toMatch(/todavía no hay guías publicadas para jericó/i);
  act(() => root.unmount());
});

test('returns from a valid destination detail to the destinations catalogue', async () => {
  const { container, root } = await renderDestination();

  try {
    const backLink = linkNamed(container, /volver a destinos/i);
    expect(backLink.getAttribute('href')).toBe('/destinos');

    act(() => {
      backLink.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toMatch(/catálogo de destinos/i);
  } finally {
    act(() => root.unmount());
  }
});

test('presents the destination identity, location, description, and planning action', async () => {
  const { container, root } = await renderDestination();

  try {
    const content = container.querySelector<HTMLElement>('.destination-detail__content');
    expect(content).toBeTruthy();
    expect(content?.querySelector('h1')?.textContent).toBe('Jardín');
    expect(content?.textContent).toMatch(/antioquia/i);
    expect(content?.querySelector('.destination-detail__description')?.textContent)
      .toMatch(/balcones floridos, café de origen/i);
    expect(buttonNamed(content!, /planear esta visita/i)).toBeTruthy();
  } finally {
    act(() => root.unmount());
  }
});

test('groups destination experiences and guide links into named sections', async () => {
  const { container, root } = await renderDestination();

  try {
    const experiences = container.querySelector<HTMLElement>(
      'section[aria-labelledby="experiences-title"]',
    );
    expect(experiences?.querySelector('h2')?.textContent)
      .toMatch(/experiencias para quedarte un poco más/i);
    expect(experiences?.querySelectorAll('.experience-card')).toHaveLength(2);
    expect(experiences?.textContent).toMatch(/ruta de café de origen/i);

    const guides = container.querySelector<HTMLElement>('section[aria-labelledby="guides-title"]');
    expect(guides?.querySelector('h2')?.textContent).toMatch(/guías para inspirar el viaje/i);
    expect(Array.from(guides?.querySelectorAll<HTMLAnchorElement>('a') ?? [])
      .map((link) => link.getAttribute('href')))
      .toEqual(['/guias/jardin/cultura-historia', '/guias/jardin/gastronomia']);

    const cultureGuide = linkNamed(guides!, /cultura e historia/i);
    act(() => {
      cultureGuide.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    });
    expect(container.textContent).toMatch(/guía de cultura e historia/i);
  } finally {
    act(() => root.unmount());
  }
});

test('opens the route modal from a destination detail', async () => {
  const { container, root } = await renderDestination('sena-calatrava');

  act(() => {
    buttonNamed(container, /cómo llegar/i).click();
  });

  expect(container.querySelector('[role="dialog"]')).toBeTruthy();
  expect(container.textContent).toMatch(/cómo llegar a sena de calatrava/i);
  act(() => root.unmount());
});

test('releases the detail map before opening live navigation', async () => {
  const { container, root } = await renderDestination('sena-calatrava');

  expect(container.querySelector('[data-map-mode="detail"]')).toBeTruthy();
  act(() => {
    buttonNamed(container, /cómo llegar/i).click();
  });

  expect(container.querySelector('[role="dialog"]')).toBeTruthy();
  expect(container.querySelector('[data-map-mode="detail"]')).toBeNull();
  act(() => root.unmount());
});
