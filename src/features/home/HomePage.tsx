import { Link } from 'react-router-dom';
import { guides } from '../../data/guides';
import { municipalities } from '../../data/municipalities';
import './home.css';

const featuredMunicipalities = municipalities.slice(0, 3);

export function HomePage() {
  return (
    <article className="home-page">
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__content">
          <img className="home-hero__logo" src="/assets/paradisse-logo.png" alt="PARADISSE" />
          <p className="home-eyebrow">Suroeste antioqueño</p>
          <h1 id="home-title">Donde cada viaje es una aventura</h1>
          <p>
            Camina despacio entre montañas, cafetales y pueblos que guardan historias para compartir.
          </p>
          <Link className="home-button" to="/destinos">Explorar destinos</Link>
        </div>
        <img
          className="home-hero__image"
          src="/assets/suroeste-landscape.png"
          alt="Paisaje del Suroeste Antioqueño"
        />
      </section>

      <section className="home-introduction" aria-labelledby="home-region-title">
        <p className="home-eyebrow">Una región para volver</p>
        <h2 id="home-region-title">El Suroeste Antioqueño se vive a tu ritmo</h2>
        <p>
          Entre plazas coloridas, caminos de arriería y fincas cafeteras, PARADISSE conecta cada visita
          con experiencias cuidadas por quienes conocen el territorio.
        </p>
      </section>

      <section className="home-facts" aria-label="Datos de la región">
        <article><strong>{municipalities.length}</strong><span>municipios para descubrir</span></article>
        <article><strong>{guides.length}</strong><span>experiencias para tu visita</span></article>
        <article><strong>1</strong><span>ruta hecha a tu medida</span></article>
      </section>

      <section className="home-destinations" aria-labelledby="home-destinations-title">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">Empieza por aquí</p>
            <h2 id="home-destinations-title">Municipios que dejan huella</h2>
          </div>
          <Link to="/destinos">Ver todos los destinos</Link>
        </div>
        <div className="home-destination-grid">
          {featuredMunicipalities.map((municipality) => (
            <article className="home-destination-card" key={municipality.slug}>
              <img src={municipality.imageUrl} alt={`Paisaje de ${municipality.name}`} />
              <div>
                <h3>{municipality.name}</h3>
                <p>{municipality.description}</p>
                <Link to={`/destinos/${municipality.slug}`}>Conocer {municipality.name}</Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-map" aria-labelledby="home-map-title">
        <div className="home-map__content">
          <p className="home-eyebrow">Traza tu propia ruta</p>
          <h2 id="home-map-title">Un mapa para imaginar el próximo desvío</h2>
          <p>Ubica los municipios y deja que una conversación, un aroma o un paisaje marque el siguiente destino.</p>
          <Link className="home-text-link" to="/destinos">Explorar el Suroeste</Link>
        </div>
        <div className="home-map__visual">
          <img src="/assets/suroeste-map.png" alt="Mapa ilustrado de municipios del Suroeste Antioqueño" />
          <nav className="home-map__controls" aria-label="Municipios en el mapa">
            <ul>
              {municipalities.map((municipality) => (
                <li key={municipality.slug}>
                  <Link to={`/destinos/${municipality.slug}`}>Ver {municipality.name} en el mapa</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <section className="home-cta" aria-labelledby="home-cta-title">
        <img src="/assets/paradisse-footer.png" alt="" />
        <div>
          <p className="home-eyebrow">Tu plan comienza hoy</p>
          <h2 id="home-cta-title">Vuelve a lo esencial: viajar, descubrir, recordar.</h2>
          <Link className="home-button home-button--light" to="/registro">Crear mi plan de visita</Link>
        </div>
      </section>
    </article>
  );
}
