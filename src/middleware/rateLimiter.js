// Rate Limiting Middleware
const rateLimit = require('express-rate-limit');
const createShortURLLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Limit each user to 5 requests per windowMs
    message: 'Too many requests, please try again later.',
  });

  module.exports = createShortURLLimiter;