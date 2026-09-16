import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiArrowUpRight, FiCalendar, FiCamera, FiCloud, FiCompass, FiInfo, FiMapPin, FiNavigation, FiTrendingUp } from 'react-icons/fi';
import { guides } from '../../data/guides';
import { featuredSites } from '../../data/featured-sites';
import { municipalities } from '../../data/municipalities';
import { InteractiveMap } from '../map/InteractiveMap';
import { listDestinations } from '../destinations/destination-service';
import './home.css';

const municipalityImages: Record<string, string> = {
  jardin: '/assets/jardin.webp',
  jerico: '/assets/figma-jerico.webp',
  tamesis: '/assets/figma-fredonia.webp',
  andes: '/assets/figma-andes-card.webp',
  urrao: '/assets/context-152.webp',
  venecia: '/assets/context-153.webp',
  fredonia: '/assets/context-fredonia.webp',
  concordia: '/assets/context-154.webp',
};

const municipalityCardCopy: Record<string, string> = {
  jardin: 'El pueblo de las flores y la tranquilidad.',
  jerico: 'Cuna de cultura, fe y tradición antioqueña.',
  tamesis: 'Tierra de aventura, historia y naturaleza viva.',
  andes: 'Capital cafetera entre montañas del Suroeste.',
  urrao: 'Paisajes de altura, bosque y naturaleza viva.',
  venecia: 'Café, montaña y tradición para desconectar.',
  fredonia: 'Historia y cultura cafetera en cada calle.',
  concordia: 'Cascadas, bosque y vida silvestre.',
};

const featuredMunicipalities = municipalities.slice(0, 8);
const featuredDestinations = [
  ...listDestinations('', 'municipality').slice(0, 8),
  ...featuredSites,
];

function imageForMunicipality(slug: string, fallback: string) {
  return municipalityImages[slug] ?? fallback;
}

export function HomePage() {
  const navigate = useNavigate();

  return (
    <article className="home-page">
      <section className="home-hero home-hero--dark" aria-labelledby="home-title">
        <img
          className="home-hero__backdrop"
          src="/assets/figma-hero-bus.webp"
          alt="Escena de viaje en el Suroeste Antioqueño"
        />
        <div className="home-hero__shade" aria-hidden="true" />
        <div className="home-hero__content">
          <img className="home-hero__logo" src="/assets/figma-paradisse-logo.webp" alt="PARADISSE APP" />
          <h1 id="home-title">Donde cada viaje <strong>es una aventura</strong></h1>
          <p className="home-hero__description">
            Descubre los destinos más increíbles, vive experiencias únicas y deja que cada rincón del mundo te sorprenda.
            <strong>Encuentra el guía perfecto en Paradisse App y descubre cada destino de una forma única.</strong>
          </p>
        </div>
      </section>

      <section className="home-region" id="suroeste" aria-labelledby="home-region-title">
        <div className="home-region__visual">
          <img src="/assets/suroeste-landscape.webp" alt="Montañas del Suroeste Antioqueño" />
          <div className="home-region__overlay" aria-hidden="true" />
          <div className="home-region__label">
            <h2 id="home-region-title">SUROESTE</h2>
            <span>ANTIOQUEÑO</span>
            <p className="home-region__tagline">Entre montañas, café y pueblos con alma paisa.</p>
            <p className="home-region__description">
              Descubre una de las subregiones más encantadoras de Antioquia, donde cada municipio guarda
              naturaleza, tradición y experiencias inolvidables.
            </p>
            <Link className="home-pill home-pill--outline" to="/destinos">
              <FiMapPin aria-hidden="true" /> Explorar municipios <FiArrowRight aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="home-facts home-facts--regional" aria-label="Datos del Suroeste Antioqueño">
          <div className="home-facts__intro">
            <p>
              El Suroeste Antioqueño es reconocido por sus paisajes cafeteros, sus coloridos pueblos
              patrimoniales, sus montañas, cascadas y una cultura profundamente arraigada a las tradiciones paisas.
            </p>
            <span className="home-facts__guide-note">{guides.length} guías para tu visita</span>
          </div>
          <div className="home-facts__grid">
            <article>
              <span className="home-fact__icon" aria-hidden="true"><FiCloud /></span>
              <span>Clima</span>
              <strong>22º - 28ºC</strong>
            </article>
            <article>
              <span className="home-fact__icon" aria-hidden="true"><FiTrendingUp /></span>
              <span>Altitud</span>
              <strong>100 - 4000 m s. n. m.</strong>
            </article>
            <article>
              <span className="home-fact__icon" aria-hidden="true"><FiCamera /></span>
              <span>Atractivos</span>
              <strong>Naturaleza, cultura, aventura y café</strong>
            </article>
            <article>
              <span className="home-fact__icon" aria-hidden="true"><FiCalendar /></span>
              <span>Mejor época</span>
              <strong>Todo el año</strong>
            </article>
          </div>
        </div>
      </section>

      <section className="home-destinations" aria-labelledby="home-destinations-title">
        <div className="home-section-heading">
          <div>
            <p className="home-eyebrow">Destinos</p>
            <h2 id="home-destinations-title">Municipios del Suroeste</h2>
          </div>
          <Link className="home-text-link" to="/destinos">Ver todos los destinos <span aria-hidden="true">→</span></Link>
        </div>
        <div className="home-destination-grid">
          {featuredMunicipalities.map((municipality, index) => (
            <article
              className={`home-destination-card ${index < 4 ? 'home-destination-card--featured' : 'home-destination-card--compact'}`}
              key={municipality.slug}
            >
              <img
                src={imageForMunicipality(municipality.slug, municipality.imageUrl ?? '/assets/suroeste-landscape.webp')}
                alt={`Paisaje de ${municipality.name}`}
              />
              <div className="home-destination-card__shade" aria-hidden="true" />
              <div className="home-destination-card__body">
                <span className="home-destination-card__index">0{index + 1}</span>
                <h3>{municipality.name}</h3>
                <p>{municipalityCardCopy[municipality.slug] ?? municipality.description}</p>
                <Link
                  className={index < 4 ? 'home-destination-card__pin' : undefined}
                  to={`/destinos/${municipality.slug}`}
                  aria-label={index < 4 ? `Ver detalles de ${municipality.name}` : `Planear visita en ${municipality.name}`}
                >
                  {index < 4 ? (
                    <FiMapPin className="home-destination-card__pin-icon" aria-hidden="true" />
                  ) : (
                    <>Planear visita <FiArrowUpRight aria-hidden="true" /></>
                  )}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="home-map" aria-labelledby="home-map-title">
        <div className="home-map__card">
          <div className="home-map__content">
            <h2 id="home-map-title">Explora el Suroeste</h2>
            <p>Selecciona un municipio en el mapa y descubre qué hacer allí, sus atractivos, rutas y recomendaciones.</p>
            <ul>
              <li><span aria-hidden="true"><FiNavigation /></span> Mapa interactivo</li>
              <li><span aria-hidden="true"><FiInfo /></span> Información turística</li>
              <li><span aria-hidden="true"><FiCompass /></span> Rutas recomendadas</li>
              <li><span aria-hidden="true"><FiMapPin /></span> Lugares imperdibles</li>
            </ul>
          </div>
          <div className="home-map__visual">
            <InteractiveMap
              destinations={featuredDestinations}
              mode="overview"
              onSelectDestination={(destination) => navigate(`/destinos/${destination.slug}`)}
            />
          </div>
        </div>
      </section>

    </article>
  );
}
