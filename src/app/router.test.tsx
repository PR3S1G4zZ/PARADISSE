import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App';

type SupportedRole = 'heading' | 'img' | 'link';

const screen = {
  getByRole(role: SupportedRole, { name }: { name: RegExp | string }): HTMLElement {
    const selector: Record<SupportedRole, string> = {
      heading: 'h1, h2, h3, h4, h5, h6',
      img: 'img',
      link: 'a[href]',
    };
    const matches = Array.from(document.querySelectorAll<HTMLElement>(selector[role])).filter((element) => {
      const accessibleName = role === 'img' ? element.getAttribute('alt') ?? '' : element.textContent ?? '';
      return typeof name === 'string' ? accessibleName === name : name.test(accessibleName);
    });

    if (matches.length !== 1) throw new Error(`Expected one ${role} named ${name}, found ${matches.length}.`);
    return matches[0];
  },
};

let appRoot: Root | undefined;

function renderApp(path: string) {
  window.history.replaceState({}, '', path);
  const container = document.createElement('div');
  document.body.appendChild(container);
  appRoot = createRoot(container);

  act(() => {
    appRoot!.render(<App />);
  });
}

afterEach(() => {
  act(() => appRoot?.unmount());
  appRoot = undefined;
  document.body.replaceChildren();
  localStorage.clear();
});

test.each([
  ['/', /donde cada viaje es una aventura/i],
  ['/nosotros', /quiénes somos/i],
  ['/destinos', /encuentra tu próximo destino/i],
  ['/destinos/jardin', /^jardín$/i],
  ['/guias/jardin/gastronomia', /^gastronomía local$/i],
  ['/registro', /^crea tu cuenta$/i],
  ['/iniciar-sesion', /^bienvenido de nuevo$/i],
  ['/pago', /inicia sesión para confirmar tu visita/i],
])('renders the real heading for %s', (path, heading) => {
  renderApp(path);

  expect(screen.getByRole('heading', { name: heading })).toBeTruthy();
});

test('uses a visible local landscape for the home hero', () => {
  renderApp('/');

  const hero = screen.getByRole('img', { name: /^paisaje del suroeste antioqueño$/i });
  expect(hero.getAttribute('src')).toBe('/assets/suroeste-landscape.png');
});

test('navigates to Jardín from its map control', () => {
  renderApp('/');
  const marker = screen.getByRole('link', { name: /ver jardín en el mapa/i });

  act(() => {
    marker.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  expect(screen.getByRole('heading', { name: /^jardín$/i })).toBeTruthy();
});

test('renders a not-found heading for an unknown route', () => {
  renderApp('/inexistente');

  expect(screen.getByRole('heading', { name: /página no encontrada/i })).toBeTruthy();
});

test('navigates with a header link without leaving the app', () => {
  renderApp('/');
  const link = screen.getByRole('link', { name: /^destinos$/i });

  act(() => {
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  expect(window.location.pathname).toBe('/destinos');
  expect(screen.getByRole('heading', { name: /encuentra tu próximo destino/i })).toBeTruthy();
});
