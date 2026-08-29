import { Link, NavLink } from 'react-router-dom';

export function SiteHeader() {
  return (
    <header>
      <Link to="/" aria-label="PARADISSE, inicio">
        PARADISSE
      </Link>
      <nav aria-label="Principal">
        <NavLink end to="/">Inicio</NavLink>
        <NavLink to="/nosotros">Nosotros</NavLink>
        <NavLink to="/destinos">Destinos</NavLink>
        <NavLink to="/registro">Regístrate</NavLink>
        <NavLink to="/iniciar-sesion">Iniciar sesión</NavLink>
      </nav>
    </header>
  );
}
