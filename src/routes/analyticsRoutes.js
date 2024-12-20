const express = require('express');
const { ensureAuthenticated } = require('../middleware/authMiddleware');
const {
  getAnalyticsByAlias,
  getAnalyticsByTopic,
  getOverallAnalytics,
} = require('../controllers/url/analyticsController');

const router = express.Router();

// Get overall analytics for all URLs created by the user
router.get('/overall', ensureAuthenticated, getOverallAnalytics);

// Get analytics for a specific short URL
router.get('/:alias', ensureAuthenticated, getAnalyticsByAlias);

// Get analytics for a specific topic
router.get('/topic/:topic', ensureAuthenticated, getAnalyticsByTopic);



module.exports = router;
