import { NavLink } from 'react-router-dom';

export function SiteHeader() {
  return (
    <header>
      <a href="/" aria-label="PARADISSE, inicio">
        PARADISSE
      </a>
      <nav aria-label="Principal">
        <NavLink to="/">Inicio</NavLink>
        <NavLink to="/nosotros">Nosotros</NavLink>
        <NavLink to="/destinos">Destinos</NavLink>
        <NavLink to="/registro">Regístrate</NavLink>
      </nav>
    </header>
  );
}
