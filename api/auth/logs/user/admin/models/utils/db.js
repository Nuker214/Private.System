const mongoose = require('mongoose');

let cachedDb = null;

async function connectDB() {
    if (cachedDb) {
        return cachedDb;
    }

    if (!process.env.MONGO_URI) {
        throw new Error('Please define the MONGO_URI environment variable inside .env.local');
    }

    try {
        const db = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000, 
            socketTimeoutMS: 45000, 
        });
        cachedDb = db;
        console.log('MongoDB Connected (reused or new connection)...');
        return db;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        throw err;
    }
}

module.exports = connectDB;
