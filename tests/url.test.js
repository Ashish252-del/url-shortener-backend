const chai = require('chai');
const sinon = require('sinon');
const { expect } = chai;
const { createShortURL, redirectToLongURL } = require('../src/controllers/url/urlController');

describe('URL Controller', () => {
  let req, res, models, redisClient;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      protocol: 'http',
      get: sinon.stub().returns('localhost:3000'),
      user: { id: 1 }, // Mock user object
      headers: {"user-agent":sinon.stub()},
      connection:{"remoteAddress":sinon.stub()}
    }
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub().returnsThis(),
      redirect: sinon.stub(),
    };

    // Mock models
    models = {
      Url: {
        create: sinon.stub(),
        findOne: sinon.stub(),
      },
      Analytics: {
        findOne: sinon.stub(),
        create: sinon.stub(),
        save: sinon.stub(), // Stub the save method

      },
    };

    // Mock Redis client
    redisClient = {
      get: sinon.stub(),
      set: sinon.stub(),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('createShortURL', () => {
    it('should create a short URL and return it', async () => {
      req.body.longUrl = 'https://example.com';
      const mockUrl = { shortAlias: 'short123', createdAt: new Date() };
      models.Url.create.resolves(mockUrl);

      const controller = createShortURL(models, redisClient);
      await controller(req, res);

      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWith({
        message: 'Short URL created successfully',
        shortUrl: 'http://localhost:3000/api/shorten/short123',
        createdAt: mockUrl.createdAt,
      })).to.be.true;
    });

    it('should return an error if long URL is not provided', async () => {
      const controller = createShortURL(models, redisClient);
      await controller(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'Long URL is required' })).to.be.true;
    });

    it('should return an error if the alias is reserved', async () => {
      req.body.longUrl = 'https://example.com';
      req.body.customAlias = 'overall'; // Reserved alias
      const controller = createShortURL(models, redisClient);
      await controller(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'Alias "overall" is reserved and cannot be used.' })).to.be.true;
    });

    it('should return an error if the custom alias already exists', async () => {
      req.body.longUrl = 'https://example.com';
      req.body.customAlias = 'short123'; // Existing alias
      models.Url.findOne.resolves({}); // Simulate existing alias

      const controller = createShortURL(models, redisClient);
      await controller(req, res);

      expect(res.status.calledWith(409)).to.be.true;
      expect(res.json.calledWith({ message: 'Custom alias already exists' })).to.be.true;
    });

    it('should handle server errors gracefully', async () => {
      req.body.longUrl = 'https://example.com';
      models.Url.create.rejects(new Error('Database error')); // Simulate a database error

      const controller = createShortURL(models, redisClient);
      await controller(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: 'Server error' })).to.be.true;
    });
  });

  describe('redirectToLongURL', () => {
    it('should redirect to the long URL if alias exists in cache', async () => {
      req.params.alias = 'short123';
      const mockCachedData = JSON.stringify({ longUrl: 'https://example.com', urlId: 1 });
      redisClient.get.resolves(mockCachedData); // Simulate cache hit

      const controller = redirectToLongURL(models, redisClient);
      await controller(req, res);

      expect(res.redirect.calledWith('https://example.com')).to.be.true;
    });

    it('should redirect to the long URL if alias exists in database', async () => {
      req.params.alias = 'short123';
      redisClient.get.resolves(null); // Simulate cache miss
      const mockUrl = { longUrl: 'https://example.com', id: 1 };
      models.Url.findOne.resolves(mockUrl); // Simulate database entry
      const controller = redirectToLongURL(models, redisClient);
      await controller(req, res);

      expect(res.redirect.calledWith('https://example.com')).to.be.true;
    });

    it('should return 404 if the alias does not exist in the database', async () => {
      req.params.alias = 'unknownAlias';
      redisClient.get.resolves(null); // Simulate cache miss
      models.Url.findOne.resolves(null); // Simulate no entry in the database

      const controller = redirectToLongURL(models, redisClient);
      await controller(req, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: 'Short URL not found' })).to.be.true;
    });

    it('should handle server errors gracefully when fetching from the database', async () => {
      req.params.alias = 'short123';
      redisClient.get.resolves(null); // Simulate cache miss
      models.Url.findOne.rejects(new Error('Database error')); // Simulate a database error

      const controller = redirectToLongURL(models, redisClient);
      await controller(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: 'Server error' })).to.be.true;
    });

    it('should handle server errors gracefully when accessing Redis', async () => {
      req.params.alias = 'short123';
      redisClient.get.rejects(new Error('Redis error')); // Simulate a Redis error

      const controller = redirectToLongURL(models, redisClient);
      await controller(req, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWith({ message: 'Server error' })).to.be.true;
    });
  });
});