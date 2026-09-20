const { DataTypes, Model } = require('sequelize');

class ModuleAuditLog extends Model {}

const initModuleAuditLogModel = (sequelize) => {
  ModuleAuditLog.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      moduleKey: {
        type: DataTypes.STRING(80),
        allowNull: false,
      },
      actorId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      previousEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ModuleAuditLog',
      tableName: 'module_audit_logs',
      underscored: true,
      createdAt: 'createdAt',
      updatedAt: false,
    }
  );

  return ModuleAuditLog;
};

module.exports = { ModuleAuditLog, initModuleAuditLogModel };