const moduleService = require('../services/module.service');
const ApiError = require('../utils/api-error');

const moduleGuard = (moduleKey) => async (_req, _res, next) => {
  try {
    if (!await moduleService.isModuleEnabled(moduleKey)) {
      throw new ApiError(503, 'This feature is currently unavailable');
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = moduleGuard;