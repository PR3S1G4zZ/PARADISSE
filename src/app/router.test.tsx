import { act } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

function renderApp(path: string) {
  window.history.pushState({}, '', path);
  const container = document.createElement('div');
  document.body.appendChild(container);

  act(() => {
    createRoot(container).render(<App />);
  });

  return container;
}

test.each([
  ['/', /donde cada viaje es una aventura/i],
  ['/nosotros', /quiénes somos/i],
  ['/destinos', /encuentra tu próximo destino/i],
  ['/destinos/jardin', /jardín/i],
  ['/guias/jardin/gastronomia', /gastronomía/i],
  ['/registro', /crea tu cuenta/i],
  ['/iniciar-sesion', /bienvenido de nuevo/i],
  ['/pago', /inicia sesión para confirmar tu visita/i],
])('renders a real screen for %s', (path, heading) => {
  const container = renderApp(path);

  expect(container.textContent).toMatch(heading);
});

test('renders a not-found screen for an unknown route', () => {
  const container = renderApp('/inexistente');

  expect(container.querySelector('h1')?.textContent).toMatch(/página no encontrada/i);
});

test('navigates with a header link without leaving the app', () => {
  const container = renderApp('/');
  const link = container.querySelector('a[href="/destinos"]');

  act(() => {
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  expect(window.location.pathname).toBe('/destinos');
  expect(container.textContent).toMatch(/encuentra tu próximo destino/i);
});
