import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAuthService } from './auth-service';
import { createStorageAdapter, type StorageAdapter } from '../../shared/lib/storage';
import type { UserSession } from '../../shared/types/domain';
import { Button } from '../../shared/ui/Button';
import { validateLogin, validateRegistration, type ValidationErrors } from './validators';
import './auth.css';

type AuthMode = 'register' | 'login';

interface AuthPageProps {
  mode: AuthMode;
  onSuccess?: (session: UserSession) => void;
  storage?: StorageAdapter;
}

interface FormValues {
  name: string;
  email: string;
  password: string;
  confirmation: string;
}

const initialValues: FormValues = { name: '', email: '', password: '', confirmation: '' };

export function AuthPage({ mode, onSuccess, storage }: AuthPageProps) {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegistering = mode === 'register';

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(undefined);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = isRegistering ? validateRegistration(values) : validateLogin(values);
    setErrors(nextErrors);
    setSubmitError(undefined);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const service = createAuthService(storage ?? createStorageAdapter());
      const session = isRegistering
        ? service.registerLocal({ name: values.name.trim(), email: values.email.trim(), password: values.password })
        : service.signInLocal({ email: values.email.trim(), password: values.password });

      if (!session) {
        setSubmitError('Correo o contraseña incorrectos.');
        return;
      }

      if (onSuccess) onSuccess(session);
      else navigate('/pago');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No fue posible crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldError = (field: keyof ValidationErrors) => errors[field];
  const title = isRegistering ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
  const action = isRegistering ? 'Crear cuenta' : 'Iniciar sesión';

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-brand">PARADISSE</p>
        <h1 id="auth-title">{title}</h1>
        <p className="auth-intro">
          {isRegistering ? 'Guarda tus destinos y diseña tu próxima escapada.' : 'Tu próxima escapada empieza aquí.'}
        </p>

        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          {isRegistering && (
            <div className="auth-field">
              <label htmlFor="auth-name">Nombre</label>
              <input
                id="auth-name"
                name="name"
                autoComplete="name"
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
              value={values.email}
              onChange={(event) => updateValue('email', event.target.value)}
              aria-describedby={fieldError('email') ? 'auth-email-error' : undefined}
              aria-invalid={Boolean(fieldError('email'))}
            />
            {fieldError('email') && <p id="auth-email-error" className="auth-error">{fieldError('email')}</p>}
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              value={values.password}
              onChange={(event) => updateValue('password', event.target.value)}
              aria-describedby={fieldError('password') ? 'auth-password-error' : undefined}
              aria-invalid={Boolean(fieldError('password'))}
            />
            {fieldError('password') && <p id="auth-password-error" className="auth-error">{fieldError('password')}</p>}
          </div>

          {isRegistering && (
            <div className="auth-field">
              <label htmlFor="auth-confirmation">Confirmar contraseña</label>
              <input
                id="auth-confirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                value={values.confirmation}
                onChange={(event) => updateValue('confirmation', event.target.value)}
                aria-describedby={fieldError('confirmation') ? 'auth-confirmation-error' : undefined}
                aria-invalid={Boolean(fieldError('confirmation'))}
              />
              {fieldError('confirmation') && <p id="auth-confirmation-error" className="auth-error">{fieldError('confirmation')}</p>}
            </div>
          )}

          {submitError && <p className="auth-error" role="alert">{submitError}</p>}
          <p className="auth-note">Sesión local en este dispositivo.</p>
          <Button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Procesando…' : action}
          </Button>
        </form>
      </section>
    </main>
  );
}
