const listingService = require('../services/listing.service');

const createListing = async (req, res, next) => {
  try {
    const listing = await listingService.createListing(req.body, req.user.id);
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

const getAvailableListings = async (req, res, next) => {
  try {
    const options = {
      location: req.query.location,
      category: req.query.category,
      page: req.query.page,
      pageSize: req.query.pageSize,
      sort: req.query.sort,
    };

    const listings = await listingService.listAvailableListings(options);
    res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createListing,
  getAvailableListings,
};
