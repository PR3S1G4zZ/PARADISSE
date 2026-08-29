import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DestinationPage } from './DestinationPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderDestination(slug = 'jardin') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={[`/destinos/${slug}`]}>
        <Routes>
          <Route path="/destinos/:slug" element={<DestinationPage />} />
          <Route path="/pago" element={<h1>Pagar visita</h1>} />
        </Routes>
      </MemoryRouter>,
    );
  });

  return { container, root };
}

function buttonNamed(container: HTMLElement, name: RegExp): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll('button'))
    .find((candidate) => name.test(candidate.textContent ?? ''));
  if (!button) throw new Error(`Unable to find button matching ${name}`);
  return button;
}

afterEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
});

test('persists the municipality before continuing to checkout', () => {
  const { container, root } = renderDestination();

  act(() => {
    buttonNamed(container, /planear esta visita/i).click();
  });

  const plan = JSON.parse(localStorage.getItem('paradisse.plan') ?? '{}');
  expect(plan.municipalities).toEqual(['jardin']);
  expect(container.textContent).toMatch(/pagar visita/i);
  act(() => root.unmount());
});

test('adds a destination experience and shows that it is already in the plan', () => {
  const { container, root } = renderDestination();
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

test('publishes only guide categories that have data for the destination', () => {
  const { container, root } = renderDestination();
  const guideHrefs = Array.from(container.querySelectorAll<HTMLAnchorElement>('.guide-links a'))
    .map((link) => link.getAttribute('href'));

  expect(guideHrefs).toEqual(['/guias/jardin/cultura-historia', '/guias/jardin/gastronomia']);
  expect(container.textContent).not.toMatch(/naturaleza y aventura/i);
  act(() => root.unmount());
});

test('does not expose empty guide routes for a destination without guides', () => {
  const { container, root } = renderDestination('jerico');

  expect(container.querySelectorAll('.guide-links a')).toHaveLength(0);
  expect(container.textContent).toMatch(/todavía no hay guías publicadas para jericó/i);
  act(() => root.unmount());
});
