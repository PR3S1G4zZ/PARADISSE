import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthPage } from './AuthPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderAuthPage(mode: 'register' | 'login' = 'register') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <AuthPage mode={mode} />
      </MemoryRouter>,
    );
  });

  return { container, root };
}

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
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
  expect(container.textContent).toMatch(/sesión local en este dispositivo/i);

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
    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    nativeValueSetter?.call(email, 'invalido');
    email!.dispatchEvent(new Event('input', { bubbles: true }));
    submit!.click();
  });

  expect(container.textContent).toMatch(/correo válido/i);
  root.unmount();
});
