module.exports = {
  ensureAuthenticated: (req, res, next) => {          
    if (req.isAuthenticated && req.isAuthenticated()) {
      // User is authenticated
      return next();
    }  
    // User is not authenticated, return 401 Unauthorized
    return res.status(401).json({
      message: 'Unauthorized. Please log in to access this resource.',
    });
  },
};
