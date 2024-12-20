const models = require('../../models');

// Get analytics for a specific short URL
const getAnalyticsByAlias = async (req, res) => {
  try {
    const { alias } = req.params;

    // Find the URL entry
    const urlEntry = await models.Url.findOne({ where: { shortAlias: alias } });

    if (!urlEntry) {
      return res.status(404).json({ message: 'Short URL not found' });
    }

    // Fetch analytics for the URL
    const analyticsData = await models.Analytics.findAll({
      where: { urlId: urlEntry.id },
    });

    return res.status(200).json({
      message: 'Analytics fetched successfully',
      url: urlEntry,
      analytics: analyticsData,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get analytics for URLs grouped by a topic
const getAnalyticsByTopic = async (req, res) => {
  try {
    const { topic } = req.params;
    const userId = req.user.id;

    // Find all URLs under the topic
    const urls = await models.Url.findAll({
      where: { topic, userId },
    });

    if (!urls.length) {
      return res.status(404).json({ message: 'No URLs found under this topic' });
    }

    // Fetch analytics for all URLs under the topic
    const urlIds = urls.map((url) => url.id);
    const analyticsData = await models.Analytics.findAll({
      where: { urlId: urlIds },
    });

    return res.status(200).json({
      message: 'Analytics for topic fetched successfully',
      topic,
      urls,
      analytics: analyticsData,
    });
  } catch (error) {
    console.error('Error fetching topic analytics:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// Get overall analytics for all URLs created by the user
const getOverallAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all URLs created by the user
    const urls = await models.Url.findAll({ where: { userId } });

    if (!urls.length) {
      return res.status(404).json({ message: 'No URLs found for this user' });
    }

    // Fetch analytics for all URLs created by the user
    const urlIds = urls.map((url) => url.id);
    const analyticsData = await models.Analytics.findAll({
      where: { urlId: urlIds },
    });

    return res.status(200).json({
      message: 'Overall analytics fetched successfully',
      urls,
      analytics: analyticsData,
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
