const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const cspHeader =
  "default-src 'self' https://*.mapbox.com; " +
  "base-uri 'self'; " +
  'block-all-mixed-content; ' +
  "font-src 'self' https: data:; " +
  "frame-ancestors 'self'; " +
  "frame-src 'self' https://js.stripe.com; " + // Allow Stripe frames
  "img-src 'self' data:; " +
  "object-src 'none'; " +
  "script-src 'self' https://js.stripe.com https://cdnjs.cloudflare.com https://api.mapbox.com https://cdn.skypack.dev blob:; " +
  "script-src-elem 'self' https://js.stripe.com https://cdnjs.cloudflare.com https://api.mapbox.com https://cdn.skypack.dev blob:; " +
  "worker-src 'self' blob: https://api.mapbox.com; " +
  "script-src-attr 'none'; " +
  "style-src 'self' https: 'unsafe-inline'; " +
  'upgrade-insecure-requests; ' +
  "connect-src 'self' ws://127.0.0.1:* https://*.mapbox.com;";

// New landing page controller
exports.getLandingPage = catchAsync(async (req, res) => {
  // console.log('User:', res.locals.user);
  // Get a few tours to display on the landing page
  const tours = await Tour.find().limit(6);

  res.status(200).set('Content-Security-Policy', cspHeader).render('landing', {
    title: 'Explore the World',
    tours,
  });
});

exports.getOverview = catchAsync(async (req, res) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();
  res.status(200).set('Content-Security-Policy', cspHeader).render('overview', {
    title: 'All Tours',
    tours,
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name.', 404));
  }
  res
    .status(200)
    .set('Content-Security-Policy', cspHeader)
    .render('tour', {
      title: `${tour.name} Tour`,
      tour,
    });
});

exports.getSignupForm = (req, res) => {
  res
    .status(200)
    .set('Content-Security-Policy', cspHeader)
    .render('signup', { title: 'Create your account' });
};

exports.getLoginForm = (req, res) => {
  res
    .status(200)
    .set('Content-Security-Policy', cspHeader)
    .render('login', { title: 'Log into your account' });
};

exports.getAccount = (req, res) => {
  res
    .status(200)
    .set('Content-Security-Policy', cspHeader)
    .render('account', { title: 'Your Account' });
};

exports.getMyTours = catchAsync(async (req, res, next) => {
  const bookings = await Booking.find({ user: req.user.id });

  const tourIDs = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).set('Content-Security-Policy', cspHeader).render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).set('Content-Security-Policy', cspHeader).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});
