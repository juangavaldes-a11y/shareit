'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('listings', ['is_available', 'created_at'], {
      name: 'listings_available_created_at_idx',
    });
    await queryInterface.addIndex('listings', ['is_available', 'price_per_day'], {
      name: 'listings_available_price_per_day_idx',
    });
    await queryInterface.addIndex('listings', ['is_available', 'category', 'location'], {
      name: 'listings_available_category_location_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('listings', 'listings_available_category_location_idx');
    await queryInterface.removeIndex('listings', 'listings_available_price_per_day_idx');
    await queryInterface.removeIndex('listings', 'listings_available_created_at_idx');
  },
};