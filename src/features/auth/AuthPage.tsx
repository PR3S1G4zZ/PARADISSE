import { useState, type FormEvent } from 'react';
import { FiArrowRight, FiCheck, FiEye, FiEyeOff, FiMap, FiShield } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import type { UserSession } from '../../shared/types/domain';
import { Button } from '../../shared/ui/Button';
import {
  getPasswordStrength,
  validateLogin,
  validateRegistration,
  type PasswordStrength,
  type ValidationErrors,
} from './validators';
import './auth.css';

type AuthMode = 'register' | 'login';

interface AuthPageProps {
  mode: AuthMode;
  onSuccess?: (session: UserSession) => void;
}

interface FormValues {
  name: string;
  email: string;
  password: string;
  confirmation: string;
}

const initialValues: FormValues = { name: '', email: '', password: '', confirmation: '' };

const passwordStrengthLabels: Record<PasswordStrength, string> = {
  empty: 'Aún no definida',
  weak: 'Necesita refuerzo',
  medium: 'Buena base',
  strong: 'Muy segura',
};

export function AuthPage({ mode, onSuccess }: AuthPageProps) {
  const navigate = useNavigate();
  const { register, signIn, hadLocalAccounts } = useAuth();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const isRegistering = mode === 'register';
  const passwordStrength = getPasswordStrength(values.password);
  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', met: values.password.length >= 8 },
    { label: 'Una letra mayúscula', met: /[A-Z]/.test(values.password) },
    { label: 'Un número', met: /\d/.test(values.password) },
  ];

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(undefined);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = isRegistering ? validateRegistration(values) : validateLogin(values);
    setErrors(nextErrors);
    setSubmitError(undefined);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const session = isRegistering
        ? await register({ name: values.name.trim(), email: values.email.trim(), password: values.password })
        : await signIn({ email: values.email.trim(), password: values.password });

      if (onSuccess) onSuccess(session);
      else navigate('/pago');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No fue posible completar la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (field: keyof ValidationErrors) => errors[field];
  const title = isRegistering ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
  const action = isRegistering ? 'Crear cuenta' : 'Iniciar sesión';
  const passwordDescribedBy = [
    fieldError('password') ? 'auth-password-error' : '',
    isRegistering ? 'auth-password-help' : '',
  ].filter(Boolean).join(' ') || undefined;
  const confirmationDescribedBy = fieldError('confirmation') ? 'auth-confirmation-error' : undefined;

  return (
    <section className={`auth-page auth-page--${mode}`}>
      <div className="auth-shell">
        <aside className="auth-story" aria-label="Experiencia PARADISSE">
          <img
            className="auth-story__image"
            src="/assets/destinations-hero.webp"
            alt="Arquitectura colorida del Suroeste Antioqueño"
          />
          <div className="auth-story__shade" aria-hidden="true" />
          <div className="auth-story__content">
            <p className="auth-story__brand">PARADISSE APP</p>
            <p className="auth-story__eyebrow">Viaja con intención</p>
            <h2>{isRegistering ? 'Tu próxima aventura empieza aquí.' : 'Qué bueno tenerte de vuelta.'}</h2>
            <p>
              {isRegistering
                ? 'Guarda tus lugares favoritos y arma una escapada a tu medida.'
                : 'Retoma tus destinos guardados y sigue planeando el viaje que imaginas.'}
            </p>
            <ul>
              <li><FiMap aria-hidden="true" /><span>Descubre lugares con historia.</span></li>
              <li><FiShield aria-hidden="true" /><span>Tu plan se guarda en este dispositivo.</span></li>
            </ul>
          </div>
        </aside>

        <section className="auth-card" aria-labelledby="auth-title">
          <div className="auth-card__topline">
            <span>CUENTA PARADISSE</span>
            <Link to="/" aria-label="Volver al inicio">Volver al inicio <FiArrowRight aria-hidden="true" /></Link>
          </div>
          <p className="auth-brand">PARADISSE</p>
          <h1 id="auth-title">{title}</h1>
          <p className="auth-intro">
            {isRegistering ? 'Guarda tus destinos y diseña tu próxima escapada.' : 'Tu próxima escapada empieza aquí.'}
          </p>

          <form className="auth-form" noValidate onSubmit={handleSubmit} aria-busy={isSubmitting}>
            {isRegistering && (
              <div className="auth-field">
                <label htmlFor="auth-name">Nombre completo</label>
                <input
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  required
                  value={values.name}
                  onChange={(event) => updateValue('name', event.target.value)}
                  aria-describedby={fieldError('name') ? 'auth-name-error' : undefined}
                  aria-invalid={Boolean(fieldError('name'))}
                />
                {fieldError('name') && <p id="auth-name-error" className="auth-error">{fieldError('name')}</p>}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="auth-email">Correo electrónico</label>
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={values.email}
                onChange={(event) => updateValue('email', event.target.value)}
                aria-describedby={fieldError('email') ? 'auth-email-error' : undefined}
                aria-invalid={Boolean(fieldError('email'))}
              />
              {fieldError('email') && <p id="auth-email-error" className="auth-error">{fieldError('email')}</p>}
            </div>

            <div className="auth-field">
              <label htmlFor="auth-password">Contraseña</label>
              <div className="auth-password-control">
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                  required
                  value={values.password}
                  onChange={(event) => updateValue('password', event.target.value)}
                  aria-describedby={passwordDescribedBy}
                  aria-invalid={Boolean(fieldError('password'))}
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-controls="auth-password"
                  aria-label={`${showPassword ? 'Ocultar' : 'Mostrar'} contraseña`}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                </button>
              </div>
              {fieldError('password') && <p id="auth-password-error" className="auth-error">{fieldError('password')}</p>}
              {isRegistering && (
                <div id="auth-password-help" className="auth-password-help">
                  <div className={`auth-strength auth-strength--${passwordStrength}`} aria-live="polite">
                    <span>Seguridad de la contraseña</span>
                    <strong>{passwordStrengthLabels[passwordStrength]}</strong>
                  </div>
                  <ul>
                    {passwordRequirements.map((requirement) => (
                      <li className={requirement.met ? 'is-met' : undefined} key={requirement.label}>
                        <FiCheck aria-hidden="true" />
                        {requirement.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {isRegistering && (
              <div className="auth-field">
                <label htmlFor="auth-confirmation">Confirmar contraseña</label>
                <div className="auth-password-control">
                  <input
                    id="auth-confirmation"
                    name="confirmation"
                    type={showConfirmation ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={values.confirmation}
                    onChange={(event) => updateValue('confirmation', event.target.value)}
                    aria-describedby={confirmationDescribedBy}
                    aria-invalid={Boolean(fieldError('confirmation'))}
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    aria-controls="auth-confirmation"
                    aria-label={`${showConfirmation ? 'Ocultar' : 'Mostrar'} confirmación de contraseña`}
                    onClick={() => setShowConfirmation((visible) => !visible)}
                  >
                    {showConfirmation ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
                  </button>
                </div>
                {fieldError('confirmation') && (
                  <p id="auth-confirmation-error" className="auth-error">{fieldError('confirmation')}</p>
                )}
              </div>
            )}

            <div className="auth-form-status" aria-live="polite" aria-atomic="true">
              {submitError && <p className="auth-error" role="alert">{submitError}</p>}
            </div>
            {hadLocalAccounts && (
              <p className="auth-note auth-note--migration" role="status">
                Las cuentas guardadas solo en este dispositivo ya no están disponibles. Crea una cuenta de nuevo.
              </p>
            )}
            <p className="auth-note">Tu sesión se guarda de forma segura en este navegador.</p>
            <Button className="auth-submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Procesando…' : action}</span>
              {!isSubmitting && <FiArrowRight aria-hidden="true" />}
            </Button>
          </form>

          <p className="auth-switch">
            {isRegistering ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}{' '}
            <Link to={isRegistering ? '/iniciar-sesion' : '/registro'}>
              {isRegistering ? 'Inicia sesión' : 'Crear una cuenta'}
            </Link>
          </p>
        </section>
      </div>
    </section>
  );
}
