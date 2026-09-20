'use strict';

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

module.exports = {
  async up(queryInterface) {
    const ownerId = randomUUID();
    const adminId = randomUUID();
    const now = new Date();

    await queryInterface.bulkInsert('users', [
      {
        id: ownerId,
        full_name: 'Sample Owner',
        email: 'owner@shareit.local',
        password_hash: await bcrypt.hash('owner-password-2026', 10),
        role: 'owner',
        created_at: now,
        updated_at: now,
      },
      {
        id: adminId,
        full_name: 'Platform Admin',
        email: 'admin@shareit.local',
        password_hash: await bcrypt.hash('admin-password-2026', 10),
        role: 'admin',
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('listings', [
      {
        id: randomUUID(),
        title: 'Bosch Cordless Drill',
        description: '18V drill with charger and two batteries.',
        category: 'tools',
        price_per_day: 15.0,
        location: 'Madrid',
        image_url: null,
        is_available: true,
        owner_id: ownerId,
        created_at: now,
        updated_at: now,
      },
      {
        id: randomUUID(),
        title: 'Road Bike Trek Domane',
        description: 'Carbon road bike, medium size.',
        category: 'sports',
        price_per_day: 35.0,
        location: 'Barcelona',
        image_url: null,
        is_available: true,
        owner_id: ownerId,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('listings', null, {});
    await queryInterface.bulkDelete('users', {
      email: ['owner@shareit.local', 'admin@shareit.local'],
    });
  },
};
