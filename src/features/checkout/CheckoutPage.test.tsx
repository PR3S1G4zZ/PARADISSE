import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { createStorageAdapter } from '../../shared/lib/storage';
import { createAuthService } from '../auth/auth-service';
import { createPlanService } from '../visit-plan/plan-service';
import { createCheckoutService } from './checkout-service';
import { CheckoutPage } from './CheckoutPage';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderCheckout() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(<MemoryRouter><CheckoutPage /></MemoryRouter>);
  });

  return { container, root };
}

function registerSession() {
  createAuthService(createStorageAdapter()).registerLocal({
    name: 'Ana',
    email: 'ana@example.com',
    password: 'secreto1',
  });
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

afterEach(() => {
  localStorage.clear();
  document.body.replaceChildren();
});

test('offers separate registration and login routes when there is no session', () => {
  const { container, root } = renderCheckout();
  const hrefs = Array.from(container.querySelectorAll<HTMLAnchorElement>('a')).map((link) => link.getAttribute('href'));

  expect(hrefs).toContain('/registro');
  expect(hrefs).toContain('/iniciar-sesion');
  act(() => root.unmount());
});

test('rehydrates a persisted local confirmation when checkout mounts again', () => {
  registerSession();
  const storage = createStorageAdapter();
  createPlanService(storage).addExperience('jardin-cafe');
  createCheckoutService(storage).confirmLocalCheckout('transferencia', {
    name: 'Ana Pérez',
    email: 'ana@example.com',
    phone: '3001234567',
  });

  const { container, root } = renderCheckout();
  const status = container.querySelector<HTMLElement>('[role="status"]');

  expect(status?.textContent).toMatch(/transferencia/i);
  act(() => root.unmount());
});

test('persists the contact entered with the local confirmation', async () => {
  registerSession();
  const { container, root } = renderCheckout();
  const phone = container.querySelector<HTMLInputElement>('input[name="phone"]');
  const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]');

  expect(phone).toBeTruthy();
  expect(submit).toBeTruthy();

  await act(async () => {
    setInputValue(phone!, '3001234567');
    submit!.click();
  });

  const persisted = JSON.parse(localStorage.getItem('paradisse.checkout.confirmation') ?? '{}');
  expect(persisted.contact).toEqual({ name: 'Ana', email: 'ana@example.com', phone: '3001234567' });
  act(() => root.unmount());
});
