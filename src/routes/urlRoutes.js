const express = require('express');
const { createShortURL, redirectToLongURL } = require('../controllers/url/urlController');
const cacheMiddleware = require('../middleware/cacheMiddleware'); // Import cache middleware
const createShortURLLimiter = require('../middleware/rateLimiter');
const router = express.Router();
const models = require('../models'); 
 const getRedisClient = require('../config/redis'); 
 const redisClient = getRedisClient(); 



// Route: POST /api/shorten
router.post('/shorten', createShortURLLimiter, createShortURL(models,redisClient));
router.get('/shorten/:alias', cacheMiddleware, redirectToLongURL(models,redisClient));

module.exports = router;
