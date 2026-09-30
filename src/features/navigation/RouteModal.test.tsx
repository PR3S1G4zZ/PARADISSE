import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { getDestination } from '../destinations/destination-service';
import { NavegacionProvider } from './NavigationContext';
import { RouteModal } from './RouteModal';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderModal() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const destination = getDestination('sena-calatrava')!;

  act(() => {
    root.render(
      <MemoryRouter>
        <NavegacionProvider>
          <RouteModal open destination={destination} onClose={() => root.unmount()} />
        </NavegacionProvider>
      </MemoryRouter>,
    );
  });

  return { container, root };
}

afterEach(() => document.body.replaceChildren());

test('starts with transport selection for the selected destination', () => {
  const { container, root } = renderModal();

  expect(container.querySelector('[role="dialog"]')).toBeTruthy();
  expect(container.textContent).toMatch(/cómo llegar a sena de calatrava/i);
  expect(container.querySelector('[data-route-mode="walk"]')).toBeTruthy();
  expect(container.querySelector('[data-route-mode="car"]')).toBeTruthy();

  act(() => root.unmount());
});

test('moves from transport selection to origin confirmation', () => {
  const { container, root } = renderModal();
  const walk = container.querySelector<HTMLButtonElement>('[data-route-mode="walk"]');

  act(() => walk!.click());

  expect(container.textContent).toMatch(/confirma tu punto de partida/i);
  expect(container.querySelector('[data-route-action="request-route"]')).toBeTruthy();

  act(() => root.unmount());
});
