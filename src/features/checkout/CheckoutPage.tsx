import { useMemo, useState, type FormEvent } from 'react';
import { FiArrowRight, FiCheckCircle, FiLock } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { guides } from '../../data/guides';
import { municipalities } from '../../data/municipalities';
import { getDestination } from '../destinations/destination-service';
import { createStorageAdapter } from '../../shared/lib/storage';
import type { Experience } from '../../shared/types/domain';
import {
  createCheckoutService,
  type CheckoutMethod,
  type LocalCheckoutConfirmation,
} from './checkout-service';
import './checkout.css';

interface PlannedExperience extends Pick<Experience, 'id' | 'title' | 'duration' | 'price'> {}

const methods: Array<{ value: CheckoutMethod; label: string; detail: string }> = [
  { value: 'tarjeta', label: 'Tarjeta', detail: 'Registra tu preferencia para coordinarla después.' },
  { value: 'transferencia', label: 'Transferencia', detail: 'Recibirás los datos de coordinación de forma local.' },
  { value: 'efectivo', label: 'Efectivo', detail: 'Acuerda el pago directamente con el anfitrión.' },
];

const formatPrice = (price?: number) => price === undefined
  ? 'Precio por confirmar'
  : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price);

const experienceCatalog: PlannedExperience[] = [
  ...guides,
  ...municipalities.flatMap((municipality) => municipality.experiences),
];

export function CheckoutPage() {
  const checkout = useMemo(() => createCheckoutService(createStorageAdapter()), []);
  const session = checkout.getSession();
  const plan = checkout.getPlan();
  const selectedDestinations = [
    ...plan.municipalities.map((slug) => getDestination(slug)).filter(Boolean),
    ...plan.sites.map((slug) => getDestination(slug)).filter(Boolean),
  ];
  const selectedExperiences = plan.experiences.map((id) => experienceCatalog.find((experience) => experience.id === id) ?? {
    id,
    title: 'Experiencia seleccionada',
  });
  const [confirmation, setConfirmation] = useState<LocalCheckoutConfirmation | null>(() => checkout.getConfirmation());
  const [method, setMethod] = useState<CheckoutMethod>(() => confirmation?.method ?? 'tarjeta');
  const [contact, setContact] = useState(() => confirmation?.contact ?? {
    name: session?.name ?? '',
    email: session?.email ?? '',
    phone: '',
  });

  if (!session) {
    return (
      <section className="checkout-page checkout-page--unauthenticated" aria-labelledby="checkout-title">
        <div className="checkout-card checkout-card--guest">
          <div className="checkout-guest-copy">
            <header className="checkout-header">
              <p className="checkout-eyebrow">Reserva PARADISSE</p>
              <h1 id="checkout-title">Inicia sesión para confirmar tu visita</h1>
              <p>Guardaremos tu selección en este dispositivo y te mostraremos una confirmación local.</p>
            </header>

            <div className="checkout-guest-summary" aria-label="Resumen de tu selección">
              <span className="checkout-guest-summary__icon" aria-hidden="true"><FiCheckCircle /></span>
              <div>
                <span className="checkout-guest-summary__label">Tu selección</span>
                <strong>
                  {selectedExperiences.length > 0
                    ? `${selectedExperiences.length} ${selectedExperiences.length === 1 ? 'experiencia' : 'experiencias'} seleccionada${selectedExperiences.length === 1 ? '' : 's'}`
                    : selectedDestinations.length > 0
                      ? `${selectedDestinations.length} ${selectedDestinations.length === 1 ? 'destino' : 'destinos'} seleccionado${selectedDestinations.length === 1 ? '' : 's'}`
                      : 'Aún no has agregado experiencias'}
                </strong>
                <small>
                  {selectedExperiences.length > 0
                    ? selectedExperiences.slice(0, 2).map((experience) => experience.title).join(' · ')
                    : selectedDestinations.length > 0
                      ? selectedDestinations.slice(0, 2).map((destination) => destination!.name).join(' · ')
                      : 'Explora destinos y agrega experiencias a tu plan cuando quieras.'}
                </small>
              </div>
            </div>
          </div>

          <div className="checkout-guest-actions">
            <div className="checkout-actions">
              <Link className="checkout-link" to="/registro">
                Crear una cuenta <FiArrowRight aria-hidden="true" />
              </Link>
              <Link className="checkout-text-link" to="/iniciar-sesion">Ya tengo una cuenta</Link>
            </div>
            <p className="checkout-guest-note">
              <FiLock aria-hidden="true" />
              <span>Sin cobros ahora. Guardaremos tu selección localmente.</span>
            </p>
          </div>
        </div>
      </section>
    );
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setConfirmation(checkout.confirmLocalCheckout(method, contact));
  };

  return (
    <section className="checkout-page" aria-labelledby="checkout-title">
      <div className="checkout-card">
        <header className="checkout-header">
          <p className="checkout-eyebrow">Reserva PARADISSE</p>
          <h1 id="checkout-title">Confirma tu experiencia</h1>
          <p>Revisaremos contigo los detalles para completar la coordinación de tu visita.</p>
        </header>

        <section className="checkout-summary" aria-labelledby="plan-title">
          <div className="checkout-section-heading">
            <h2 id="plan-title">Tu plan</h2>
            <span>{selectedDestinations.length + selectedExperiences.length} elementos</span>
          </div>
          {selectedDestinations.length > 0 && (
            <div className="checkout-destinations" aria-label="Destinos seleccionados">
              <strong>Destinos seleccionados</strong>
              <ul>
                {selectedDestinations.map((destination) => (
                  <li key={destination!.slug}>{destination!.name}</li>
                ))}
              </ul>
            </div>
          )}
          {selectedExperiences.length > 0 ? (
            <ul>
              {selectedExperiences.map((experience) => (
                <li key={experience.id}>
                  <div>
                    <strong>{experience.title}</strong>
                    {experience.duration && <span>{experience.duration}</span>}
                  </div>
                  <b>{formatPrice(experience.price)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="checkout-empty">Aún no agregaste experiencias. Puedes confirmar tu interés y completarlo después.</p>
          )}
        </section>

        <form className="checkout-form" onSubmit={submit}>
          <fieldset>
            <legend>¿Cómo prefieres coordinar el pago?</legend>
            <div className="checkout-methods">
              {methods.map((option) => (
                <label className="checkout-method" key={option.value}>
                  <input
                    checked={method === option.value}
                    name="payment-method"
                    onChange={() => setMethod(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.detail}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="checkout-contact">
            <h2>Datos de contacto</h2>
            <label>
              Nombre completo
              <input
                name="name"
                onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))}
                autoComplete="name"
                required
                type="text"
                value={contact.name}
              />
            </label>
            <label>
              Correo electrónico
              <input
                name="email"
                onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
                autoComplete="email"
                required
                type="email"
                value={contact.email}
              />
            </label>
            <label>
              Teléfono
              <input
                name="phone"
                onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))}
                autoComplete="tel"
                required
                type="tel"
                value={contact.phone}
              />
            </label>
          </div>

          <p className="checkout-disclaimer">Confirmación local: no se realizó ningún cobro.</p>
          <button className="checkout-submit" type="submit">Confirmar reserva local</button>
        </form>

        {confirmation && (
          <div className="checkout-confirmation" role="status">
            <strong>Tu reserva quedó confirmada localmente.</strong>
            <span>Preferencia registrada: {methods.find((option) => option.value === confirmation.method)?.label}.</span>
            <span>Confirmación local: no se realizó ningún cobro.</span>
          </div>
        )}
      </div>
    </section>
  );
}
