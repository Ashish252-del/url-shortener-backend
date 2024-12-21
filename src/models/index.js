const initializeSequelize = require('../config/db');
const { Sequelize } = require('sequelize');
// Import models
const UserModel = require('./user');
const UrlModel = require('./url');
const AnalyticsModel = require('./analytics');

const models = {};

(async () => {
  const sequelize = await initializeSequelize();

  // Load models
  models.User = UserModel(sequelize);
  models.Url = UrlModel(sequelize);
  models.Analytics = AnalyticsModel(sequelize);

  // Define associations
  models.User.hasMany(models.Url, { foreignKey: 'userId' });
  models.Url.belongsTo(models.User, { foreignKey: 'userId' });

  models.Url.hasMany(models.Analytics, { foreignKey: 'urlId' });
  models.Analytics.belongsTo(models.Url, { foreignKey: 'urlId' });

  // Synchronize models
  await sequelize.sync({ alter: true }); //{ alter: true }
  console.log('Database synchronized successfully!!');
  Object.keys(models).forEach(model => console.log("models are ",model)
  )
  models.Sequelize = Sequelize;
})();

module.exports = models;
