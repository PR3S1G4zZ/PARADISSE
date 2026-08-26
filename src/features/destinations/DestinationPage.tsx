import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { createStorageAdapter } from '../../shared/lib/storage';
import { createPlanService } from '../visit-plan/plan-service';
import { getMunicipality } from './destination-service';
import './destinations.css';

const planService = createPlanService(createStorageAdapter());

const formatPrice = (price?: number) => price === undefined
  ? undefined
  : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);

export function DestinationPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const municipality = getMunicipality(slug);
  const [favorites, setFavorites] = useState(() => planService.getPlan().favorites);

  if (!municipality) {
    return (
      <section className="destination-not-found">
        <h1>Destino no encontrado</h1>
        <p>Este lugar no está disponible en el catálogo todavía.</p>
        <Link className="text-link" to="/destinos">Volver a destinos</Link>
      </section>
    );
  }

  const isFavorite = favorites.includes(municipality.slug);
  const toggleFavorite = () => setFavorites(planService.toggleFavorite(municipality.slug).favorites);

  return (
    <article className="destination-detail">
      <img className="destination-detail__image" src={municipality.imageUrl} alt={`Paisaje de ${municipality.name}`} />
      <div className="destination-detail__content">
        <p className="eyebrow">Destino PARADISSE</p>
        <div className="destination-detail__title-row">
          <h1>{municipality.name}</h1>
          <button className="favorite-button" aria-pressed={isFavorite} onClick={toggleFavorite}>
            {isFavorite ? '♥ Guardado' : '♡ Guardar'}
          </button>
        </div>
        <p className="destination-detail__description">{municipality.description}</p>
        <button className="visit-cta" onClick={() => navigate('/pago')}>Planear esta visita</button>

        <section aria-labelledby="experiences-title">
          <h2 id="experiences-title">Experiencias para quedarte un poco más</h2>
          <div className="experience-list">
            {municipality.experiences.map((experience) => (
              <article className="experience-card" key={experience.id}>
                <h3>{experience.title}</h3>
                <p>{experience.description}</p>
                <p className="experience-card__meta">{experience.duration}{experience.price ? ` · ${formatPrice(experience.price)}` : ''}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="guide-links" aria-labelledby="guides-title">
          <h2 id="guides-title">Guías para inspirar el viaje</h2>
          <Link to={`/guias/${municipality.slug}/cultura-historia`}>Cultura e historia</Link>
          <Link to={`/guias/${municipality.slug}/gastronomia`}>Gastronomía local</Link>
          <Link to={`/guias/${municipality.slug}/naturaleza-aventura`}>Naturaleza y aventura</Link>
        </section>
      </div>
    </article>
  );
}
