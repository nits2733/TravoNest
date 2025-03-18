const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'User must have a name'],
    trim: true,
    maxLength: [50, 'Name must not exceed 50 characters'],
  },
  email: {
    type: String,
    required: [true, 'User must have an email'],
    unique: true,
    isLowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address'],
  },
  photo: { type: String, default: 'default.jpg' },

  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },

  password: {
    type: String,
    required: [true, 'User must have a password'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      //This only works on CREATE and SAVE!!!
      validator: function (value) {
        return this.password === value;
      },
      message: 'Passwords do not match',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,

  active: {
    type: Boolean,
    default: true,
    select: false, // Do not include this field in the returned JSON output
  },
});

// This function runs before a user document is saved to the database.
userSchema.pre('save', async function (next) {
  // Check if the 'password' field has been modified.
  // If the password was not changed, skip further processing.
  if (!this.isModified('password')) return next();
  // Hash the password using bcrypt with a cost factor (salt rounds) of 12.
  // This ensures that the password is stored securely in a hashed format.
  this.password = await bcrypt.hash(this.password, 12);
  // Remove the password confirmation field.
  // This field is only needed for validation during signup and should not be stored in the database.
  this.passwordConfirm = undefined;

  next(); // Proceed to save the document
});

userSchema.pre('save', function (next) {
  // If the password is NOT modified OR the document is new, skip this middleware
  if (!this.isModified('password') || this.isNew) return next();

  // Set the passwordChangedAt timestamp to the current time minus 1 second
  // This ensures the token is always issued after the password change
  this.passwordChangedAt = Date.now() - 1000;

  next(); // Proceed to save the document
});

//pre-query middleware that runs before any query that starts with find
userSchema.pre(/^find/, function (next) {
  // Only return active users when querying the database.
  this.find({ active: { $ne: false } });
  next();
});

// Define a method on the user schema to compare passwords
userSchema.methods.correctPassword = async function (
  candidatePassword, // Password entered by the user during login
  userPassword // Hashed password stored in the database
) {
  // Compare the hashed 'userPassword' with the 'candidatePassword'
  // bcrypt.compare() hashes the candidatePassword and checks if it matches userPassword
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // Check if the user has changed their password
  if (this.passwordChangedAt) {
    // Convert passwordChangedAt from milliseconds to seconds (as JWT timestamps are in seconds)
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    // Log timestamps for debugging
    console.log(changedTimestamp, JWTTimestamp);

    // Compare JWT issuance time with password change time
    // If the JWT was issued before the password was changed, return true (i.e., password was changed after login)
    return JWTTimestamp < changedTimestamp;
  }

  // If passwordChangedAt is not set, return false (password was never changed)
  return false;
};

//Instance method to generate a secure password reset token.
userSchema.methods.createPasswordResetToken = function () {
  // 1) Generate a random token (32-byte hex string)
  const resetToken = crypto.randomBytes(32).toString('hex');

  // 2) Encrypt the token using SHA-256 before storing it in the database
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log({ resetToken }, this.passwordResetToken);

  // 3) Set token expiration time (current time + 10 minutes)
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  // 4) Return the unencrypted token to be sent to the user via email
  return resetToken;
};

// Create a User model from the schema
const User = mongoose.model('User', userSchema);

// Export the User model for use in other parts of the application
module.exports = User;
