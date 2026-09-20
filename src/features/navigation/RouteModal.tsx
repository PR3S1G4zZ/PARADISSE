import { useEffect, useState } from 'react';
import { FiArrowLeft, FiCheckCircle, FiClock, FiMapPin, FiNavigation, FiRefreshCw, FiVolume2, FiX } from 'react-icons/fi';
import type { CatalogDestination, TravelMode } from '../../shared/types/domain';
import { mapaApi } from '../../shared/lib/api';
import { parseManualOrigin } from '../../shared/lib/route-request';
import { InteractiveMap } from '../map/InteractiveMap';
import { safeNavigationError, useNavegacion } from './NavigationContext';
import './route-modal.css';

type RouteStep = 'transport' | 'confirm' | 'tracking';

interface RouteModalProps {
  open: boolean;
  destination: CatalogDestination;
  onClose: () => void;
}

const statusCopy: Record<string, string> = {
  idle: 'Listo para preparar tu ruta.',
  locating: 'Buscando una ubicación reciente…',
  routing: 'Calculando la ruta…',
  preview: 'Vista previa: el origen fue elegido manualmente.',
  navigating: 'Navegación activa.',
  'confirming-deviation': 'Confirmando un posible desvío…',
  'gps-degraded': 'GPS degradado: mantén el mapa visible mientras recuperamos precisión.',
  recalculating: 'Recalculando por un cambio de recorrido…',
  arrived: 'Has llegado a tu destino.',
  error: 'No se pudo preparar la ruta.',
};

const formatDistance = (distanceM?: number) => {
  if (!Number.isFinite(distanceM)) return '—';
  return distanceM! >= 1000 ? `${(distanceM! / 1000).toFixed(1)} km` : `${Math.round(distanceM!)} m`;
};

const routeWarningCopy: Record<string, string> = {
  'trafico-no-aplicado': 'La ruta en automóvil no incluye información de tráfico en tiempo real.',
  'travel-mode-no-resuelto': 'El proveedor no identificó un perfil específico; se usó el modo solicitado como respaldo.',
};

export function RouteModal({ open, destination, onClose }: RouteModalProps) {
  const navigation = useNavegacion();
  const [step, setStep] = useState<RouteStep>('transport');
  const [selectedMode, setSelectedMode] = useState<TravelMode>('walk');
  const [manualOriginOpen, setManualOriginOpen] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep('transport');
    setSelectedMode('walk');
    setManualOriginOpen(false);
    setManualLat('');
    setManualLng('');
    setLocalError(null);
  }, [destination.slug, open]);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // DestinationPage unmounts the detail map when this modal opens, then
    // tracking mounts a fresh InteractiveMap. Warm the shared token cache so
    // En automóvil does not wait on /api/mapa/token after confirm.
    void mapaApi.token();
  }, [open]);

  if (!open) return null;

  const close = () => {
    navigation.stopRoute();
    onClose();
  };

  const chooseMode = (mode: TravelMode) => {
    setSelectedMode(mode);
    setStep('confirm');
    setLocalError(null);
  };

  const requestRoute = async () => {
    setLocalError(null);
    let manualOrigin;
    if (manualOriginOpen) {
      const parsed = parseManualOrigin(manualLat, manualLng);
      if (!parsed.ok) {
        setLocalError(parsed.error);
        return;
      }
      manualOrigin = parsed.origin;
    }
    try {
      await navigation.startRoute(destination, selectedMode, manualOrigin);
      setStep('tracking');
    } catch (error) {
      setLocalError(safeNavigationError(error));
    }
  };

  return (
    <div className="route-modal" role="dialog" aria-modal="true" aria-labelledby="route-modal-title">
      <div className="route-modal__backdrop" aria-hidden="true" />
      <section className="route-modal__panel">
        <header className="route-modal__header">
          <div>
            <p className="route-modal__eyebrow">Navegación PARADISSE</p>
            <h2 id="route-modal-title">Cómo llegar a {destination.name}</h2>
          </div>
          <button className="route-modal__close" type="button" onClick={close} aria-label="Cerrar navegación">
            <FiX aria-hidden="true" />
          </button>
        </header>

        {step === 'transport' && (
          <div className="route-modal__body">
            <p className="route-modal__lead">Elige cómo quieres llegar a tu punto de llegada.</p>
            <div className="route-modal__transport-options">
              <button className="route-modal__transport" data-route-mode="walk" type="button" onClick={() => chooseMode('walk')}>
                <FiNavigation aria-hidden="true" />
                <span><strong>A pie</strong><small>Una ruta pensada para caminar.</small></span>
              </button>
              <button className="route-modal__transport" data-route-mode="car" type="button" onClick={() => chooseMode('car')}>
                <FiNavigation aria-hidden="true" />
                <span><strong>En automóvil</strong><small>Consulta el recorrido por carretera.</small></span>
              </button>
            </div>
            <div className="route-modal__destination-note">
              <FiMapPin aria-hidden="true" />
              <span>{destination.location.arrivalLabel}{destination.location.address ? ` · ${destination.location.address}` : ''}</span>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="route-modal__body">
            <button className="route-modal__back" type="button" onClick={() => setStep('transport')}>
              <FiArrowLeft aria-hidden="true" /> Cambiar transporte
            </button>
            <p className="route-modal__lead">Confirma tu punto de partida</p>
            <div className="route-modal__gps-status" role="status">
              <FiNavigation aria-hidden="true" />
              <span>
                <strong>{navigation.gpsConfiable ? 'Ubicación lista' : 'Necesitamos tu ubicación'}</strong>
                <small>{navigation.gpsError ?? 'Usaremos GPS de alta precisión para seguir tu avance.'}</small>
              </span>
            </div>
            {!manualOriginOpen ? (
              <button className="route-modal__secondary" type="button" onClick={() => setManualOriginOpen(true)}>
                Usar un origen manual para vista previa
              </button>
            ) : (
              <div className="route-modal__manual-origin">
                <label>Latitud<input data-manual-origin="lat" inputMode="decimal" value={manualLat} onChange={(event) => setManualLat(event.target.value)} placeholder="6.170000" /></label>
                <label>Longitud<input data-manual-origin="lng" inputMode="decimal" value={manualLng} onChange={(event) => setManualLng(event.target.value)} placeholder="-75.610000" /></label>
                <small>La vista previa manual no activa seguimiento GPS ni recálculo.</small>
              </div>
            )}
            {(localError || navigation.error) && <p className="route-modal__error" role="alert">{localError ?? navigation.error}</p>}
            <button className="route-modal__primary" data-route-action="request-route" type="button" onClick={() => void requestRoute()}>
              <FiNavigation aria-hidden="true" /> Calcular ruta {selectedMode === 'walk' ? 'a pie' : 'en automóvil'}
            </button>
          </div>
        )}

        {step === 'tracking' && (
          <div className="route-modal__tracking">
            <div className="route-modal__tracking-status" role="status">
              <span className={`route-modal__status-dot route-modal__status-dot--${navigation.status}`} aria-hidden="true" />
              <span>{statusCopy[navigation.status] ?? navigation.status}</span>
            </div>
            <InteractiveMap
              destinations={[destination]}
              focusedDestination={destination}
              mode="navigation"
              routeGeometry={navigation.route?.puntos}
              showRoute
              userPosition={navigation.frame?.displayPosition ?? navigation.position}
            />
            <div className="route-modal__summary">
              <div><FiMapPin aria-hidden="true" /><span>Destino<strong>{destination.name}</strong></span></div>
              <div><FiNavigation aria-hidden="true" /><span>Recorrido<strong>{formatDistance(navigation.progress?.remainingM)}</strong></span></div>
              <div><FiClock aria-hidden="true" /><span>Tiempo<strong>{navigation.route ? `${Math.round(navigation.route.duracionMin)} min` : '—'}</strong></span></div>
            </div>
            <p className={`route-modal__gps-quality route-modal__gps-quality--${navigation.gpsQuality}`} role="status">
              {navigation.status === 'preview'
                ? 'Vista previa manual: no se está usando GPS en vivo.'
                : navigation.gpsQuality === 'confiable'
                  ? navigation.frame?.positionSource === 'held'
                    ? `GPS estable · marcador estabilizado para evitar un salto (±${Math.round(navigation.position?.accuracy ?? 0)} m)`
                    : `GPS estable · Precisión estimada: ±${Math.round(navigation.position?.accuracy ?? 0)} m`
                  : navigation.gpsQuality === 'degradada'
                    ? `GPS degradado · conservamos temporalmente la última posición válida${navigation.gpsDiagnostics.positionAgeMs != null ? ` (${Math.round(navigation.gpsDiagnostics.positionAgeMs / 1000)} s)` : ''}.`
                    : 'Sin una señal GPS reciente; la ruta continúa en modo seguro hasta recuperar ubicación.'}
            </p>
            {navigation.instruction && <p className="route-modal__instruction"><strong>Siguiente indicación</strong>{navigation.instruction}</p>}
            {navigation.route?.ajustesParadas?.aviso && (
              <p className="route-modal__route-adjustment" role="status">{navigation.route.ajustesParadas.aviso}</p>
            )}
            {navigation.route?.advertencias.some((warning) => routeWarningCopy[warning]) && (
              <ul className="route-modal__route-warnings" aria-label="Advertencias de la ruta">
                {navigation.route.advertencias.filter((warning) => routeWarningCopy[warning]).map((warning) => (
                  <li key={warning}>{routeWarningCopy[warning]}</li>
                ))}
              </ul>
            )}
            {navigation.wakeLock.status === 'active' && <p className="route-modal__wake-lock" role="status">Pantalla activa durante la navegación.</p>}
            {['unsupported', 'error', 'released'].includes(navigation.wakeLock.status) && (
              <p className="route-modal__wake-lock route-modal__wake-lock--warning" role="status">
                La navegación continúa, pero el navegador no puede mantener la pantalla activa.
              </p>
            )}
            {navigation.route && <p className="route-modal__provider">Ruta resuelta por {navigation.route.fuente === 'arcgis' ? 'ArcGIS' : 'OSRM (respaldo explícito)'}</p>}
            <div className="route-modal__actions">
              <button className="route-modal__secondary" type="button" onClick={() => navigation.setVoiceActive(!navigation.voiceActive)}>
                <FiVolume2 aria-hidden="true" /> Voz {navigation.voiceActive ? 'activa' : 'apagada'}
              </button>
              <button className="route-modal__secondary" type="button" onClick={() => void navigation.recalculateNow()}>
                <FiRefreshCw aria-hidden="true" /> Recalcular
              </button>
              <button className="route-modal__primary" type="button" onClick={close}>
                <FiCheckCircle aria-hidden="true" /> Terminar
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
