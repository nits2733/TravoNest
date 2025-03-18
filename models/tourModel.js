const mongoose = require('mongoose');
const slugify = require('slugify');
const User = require('./userModel');
// const validator = require('validator');

// Define a schema for a Tour document in the 'tours' collection
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true, // Removes whitespace in the beginning and end of the string
      maxlength: [40, 'A tour name must have less or equal to 40 characters'],
      minlength: [10, 'A tour name must be atleast 10 characters'],
      // validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: String,
    startDates: [Date],
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a maximum group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be equal or above 1.0'],
      max: [5, 'Rating must be below or qual to 5.0'],
      set: (val) => Math.round(val * 10) / 10, // 4.66666, 46.66666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },

    priceDiscount: {
      type: Number,
      validate: {
        validator: function (val) {
          //this only points to current doc on New document creation
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },

    summary: {
      type: String,
      trim: true, // Removes whitespace in the beginning and end of the string
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true, // Removes whitespace in the beginning and end of the
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    images: [String], // Array of strings to store image URLs or file paths

    createdAt: {
      type: Date, // Field to store the date and time the document was created
      default: Date.now, // Automatically sets the current timestamp when the document is created
      select: false, //ensures the createdAt field is not included in query results by default.
    },
    startLocation: {
      type: {
        type: String, // Defines the type of GeoJSON data (should always be 'Point' for locations)
        default: 'Point', // Default type is 'Point', as MongoDB supports different GeoJSON types
        enum: ['Point'], // Restricts this field to only allow 'Point' (no LineString or Polygon)
      },
      coordinates: [Number], // GeoJSON requires coordinates in [longitude, latitude] format
      address: String, // Stores the human-readable address of the location
      description: String, // Additional details about the location (e.g., city name, landmark)
    },

    locations: [
      {
        type: {
          type: String, // Specifies that each location is a GeoJSON 'Point'
          default: 'Point', // Ensures all locations are of type 'Point'
          enum: ['Point'], // Prevents invalid GeoJSON types (only 'Point' allowed)
        },
        coordinates: [Number], // Stores [longitude, latitude] for geospatial indexing & queries
        address: String, // Stores location address (optional but useful for display)
        description: String, // Brief info about the stop (e.g., "Lummus Park Beach")
        day: Number, // Represents the day of the tour when visiting this location
      },
    ],
    //Child Referencing
    guides: [
      {
        type: mongoose.Schema.ObjectId, // 🔹 Stores the ID of a referenced User document
        ref: 'User', // 🔹 Establishes a relationship (reference) with the 'User' collection
      },
    ],
  },
  {
    // Ensure virtual properties are included when converting the document to JSON or JavaScript object
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// tourSchema.index({ price: 1 });
//This helps optimize queries that filter/sort by both price and ratingsAverage.
tourSchema.index({ price: 1, ratingsAverage: -1 });
//Useful for searching tours by their unique slug values.
tourSchema.index({ slug: 1 });

// Creating a geospatial index on the 'startLocation' field
// This enables geospatial queries such as $geoWithin, $near, and $geoIntersects
tourSchema.index({ startLocation: '2dsphere' });

// Define a virtual property 'durationWeeks' that calculates the number of weeks
tourSchema.virtual('durationWeeks').get(function () {
  // Virtual properties are not stored in the database; they are derived fields
  return this.duration / 7;
});

//Virtual Populate
tourSchema.virtual('reviews', {
  ref: 'Review', // Establishes a relationship with the 'Review' collection
  foreignField: 'tour', // 🔹 The field(tour) in the 'Review' model that stores the Tour's ID
  localField: '_id', // 🔹 The field in the 'Tour' model that matches 'foreignField'
});

//Document Middleware - Pre-save Middleware: runs before .save() and .create() only
tourSchema.pre('save', function (next) {
  // Generate a slug (URL-friendly string) from the 'name' field and assign it to 'slug'
  this.slug = slugify(this.name, { lower: true });
  next(); // Call the next middleware in the chain
});

// tourSchema.pre('save', async function (next) { //Embedding guides in tour document
//   // 🔹 `this.guides` contains an array of user IDs before saving the document.
//   // 🔹 `.map()` iterates over each guide ID and returns a **promise** for `User.findById(id)`.
//   const guidesPromises = this.guides.map(async (id) => await User.findById(id));

//   // 🔹 `Promise.all()` waits for **all** `findById()` operations to complete.
//   // 🔹 It resolves an array of full user documents, replacing the original ID array.
//   this.guides = await Promise.all(guidesPromises);

//   // 🔹 Call `next()` to move to the next middleware in the Mongoose save process.
//   next();
// });

// Post-save middleware - doc represents currently saved document
tourSchema.post('save', function (doc, next) {
  console.log(`New tour created: ${doc.name}`);
  next(); // Call the next middleware in the chain
});

//Query Middleware
// This middleware modifies the query to exclude documents with the field 'secretTour' set to true
tourSchema.pre('find', function (next) {
  this.find({ secretTour: { $ne: true } }); // Ensures only public tours are fetched
  next(); // Call the next middleware in the chain
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides', // Populates the 'guides' field
    select: '-__v -passwordChangedAt', // Excludes version and sensitive data
  });
  next();
});

//Query Middleware- Post-find hook to run after the query has been executed
// tourSchema.post('find', function (docs, next) {
//   // console.log(docs.length);
//   next(); // Call the next middleware in the chain
// });

//Aggregation Middleware
// tourSchema.pre('aggregate', function (next) {
//   // Add a $match stage to the aggregation pipeline to filter out secret tours
//   this.pipeline().unshift({ $match: { secretTour: { $ne: true } } });
//   console.log(this.pipeline());
//   next(); // Call the next middleware in the chain
// });

// Create a Mongoose model based on the tour schema
const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
