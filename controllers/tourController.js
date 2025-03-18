const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');
const multer = require('multer');
const sharp = require('sharp');

const multerStorage = multer.memoryStorage(); // Use memory storage for temporary files

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    const ext = file.mimetype.split('/')[1].toLowerCase(); // Extract extension from mimetype
    if (['jpg', 'jpeg', 'png'].includes(ext)) {
      cb(null, true); // Accept the file
    } else {
      cb(
        new AppError('Please upload an image file (JPEG, JPG, PNG)', 400),
        false
      );
    }
  } else {
    cb(
      new AppError('Please upload an image file (JPEG, JPG, PNG)', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files.imageCover || req.files.images) return next();

  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${filename}`);

      req.body.images.push(filename);
    })
  );

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingAverage,price';
  req.query.fields = 'name,price,ratingAverage,summary,difficulty';
  next(); // Proceed if valid
};

// const tours = JSON.parse(
//   fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// );

// Middleware to check if ID is valid
// exports.checkID = (req, res, next, val) => {
//   if (req.params.id * 1 > tours.length) {
//     return res.status(404).json({
//       status: 'fail',
//       message: 'Invalid ID',
//     });
//   }
//   next(); // Proceed if valid
// };

// Controller function to handle the "GET /api/v1/tours" request
exports.getAllTours = factory.getAll(Tour);
//Here popOptions is passed
exports.getTour = factory.getOne(Tour, {
  path: 'reviews',
});
// Define an asynchronous function to handle creating a new tour
exports.createTour = factory.createOne(Tour);
// Update a specific tour in the database
exports.updateTour = factory.updateOne(Tour);
// Controller function to handle DELETE requests for a specific tour
exports.deleteTour = factory.deleteOne(Tour);

//// Function to get aggregated statistics about tours
exports.getTourStats = catchAsync(async (req, res) => {
  const stats = await Tour.aggregate([
    {
      // Stage 1: Match tours with a ratingsAverage greater than or equal to 4.5
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      // Stage 2: Group the matched documents by difficulty level
      $group: {
        _id: '$difficulty', // Group by the 'difficulty' field
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
        numTours: { $sum: 1 }, // Count the number of tours in each group
        numRatings: { $sum: '$ratingsQuantity' },
      },
    },
    {
      // Stage 3: Sort the results by average price in ascending order
      $sort: { avgPrice: 1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats, // Return the aggregated stats
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = parseInt(req.params.year);
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates', //deconstructs an array field from a document and creates a new document for each element in that array.
    },
    {
      $match: {
        // Filter documents where startDates are within the given year
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        // Group by the month extracted from startDates
        _id: {
          $month: '$startDates', // Extract the month from startDates
        },
        numTourStarts: { $sum: 1 }, // Count the number of tours that start each month
        tours: { $push: '$name' }, // Push all tour names into an array for each group
      },
    },
    {
      // Add a 'month' field with the value from '_id'
      $addFields: { month: '$_id' },
    },
    {
      $project: {
        //include, exclude, or reshape fields in documents
        _id: 0,
      },
    },
    {
      // Sort the results by numTourStarts in descending order
      $sort: { numTourStarts: -1 },
    },
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      plan, // Return the monthly plan
    },
  });
});

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(','); // Splitting 'lat,lng' into separate variables

  // Convert distance to radians
  // - Earth's radius: 3963.2 miles or 6378.1 km
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  // Error handling: If latitude or longitude is missing, return an error response
  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400
      )
    );
  }

  // Finding tours within the given radius using the $geoWithin and $centerSphere operators
  // - $centerSphere expects [longitude, latitude] (note: order is lng, lat)
  // - radius must be in radians (which we calculated above)
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  // Sending response with the list of matching tours
  res.status(200).json({
    status: 'success',
    results: tours.length, // Number of tours found
    data: {
      data: tours, // The retrieved tour data
      message:
        'This is the tours within a certain distance from the provided latitude and longitude.',
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(','); // Splitting 'lat,lng' into separate variables

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  // Error handling: If latitude or longitude is missing, return an error response
  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
        400
      )
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        //Needs to be first stage
        // This stage performs a geospatial search in a collection
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance', // Name of the field to store the calculated distance
        distanceMultiplier: multiplier,

        spherical: true, // Use spherical geometry for distance calculation
      },
    },
    {
      $project: {
        // Include, exclude, or reshape fields in documents
        distance: 1, // The calculated distance in meters
        name: 1, // The name of the tour
      },
    },
    // {
    //   $sort: { distance: 1 }, // Sort the results by distance in ascending order
    // },
    // {
    //   $limit: 5, // Limit the results to the top 5 nearest tours
    // },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: distances,
      message:
        'This is the tours within a certain distance from the provided latitude and longitude.',
    },
  });
});
