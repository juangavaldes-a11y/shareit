const bcrypt = require('bcryptjs');
const { sequelize, initModels, User } = require('../models');

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'Platform Administrator';

const run = async () => {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    || !password || password.length < 12 || password.length > 128) {
    throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD between 12 and 128 characters');
  }

  initModels();
  await sequelize.authenticate();

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.findOne({ where: { email } });

  if (user) {
    await user.update({ fullName, passwordHash, role: 'admin' });
  } else {
    await User.create({ fullName, email, passwordHash, role: 'admin' });
  }

  console.log(`Administrator provisioned for ${email}`);
};

run()
  .catch((error) => {
    console.error('Unable to provision administrator:', error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());