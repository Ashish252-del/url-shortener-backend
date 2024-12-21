const express = require('express');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const {
  getAnalyticsByAlias,
  getAnalyticsByTopic,
  getOverallAnalytics,
} = require('../controllers/url/analyticsController');

const router = express.Router();
const models = require('../models');
const getRedisClient = require('../config/redis'); 
const redisClient = getRedisClient(); 
// Get overall analytics for all URLs created by the user
router.get('/overall', ensureAuthenticated, getOverallAnalytics(models));

// Get analytics for a specific short URL
router.get('/:alias', ensureAuthenticated, getAnalyticsByAlias(models,redisClient));

// Get analytics for a specific topic
router.get('/topic/:topic', ensureAuthenticated, getAnalyticsByTopic(models));



module.exports = router;
