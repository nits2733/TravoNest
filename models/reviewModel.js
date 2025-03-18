const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review must contain a text'],
      minlength: [5, 'Review must be at least 5 characters long'],
      maxlength: [500, 'Review must not exceed 500 characters'],
    },
    rating: {
      type: Number,
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
      required: [true, 'Review must have a rating'],
    },
    createdAt: {
      type: Date,
      default: Date.now, // Automatically sets the creation date to the current time
    },
    //Parent Referencing
    tour: {
      type: mongoose.Schema.ObjectId, // Stores the reference ID of the associated tour
      ref: 'Tour', // Establishes a relationship with the 'Tour' collection
      required: [true, 'Review must belong to a tour.'], // Ensures that a tour reference is mandatory
    },
    //Parent Referencing
    user: {
      type: mongoose.Schema.ObjectId, // Stores the reference ID of the associated user
      ref: 'User', // Establishes a relationship with the 'User' collection
      required: [true, 'Review  must belong to a user'], // Ensures that a user reference is mandatory
    },
  },
  {
    // Ensure virtual properties are included when converting the document to JSON or JavaScript object
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour', // Populates the 'tour' field
  //     select: 'name',
  //   }).populate({
  //     path: 'user', // Populates the 'user' field
  //     select: 'name photo',
  //   });
  this.populate({
    path: 'user', // Populates the 'user' field
    select: 'name photo',
  });
  next();
});

// Static method to calculate average ratings for a specific tour
reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }, // Match only reviews belonging to the given tourId
    },
    {
      $group: {
        _id: '$tour', // Group all reviews by tour ID
        nRating: { $sum: 1 }, // Count the total number of reviews
        avgRating: { $avg: '$rating' }, // Compute the average rating
      },
    },
  ]);

  // Check if stats array has data before updating the tour document
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating, // Update total number of reviews
      ratingsAverage: stats[0].avgRating, // Update average rating
    });
  } else {
    // If no reviews exist for the tour, reset ratingsQuantity and ratingsAverage
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5, // Default rating (adjust as needed)
    });
  }
};

// POST middleware that triggers after a review is saved
reviewSchema.post('save', function () {
  // `this` refers to the current review document
  // Call the static method to recalculate ratings for the associated tour
  this.constructor.calcAverageRatings(this.tour);
});

// Pre middleware that runs before any "findOneAnd" operation (e.g., findOneAndUpdate, findOneAndDelete)
reviewSchema.pre(/^findOneAnd/, async function (next) {
  // "this" refers to the current query object
  // We use "findOne()" on the query to retrieve the document that is about to be updated or deleted
  this.r = await this.findOne();
  next();
});

// Post middleware that runs after a "findOneAnd" operation is executed
reviewSchema.post(/^findOneAnd/, async function () {
  // "this" still refers to the query object, but the document itself is stored in "this.r"
  // Ensure that "this.r" exists before proceeding
  if (!this.r) return;

  // Call the calcAverageRatings function on the model (constructor of "this.r")
  // to recalculate the average rating for the associated tour
  await this.r.constructor.calcAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
