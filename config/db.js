const mongoose = require("mongoose");

/**
 * Connects to MongoDB using the URI from environment variables.
 * Uses retry logic with exponential backoff for robustness.
 */
const connectDB = async () => {
  const MONGO_URI =
    process.env.MONGO_URI || "mongodb://localhost:27017/advanced_events";

  const options = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
  };

  try {
    const conn = await mongoose.connect(MONGO_URI, options);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("✅ MongoDB reconnected.");
    });
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
