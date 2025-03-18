const express = require('express');
const reviewController = require('./../controllers/reviewController');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');

//// { mergeParams: true } allows this router to access URL parameters from parent routers (e.g., tourId from tourRouter)
const router = express.Router({ mergeParams: true });

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setTourUserIds,
    reviewController.createReview
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview
  );

module.exports = router;
