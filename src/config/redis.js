const redis = require('redis');

let redisClient;

// Function to get or create a Redis connection
const getRedisClient = () => {
  if (!redisClient) {
    // Create a new Redis client if not already initialized
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    // Connect to Redis
    redisClient
      .connect()
      .then(() => console.log('Connected to Redis! 🚀'))
      .catch((err) => console.error('Redis connection error:', err));
  }

  return redisClient; // Return the existing or newly created client
};

module.exports = getRedisClient();
