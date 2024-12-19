require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('./src/config/googleAuth'); // Google OAuth configuration
require('./src/models'); // Import models (initializes models automatically)
const routes = require('./src/routes'); // Centralized routes entry

const app = express();

// Middleware to parse JSON requests
app.use(express.json());

// Middleware to parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// Middleware for cookies
app.use(require('cookie-parser')());

// Session middleware (properly configured)
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'mysecret', // Use a secure secret in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1 * 60 * 60 * 1000, // 1 hour in milliseconds
      httpOnly: true, // Prevent JavaScript access to the cookie
      secure: false, // Set true in production with HTTPS
    },
  })
);

// Passport Middleware (after session)
app.use(passport.initialize());
app.use(passport.session());

// Register all routes
app.use('/', routes);

// Test Route
app.get('/', (req, res) => {
  res.send('Welcome to the URL Shortener API!');
});

// Google OAuth Routes
app.get(
  '/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get(
  '/api/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.send(`Welcome, ${req.user.name}! You are successfully authenticated.`);
  }
);

app.get('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Error logging out' });

    // Destroy the session
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: 'Error destroying session' });
      
      res.clearCookie('connect.sid'); // Clear the session cookie
      res.send('Logged out successfully!');
    });
  });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}!!`);
});
