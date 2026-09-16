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

test('shows reservation context without exposing checkout controls before authentication', () => {
  const { container, root } = renderCheckout();
  const guestCard = container.querySelector('.checkout-card--guest');
  const guestHeader = container.querySelector('.checkout-card--guest .checkout-header');
  const planSummary = container.querySelector('[aria-label="Resumen de tu selección"]');
  const localNote = container.querySelector('.checkout-guest-note');

  expect(guestCard).toBeTruthy();
  expect(guestHeader?.querySelector('h1')?.textContent).toMatch(/inicia sesión para confirmar tu visita/i);
  expect(planSummary?.textContent).toMatch(/tu selección/i);
  expect(planSummary?.textContent).toMatch(/aún no has agregado experiencias/i);
  expect(localNote?.textContent).toMatch(/guardaremos tu selección/i);
  expect(container.querySelector('form')).toBeNull();
  expect(container.querySelector('input[name="payment-method"]')).toBeNull();

  act(() => root.unmount());
});

test('shows the number of selected experiences before asking for authentication', () => {
  const storage = createStorageAdapter();
  createPlanService(storage).addExperience('jardin-cafe');

  const { container, root } = renderCheckout();
  const planSummary = container.querySelector('[aria-label="Resumen de tu selección"]');

  expect(planSummary?.textContent).toMatch(/1 experiencia seleccionada/i);

  act(() => root.unmount());
});

test('shows selected Itagui sites as part of the local visit plan', () => {
  const storage = createStorageAdapter();
  createPlanService(storage).addSite('sena-calatrava');

  const { container, root } = renderCheckout();
  const planSummary = container.querySelector('[aria-label="Resumen de tu selección"]');

  expect(planSummary?.textContent).toMatch(/sena de calatrava/i);
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
  const transfer = container.querySelector<HTMLInputElement>('input[name="payment-method"][value="transferencia"]');
  const card = container.querySelector<HTMLInputElement>('input[name="payment-method"][value="tarjeta"]');
  const name = container.querySelector<HTMLInputElement>('input[name="name"]');
  const email = container.querySelector<HTMLInputElement>('input[name="email"]');
  const phone = container.querySelector<HTMLInputElement>('input[name="phone"]');

  expect(status?.textContent).toMatch(/transferencia/i);
  expect(transfer?.checked).toBe(true);
  expect(card?.checked).toBe(false);
  expect(name?.value).toBe('Ana Pérez');
  expect(email?.value).toBe('ana@example.com');
  expect(phone?.value).toBe('3001234567');
  expect(name?.getAttribute('autocomplete')).toBe('name');
  expect(email?.getAttribute('autocomplete')).toBe('email');
  expect(phone?.getAttribute('autocomplete')).toBe('tel');
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
