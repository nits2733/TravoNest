const mongoose = require('mongoose');
const dotenv = require('dotenv'); // loads environment variables from a .env file into process.env

// Listen for any uncaught exceptions in the Node.js process
process.on('uncaughtException', (err) => {
  console.log('UNHANDLED EXCEPTION! 💥 Shutting down');
  console.log(err.name, err.message);
  // Close the server gracefully before exiting
  server.close(() => {
    console.log('Server is closing down...');
    process.exit(1); // Exit the application with a non-zero status code (1 indicates failure)
  });
});

dotenv.config({ path: './config.env' }); // Load environment variables from config.env file located in the root directory (or a specified relative path)
// console.log('NODE_ENV:', process.env.NODE_ENV);
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD //Use the password stored in environment variables
);

// Connect to MongoDB using Mongoose with specified options
mongoose
  .connect(DB, {
    useNewUrlParser: true, // Use the new URL parser (recommended for modern MongoDB versions)
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    ssl: true, // Enable SSL for secure connections
    sslValidate: true, // Validate the server's SSL certificate
  })
  .then(() => console.log('DB Connection Successful'));

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Listening for unhandled promise rejections globally - node.js knows by name
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down');
  console.log(err.name, err.message);
  // Close the server gracefully before exiting
  server.close(() => {
    console.log('Server is closing down...');
    process.exit(1); // Exit the application with a non-zero status code (1 indicates failure)
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process Terminated!');
  });
});
