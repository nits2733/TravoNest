// 'promisify' converts callback-based functions into Promise-based ones
const { promisify } = require('util');
// Import the 'jsonwebtoken' package for creating and verifying JWTs
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

// Function to generate a JWT (JSON Web Token) for authentication
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN, // Token expiration time (e.g., '90d' for 90 days)
  });
};

// Function to create and send the JWT token as a response (both in JSON and as a cookie)
const createSendToken = (user, statusCode, res) => {
  // Generate a JWT token using the user's unique ID
  const token = signToken(user._id);

  // Define cookie options for storing the JWT in cookies
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000 // Cookie expiration time
    ),
    httpOnly: true, // Makes sure the cookie is accessible only by the server, preventing XSS attacks
  };

  // In production, ensure the cookie is sent over secure HTTPS connections
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  // Set the JWT as a cookie in the response
  res.cookie('jwt', token, cookieOptions);

  // Remove the password field from the user object before sending the response
  user.password = undefined;

  // Send the response with the JWT token and user data
  res.status(statusCode).json({
    status: 'success',
    token, // Token included in the response body for client-side storage
    data: {
      user, // Updated user details without the password
    },
  });
};

// Create and save a new user
exports.signUp = catchAsync(async (req, res, next) => {
  const newUser = await User.create(req.body);

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, res);
});

// Login controller to authenticate users
exports.login = catchAsync(async (req, res, next) => {
  // Extract email and password from the request body
  const { email, password } = req.body;

  // Check if both email and password are provided
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // Find the user in the database by email and explicitly select the password field (since it's excluded because of schema)
  const user = await User.findOne({ email }).select('+password');

  // Check if the user exists and if the provided password is correct
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password!', 401)); // Unauthorized error if authentication fails
  }
  // Generate a JWT token for the authenticated user
  createSendToken(user, 201, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: 'success', message: 'Logged out' });
};

// Middleware to protect routes by verifying the JWT token, ensuring the user exists and hasn't changed their password after token issuance.
exports.protect = catchAsync(async (req, res, next) => {
  let token;

  // Step 1: Check if the Authorization header contains a Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Extract the token from the "Authorization" header (format: "Bearer <TOKEN>")
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  // Step 2: If no token is found, return an authentication error
  if (!token) {
    return next(new AppError('You are not logged in! Please log in.', 401)); // 401 = Unauthorized
  }

  // Step 3: Verify the token using JWT's verify method
  //jwt.verify(token, secret)` checks if the token is valid and not expired.
  //If the token is valid, `decoded` will contain the payload (e.g., `{ id: 'userId', iat: timestamp, exp: timestamp }`).
  // - If the token is invalid or expired, an error will be thrown, which should be handled in `catchAsync`.
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Debugging: Log the decoded token payload
  // console.log(decoded);

  // Step 4: Fetch the user corresponding to the decoded token's ID
  const currentUser = await User.findById(decoded.id);

  // Step 5: If no user is found, return an authentication error
  if (!currentUser) {
    return next(
      new AppError('User belonging to this token no longer exists!', 401) // 401 = Unauthorized
    );
  }

  // Step 6: Check if the user has changed their password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please login again.', 401)
    );
  }

  // Step 7: Attach the authenticated user object to the request for further processing in protected routes
  req.user = currentUser;
  res.locals.user = currentUser;

  // Step 8: Call the next middleware function to proceed with the request
  next();
});

//only for rendered pages
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1) Verifies the jwt token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // Step 4: Fetch the user corresponding to the decoded token's ID
      const currentUser = await User.findById(decoded.id);

      // Step 5: If no user is found, return an authentication error
      if (!currentUser) {
        return next();
      }

      // Step 6: Check if the user has changed their password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      //There is a logged in User
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  // Step 8: Call the next middleware function to proceed with the request
  next();
};

// Middleware to restrict access based on user roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if the authenticated user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have the necessary permissions to access this route!',
          403 // 403 = Forbidden (User is authenticated but does not have permission)
        )
      );
    }

    // If the user's role is allowed, proceed to the next middleware/controller
    next();
  };
};

//Controller for handling forgot password functionality
exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the provided email from the request body
  const user = await User.findOne({ email: req.body.email });

  // If no user is found with the given email, return an error response
  if (!user) {
    return next(new AppError('There is no user with this email address.', 400));
  }

  // 2) Generate a random password reset token
  const resetToken = user.createPasswordResetToken();

  // Save the reset token and expiration time in the database
  // Setting `validateBeforeSave: false` skips validation rules for required fields
  await user.save({ validateBeforeSave: false });

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    // Send a success response indicating the email has been sent
    res.status(200).json({
      status: 'success',
      message: 'Token sent to your email!',
    });
  } catch (err) {
    // 5) Handle email sending errors
    // If sending email fails, remove the reset token from the database
    user.passwordResetToken = undefined;
    user.passwordResetExpiresAt = undefined;

    // Save the user again to remove the invalid reset token
    await user.save({ validateBeforeSave: false });

    // Return an error response for the failed email attempt
    return next(
      new AppError(
        'There was an error sending the email. Please try again later.',
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the provided reset token from the request URL
  const hashedToken = crypto
    .createHash('sha256') // Hash the token received from the request
    .update(req.params.token) // Use the token from the request parameters
    .digest('hex'); // Convert the hash to a hexadecimal string

  // Find the user by the hashed token and check if the token is still valid
  const user = await User.findOne({
    passwordResetToken: hashedToken, // Match the stored hashed token
    passwordResetExpires: { $gt: Date.now() }, // Ensure the token has not expired
  });

  // 2) If token has expired or no user found, return an error
  if (!user) {
    return next(new AppError('Token has expired or is invalid!', 400));
  }

  // Set the new password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  // Remove the reset token and expiration time from the database
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // Save the updated user document to the database
  await user.save(); // Runs validation and triggers pre-save middleware

  // 3) Update the passwordChangedAt property for the user
  // This is handled in the pre-save middleware in the schema

  // Generate a JWT token for the authenticated user
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user from collection
  const user = await User.findById(req.user.id).select('+password');
  //2) Check if Posted current password is correct
  const isMatch = await user.correctPassword(
    req.body.currentPassword,
    user.password
  );
  //3) If so, update password
  if (!isMatch) {
    return next(new AppError('Your current password is wrong!', 401));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // Generate a JWT token for the authenticated user
  createSendToken(user, 201, res);
});
