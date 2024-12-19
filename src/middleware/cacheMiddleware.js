const redisClient = require('../config/redis');
const cacheMiddleware = async (req, res, next) => {
  const { alias } = req.params;

  try {
    // Check if the short URL alias exists in Redis
    const cachedUrl = await redisClient.get(alias);

    if (cachedUrl) {
      console.log('Cache hit!!');
      // Attach cached long URL to the request object
      req.cachedUrl = cachedUrl;
    } else {
      console.log('Cache miss!!');
    }

    next(); // Pass control to the next middleware/controller
  } catch (err) {
    console.error('Error accessing Redis:', err);
    next(); // Proceed to the controller in case of Redis failure
  }
};

module.exports = cacheMiddleware;
