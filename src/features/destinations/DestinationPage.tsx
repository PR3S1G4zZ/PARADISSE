import { useState } from 'react';
import {
  FiArrowLeft,
  FiCalendar,
  FiCloud,
  FiCompass,
  FiHeart,
  FiMap,
  FiMapPin,
  FiNavigation,
  FiUsers,
} from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getGuides, type GuideCategory } from '../../data/guides';
import { getDestinationDetails, type DestinationFactIcon } from '../../data/destination-details';
import { createStorageAdapter } from '../../shared/lib/storage';
import { createPlanService } from '../visit-plan/plan-service';
import { InteractiveMap } from '../map/InteractiveMap';
import { RouteModal } from '../navigation/RouteModal';
import { getDestination } from './destination-service';
import type { DestinationDetails } from '../../data/destination-details';
import './destinations.css';

const planService = createPlanService(createStorageAdapter());
const guideCategories: Array<{ category: GuideCategory; label: string }> = [
  { category: 'cultura-historia', label: 'Cultura e historia' },
  { category: 'gastronomia', label: 'Gastronomía local' },
];

const siteDetails: DestinationDetails = {
  heroLead: 'Un punto de encuentro para comenzar tu recorrido por Itagüí.',
  overview: 'Conoce este lugar destacado de Itagüí y úsalo como punto de partida para moverte por la ciudad.',
  facts: [
    { label: 'Región', value: 'Valle de Aburrá', icon: 'map' },
    { label: 'Destino', value: 'Sitio destacado', icon: 'compass' },
    { label: 'Llegada', value: 'Punto urbano', icon: 'road' },
  ],
  landmarks: [],
};

const formatPrice = (price?: number) => price === undefined
  ? undefined
  : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);

function FactIcon({ icon }: { icon: DestinationFactIcon }) {
  switch (icon) {
    case 'calendar':
      return <FiCalendar aria-hidden="true" />;
    case 'cloud':
      return <FiCloud aria-hidden="true" />;
    case 'compass':
      return <FiCompass aria-hidden="true" />;
    case 'map':
      return <FiMap aria-hidden="true" />;
    case 'mountain':
      return <FiNavigation aria-hidden="true" />;
    case 'people':
      return <FiUsers aria-hidden="true" />;
    case 'road':
      return <FiNavigation aria-hidden="true" />;
    default:
      return <FiMapPin aria-hidden="true" />;
  }
}

export function DestinationPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const destination = getDestination(slug);
  const [plan, setPlan] = useState(() => planService.getPlan());
  const [routeOpen, setRouteOpen] = useState(false);

  if (!destination) {
    return (
      <section className="destination-not-found">
        <h1>Destino no encontrado</h1>
        <p>Este lugar no está disponible en el catálogo todavía.</p>
        <Link className="text-link" to="/destinos">Volver a destinos</Link>
      </section>
    );
  }

  const details = destination.kind === 'municipality' ? getDestinationDetails(destination) : siteDetails;
  const heroImageUrl = destination.imageUrl ?? details.landmarks[0]?.imageUrl ?? '/assets/destinations-hero.webp';
  const aboutImageUrl = details.landmarks[1]?.imageUrl ?? heroImageUrl;
  const isFavorite = plan.favorites.includes(destination.slug);
  const publishedGuideCategories = destination.kind === 'municipality'
    ? guideCategories.filter(({ category }) => getGuides(destination.slug, category).length > 0)
    : [];
  const toggleFavorite = () => setPlan(planService.toggleFavorite(destination.slug));
  const planVisit = () => {
    setPlan(destination.kind === 'site'
      ? planService.addSite(destination.slug)
      : planService.addMunicipality(destination.slug));
    navigate('/pago');
  };
  const addExperience = (experienceId: string) => setPlan(planService.addExperience(experienceId));

  return (
    <article className="destination-detail-page destination-detail__content">
      <section className="destination-detail__hero" aria-labelledby="destination-title">
        <img className="destination-detail__hero-image" src={heroImageUrl} alt={`Paisaje de ${destination.name}`} />
        <div className="destination-detail__hero-shade" aria-hidden="true" />
        <div className="destination-detail__hero-inner">
          <Link className="destination-detail__back" to="/destinos">
            <FiArrowLeft aria-hidden="true" />
            <span>Volver a destinos</span>
          </Link>
          <p className="destination-detail__welcome">Bienvenido a</p>
          <h1 id="destination-title">{destination.name}</h1>
          <p className="destination-detail__hero-lead">{details.heroLead}</p>
          <p className="destination-detail__region destination-detail__region--hero">
            <FiMapPin aria-hidden="true" /> {destination.kind === 'site' ? 'Itagüí, Antioquia' : 'Suroeste Antioqueño, Antioquia'}
          </p>
        </div>
        <button
              aria-label={`${isFavorite ? 'Quitar' : 'Agregar'} ${destination.name} de favoritos`}
          aria-pressed={isFavorite}
          className="destination-detail__favorite"
          type="button"
          onClick={toggleFavorite}
        >
          <FiHeart aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
          <span>{isFavorite ? 'Guardado' : 'Guardar destino'}</span>
        </button>
      </section>

      <div className="destination-detail__body">
        <section className="destination-detail__overview" aria-labelledby="about-destination-title">
          <div className="destination-detail__about">
            <div className="destination-detail__image-frame">
              <img className="destination-detail__image" src={aboutImageUrl} alt={`Vista destacada de ${destination.name}`} />
            </div>
            <div className="destination-detail__about-copy">
              <p className="destination-detail__region">
                <FiMapPin aria-hidden="true" /> {destination.kind === 'site' ? 'Itagüí, Antioquia' : 'Suroeste Antioqueño, Antioquia'}
              </p>
              <h2 id="about-destination-title" className="destination-detail__script-heading">
                <span>Sobre</span> {destination.name}
              </h2>
              <p className="destination-detail__description">{destination.description}</p>
              <p className="destination-detail__overview-copy">{details.overview}</p>
              <dl className="destination-facts">
                {details.facts.map((fact) => (
                  <div className="destination-fact" key={`${fact.label}-${fact.value}`}>
                    <dt><span className="destination-fact__icon"><FactIcon icon={fact.icon} /></span>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <section className="tourism-plans" aria-labelledby="experiences-title">
            <div className="tourism-plans__heading-row">
              <h2 id="experiences-title">
                <span className="tourism-plans__heading">Planes <strong>turísticos</strong></span>
                <span className="sr-only">Experiencias para quedarte un poco más</span>
              </h2>
              <span className="tourism-plans__count">{destination.experiences.length} opciones</span>
            </div>
            <p className="tourism-plans__lead">Elige una experiencia y arma un recorrido a tu ritmo.</p>
            <div className="experience-list">
              {destination.experiences.map((experience) => {
                const isAdded = plan.experiences.includes(experience.id);
                return (
                  <article className="experience-card" key={experience.id}>
                    <span className="experience-card__icon"><FiCompass aria-hidden="true" /></span>
                    <div className="experience-card__content">
                      <h3>{experience.title}</h3>
                      <p>{experience.description}</p>
                      <p className="experience-card__meta">
                        {experience.duration}{experience.price ? ` · ${formatPrice(experience.price)}` : ''}
                      </p>
                      <button
                        className="experience-card__add"
                        disabled={isAdded}
                        onClick={() => addExperience(experience.id)}
                        type="button"
                      >
                        {isAdded ? 'Agregada al plan' : 'Añadir al plan'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <button className="visit-cta" onClick={planVisit} type="button">
              Planear esta visita
            </button>
            <button
              className="destination-route-button"
              type="button"
              onClick={() => setRouteOpen(true)}
            >
              <FiNavigation aria-hidden="true" /> Cómo llegar
            </button>
          </section>
        </section>

        <section className="destination-landmarks" aria-labelledby="landmarks-title">
          <div className="destination-detail__section-heading">
            <p className="destination-detail__eyebrow">{destination.kind === 'site' ? 'Descubre el sitio' : 'Descubre el municipio'}</p>
            <h2 id="landmarks-title">Lugares turísticos <strong>destacados</strong></h2>
          </div>
          {details.landmarks.length > 0 ? (
            <div className="destination-landmarks__grid">
              {details.landmarks.map((landmark) => (
                <article className="destination-landmark-card" key={landmark.id}>
                  <img src={landmark.imageUrl} alt={`Lugar turístico: ${landmark.name}`} loading="lazy" />
                  <div className="destination-landmark-card__body">
                    <h3>{landmark.name}</h3>
                    <p>{landmark.description}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="destination-landmarks__empty">Estamos preparando los lugares imperdibles de este destino.</p>
          )}
        </section>

        {!routeOpen && (
          <section className="destination-detail__map" aria-labelledby="destination-map-title">
            <div className="destination-detail__section-heading destination-detail__section-heading--map">
              <p className="destination-detail__eyebrow">Ubica tu próxima parada</p>
              <h2 id="destination-map-title">Mapa de <strong>{destination.name}</strong></h2>
            </div>
            <div className="destination-detail__map-frame">
              <InteractiveMap
                destinations={[destination]}
                focusedDestination={destination}
                mode="detail"
                onStartRoute={() => setRouteOpen(true)}
              />
            </div>
          </section>
        )}

        <section className="guide-links" aria-labelledby="guides-title">
          <div>
            <p className="destination-detail__eyebrow">Inspira tu recorrido</p>
            <h2 id="guides-title">Guías para inspirar el viaje</h2>
          </div>
          {publishedGuideCategories.length > 0 ? publishedGuideCategories.map(({ category, label }) => (
            <Link key={category} to={`/guias/${destination.slug}/${category}`}>{label}</Link>
          )) : (
            <p className="guide-links__empty">Todavía no hay guías publicadas para {destination.name}.</p>
          )}
        </section>
      </div>
      {routeOpen && (
        <RouteModal
          open={routeOpen}
          destination={destination}
          onClose={() => setRouteOpen(false)}
        />
      )}
    </article>
  );
}
