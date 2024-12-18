const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const models = require('../models');

// Configure Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {

        // Check if the user exists in the database
        let user = await models.User.findOne({ where: { googleId: profile.id } });

        if (!user) {
          // Create new user if not found
          user = await models.User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
          });
          console.log('New user created:', user);
        } else {
        }

        return done(null, user);
      } catch (err) {
        console.error('Error in Google Strategy:', err);
        return done(err, null);
      }
    }
  )
);

// Serialize user into the session
passport.serializeUser((user, done) => {
  done(null, user.id); // Save user ID in the session
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await models.User.findByPk(id); // Fetch user from the database
    if (!user) {
      console.error('User not found during deserialization');
      return done(null, false); // Pass `false` if user not found
    }
    done(null, user); // Attach user object to req.user
  } catch (err) {
    console.error('Error in deserializeUser:', err);
    done(err, null);
  }
});

module.exports = passport;
