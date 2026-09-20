const authService = require('../services/auth.service');
const userRepository = require('../repositories/user.repository');
const { clearAccessTokenCookie, setAccessTokenCookie } = require('../utils/auth-cookie');

const register = async (req, res, next) => {
  try {
    const payload = await authService.register(req.body);
    setAccessTokenCookie(res, payload.token);
    res.status(201).json({ user: payload.user });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const payload = await authService.login(req.body);
    setAccessTokenCookie(res, payload.token);
    res.status(200).json({ user: payload.user });
  } catch (error) {
    next(error);
  }
};

const logout = (_req, res) => {
  clearAccessTokenCookie(res);
  res.status(204).send();
};

const me = async (req, res, next) => {
  try {
    const user = await userRepository.findUserById(req.user.id);

    res.status(200).json(
      authService.sanitizeUser(user)
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  me,
};
