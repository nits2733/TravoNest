const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongosanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes'); // Import the tours router
const userRouter = require('./routes/userRoutes'); // Import the users router
const reviewRouter = require('./routes/reviewRoutes'); // Import the reviews router
const bookingRouter = require('./routes/bookingRoutes');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// Set Pug as the template (view) engine
app.set('view engine', 'pug');
// Set the directory where the Pug templates (views) are stored
app.set('views', path.join(__dirname, 'views'));

// Global Middlewares
// Serve static files (e.g., HTML, CSS, JS, images) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

//Security HTTP headers
app.use(helmet());

//Development Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Log HTTP requests
}

// Import the express-rate-limit package to limit repeated requests from the same IP
//rateLimit() is a middleware function
const limiter = rateLimit({
  max: 100, // Maximum number of requests allowed per windowMs
  windowMs: 60 * 60 * 1000, // Time window in milliseconds (1 hour)
  message: 'Too many requests from this IP, please try again in an hour.', // Response message when the limit is exceeded
});

// Apply the rate limiter middleware to all routes starting with '/api'
// This helps protect the API from abuse and prevents excessive requests from a single IP
app.use('/api', limiter);

app.use(express.json({ limit: '10kb' })); // Middleware to parse JSON request body with a limit of 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser()); // Middleware to parse data from cookie

//Data sanitization against NoSQL query injections
app.use(mongosanitize());

//Data sanitization against XSS attacks
app.use(xss());

//Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

// Middleware to add a custom property 'requestTime' to the request object
//Test Middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString(); // store the current timestamp when the request is made
  // console.log(req.headers);
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https://*.mapbox.com; connect-src 'self' ws://127.0.0.1:* https://*.mapbox.com;"
  );
  next();
});

// Mounting the routers
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

//will execute if no other route matches the incoming request
app.all('*', (req, res, next) => {
  // res.status(404).json({
  //   status: 'fail',
  //   message: `Can't find ${req.originalUrl} on this server!`,
  // });

  // const err = new Error(`Can't find ${req.originalUrl} on this server!`);
  // err.status = 'fail';
  // err.statusCode = 404;
  // next(err);

  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use((err, req, res, next) => {
  next(err);
});

app.use(globalErrorHandler);

module.exports = app;
