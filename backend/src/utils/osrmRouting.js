import { config } from '../config.js';

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';

const assertResponse = async (response) => {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.code !== 'Ok') {
    throw new Error(`OSRM HTTP ${response.status || 502}`);
  }
  return body;
};

const stepText = (step) => {
  const type = step.maneuver?.type;
  const modifier = step.maneuver?.modifier;
  if (type === 'arrive') return 'Has llegado a tu destino.';
  if (type === 'depart') return 'Inicia el recorrido.';
  if (type === 'roundabout') return 'Toma la glorieta.';
  if (modifier) return `Gira ${modifier}.`;
  if (type) return `Continúa por la vía (${type}).`;
  return step.name ? `Continúa por ${step.name}.` : 'Continúa por la ruta.';
};

export async function resolveOsrmRoute({ origen, destino, modo }) {
  const profile = modo === 'car' ? 'driving' : 'foot';
  const coordinates = `${origen.lng},${origen.lat};${destino.lng},${destino.lat}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.routingTimeoutMs);
  try {
    const response = await fetch(`${OSRM_BASE_URL}/${profile}/${coordinates}?overview=full&geometries=geojson&steps=true`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const body = await assertResponse(response);
    const route = body.routes?.[0];
    if (!route?.geometry?.coordinates?.length) throw new Error('OSRM route geometry missing');
    const steps = (route.legs ?? []).flatMap((leg) => leg.steps ?? []).map((step) => ({
      texto: stepText(step),
      distanciaM: Number(step.distance) || 0,
      duracionMin: (Number(step.duration) || 0) / 60,
      maniobra: step.maneuver?.type || '',
    }));
    return {
      puntos: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
      pasos: steps,
      distanciaM: Number(route.distance) || 0,
      duracionMin: (Number(route.duration) || 0) / 60,
      travelModeUtilizado: profile,
      traficoSolicitado: false,
      traficoAplicado: false,
      degradacionTrafico: null,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export { OSRM_BASE_URL };
