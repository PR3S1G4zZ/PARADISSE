import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getGuides, type GuideCategory, type GuideExperience } from '../../data/guides';
import { createStorageAdapter } from '../../shared/lib/storage';
import { createPlanService } from '../visit-plan/plan-service';
import { getMunicipality } from '../destinations/destination-service';
import { GuideCard } from './GuideCard';
import './guides.css';

const planService = createPlanService(createStorageAdapter());
const categoryNames: Record<GuideCategory, string> = {
  'cultura-historia': 'Cultura e historia',
  gastronomia: 'Gastronomía local',
};

interface GuidePageProps {
  municipalitySlug?: string;
  category?: string;
}

export function GuidePage({ municipalitySlug: propSlug, category: propCategory }: GuidePageProps = {}) {
  const params = useParams();
  const municipalitySlug = propSlug ?? params.slug ?? '';
  const category = (propCategory ?? params.category) as GuideCategory;
  const municipality = getMunicipality(municipalitySlug);
  const validCategory = category === 'cultura-historia' || category === 'gastronomia';
  const experiences = validCategory ? getGuides(municipalitySlug, category) : [];
  const [addedIds, setAddedIds] = useState<string[]>(() => planService.getPlan().experiences);

  const addExperience = (guide: GuideExperience) => {
    planService.addExperience(guide.id);
    setAddedIds((current) => current.includes(guide.id) ? current : [...current, guide.id]);
  };

  if (!municipality || !validCategory) {
    return <section className="guide-page guide-page--empty"><h1>Guía de viaje no encontrada</h1><Link to="/destinos">Volver a destinos</Link></section>;
  }

  return (
    <section className="guide-page" aria-labelledby="guide-title">
      <p className="eyebrow">Guía PARADISSE · {municipality.name}</p>
      <h1 id="guide-title">{categoryNames[category]}</h1>
      <p className="guide-page__intro">Experiencias para conocer {municipality.name} a través de sus historias y sabores.</p>
      {experiences.length > 0 ? (
        <div className="guide-grid">
          {experiences.map((guide) => <GuideCard key={guide.id} guide={guide} onAdd={addExperience} added={addedIds.includes(guide.id)} />)}
        </div>
      ) : (
        <p className="guide-page__empty">Todavía no hay guías publicadas para {municipality.name} en esta categoría.</p>
      )}
      <nav className="guide-page__links" aria-label="Más opciones de viaje">
        <Link to={`/destinos/${municipality.slug}`}>Volver a {municipality.name}</Link>
        <Link to="/pago">Ver mi plan y continuar</Link>
      </nav>
    </section>
  );
}
