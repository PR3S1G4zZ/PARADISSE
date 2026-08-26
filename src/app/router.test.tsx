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
  ['/', /bienvenido a paradisse/i],
  ['/nosotros', /^nosotros$/i],
  ['/destinos', /^destinos$/i],
  ['/destinos/jerico', /detalle del destino/i],
  ['/guias/jerico/comida', /guía de viaje/i],
  ['/registro', /^regístrate$/i],
  ['/iniciar-sesion', /iniciar sesión/i],
  ['/pago', /^pago$/i],
  ['/inexistente', /página no encontrada/i],
])('renders the route %s', (path, title) => {
  const container = renderApp(path);

  expect(container.querySelector('h1')?.textContent).toMatch(title);
});

test('navigates with a header link without leaving the app', () => {
  const container = renderApp('/');
  const link = container.querySelector('a[href="/destinos"]');

  act(() => {
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  expect(window.location.pathname).toBe('/destinos');
  expect(container.querySelector('h1')?.textContent).toMatch(/^destinos$/i);
});
