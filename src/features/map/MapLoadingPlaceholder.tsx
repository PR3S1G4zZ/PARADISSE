import { FiNavigation } from 'react-icons/fi';
import type { InteractiveMapMode } from './map-types';

interface MapLoadingPlaceholderProps {
  mode: InteractiveMapMode;
  className?: string;
}

export function MapLoadingPlaceholder({ mode, className = '' }: MapLoadingPlaceholderProps) {
  return (
    <div
      className={`interactive-map interactive-map--${mode} interactive-map--loading ${className}`.trim()}
      data-map-mode={mode}
      data-map-state="loading"
      role="status"
      aria-busy="true"
      aria-label="Cargando mapa"
    >
      <div className="interactive-map__fallback">
        <div className="interactive-map__fallback-surface" aria-hidden="true">
          <FiNavigation />
        </div>
        <div className="interactive-map__fallback-copy">
          <strong>Cargando mapa…</strong>
          <span>Preparando el visor interactivo.</span>
        </div>
      </div>
    </div>
  );
}
