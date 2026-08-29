import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { getGuides, type GuideCategory } from '../../data/guides';
import { createStorageAdapter } from '../../shared/lib/storage';
import { createPlanService } from '../visit-plan/plan-service';
import { getMunicipality } from './destination-service';
import './destinations.css';

const planService = createPlanService(createStorageAdapter());
const guideCategories: Array<{ category: GuideCategory; label: string }> = [
  { category: 'cultura-historia', label: 'Cultura e historia' },
  { category: 'gastronomia', label: 'Gastronomía local' },
];

const formatPrice = (price?: number) => price === undefined
  ? undefined
  : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);

export function DestinationPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const municipality = getMunicipality(slug);
  const [plan, setPlan] = useState(() => planService.getPlan());

  if (!municipality) {
    return (
      <section className="destination-not-found">
        <h1>Destino no encontrado</h1>
        <p>Este lugar no está disponible en el catálogo todavía.</p>
        <Link className="text-link" to="/destinos">Volver a destinos</Link>
      </section>
    );
  }

  const isFavorite = plan.favorites.includes(municipality.slug);
  const publishedGuideCategories = guideCategories.filter(({ category }) =>
    getGuides(municipality.slug, category).length > 0);
  const toggleFavorite = () => setPlan(planService.toggleFavorite(municipality.slug));
  const planVisit = () => {
    setPlan(planService.addMunicipality(municipality.slug));
    navigate('/pago');
  };
  const addExperience = (experienceId: string) => setPlan(planService.addExperience(experienceId));

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
        <button className="visit-cta" onClick={planVisit}>Planear esta visita</button>

        <section aria-labelledby="experiences-title">
          <h2 id="experiences-title">Experiencias para quedarte un poco más</h2>
          <div className="experience-list">
            {municipality.experiences.map((experience) => (
              <article className="experience-card" key={experience.id}>
                <h3>{experience.title}</h3>
                <p>{experience.description}</p>
                <p className="experience-card__meta">{experience.duration}{experience.price ? ` · ${formatPrice(experience.price)}` : ''}</p>
                <button
                  className="experience-card__add"
                  disabled={plan.experiences.includes(experience.id)}
                  onClick={() => addExperience(experience.id)}
                  type="button"
                >
                  {plan.experiences.includes(experience.id) ? 'Agregada al plan' : 'Añadir al plan'}
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="guide-links" aria-labelledby="guides-title">
          <h2 id="guides-title">Guías para inspirar el viaje</h2>
          {publishedGuideCategories.length > 0 ? publishedGuideCategories.map(({ category, label }) => (
            <Link key={category} to={`/guias/${municipality.slug}/${category}`}>{label}</Link>
          )) : (
            <p className="guide-links__empty">Todavía no hay guías publicadas para {municipality.name}.</p>
          )}
        </section>
      </div>
    </article>
  );
}
