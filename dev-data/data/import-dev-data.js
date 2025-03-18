const fs = require('fs');
const mongoose = require('mongoose');
const dotenv = require('dotenv'); // loads environment variables from a .env file into process.env

const Tour = require('./../../models/tourModel');
const Review = require('./../../models/reviewModel');
const User = require('./../../models/userModel');

dotenv.config({ path: './config.env' }); // Load environment variables from config.env file located in the root directory (or a specified relative path)

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD //Use the password stored in environment variables
);

// Mongoose connection to the database with specified options
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

//Read JSON file
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf-8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf-8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf-8')
);
// console.log(tours);

//Import DATA into DataBase
const importData = async () => {
  try {
    await Tour.create(tours); //Inserts the tours data into the Tour collection
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews);
    console.log('Data Imported Successfully');
    process.exit(); //Ensures the script terminates after deletion
  } catch (err) {
    console.log(err);
  }
};

//Delete all DATA from DataBase
const deleteData = async () => {
  try {
    await Tour.deleteMany(); //Deletes all documents from the Tour collection in the database.
    await User.deleteMany();
    await Review.deleteMany();
    console.log('Data Deleted Successfully');
  } catch (err) {
    console.log(err);
  }
  process.exit(); //Ensures the script terminates after deletion
};

// Check if the third command-line argument (process.argv[2]) is '--import'
if (process.argv[2] === '--import') {
  importData();
  // Check if the third command-line argument is '--delete'
} else if (process.argv[2] === '--delete') {
  deleteData();
}

// console.log(process.argv);

//Command for importing and deleting data from DataBase
//node dev-data/data/import-dev-data.js --import
//node dev-data/data/import-dev-data.js --delete
