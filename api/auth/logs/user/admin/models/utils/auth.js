const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin'); // Required for default admin creation and initial role check

const authenticateToken = (handler) => async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; 
        return handler(req, res); 
    } catch (err) {
        return res.status(403).json({ msg: 'Token is not valid' });
    }
};

const authorizeAdmin = (handler) => async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied: Admin role required.' });
    }
    return handler(req, res); 
};

// Function to initialize default admin (called during first API invocation)
const createDefaultAdmin = async (connectDB, hashPassword) => {
    await connectDB();
    const adminExists = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (!adminExists) {
        const hashedPassword = await hashPassword(process.env.ADMIN_PASSWORD_RAW);
        const newAdmin = new Admin({
            username: process.env.ADMIN_USERNAME,
            password: hashedPassword,
            userID: process.env.ADMIN_USER_ID,
            name: 'Mehlbaum' // Hardcoded name for the default admin
        });
        await newAdmin.save();
        console.log('Default admin user created.');
    } else {
        console.log('Default admin user already exists.');
    }
};


module.exports = { authenticateToken, authorizeAdmin, createDefaultAdmin };
