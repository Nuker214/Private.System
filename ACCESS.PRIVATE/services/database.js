const mongoose = require('mongoose');
const { logger } = require('../utils/logging'); // Your centralized logging utility

// Load environment variables
require('dotenv').config();
const DATABASE_URL = process.env.DATABASE_URL;

/**
 * Establishes a connection to the MongoDB database.
 * @returns {Promise<void>} A promise that resolves when the connection is successful.
 */
async function connectDB() {
    if (!DATABASE_URL) {
        logger.error('DATABASE_URL is not defined in environment variables. Cannot connect to database.');
        process.exit(1); // Exit the process if critical env var is missing
    }

    try {
        await mongoose.connect(DATABASE_URL, {
            // Recommended options for Mongoose 6.x+ (some are default now but good to be explicit)
            serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            family: 4 // Use IPv4, skip trying IPv6
        });
        logger.info('Successfully connected to MongoDB database.');
    } catch (error) {
        logger.error(`Failed to connect to MongoDB database: ${error.message}`, { stack: error.stack });
        process.exit(1); // Exit the process on database connection failure
    }
}

/**
 * Disconnects from the MongoDB database.
 * @returns {Promise<void>} A promise that resolves when the disconnection is successful.
 */
async function disconnectDB() {
    try {
        await mongoose.disconnect();
        logger.info('Disconnected from MongoDB database.');
    } catch (error) {
        logger.error(`Error disconnecting from MongoDB database: ${error.message}`, { stack: error.stack });
    }
}

// Optional: Listen for Mongoose connection events for more detailed logging
mongoose.connection.on('connected', () => {
    logger.verbose('Mongoose default connection open.');
});

mongoose.connection.on('error', (err) => {
    logger.error(`Mongoose default connection error: ${err.message}`);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose default connection disconnected.');
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('Mongoose default connection disconnected through app termination.');
    process.exit(0);
});

module.exports = {
    connectDB,
    disconnectDB,
    mongoose // Export mongoose instance if you need to define schemas elsewhere
};
