const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 128;

const asString = (value) => (typeof value === 'string' ? value : '');

export function normalizeEmail(email) {
  return asString(email).trim().toLowerCase();
}

export function validateRegisterBody(body = {}) {
  const name = asString(body.name).trim();
  const email = normalizeEmail(body.email);
  const password = asString(body.password);

  if (!name) return { error: 'Ingresa tu nombre.' };
  if (name.length > MAX_NAME) return { error: 'El nombre es demasiado largo.' };
  if (!email) return { error: 'Ingresa tu correo electrónico.' };
  if (email.length > MAX_EMAIL || !EMAIL_PATTERN.test(email)) {
    return { error: 'Ingresa un correo válido.' };
  }
  if (!password) return { error: 'Ingresa una contraseña.' };
  if (password.length < MIN_PASSWORD) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  if (password.length > MAX_PASSWORD) {
    return { error: 'La contraseña es demasiado larga.' };
  }

  return { name, email, password };
}

export function validateLoginBody(body = {}) {
  const email = normalizeEmail(body.email);
  const password = asString(body.password);

  if (!email) return { error: 'Ingresa tu correo electrónico.' };
  if (email.length > MAX_EMAIL || !EMAIL_PATTERN.test(email)) {
    return { error: 'Ingresa un correo válido.' };
  }
  if (!password) return { error: 'Ingresa tu contraseña.' };
  if (password.length > MAX_PASSWORD) {
    return { error: 'La contraseña es demasiado larga.' };
  }

  return { email, password };
}
