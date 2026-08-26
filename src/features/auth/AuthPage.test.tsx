import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { AuthPage } from './AuthPage';

function renderAuthPage() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <MemoryRouter>
        <AuthPage mode="register" />
      </MemoryRouter>,
    );
  });

  return { container, root };
}

afterEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

test('prevents registration with an invalid email', async () => {
  const { container, root } = renderAuthPage();
  const email = container.querySelector<HTMLInputElement>('#auth-email');
  const submit = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
    .find((button) => /crear cuenta/i.test(button.textContent ?? ''));

  expect(email).toBeTruthy();
  expect(submit).toBeTruthy();

  await act(async () => {
    email!.value = 'invalido';
    email!.dispatchEvent(new Event('input', { bubbles: true }));
    submit!.click();
  });

  expect(container.textContent).toMatch(/correo válido/i);
  root.unmount();
});
