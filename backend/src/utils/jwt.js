const jwt = require('jsonwebtoken');
const env = require('../config/env');

const signAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn }
  );
};

const verifyAccessToken = (token) => jwt.verify(token, env.jwt.secret);

module.exports = {
  signAccessToken,
  verifyAccessToken,
};
