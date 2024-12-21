const chai = require('chai');
const sinon = require('sinon');
const { expect } = chai;
const {
  getAnalyticsByAlias,
  getAnalyticsByTopic,
  getOverallAnalytics
} = require('../src/controllers/url/analyticsController');

describe('Analytics Controller', () => {
  let req, res, models;

  beforeEach(() => {
    req = {
      params: {},
      user: { id: 1 }, // Mock user object
    };
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
    };

    // Mock models
    models = {
      Url: {
        findOne: sinon.stub(),
        findAll: sinon.stub(),
      },
      Analytics: {
        findAll: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getAnalyticsByAlias', () => {
    it('should fetch analytics for a valid alias', async () => {
      req.params.alias = 'short123';
      const mockUrl = { id: 1, shortAlias: 'short123' };
      const mockAnalytics = [{ urlId: 1, clicks: 10 }];
      models.Url.findOne.resolves(mockUrl);
      models.Analytics.findAll.resolves(mockAnalytics);

      const controller = getAnalyticsByAlias(models);
      await controller(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.calledWith({
        message: 'Analytics fetched successfully',
        url: mockUrl,
        analytics: mockAnalytics,
      })).to.be.true;
    });

    it('should return 404 if the alias does not exist', async () => {
      req.params.alias = 'unknownAlias';
      models.Url.findOne.resolves(null); // Simulate no URL found

      const controller = getAnalyticsByAlias(models);
      await controller(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.calledWith({ message: 'Short URL not found' })).to.be.true;
    });

    it('should handle server errors gracefully', async () => {
      req.params.alias = 'short123';
      models.Url.findOne.rejects(new Error('Database error')); // Simulate database error

      const controller = getAnalyticsByAlias(models);
      await controller(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.calledWith({ message: 'Server error' })).to.be.true;
    });
  });

  describe('getAnalyticsByTopic', () => {
    it('should fetch analytics for URLs under a topic', async () => {
      req.params.topic = 'technology';
      const mockUrls = [{ id: 1, topic: 'technology', userId: 1 }];
      const mockAnalytics = [{ urlId: 1, clicks: 10 }];
      models.Url.findAll.resolves(mockUrls);
      models.Analytics.findAll.resolves(mockAnalytics);

      const controller = getAnalyticsByTopic(models);
      await controller(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.calledWith({
        message: 'Analytics for topic fetched successfully',
        topic: 'technology',
        urls: mockUrls,
        analytics: mockAnalytics,
      })).to.be.true;
    });

    it('should return 404 if no URLs are found under the topic', async () => {
      req.params.topic = 'unknownTopic';
      models.Url.findAll.resolves([]); // Simulate no URLs found

      const controller = getAnalyticsByTopic(models);
      await controller(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.calledWith({ message: 'No URLs found under this topic' })).to.be.true;
    });

    it('should handle server errors gracefully', async () => {
      req.params.topic = 'technology';
      models.Url.findAll.rejects(new Error('Database error')); // Simulate database error

      const controller = getAnalyticsByTopic(models);
      await controller(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.calledWith({ message: 'Server error' })).to.be.true;
    });
  });

  describe('getOverallAnalytics', () => {
    it('should fetch overall analytics for all URLs created by the user', async () => {
      const mockUrls = [{ id: 1, userId: 1 }];
      const mockAnalytics = [{ urlId: 1, clicks: 10 }];
      models.Url.findAll.resolves(mockUrls);
      models.Analytics.findAll.resolves(mockAnalytics);

      const controller = getOverallAnalytics(models);
      await controller(req, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.calledWith({
        message: 'Overall analytics fetched successfully',
        urls: mockUrls,
        analytics: mockAnalytics,
      })).to.be.true;
    });

    it('should return 404 if no URLs are found for the user', async () => {
      models.Url.findAll.resolves([]); // Simulate no URLs found

      const controller = getOverallAnalytics(models);
      await controller(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.calledWith({ message: 'No URLs found for this user' })).to.be.true;
    });

    it('should handle server errors gracefully', async () => {
      models.Url.findAll.rejects(new Error('Database error')); // Simulate database error

      const controller = getOverallAnalytics(models);
      await controller(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.calledWith({ message: 'Server error' })).to.be.true;
    });
  });
});
