import { Component, Fragment, type ErrorInfo, type ReactNode } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import type { InteractiveMapMode } from './map-types';

export interface MapErrorBoundaryProps {
  children: ReactNode;
  mode?: InteractiveMapMode;
  className?: string;
  onRetry?: () => void;
}

interface MapErrorBoundaryState {
  error: Error | null;
  resetKey: number;
}

export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Pick<MapErrorBoundaryState, 'error'> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PARADISSE map crashed', error, info);
  }

  private retry = () => {
    this.setState((current) => ({ error: null, resetKey: current.resetKey + 1 }));
    this.props.onRetry?.();
  };

  render() {
    const { mode = 'overview', className = '', children } = this.props;

    if (this.state.error) {
      return (
        <div
          className={`interactive-map interactive-map--${mode} interactive-map--error ${className}`.trim()}
          data-map-mode={mode}
          data-map-error="true"
          role="alert"
        >
          <div className="interactive-map__fallback">
            <div className="interactive-map__fallback-copy">
              <strong>El mapa no se pudo mostrar</strong>
              <span>Si el visor 3D o WebGL falla, reintenta o usa OpenStreetMap.</span>
            </div>
            <button
              type="button"
              className="interactive-map__retry"
              data-map-action="retry"
              onClick={this.retry}
            >
              <FiRefreshCw aria-hidden="true" /> Reintentar mapa
            </button>
          </div>
        </div>
      );
    }

    return <Fragment key={this.state.resetKey}>{children}</Fragment>;
  }
}
