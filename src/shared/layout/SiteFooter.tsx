import './shell.css';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__backdrop" aria-hidden="true" />
      <div className="site-footer__shade" aria-hidden="true" />
      <div className="site-footer__inner">
        <p className="site-footer__quote">
          <span>El Suroeste no se visita una vez…</span>
          <em>Se vuelve un destino al que siempre quieres regresar.</em>
        </p>
        <small>© 2026 Paradisse App. Todos los derechos reservados. El contenido de esta aplicación está protegido por derechos de autor.</small>
      </div>
    </footer>
  );
}
