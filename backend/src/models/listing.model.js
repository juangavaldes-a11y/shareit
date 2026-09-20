const { DataTypes, Model } = require('sequelize');

class Listing extends Model {}

const initListingModel = (sequelize) => {
  Listing.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      title: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(80),
        allowNull: false,
        defaultValue: 'general',
      },
      pricePerDay: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING(120),
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      isAvailable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'Listing',
      tableName: 'listings',
      underscored: true,
      timestamps: true,
    }
  );

  return Listing;
};

module.exports = { Listing, initListingModel };
