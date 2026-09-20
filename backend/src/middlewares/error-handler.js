const ApiError = require('../utils/api-error');

const errorHandler = (error, req, res, _next) => {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      message: error.message,
    });
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return res.status(401).json({
      message: 'Invalid or expired token',
    });
  }

  req.log?.error({ err: error }, 'Unhandled request error');

  return res.status(500).json({
    message: 'Internal server error',
  });
};

module.exports = errorHandler;
