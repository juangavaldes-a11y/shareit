const moduleService = require('../services/module.service');

const getCapabilities = async (_req, res, next) => {
  try {
    const enabledModules = await moduleService.listEnabledModuleKeys();
    res.status(200).json({ enabledModules });
  } catch (error) {
    next(error);
  }
};

const getModules = async (_req, res, next) => {
  try {
    res.status(200).json(await moduleService.listModules());
  } catch (error) {
    next(error);
  }
};

const updateModule = async (req, res, next) => {
  try {
    const module = await moduleService.setModuleEnabled(req.params.key, req.body.enabled, req.user.id);
    res.status(200).json(module);
  } catch (error) {
    next(error);
  }
};

const getModuleAuditLogs = async (req, res, next) => {
  try {
    res.status(200).json(await moduleService.listModuleAuditLogs(req.params.key));
  } catch (error) {
    next(error);
  }
};

module.exports = { getCapabilities, getModuleAuditLogs, getModules, updateModule };