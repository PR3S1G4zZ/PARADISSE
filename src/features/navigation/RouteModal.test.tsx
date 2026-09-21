import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { mapaApi, resetBasemapTokenCache } from '../../shared/lib/api';
import { getDestination } from '../destinations/destination-service';
import { flushLazyInteractiveMap } from '../map/flush-lazy-map';
import { NavegacionProvider } from './NavigationContext';
import { RouteModal } from './RouteModal';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const routeResponse = {
  fuente: 'arcgis' as const,
  fallbackAplicado: false,
  motivo: null,
  travelModeSolicitado: 'car' as const,
  travelModeUtilizado: 'Driving Time',
  puntos: [[6.17, -75.61] as [number, number], [6.1723858, -75.609416] as [number, number]],
  pasos: [{ texto: 'Continúa por la vía principal', distanciaM: 400, duracionMin: 2 }],
  distanciaM: 400,
  duracionMin: 2,
  advertencias: [],
};

function renderModal(slug = 'sena-calatrava') {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const destination = getDestination(slug)!;

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

function setInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function openCarManualOrigin(container: HTMLElement) {
  act(() => {
    container.querySelector<HTMLButtonElement>('[data-route-mode="car"]')!.click();
  });
  act(() => {
    Array.from(container.querySelectorAll('button'))
      .find((button) => /origen manual/i.test(button.textContent ?? ''))!
      .click();
  });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify(routeResponse), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }))));
});

afterEach(() => {
  resetBasemapTokenCache();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

test('starts with transport selection for the selected destination', () => {
  const { container, root } = renderModal();

  expect(container.querySelector('[role="dialog"]')).toBeTruthy();
  expect(container.textContent).toMatch(/cómo llegar a sena de calatrava/i);
  expect(container.querySelector('[data-route-mode="walk"]')).toBeTruthy();
  expect(container.querySelector('[data-route-mode="car"]')).toBeTruthy();

  act(() => root.unmount());
});

test('prefetches the basemap token when the route modal opens', () => {
  const token = vi.spyOn(mapaApi, 'token').mockResolvedValue({
    token: 'public-key',
    proveedor: 'arcgis',
    motivo: null,
  });

  const { root } = renderModal();

  expect(token).toHaveBeenCalled();
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

test('does not send Null Island when the manual origin placeholders are left empty', async () => {
  const { container, root } = renderModal('parque-principal-itagui');
  openCarManualOrigin(container);

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-route-action="request-route"]')!.click();
    await Promise.resolve();
  });

  const resolverCalls = vi.mocked(fetch).mock.calls.filter(([url, init]) => (
    String(url).includes('/api/rutas/resolver') && (init as RequestInit | undefined)?.method === 'POST'
  ));
  expect(resolverCalls).toHaveLength(0);
  expect(container.textContent).toMatch(/escribe una latitud y longitud válidas/i);
  expect(container.textContent).not.toMatch(/vista previa: el origen fue elegido manualmente/i);
  act(() => root.unmount());
});

test('resolves a car preview from the QA manual origin against the API contract', async () => {
  const { container, root } = renderModal('parque-principal-itagui');
  openCarManualOrigin(container);

  act(() => {
    setInputValue(container.querySelector<HTMLInputElement>('[data-manual-origin="lat"]')!, '6.170000');
    setInputValue(container.querySelector<HTMLInputElement>('[data-manual-origin="lng"]')!, '-75.610000');
  });

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-route-action="request-route"]')!.click();
    await Promise.resolve();
  });

  const resolverCall = vi.mocked(fetch).mock.calls.find(([url, init]) => (
    String(url).includes('/api/rutas/resolver') && init?.method === 'POST'
  ));
  expect(resolverCall).toBeTruthy();
  expect(JSON.parse(String(resolverCall?.[1]?.body))).toEqual({
    origen: { lat: 6.17, lng: -75.61 },
    destino: { lat: 6.1723858, lng: -75.609416 },
    modo: 'car',
    nombreDestino: 'Parque Principal de Itagüí',
  });
  await act(async () => {
    await flushLazyInteractiveMap();
  });

  expect(container.textContent).toMatch(/vista previa: el origen fue elegido manualmente/i);
  expect(container.textContent).toMatch(/ruta resuelta por arcgis/i);
  expect(container.querySelector('[data-map-mode="navigation"]')).toBeTruthy();
  act(() => root.unmount());
});

test('maps a 502 from resolver using the thrown error, not a stale empty state', async () => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({
    error: 'No fue posible resolver la ruta.',
  }), { status: 502, headers: { 'Content-Type': 'application/json' } }))));
  const { container, root } = renderModal('parque-principal-itagui');
  openCarManualOrigin(container);

  act(() => {
    setInputValue(container.querySelector<HTMLInputElement>('[data-manual-origin="lat"]')!, '0');
    setInputValue(container.querySelector<HTMLInputElement>('[data-manual-origin="lng"]')!, '0');
  });

  await act(async () => {
    container.querySelector<HTMLButtonElement>('[data-route-action="request-route"]')!.click();
    await Promise.resolve();
  });

  expect(container.textContent).toMatch(/ruta no disponible en este momento/i);
  expect(container.textContent).not.toMatch(/no se pudo calcular la ruta/i);
  act(() => root.unmount());
});
