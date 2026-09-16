import { useState } from 'react';
import { FiCompass, FiInfo, FiMapPin, FiNavigation, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { createStorageAdapter } from '../../shared/lib/storage';
import { createPlanService } from '../visit-plan/plan-service';
import { InteractiveMap } from '../map/InteractiveMap';
import { DestinationCard } from './DestinationCard';
import { listDestinations } from './destination-service';
import './destinations.css';

const planService = createPlanService(createStorageAdapter());

export function DestinationsPage() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'municipality' | 'site'>('all');
  const [favorites, setFavorites] = useState(() => planService.getPlan().favorites);
  const navigate = useNavigate();
  const destinations = listDestinations(query, filter === 'all' ? undefined : filter);

  const toggleFavorite = (slug: string) => {
    setFavorites(planService.toggleFavorite(slug).favorites);
  };

  return (
    <article className="destinations-page">
      <section className="destinations-hero" aria-labelledby="destinations-title">
        <img
          className="destinations-hero__backdrop"
          src="/assets/destinations-hero.webp"
          alt="Pueblo colorido del Suroeste Antioqueño"
        />
        <div className="destinations-hero__shade" aria-hidden="true" />
        <div className="destinations-hero__content">
          <h1 id="destinations-title">
            Destinos <span className="sr-only">Encuentra tu próximo destino</span>
          </h1>
          <p className="destinations-hero__strapline">
            Donde cada viaje <strong>es una aventura</strong>
          </p>
          <p className="destinations-hero__lead">
            Explora los <strong>mejores lugares del Suroeste Antioqueño</strong>, donde la naturaleza,
            la cultura y la tradición se unen para brindarte <strong>experiencias inolvidables.</strong>
          </p>
        </div>
      </section>

      <section className="destinations-catalogue" aria-labelledby="municipalities-title">
        <div className="destinations-section-heading">
          <h2 id="municipalities-title">Municipios del Suroeste y sitios destacados</h2>
          <div className="destinations-section-heading__rule" aria-hidden="true">
            <span />
            <img src="/assets/destinations-flourish.webp" alt="" />
            <span />
          </div>
        </div>

        <div className="destinations-toolbar">
          <p className="destinations-count" aria-live="polite">
            {destinations.length} {destinations.length === 1 ? 'destino disponible' : 'destinos para descubrir'}
          </p>
          <label className="destinations-search">
            <FiSearch aria-hidden="true" />
            <span className="sr-only">Buscar destino</span>
            <input
              type="search"
              value={query}
              placeholder="Buscar destino"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="destinations-filters" role="group" aria-label="Filtrar destinos">
          {[
            ['all', 'Todos'],
            ['municipality', 'Municipios'],
            ['site', 'Sitios de Itagüí'],
          ].map(([value, label]) => (
            <button
              className={filter === value ? 'destinations-filter destinations-filter--active' : 'destinations-filter'}
              data-destination-filter={value}
              key={value}
              onClick={() => setFilter(value as 'all' | 'municipality' | 'site')}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        {destinations.length > 0 ? (
          <div className="destination-grid">
            {destinations.map((destination, index) => (
              <DestinationCard
                key={destination.slug}
                destination={destination}
                variant={index < 4 ? 'featured' : 'compact'}
                isFavorite={favorites.includes(destination.slug)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <div className="empty-search" role="status">
            <FiCompass aria-hidden="true" />
            <p>No encontramos un destino con ese nombre. Prueba con otro lugar.</p>
          </div>
        )}
      </section>

      <section className="destinations-explorer" aria-labelledby="explore-destinations-title">
        <div className="destinations-explorer__shell">
          <div className="destinations-explorer__content">
            <p className="destinations-eyebrow">Planifica tu recorrido</p>
            <h2 id="explore-destinations-title">Explora el Suroeste</h2>
            <p>
              Selecciona un municipio o sitio en el mapa y descubre qué hacer allí, sus atractivos, rutas y recomendaciones.
            </p>
            <ul>
              <li><span><FiNavigation aria-hidden="true" /></span>Mapa interactivo</li>
              <li><span><FiInfo aria-hidden="true" /></span>Información turística</li>
              <li><span><FiCompass aria-hidden="true" /></span>Rutas recomendadas</li>
              <li><span><FiMapPin aria-hidden="true" /></span>Lugares imperdibles</li>
            </ul>
          </div>
          <div className="destinations-explorer__map">
            <InteractiveMap
              destinations={destinations}
              mode="overview"
              onSelectDestination={(destination) => navigate(`/destinos/${destination.slug}`)}
            />
          </div>
        </div>
      </section>
    </article>
  );
}
