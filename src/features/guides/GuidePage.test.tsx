import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GuidePage } from './GuidePage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function getByRole(container: HTMLElement, role: 'button' | 'heading', name: RegExp): HTMLElement {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(role === 'button' ? 'button' : 'h1, h2, h3'));
  const match = candidates.find((element) => name.test(element.textContent ?? ''));
  if (!match) throw new Error(`Unable to find ${role} matching ${name}`);
  return match;
}

function renderGuide(municipalitySlug = 'jardin', category = 'gastronomia') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <GuidePage municipalitySlug={municipalitySlug} category={category} />
      </MemoryRouter>,
    );
  });

  return { container, root };
}

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

test('adds a guide experience to the visit plan', async () => {
  const { container, root } = renderGuide();
  const button = getByRole(container, 'button', /añadir.*plan/i);

  await act(async () => {
    button.click();
  });

  expect(getByRole(container, 'button', /agregada a tu visita/i)).toBeTruthy();
  expect(JSON.parse(localStorage.getItem('paradisse.plan') ?? '{}').experiences).toContain('jardin-gastro-trucha');
  act(() => root.unmount());
});

test('rehydrates already-added experiences when the guide returns', () => {
  localStorage.setItem('paradisse.plan', JSON.stringify({ favorites: [], municipalities: [], experiences: ['jardin-gastro-trucha'] }));
  const { container, root } = renderGuide();

  expect(getByRole(container, 'button', /agregada a tu visita/i)).toBeTruthy();
  act(() => root.unmount());
});

test('shows an honest state when a municipality has no published guides', () => {
  const { container, root } = renderGuide('jerico', 'gastronomia');

  expect(container.textContent).toMatch(/todavía no hay guías publicadas para jericó/i);
  expect(container.querySelector('.guide-card')).toBeNull();
  act(() => root.unmount());
});

test('returns to the destination through client-side navigation', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter initialEntries={['/guias/jardin/gastronomia']}>
        <Routes>
          <Route path="/guias/:slug/:category" element={<GuidePage />} />
          <Route path="/destinos/:slug" element={<h1>Ficha de Jardín</h1>} />
        </Routes>
      </MemoryRouter>,
    );
  });

  const link = Array.from(container.querySelectorAll<HTMLAnchorElement>('a'))
    .find((candidate) => /volver a jardín/i.test(candidate.textContent ?? ''));
  expect(link).toBeTruthy();

  act(() => {
    link!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  expect(getByRole(container, 'heading', /ficha de jardín/i)).toBeTruthy();
  act(() => root.unmount());
});
