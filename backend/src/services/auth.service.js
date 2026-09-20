const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const ApiError = require('../utils/api-error');
const { signAccessToken } = require('../utils/jwt');

const selfRegistrationRoles = new Set(['renter', 'owner']);

const validateCredentials = ({ fullName, email, password }, requiresName) => {
  if ((requiresName && (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.trim().length > 120))
    || typeof email !== 'string'
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || typeof password !== 'string'
    || password.length < 12
    || password.length > 128) {
    throw new ApiError(400, 'Provide a valid email and a password between 12 and 128 characters');
  }
};

const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const register = async ({ fullName, email, password, role = 'renter' }) => {
  validateCredentials({ fullName, email, password }, true);

  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : '';
  if (!selfRegistrationRoles.has(normalizedRole)) {
    throw new ApiError(400, 'Invalid role');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await userRepository.findUserByEmail(normalizedEmail);
  if (existing) {
    throw new ApiError(409, 'Email already in use');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userRepository.createUser({
    fullName: fullName.trim(),
    email: normalizedEmail,
    passwordHash,
    role: normalizedRole,
  });

  return {
    user: sanitizeUser(user),
    token: signAccessToken(user),
  };
};

const login = async ({ email, password }) => {
  validateCredentials({ email, password }, false);

  const user = await userRepository.findUserByEmail(email.trim().toLowerCase());
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  return {
    user: sanitizeUser(user),
    token: signAccessToken(user),
  };
};

module.exports = {
  register,
  login,
  sanitizeUser,
};
