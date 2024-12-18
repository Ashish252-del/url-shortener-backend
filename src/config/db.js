const { Sequelize } = require('sequelize');
const config = require('./config'); // Import the config.js file
const mysql = require('mysql2/promise'); // For raw database creation queries

// Determine the current environment
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Function to create the database if it doesn't exist
const createDatabase = async () => {
  try {
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port || 3306,
      user: dbConfig.username,
      password: dbConfig.password,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
    console.log(`Database "${dbConfig.database}" ensured to exist.`);
    await connection.end();
  } catch (err) {
    console.error('Unable to create database:', err.message);
    process.exit(1);
  }
};

// Initialize Sequelize instance
const initializeSequelize = async () => {
  await createDatabase(); // Ensure the database exists first

  const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port || 3306,
      dialect: dbConfig.dialect,
      logging: false,
    }
  );

  return sequelize;
};

module.exports = initializeSequelize;
