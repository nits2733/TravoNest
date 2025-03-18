const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const multer = require('multer');
const sharp = require('sharp');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}${ext}`);
//   },
// });

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

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  // Check if there's no file uploaded
  if (!req.file) return next();

  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  // Create a sharp object with the uploaded image file
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

//function to prevent users from updating restricted fields
const filterObj = (obj, ...allowedFields) => {
  const newObj = {}; // Create an empty object to store filtered fields.

  // Loop through each key in the original object.
  Object.keys(obj).forEach((el) => {
    // Check if the key is in the list of allowed fields.
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el]; // Add the allowed field to the new object.
    }
  });

  return newObj; // Return the filtered object.
};

// Middleware to set the user ID in the request parameters
exports.getMe = (req, res, next) => {
  // Assign the authenticated user's ID (from req.user) to req.params.id
  // This allows the next middleware/controller to use req.params.id as if it were provided in the URL
  req.params.id = req.user.id;

  // Call the next middleware in the stack
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {
  //1) Create error if user posts password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword instead.',
        400
      )
    );
  }
  //2) Filtered out unwanted field names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');

  if (req.file) filteredBody.photo = req.file.filename;

  //2) Update user Document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true, // Returns the updated document instead of the old one.
    runValidators: true, // Ensures that the new data follows the schema's validation rules.
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  //Soft delete the user by setting 'active' field to false
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet Defined! Please use /signUp instead',
  });
};
//Do not update password with this
exports.updateUser = factory.updateOne(User);
exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);
exports.deleteUser = factory.deleteOne(User);
