import type { GuideExperience } from '../../data/guides';

interface GuideCardProps {
  guide: GuideExperience;
  onAdd: (guide: GuideExperience) => void;
  added: boolean;
}

const formatPrice = (price: number) => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP', maximumFractionDigits: 0,
}).format(price);

export function GuideCard({ guide, onAdd, added }: GuideCardProps) {
  return (
    <article className="guide-card">
      <img className="guide-card__image" src={guide.imageUrl} alt={guide.title} />
      <div className="guide-card__body">
        <h2>{guide.title}</h2>
        <p>{guide.description}</p>
        <p className="guide-card__meta">{guide.duration} · {formatPrice(guide.price)}</p>
        <button type="button" onClick={() => onAdd(guide)} disabled={added}>
          {added ? 'Agregada a tu visita' : 'Añadir al plan'}
        </button>
      </div>
    </article>
  );
}
