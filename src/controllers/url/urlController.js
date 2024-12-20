const models = require('../../models');
const { v4: uuidv4 } = require('uuid');
const UAParser = require('ua-parser-js'); // For user-agent parsing
const geoip = require('geoip-lite'); // For geolocation
const parser = new UAParser();
const getRedisClient = require('../../config/redis');
const redisClient = getRedisClient();
const RESERVED_ALIASES = ['overall', 'topic'];

const createShortURL = async (req, res) => {
  try {
    const { longUrl, customAlias, topic } = req.body;

    // Validate input
    if (!longUrl) {
      return res.status(400).json({ message: 'Long URL is required' });
    }

    // Generate a unique alias if customAlias is not provided
    let alias = customAlias ||uuidv4().slice(0, 8); // Default alias length is 8 characters
    
    if (RESERVED_ALIASES.includes(alias)) {
      return res.status(400).json({ message: `Alias "${alias}" is reserved and cannot be used.` });
    }
    // Check if the alias already exists
    const existingURL = await models.Url.findOne({ where: { shortAlias: alias } });
    if (existingURL) {
      return res.status(409).json({ message: 'Custom alias already exists' });
    }

    // Save the new short URL in the database
    const newURL = await models.Url.create({
      longUrl,
      shortAlias: alias,
      topic: topic || null,
      userId: req.user.id, // Assuming req.user is available after authMiddleware
    });

    const shortUrl = `${req.protocol}://${req.get('host')}/api/shorten/${alias}`;

    return res.status(201).json({
      message: 'Short URL created successfully',
      shortUrl,
      createdAt: newURL.createdAt,
    });
  } catch (error) {
    console.error('Error creating short URL:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const redirectToLongURL = async (req, res) => {
  try {
    const { alias } = req.params;

    let cachedData = await redisClient.get(alias);
    let longUrl, urlId;

    if (cachedData) {
      console.log('Cache hit!!');
      const parsedData = JSON.parse(cachedData);
      longUrl = parsedData.longUrl;
      urlId = parsedData.urlId;
    } else {
      console.log('Cache miss!!');

      // Fetch the URL from the database
      const urlEntry = await models.Url.findOne({ where: { shortAlias: alias } });

      if (!urlEntry) {
        return res.status(404).json({ message: 'Short URL not found' });
      }

      longUrl = urlEntry.longUrl;
      urlId = urlEntry.id;

      // Cache the long URL and ID in Redis for future requests
      await redisClient.set(
        alias,
        JSON.stringify({ longUrl, urlId }),
        { EX: 3600 } // Cache expiry time in seconds (1 hour)
      );
    }

    // Parse user-agent for analytics
    const ua = req.headers['user-agent'];
    const uaResult = parser.setUA(ua).getResult();

    // Get the user's IP address
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    // Fetch geolocation data
    const geo = geoip.lookup(ip) || {}; // geoip-lite returns { country, region, city }
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Check if an analytics record exists for the same URL and date
    let analyticsEntry = await models.Analytics.findOne({
      where: {
        urlId,
        date: today,
        osType: uaResult.os.name || 'Unknown',
        deviceType: uaResult.device.type || 'Desktop',
      },
    });

    if (analyticsEntry) {
      // Increment clicks
      analyticsEntry.clicks += 1;
      await analyticsEntry.save();
    } else {
      // Create a new analytics entry
      await models.Analytics.create({
        urlId,
        clicks: 1,
        uniqueUsers: 1, // Adjust logic for unique users later
        osType: uaResult.os.name || 'Unknown',
        deviceType: uaResult.device.type || 'Desktop',
        ipAddress: ip || 'Unknown',
        country: geo.country || 'Unknown',
        region: geo.region || 'Unknown',
        city: geo.city || 'Unknown',
        date: today,
      });
    }

    // Redirect to the long URL
    return res.redirect(longUrl);
  } catch (error) {
    console.error('Error redirecting to long URL:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};


module.exports = { createShortURL, redirectToLongURL };
