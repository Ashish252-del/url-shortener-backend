
// Get analytics for a specific short URL
const getAnalyticsByAlias = (models, redisClient) => async (req, res) => {
  try {
    const { alias } = req.params;
    // Check cache first
    let cachedData = await redisClient.get(alias);
    let longUrl, urlId;

    if (cachedData) {
      console.log('Cache hit!!');
      const parsedData = JSON.parse(cachedData);
      longUrl = parsedData.longUrl;
      urlId = parsedData.urlId;
    } else {
      console.log('Cache miss!!');
      // Fetch from the database if cache miss
      const urlEntry = await models.Url.findOne({
        where: { shortAlias: alias, userId: req.user.id },
      });

      if (!urlEntry) {
        return res.status(404).json({ message: 'Short URL not found' });
      }

      longUrl = urlEntry.longUrl;
      urlId = urlEntry.id;

      // Cache the data
      await redisClient.set(alias, JSON.stringify({ longUrl, urlId }), { EX: 3600 });
    }

    // Fetch all analytics data in one query (Batch request)
    const analyticsData = await models.Analytics.findAll({
      where: { urlId },
      raw: true,
    });

    // Get total and unique clicks
    const totalAndUniqueClicks = analyticsData.reduce(
      (acc, entry) => {
        acc.totalClicks += entry.clicks;
        acc.uniqueUsers.add(entry.userId);
        return acc;
      },
      { totalClicks: 0, uniqueUsers: new Set() }
    );

    const { totalClicks, uniqueUsers } = totalAndUniqueClicks;

    // Calculate the date 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Filter data for the last 7 days
    const lastSevenDaysData = analyticsData.filter((entry) => new Date(entry.date) >= sevenDaysAgo);

    // Group by date and calculate total clicks per day
    const clicksByDate = lastSevenDaysData.reduce((acc, entry) => {
      const date = entry.date;
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += entry.clicks;
      return acc;
    }, {});

    const clicksByDateFormatted = Object.entries(clicksByDate).map(([date, clicks]) => ({
      date,
      clicks,
    }));

    // Group by OS type and calculate unique clicks/users
    const osTypeData = analyticsData.reduce((acc, entry) => {
      const os = entry.osType;
      if (!acc[os]) {
        acc[os] = { uniqueClicks: 0, uniqueUsers: new Set() };
      }
      acc[os].uniqueClicks += entry.clicks;
      acc[os].uniqueUsers.add(entry.userId);
      return acc;
    }, {});

    const osType = Object.entries(osTypeData).map(([osName, data]) => ({
      osName,
      uniqueClicks: data.uniqueClicks,
      uniqueUsers: data.uniqueUsers.size,
    }));

    // Group by device type and calculate unique clicks/users
    const deviceTypeData = analyticsData.reduce((acc, entry) => {
      const device = entry.deviceType;
      if (!acc[device]) {
        acc[device] = { uniqueClicks: 0, uniqueUsers: new Set() };
      }
      acc[device].uniqueClicks += entry.clicks;
      acc[device].uniqueUsers.add(entry.userId);
      return acc;
    }, {});

    const deviceType = Object.entries(deviceTypeData).map(([deviceName, data]) => ({
      deviceName,
      uniqueClicks: data.uniqueClicks,
      uniqueUsers: data.uniqueUsers.size,
    }));

    // Send the response
    return res.status(200).json({
      totalClicks,
      uniqueClicks: uniqueUsers.size,
      clicksByDate: clicksByDateFormatted,
      osType,
      deviceType,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getAnalyticsByTopic = (models) => async (req, res) => {
  try {
    const { topic } = req.params;
    const userId = req.user.id; // Assuming the user's ID is available from authentication middleware

    // Step 1: Find all URLs under the topic for the user
    const urls = await models.Url.findAll({
      where: { topic, userId },
      attributes: ['id', 'shortAlias'],
      raw: true,
    });

    if (!urls.length) {
      return res.status(404).json({ message: 'No URLs found under this topic' });
    }

    const urlIds = urls.map((url) => url.id);

    // Step 2: Aggregate analytics data for the topic
    const analyticsData = await models.Analytics.findAll({
      where: { urlId: urlIds },
      attributes: [
        [models.Sequelize.fn('SUM', models.Sequelize.col('clicks')), 'totalClicks'], // Total clicks
        [
          models.Sequelize.fn(
            'COUNT',
            models.Sequelize.fn('DISTINCT', models.Sequelize.col('userId'))
          ),
          'uniqueClicks', // Unique users
        ],
        [models.Sequelize.fn('DATE', models.Sequelize.col('date')), 'date'], // Group by date
        'urlId',
      ],
      group: ['urlId', models.Sequelize.fn('DATE', models.Sequelize.col('date'))],
      raw: true,
    });

    // Step 3: Process aggregated data into required formats
    const clicksByDateMap = analyticsData.reduce((acc, entry) => {
      const { date, totalClicks } = entry;
      if (!acc[date]) acc[date] = 0;
      acc[date] += parseInt(totalClicks, 10);
      return acc;
    }, {});

    const clicksByDate = Object.entries(clicksByDateMap).map(([date, totalClicks]) => ({
      date,
      totalClicks,
    }));

    const urlsWithAnalytics = urls.map((url) => {
      const urlAnalytics = analyticsData.filter((entry) => entry.urlId === url.id);
    
      // Calculate total clicks
      const urlTotalClicks = urlAnalytics.reduce(
        (sum, entry) => sum + parseInt(entry.totalClicks, 10),
        0
      );
    
      // Calculate unique clicks
      const uniqueUserIds = new Set();
      urlAnalytics.forEach((entry) => {
         uniqueUserIds.add(entry.userId); // Add unique userIds from the entry
      });
      const urlUniqueClicks = uniqueUserIds.size;
    
      return {
        shortUrl: `${process.env.BASE_URL}/api/shorten/${url.shortAlias}`,
        totalClicks: urlTotalClicks,
        uniqueClicks: urlUniqueClicks,
      };
    });

    // Calculate total clicks and unique users across all URLs
    const totalClicks = analyticsData.reduce(
      (sum, entry) => sum + parseInt(entry.totalClicks, 10),
      0
    );

    const uniqueClicks = new Set(
      analyticsData.map((entry) => entry.userId)
    ).size;

    // Step 4: Send the final response
    return res.status(200).json({
      totalClicks,
      uniqueClicks,
      clicksByDate,
      urls: urlsWithAnalytics,
    });
  } catch (error) {
    console.error('Error fetching analytics by topic:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getOverallAnalytics = (models) => async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all URLs created by the user
    const urls = await models.Url.findAll({
      where: { userId },
      attributes: ['id', 'shortAlias'],
    });

    if (!urls.length) {
      return res.status(404).json({ message: 'No URLs found for this user' });
    }

    // Fetch analytics for all URLs created by the user
    const urlIds = urls.map((url) => url.id);
    const analyticsData = await models.Analytics.findAll({
      where: { urlId: urlIds },
      attributes: [
        'urlId',
        'userId',
        'clicks',
        'date',
        'osType',
        'deviceType',
      ],
    });

    // Aggregate total clicks and unique clicks across all URLs
    const totalClicks = analyticsData.reduce((sum, entry) => sum + entry.clicks, 0);
    const uniqueUserIds = new Set();
    analyticsData.forEach((entry) => entry.userId && uniqueUserIds.add(entry.userId));
    const uniqueClicks = uniqueUserIds.size;

    // Aggregate clicks by date
    const clicksByDate = analyticsData.reduce((acc, entry) => {
      const date = entry.date.split('T')[0]; // Use just the date (exclude time)
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += entry.clicks;
      return acc;
    }, {});

    const clicksByDateArray = Object.entries(clicksByDate).map(([date, totalClicks]) => ({
      date,
      totalClicks,
    }));

    // Aggregate OS type clicks (unique clicks and unique users per OS)
    const osType = analyticsData.reduce((acc, entry) => {
      const os = entry.osType;
      if (!acc[os]) {
        acc[os] = { uniqueClicks: 0, uniqueUsers: new Set() };
      }
      acc[os].uniqueClicks += entry.clicks;
      acc[os].uniqueUsers.add(entry.userId);
      return acc;
    }, {});

    const osTypeArray = Object.entries(osType).map(([osName, data]) => ({
      osName,
      uniqueClicks: data.uniqueClicks,
      uniqueUsers: data.uniqueUsers.size,
    }));

    // Aggregate device type clicks (unique clicks and unique users per device)
    const deviceType = analyticsData.reduce((acc, entry) => {
      const device = entry.deviceType;
      if (!acc[device]) {
        acc[device] = { uniqueClicks: 0, uniqueUsers: new Set() };
      }
      acc[device].uniqueClicks += entry.clicks;
      acc[device].uniqueUsers.add(entry.userId);
      return acc;
    }, {});

    const deviceTypeArray = Object.entries(deviceType).map(([deviceName, data]) => ({
      deviceName,
      uniqueClicks: data.uniqueClicks,
      uniqueUsers: data.uniqueUsers.size,
    }));

    // Return the response
    return res.status(200).json({
      totalUrls: urls.length,
      totalClicks,
      uniqueClicks,
      clicksByDate: clicksByDateArray,
      osType: osTypeArray,
      deviceType: deviceTypeArray,
    });
  } catch (error) {
    console.error('Error fetching overall analytics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getAnalyticsByAlias,
  getAnalyticsByTopic,
  getOverallAnalytics,
};
