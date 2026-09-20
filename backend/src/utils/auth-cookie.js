const env = require('../config/env');

const accessTokenCookieName = 'shareit_access_token';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.nodeEnv === 'production',
  path: '/',
};

const setAccessTokenCookie = (res, token) => {
  res.cookie(accessTokenCookieName, token, cookieOptions);
};

const clearAccessTokenCookie = (res) => {
  res.clearCookie(accessTokenCookieName, cookieOptions);
};

module.exports = {
  accessTokenCookieName,
  clearAccessTokenCookie,
  setAccessTokenCookie,
};