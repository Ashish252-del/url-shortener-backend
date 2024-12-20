module.exports = {
  ensureAuthenticated: (req, res, next) => {          
    if (req.isAuthenticated && req.isAuthenticated()) {
      // User is authenticated
      return next();
    }
    if (process.env.NODE_ENV === 'development') {
      // Mock user for testing
      req.user = {
        id: 1, 
        name: 'Ashish Patel',
        email: 'ashishpatel3946@gmail.com',
      };
      return next();
    }   
    // User is not authenticated, return 401 Unauthorized
    return res.status(401).json({
      message: 'Unauthorized. Please log in to access this resource.',
    });
  },

  ensureGuest: (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      // User is not authenticated
      return next();
    }
    // User is authenticated, redirect to another page
    return res.redirect('/');
  },
};
