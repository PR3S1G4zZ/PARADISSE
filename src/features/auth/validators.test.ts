import { getPasswordStrength, validateLogin, validateRegistration } from './validators';

test('returns a required email message for an empty login email', () => {
  expect(validateLogin({ email: '  ', password: '' })).toEqual({
    email: 'Ingresa tu correo electrónico.',
    password: 'Ingresa tu contraseña.',
  });
});

test('classifies password strength using length and character variety', () => {
  expect(getPasswordStrength('abc')).toBe('weak');
  expect(getPasswordStrength('Viaje2026')).toBe('medium');
  expect(getPasswordStrength('ViajeSeguro2026!')).toBe('strong');
});

test('keeps registration validation focused on the fields the user must fix', () => {
  expect(validateRegistration({
    name: ' Ana ',
    email: 'ana@example.com',
    password: 'Viaje2026',
    confirmation: 'Viaje2026-no',
  })).toEqual({ confirmation: 'Las contraseñas no coinciden.' });
});
