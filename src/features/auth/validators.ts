export type RegistrationField = 'name' | 'email' | 'password' | 'confirmation';
export type ValidationErrors = Partial<Record<RegistrationField, string>>;

export interface RegistrationValues {
  name: string;
  email: string;
  password: string;
  confirmation: string;
}

export interface LoginValues {
  email: string;
  password: string;
}

export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong';

export const validateEmail = (email: string): string | undefined => {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) return 'Ingresa tu correo electrónico.';
  return /^\S+@\S+\.\S+$/.test(normalizedEmail) ? undefined : 'Ingresa un correo válido.';
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'empty';

  const score = [
    password.length >= 8,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z\d\s]/.test(password),
  ].filter(Boolean).length;

  if (score < 3) return 'weak';
  if (score < 5) return 'medium';
  return 'strong';
}

export function validateRegistration(input: RegistrationValues): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!input.name.trim()) errors.name = 'Ingresa tu nombre.';
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  if (!input.password) errors.password = 'Ingresa una contraseña.';
  else if (input.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  if (!input.confirmation) errors.confirmation = 'Confirma tu contraseña.';
  else if (input.confirmation !== input.password) errors.confirmation = 'Las contraseñas no coinciden.';

  return errors;
}

export function validateLogin(input: LoginValues): Pick<ValidationErrors, 'email' | 'password'> {
  const errors: Pick<ValidationErrors, 'email' | 'password'> = {};
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  if (!input.password) errors.password = 'Ingresa tu contraseña.';

  return errors;
}
