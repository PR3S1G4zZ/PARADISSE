import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, vi } from 'vitest';
import { AuthPage } from './AuthPage';
import { AuthProvider } from './AuthProvider';
import { createStorageAdapter } from '../../shared/lib/storage';
import { LEGACY_SESSION_KEY, LEGACY_USERS_KEY } from './auth-service';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockAuthFetch(handlers: {
  me?: unknown;
  register?: unknown;
  login?: unknown;
} = {}) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? 'GET';
    if (url.includes('/api/auth/me')) return jsonResponse(handlers.me ?? { error: 'No autenticado.' }, handlers.me ? 200 : 401);
    if (url.includes('/api/auth/register') && method === 'POST') {
      return jsonResponse(handlers.register ?? { id: 'user-1', name: 'Ana', email: 'ana@example.com' }, 201);
    }
    if (url.includes('/api/auth/login') && method === 'POST') {
      return jsonResponse(handlers.login ?? { error: 'Correo o contraseña incorrectos.' }, handlers.login ? 200 : 401);
    }
    return jsonResponse({}, 404);
  }));
}

function renderAuthPage(mode: 'register' | 'login' = 'register') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <AuthProvider>
          <AuthPage mode={mode} />
        </AuthProvider>
      </MemoryRouter>,
    );
  });

  return { container, root };
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

beforeEach(() => {
  mockAuthFetch();
});

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

test('guides registration with password requirements and a link to sign in', () => {
  const { container, root } = renderAuthPage();

  expect(container.querySelector('button[aria-controls="auth-password"]')).toBeTruthy();
  expect(container.querySelector('button[aria-controls="auth-confirmation"]')).toBeTruthy();
  expect(container.textContent).toMatch(/mínimo 8 caracteres/i);
  expect(container.querySelector('a[href="/iniciar-sesion"]')?.textContent).toMatch(/inicia sesión/i);

  root.unmount();
});

test('lets users reveal and hide the login password without changing its value', () => {
  const { container, root } = renderAuthPage('login');
  const password = container.querySelector<HTMLInputElement>('#auth-password');
  const toggle = container.querySelector<HTMLButtonElement>('button[aria-controls="auth-password"]');

  expect(password?.type).toBe('password');
  expect(toggle).toBeTruthy();

  act(() => toggle!.click());
  expect(password?.type).toBe('text');
  expect(toggle?.getAttribute('aria-label')).toMatch(/ocultar/i);

  act(() => toggle!.click());
  expect(password?.type).toBe('password');
  expect(toggle?.getAttribute('aria-label')).toMatch(/mostrar/i);

  root.unmount();
});

test('offers registration from the login form and omits registration-only fields', () => {
  const { container, root } = renderAuthPage('login');

  expect(container.querySelector('#auth-name')).toBeNull();
  expect(container.querySelector('#auth-confirmation')).toBeNull();
  expect(container.querySelector('a[href="/registro"]')?.textContent).toMatch(/crear una cuenta/i);
  expect(container.textContent).toMatch(/sesión se guarda de forma segura/i);

  root.unmount();
});

test('prevents registration with an invalid email', async () => {
  const { container, root } = renderAuthPage();
  const email = container.querySelector<HTMLInputElement>('#auth-email');
  const submit = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
    .find((button) => /crear cuenta/i.test(button.textContent ?? ''));

  expect(email).toBeTruthy();
  expect(submit).toBeTruthy();

  await act(async () => {
    setInputValue(email!, 'invalido');
    submit!.click();
  });

  expect(container.textContent).toMatch(/correo válido/i);
  root.unmount();
});

test('registers through the API with credentials included', async () => {
  const { container, root } = renderAuthPage();

  await act(async () => {
    setInputValue(container.querySelector('#auth-name')!, 'Ana');
    setInputValue(container.querySelector('#auth-email')!, 'ana@example.com');
    setInputValue(container.querySelector('#auth-password')!, 'Viaje2026');
    setInputValue(container.querySelector('#auth-confirmation')!, 'Viaje2026');
    Array.from(container.querySelectorAll('button')).find((button) => /crear cuenta/i.test(button.textContent ?? ''))!.click();
  });

  const registerCall = vi.mocked(fetch).mock.calls.find(([url]) => String(url).includes('/api/auth/register'));
  expect(registerCall).toBeTruthy();
  expect(registerCall?.[1]?.credentials).toBe('include');
  expect(JSON.parse(String(registerCall?.[1]?.body))).toEqual({
    name: 'Ana',
    email: 'ana@example.com',
    password: 'Viaje2026',
  });
  root.unmount();
});

test('wipes local auth keys and shows a short migration note', () => {
  localStorage.setItem(LEGACY_USERS_KEY, JSON.stringify([{ email: 'ana@example.com', password: 'secreto1' }]));
  localStorage.setItem(LEGACY_SESSION_KEY, JSON.stringify({ id: 'local', name: 'Ana' }));

  const { container, root } = renderAuthPage();

  expect(createStorageAdapter().get(LEGACY_USERS_KEY, null)).toBeNull();
  expect(createStorageAdapter().get(LEGACY_SESSION_KEY, null)).toBeNull();
  expect(container.textContent).toMatch(/cuentas guardadas solo en este dispositivo/i);
  root.unmount();
});
