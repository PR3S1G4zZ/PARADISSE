import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

test('renders a recovery view for an unknown path', () => {
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    createRoot(container).render(<App initialPath="/inexistente" />);
  });

  expect(container.querySelector('h1')?.textContent).toMatch(/página no encontrada/i);
});
