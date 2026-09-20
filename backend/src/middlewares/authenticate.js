const ApiError = require('../utils/api-error');
const { verifyAccessToken } = require('../utils/jwt');
const userRepository = require('../repositories/user.repository');
const { accessTokenCookieName } = require('../utils/auth-cookie');

const authenticate = async (req, _res, next) => {
  try {
    const token = req.cookies?.[accessTokenCookieName];

    if (!token) {
      throw new ApiError(401, 'Missing or invalid authorization token');
    }

    const decoded = verifyAccessToken(token);
    const user = await userRepository.findUserById(decoded.sub);

    if (!user) {
      throw new ApiError(401, 'Invalid token user');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
