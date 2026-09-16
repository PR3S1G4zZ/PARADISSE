import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiHeart, FiMapPin } from 'react-icons/fi';
import type { CatalogDestination } from '../../shared/types/domain';

interface DestinationCardProps {
  destination: CatalogDestination;
  isFavorite: boolean;
  onToggleFavorite: (slug: string) => void;
  variant?: 'featured' | 'compact';
}

export function DestinationCard({
  destination,
  isFavorite,
  onToggleFavorite,
  variant = 'compact',
}: DestinationCardProps) {
  return (
    <article className={`destination-card destination-card--${variant}`}>
      <Link
        className="destination-card__media"
        to={`/destinos/${destination.slug}`}
        aria-label={`Ver detalles de ${destination.name}`}
      >
        <img
          src={destination.imageUrl ?? '/assets/destinations-hero.webp'}
          alt={`Paisaje de ${destination.name}`}
          loading={variant === 'featured' ? 'eager' : 'lazy'}
        />
        <span className="destination-card__shade" aria-hidden="true" />
      </Link>
      <div className="destination-card__body">
        <div className="destination-card__heading">
          <div>
            <span className="destination-card__kind">
              {destination.kind === 'site' ? 'Sitio destacado' : 'Municipio'}
            </span>
            <h2>{destination.name}</h2>
          </div>
          <button
            aria-label={`${isFavorite ? 'Quitar' : 'Agregar'} ${destination.name} de favoritos`}
            aria-pressed={isFavorite}
            className="favorite-button"
            type="button"
            onClick={() => onToggleFavorite(destination.slug)}
          >
            <FiHeart aria-hidden="true" fill={isFavorite ? 'currentColor' : 'none'} />
          </button>
        </div>
        <p>{destination.description}</p>
        <Link className="destination-card__plan" to={`/destinos/${destination.slug}`}>
          <FiMapPin aria-hidden="true" />
          <span>Planear visita</span>
          <FiArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
