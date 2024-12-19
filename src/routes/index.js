const express = require('express');
const urlRoutes = require('./urlRoutes'); // Import URL routes

const router = express.Router();

// Register route modules
router.use('/api', urlRoutes); // All URL routes under /api

module.exports = router;
