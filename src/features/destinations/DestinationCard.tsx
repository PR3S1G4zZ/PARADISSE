import { Link } from 'react-router-dom';
import type { Municipality } from '../../shared/types/domain';

interface DestinationCardProps {
  municipality: Municipality;
  isFavorite: boolean;
  onToggleFavorite: (slug: string) => void;
}

export function DestinationCard({ municipality, isFavorite, onToggleFavorite }: DestinationCardProps) {
  return (
    <article className="destination-card">
      <img src={municipality.imageUrl} alt={`Paisaje de ${municipality.name}`} />
      <div className="destination-card__body">
        <div className="destination-card__heading">
          <h2>{municipality.name}</h2>
          <button
            aria-label={`${isFavorite ? 'Quitar' : 'Agregar'} ${municipality.name} de favoritos`}
            aria-pressed={isFavorite}
            className="favorite-button"
            onClick={() => onToggleFavorite(municipality.slug)}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        </div>
        <p>{municipality.description}</p>
        <Link className="text-link" to={`/destinos/${municipality.slug}`}>Descubrir destino</Link>
      </div>
    </article>
  );
}
