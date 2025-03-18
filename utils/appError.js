class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // This property is used by Express to determine if the error is an operational error
    Error.captureStackTrace(this, this.constructor); // Capture the stack trace of the error
  }
}

module.exports = AppError; // Export the AppError class as a module for use in other files. This allows us to reuse this class in other files without having to redefine it.
