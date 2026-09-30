import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import App from './App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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

test('uses the downloaded Figma photography for the home hero', () => {
  renderApp('/');

  const hero = screen.getByRole('img', { name: /^escena de viaje en el suroeste antioqueño$/i });
  expect(hero.getAttribute('src')).toBe('/assets/figma-hero-bus.webp');
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

test('makes login reachable from the header', () => {
  renderApp('/');

  expect(screen.getByRole('link', { name: /^iniciar sesión$/i }).getAttribute('href')).toBe('/iniciar-sesion');
});

test('navigates home through the logo without leaving the app', () => {
  renderApp('/destinos');
  const logo = screen.getByRole('link', { name: /^paradisse$/i });

  act(() => {
    logo.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });

  expect(screen.getByRole('heading', { name: /donde cada viaje es una aventura/i })).toBeTruthy();
});

test.each(['/registro', '/guias/jardin/gastronomia'])('keeps a single main landmark on %s', (path) => {
  renderApp(path);

  expect(document.querySelectorAll('main')).toHaveLength(1);
});

test('labels the guide counter as guides instead of destination experiences', () => {
  renderApp('/');
  const facts = document.querySelector<HTMLElement>('.home-facts');

  expect(facts?.textContent).toMatch(/guías para tu visita/i);
  expect(facts?.textContent).not.toMatch(/experiencias para tu visita/i);
});

test('renders the dark Figma home composition with regional facts and all municipalities', () => {
  renderApp('/');

  expect(document.querySelector('.home-hero--dark')).toBeTruthy();
  expect(document.body.textContent).toMatch(/suroeste antioqueño/i);
  expect(document.body.textContent).toMatch(/22º\s*-\s*28ºC/i);
  expect(document.body.textContent).toMatch(/100\s*-\s*4000\s*m\s*s\.\s*n\.\s*m\./i);
  expect(document.querySelectorAll('.home-destination-card')).toHaveLength(8);
});

test('keeps the Figma region image and facts card in the same composition', () => {
  renderApp('/');

  expect(document.querySelector('.home-region .home-facts')).toBeTruthy();
  expect(document.body.textContent).toMatch(/paisajes cafeteros, sus coloridos pueblos patrimoniales/i);
  expect(document.body.textContent).toMatch(/entre montañas, café y pueblos con alma paisa/i);
  expect(document.body.textContent).toMatch(/municipios del suroeste/i);
});

test('renders the Figma navbar and footer content', () => {
  renderApp('/');

  const header = document.querySelector('.site-header');
  expect(header?.querySelector('a[href="/"]')).toBeTruthy();
  expect(header?.querySelector('a[href="/nosotros"]')).toBeTruthy();
  expect(header?.querySelector('a[href="/destinos"]')).toBeTruthy();
  expect(header?.querySelector('a[href="/registro"]')).toBeTruthy();
  expect(document.querySelector('.site-footer')?.textContent).toMatch(/©\s*2026\s*Paradisse App/i);
});

test('renders the complete Nosotros composition with iconography', () => {
  renderApp('/nosotros');

  expect(document.querySelector('.about-hero__backdrop')?.getAttribute('src')).toBe('/assets/suroeste-landscape.webp');
  expect(document.querySelector('.about-story__image')).toBeTruthy();
  expect(document.querySelector('.about-purpose__grid')).toBeTruthy();
  expect(document.querySelectorAll('.about-differentiators__grid article')).toHaveLength(3);
  expect(document.querySelectorAll('.about-card-icon svg').length).toBeGreaterThanOrEqual(5);
  expect(document.body.textContent).toMatch(/nacimos para que viajar vuelva a sentirse personal/i);
});
