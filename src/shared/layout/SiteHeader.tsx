import { Link, NavLink } from 'react-router-dom';
import './shell.css';

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-header__brand" to="/" aria-label="PARADISSE, inicio">
          <img src="/assets/figma-paradisse-logo.webp" alt="PARADISSE APP" />
          <span className="sr-only">PARADISSE</span>
        </Link>
        <nav className="site-header__nav" aria-label="Principal">
          <NavLink end to="/">Inicio</NavLink>
          <NavLink to="/nosotros">Nosotros</NavLink>
          <NavLink to="/destinos">Destinos</NavLink>
          <NavLink to="/registro">Regístrate</NavLink>
          <NavLink className="site-header__login" to="/iniciar-sesion">Iniciar sesión</NavLink>
        </nav>
      </div>
    </header>
  );
}
