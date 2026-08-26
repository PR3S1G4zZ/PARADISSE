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

export const validateEmail = (email: string): string | undefined =>
  /^\S+@\S+\.\S+$/.test(email) ? undefined : 'Ingresa un correo válido.';

export function validateRegistration(input: RegistrationValues): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!input.name.trim()) errors.name = 'Ingresa tu nombre.';
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  if (input.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  if (input.confirmation !== input.password) errors.confirmation = 'Las contraseñas no coinciden.';

  return errors;
}

export function validateLogin(input: LoginValues): Pick<ValidationErrors, 'email' | 'password'> {
  const errors: Pick<ValidationErrors, 'email' | 'password'> = {};
  const emailError = validateEmail(input.email);
  if (emailError) errors.email = emailError;
  if (!input.password) errors.password = 'Ingresa tu contraseña.';

  return errors;
}
