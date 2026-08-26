import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { GuidePage } from './GuidePage';

function renderGuide() {
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    createRoot(container).render(<GuidePage municipalitySlug="jardin" category="gastronomia" />);
  });

  return container;
}

test('adds a guide experience to the visit plan', async () => {
  const container = renderGuide();
  const button = Array.from(container.querySelectorAll('button')).find((item) => /añadir.*plan/i.test(item.textContent ?? ''));

  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

  expect(container.textContent).toMatch(/agregada a tu visita/i);
});
