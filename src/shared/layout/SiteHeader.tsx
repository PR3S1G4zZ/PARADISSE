import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthProvider';
import './shell.css';

export function SiteHeader() {
  const { session, signOut } = useAuth();

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
          {session ? (
            <span className="site-header__session">
              <span className="site-header__user">{session.name}</span>
              <button className="site-header__logout" type="button" onClick={() => void signOut()}>
                Cerrar sesión
              </button>
            </span>
          ) : (
            <>
              <NavLink to="/registro">Regístrate</NavLink>
              <NavLink className="site-header__login" to="/iniciar-sesion">Iniciar sesión</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
