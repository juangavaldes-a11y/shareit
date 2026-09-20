const { Listing, User } = require('../models');

const createListing = (payload) => Listing.create(payload);

const findAvailableListings = ({ filters = {}, limit, offset, order }) => {
  const where = { isAvailable: true };

  if (filters.location) {
    where.location = filters.location;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  return Listing.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'owner',
        attributes: ['id', 'fullName', 'email', 'role'],
      },
    ],
    order,
    limit,
    offset,
    distinct: true,
  });
};

module.exports = {
  createListing,
  findAvailableListings,
};
