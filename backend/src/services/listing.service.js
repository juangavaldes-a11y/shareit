const listingRepository = require('../repositories/listing.repository');
const ApiError = require('../utils/api-error');

const maxPageSize = 50;
const sortOptions = {
  newest: [['createdAt', 'DESC']],
  price_asc: [['pricePerDay', 'ASC']],
  price_desc: [['pricePerDay', 'DESC']],
};

const mapListingInput = (input, ownerId) => ({
  title: input.title?.trim(),
  description: input.description?.trim() || null,
  category: input.category?.trim()?.toLowerCase() || 'general',
  pricePerDay: input.pricePerDay,
  location: input.location?.trim(),
  imageUrl: input.imageUrl?.trim() || null,
  ownerId,
});

const validateCreateInput = (input) => {
  if (!input || typeof input !== 'object'
    || typeof input.title !== 'string' || input.title.trim().length < 2 || input.title.trim().length > 150
    || typeof input.location !== 'string' || input.location.trim().length < 2 || input.location.trim().length > 120
    || !Number.isFinite(Number(input.pricePerDay)) || Number(input.pricePerDay) <= 0) {
    throw new ApiError(400, 'Provide a title, location, and positive daily price');
  }

  for (const field of ['description', 'category', 'imageUrl']) {
    if (input[field] !== undefined && typeof input[field] !== 'string') {
      throw new ApiError(400, `${field} must be a string`);
    }
  }
};

const validateFilters = (filters) => {
  const validated = {};

  for (const field of ['location', 'category']) {
    const value = filters[field];
    if (value !== undefined) {
      if (typeof value !== 'string' || value.trim().length > 120) {
        throw new ApiError(400, `Invalid ${field} filter`);
      }
      validated[field] = field === 'category' ? value.trim().toLowerCase() : value.trim();
    }
  }

  return validated;
};

const parsePositiveInteger = (value, defaultValue, field) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (!/^\d+$/.test(value) || Number(value) < 1) {
    throw new ApiError(400, `${field} must be a positive integer`);
  }

  return Number(value);
};

const validateListOptions = (options) => {
  const page = parsePositiveInteger(options.page, 1, 'page');
  const pageSize = parsePositiveInteger(options.pageSize, 12, 'pageSize');
  if (pageSize > maxPageSize) {
    throw new ApiError(400, `pageSize must not exceed ${maxPageSize}`);
  }

  const sort = options.sort || 'newest';
  if (!sortOptions[sort]) {
    throw new ApiError(400, 'Invalid sort option');
  }

  return { page, pageSize, sort };
};

const createListing = async (payload, ownerId) => {
  validateCreateInput(payload);
  return listingRepository.createListing(mapListingInput(payload, ownerId));
};

const listAvailableListings = async (options) => {
  const filters = validateFilters(options);
  const { page, pageSize, sort } = validateListOptions(options);
  const result = await listingRepository.findAvailableListings({
    filters,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: sortOptions[sort],
  });

  return {
    items: result.rows,
    pagination: {
      page,
      pageSize,
      total: result.count,
      totalPages: Math.ceil(result.count / pageSize),
    },
  };
};

module.exports = {
  createListing,
  listAvailableListings,
};
