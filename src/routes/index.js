const express = require('express');
const urlRoutes = require('./urlRoutes'); // Import URL routes
const analyticsRoutes = require('./analyticsRoutes');

const router = express.Router();

// Register route modules
router.use('/api', urlRoutes); // All URL routes under /api
router.use('/api/analytics', analyticsRoutes);

module.exports = router;
