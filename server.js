// server.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// --------------------------------------------------------------------------------
// 1. LOAD ENVIRONMENT VARIABLES
//    If Render (or any host) has already injected a PORT, we assume we’re in “production.”
//
//    Otherwise (i.e. `process.env.PORT` is falsy), load from ./config.env.
// --------------------------------------------------------------------------------

if (!process.env.PORT) {
  // No PORT yet—probably running locally, so read from config.env
  dotenv.config({ path: './config.env' });
  console.log('☁️  Loaded config.env → PORT =', process.env.PORT);
} else {
  // PORT was already set (e.g. Render injected it), so skip dotenv entirely
  console.log('⚙️  Detected production environment – skipping dotenv');
}

// --------------------------------------------------------------------------------
// 2. NOW WE CAN LOG WHAT PORT WE’LL BIND TO
// --------------------------------------------------------------------------------

console.log('🔥 Startup: process.env.PORT =', process.env.PORT);

// --------------------------------------------------------------------------------
// 3. SET UP MONGOOSE & EXPRESS
// --------------------------------------------------------------------------------

const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB Connection Successful 💾');

    const port = process.env.PORT || 8000;
    console.log(`🔥 About to bind Express on port ${port}…`);
    const server = app.listen(port, () => {
      console.log(`✅ Server is running on port ${port}`);
    });

    // --------------------------------------------------------------------------
    // 4. GLOBAL ERROR HANDLERS
    // --------------------------------------------------------------------------
    process.on('uncaughtException', (err) => {
      console.log('UNHANDLED EXCEPTION! 💥 Shutting down');
      console.log(err.name, err.message);
      server.close(() => {
        console.log('Server closed due to uncaught exception.');
        process.exit(1);
      });
    });

    process.on('unhandledRejection', (err) => {
      console.log('UNHANDLED REJECTION! 💥 Shutting down');
      console.log(err.name, err.message);
      server.close(() => {
        console.log('Server closed due to unhandled promise rejection.');
        process.exit(1);
      });
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received. Shutting down gracefully...');
      server.close(() => {
        console.log('Process terminated!');
      });
    });
  })
  .catch((err) => {
    console.error('❌ DB Connection failed:', err);
    process.exit(1);
  });
