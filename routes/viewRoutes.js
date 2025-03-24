const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const bookingController = require('../controllers/bookingController');

const router = express.Router();

// Add this new route for the landing page
router.get(
  '/landing',
  authController.isLoggedIn,
  viewsController.getLandingPage
);

// Modify the root route to redirect to the landing page for new visitors
// or to the overview page for returning visitors (using a cookie)
router.get(
  '/',
  (req, res, next) => {
    // Check if user has visited before
    if (req.cookies.visited) {
      // User has visited before, proceed to overview
      next();
    } else {
      // Set a cookie to remember the visit
      res.cookie('visited', 'true', {
        expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        httpOnly: true,
      });
      // Redirect to landing page
      res.redirect('/landing');
    }
  },
  bookingController.createBookingCheckout,
  authController.isLoggedIn,
  viewsController.getOverview
);

router.get('/tour/:slug', authController.isLoggedIn, viewsController.getTour);
router.get('/login', authController.isLoggedIn, viewsController.getLoginForm);
router.get('/signup', authController.isLoggedIn, viewsController.getSignupForm);
router.get('/me', authController.protect, viewsController.getAccount);
router.get('/my-tours', authController.protect, viewsController.getMyTours);

router.post(
  '/submit-user-data',
  authController.protect,
  viewsController.updateUserData
);

module.exports = router;
