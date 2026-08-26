import { useState } from 'react';
import { createStorageAdapter } from '../../shared/lib/storage';
import { createPlanService } from '../visit-plan/plan-service';
import { DestinationCard } from './DestinationCard';
import { listMunicipalities } from './destination-service';
import './destinations.css';

const planService = createPlanService(createStorageAdapter());

export function DestinationsPage() {
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState(() => planService.getPlan().favorites);
  const destinations = listMunicipalities(query);

  const toggleFavorite = (slug: string) => {
    setFavorites(planService.toggleFavorite(slug).favorites);
  };

  return (
    <section className="destinations-page" aria-labelledby="destinations-title">
      <p className="eyebrow">Suroeste antioqueño</p>
      <h1 id="destinations-title">Encuentra tu próximo destino</h1>
      <p className="destinations-page__intro">Viaja a pueblos que guardan historias, naturaleza y sabores para recordar.</p>
      <label className="search-field" htmlFor="destination-search">
        <span>Buscar destino</span>
        <input
          id="destination-search"
          type="search"
          value={query}
          placeholder="Ej. Jardín o Jericó"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {destinations.length > 0 ? (
        <div className="destination-grid">
          {destinations.map((municipality) => (
            <DestinationCard
              key={municipality.slug}
              municipality={municipality}
              isFavorite={favorites.includes(municipality.slug)}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      ) : (
        <p className="empty-search">No encontramos un destino con ese nombre. Prueba con otro lugar.</p>
      )}
    </section>
  );
}
