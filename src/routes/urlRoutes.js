const express = require('express');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const { createShortURL, redirectToLongURL } = require('../controllers/url/urlController');
const cacheMiddleware = require('../middleware/cacheMiddleware'); // Import cache middleware
const createShortURLLimiter = require('../middleware/rateLimiter');
const router = express.Router();




// Route: POST /api/shorten
router.post('/shorten', ensureAuthenticated, createShortURLLimiter, createShortURL);
router.get('/shorten/:alias', cacheMiddleware, redirectToLongURL);

module.exports = router;
