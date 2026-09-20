const sequelize = require('../db/sequelize');
const { initUserModel, User } = require('./user.model');
const { initListingModel, Listing } = require('./listing.model');
const { initModuleModel, AppModule } = require('./module.model');
const { initModuleAuditLogModel, ModuleAuditLog } = require('./module-audit-log.model');

const initModels = () => {
  initUserModel(sequelize);
  initListingModel(sequelize);
  initModuleModel(sequelize);
  initModuleAuditLogModel(sequelize);

  User.hasMany(Listing, {
    foreignKey: 'ownerId',
    as: 'listings',
  });

  Listing.belongsTo(User, {
    foreignKey: 'ownerId',
    as: 'owner',
  });

  AppModule.hasMany(ModuleAuditLog, {
    foreignKey: 'moduleKey',
    as: 'auditLogs',
  });

  ModuleAuditLog.belongsTo(AppModule, {
    foreignKey: 'moduleKey',
    as: 'module',
  });

  User.hasMany(ModuleAuditLog, {
    foreignKey: 'actorId',
    as: 'moduleChanges',
  });

  ModuleAuditLog.belongsTo(User, {
    foreignKey: 'actorId',
    as: 'actor',
  });
};

module.exports = {
  sequelize,
  initModels,
  User,
  Listing,
  AppModule,
  ModuleAuditLog,
};
