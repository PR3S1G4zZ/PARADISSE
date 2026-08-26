import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { GuidePage } from './GuidePage';

function getByRole(container: HTMLElement, role: 'button' | 'heading', name: RegExp): HTMLElement {
  const candidates = Array.from(container.querySelectorAll<HTMLElement>(role === 'button' ? 'button' : 'h1, h2, h3'));
  const match = candidates.find((element) => name.test(element.textContent ?? ''));
  if (!match) throw new Error(`Unable to find ${role} matching ${name}`);
  return match;
}

function renderGuide() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<GuidePage municipalitySlug="jardin" category="gastronomia" />);
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
  root.unmount();
});

test('rehydrates already-added experiences when the guide returns', () => {
  localStorage.setItem('paradisse.plan', JSON.stringify({ favorites: [], municipalities: [], experiences: ['jardin-gastro-trucha'] }));
  const { container, root } = renderGuide();

  expect(getByRole(container, 'button', /agregada a tu visita/i)).toBeTruthy();
  root.unmount();
});
