const { AppModule, ModuleAuditLog, sequelize } = require('../models');
const ApiError = require('../utils/api-error');

const serializeModule = (module) => ({
  key: module.key,
  name: module.name,
  description: module.description,
  enabled: module.enabled,
  isCore: module.isCore,
  updatedAt: module.updatedAt,
});

const listModules = async () => {
  const modules = await AppModule.findAll({ order: [['name', 'ASC']] });
  return modules.map(serializeModule);
};

const listEnabledModuleKeys = async () => {
  const modules = await AppModule.findAll({
    where: { enabled: true },
    attributes: ['key'],
  });

  return modules.map((module) => module.key);
};

const isModuleEnabled = async (moduleKey) => {
  const module = await AppModule.findByPk(moduleKey, { attributes: ['enabled'] });
  return module?.enabled === true;
};

const setModuleEnabled = async (moduleKey, enabled, actorId) => {
  if (typeof enabled !== 'boolean') {
    throw new ApiError(400, 'enabled must be a boolean');
  }

  return sequelize.transaction(async (transaction) => {
    const module = await AppModule.findByPk(moduleKey, { transaction, lock: transaction.LOCK.UPDATE });
    if (!module) {
      throw new ApiError(404, 'Module not found');
    }
    if (module.isCore) {
      throw new ApiError(400, 'Core modules cannot be disabled');
    }

    const previousEnabled = module.enabled;
    await module.update({ enabled }, { transaction });

    if (previousEnabled !== enabled) {
      await ModuleAuditLog.create({
        moduleKey,
        actorId,
        previousEnabled,
        enabled,
      }, { transaction });
    }

    return serializeModule(module);
  });
};

const listModuleAuditLogs = async (moduleKey) => {
  const module = await AppModule.findByPk(moduleKey, { attributes: ['key'] });
  if (!module) {
    throw new ApiError(404, 'Module not found');
  }

  const auditLogs = await ModuleAuditLog.findAll({
    where: { moduleKey },
    include: [{
      association: 'actor',
      attributes: ['id', 'fullName', 'email'],
    }],
    order: [['createdAt', 'DESC']],
    limit: 20,
  });

  return auditLogs.map((auditLog) => ({
    id: auditLog.id,
    previousEnabled: auditLog.previousEnabled,
    enabled: auditLog.enabled,
    createdAt: auditLog.createdAt,
    actor: auditLog.actor,
  }));
};

module.exports = {
  listModules,
  listEnabledModuleKeys,
  isModuleEnabled,
  listModuleAuditLogs,
  setModuleEnabled,
};