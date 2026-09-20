const { DataTypes, Model } = require('sequelize');

class AppModule extends Model {}

const initModuleModel = (sequelize) => {
  AppModule.init(
    {
      key: {
        type: DataTypes.STRING(80),
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      isCore: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'AppModule',
      tableName: 'modules',
      underscored: true,
      timestamps: true,
    }
  );

  return AppModule;
};

module.exports = { AppModule, initModuleModel };