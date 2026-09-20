const { User } = require('../models');

const createUser = (payload) => User.create(payload);

const findUserByEmail = (email) => {
  return User.findOne({ where: { email } });
};

const findUserById = (id) => {
  return User.findByPk(id);
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
};
