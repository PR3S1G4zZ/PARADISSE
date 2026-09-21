import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../features/auth/AuthProvider';
import { SiteHeader } from './SiteHeader';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderHeader(session: { id: string; name: string; email: string } | null = null) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <AuthProvider initialSession={session}>
          <SiteHeader />
        </AuthProvider>
      </MemoryRouter>,
    );
  });

  return { container, root };
}

afterEach(() => {
  document.body.replaceChildren();
});

test('shows login links when there is no session', () => {
  const { container, root } = renderHeader(null);
  expect(container.querySelector('a[href="/iniciar-sesion"]')?.textContent).toMatch(/iniciar sesión/i);
  expect(container.querySelector('a[href="/registro"]')?.textContent).toMatch(/regístrate/i);
  act(() => root.unmount());
});

test('shows the logged-in name and a logout control', () => {
  const { container, root } = renderHeader({
    id: 'user-1',
    name: 'Ana Pérez',
    email: 'ana@example.com',
  });

  expect(container.textContent).toMatch(/Ana Pérez/);
  expect(container.querySelector('button.site-header__logout')?.textContent).toMatch(/cerrar sesión/i);
  expect(container.querySelector('a[href="/iniciar-sesion"]')).toBeNull();
  act(() => root.unmount());
});
