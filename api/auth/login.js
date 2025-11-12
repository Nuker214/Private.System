require('dotenv').config();
const connectDB = require('../utils/db');
const User = require('../models/User');
const LoginHistory = require('../models/LoginHistory');
const { generateAccessToken, comparePasswords, hashPassword } = require('../utils/helpers');
const { createDefaultAdmin } = require('../utils/auth'); // For initial setup
const cors = require('cors');

const corsOptions = {
    origin: [
        'http://localhost:3000', // User Dashboard Dev
        'https://your-user-dashboard-vercel-app.vercel.app' // Replace with your Vercel URL
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

module.exports = async (req, res) => {
    await cors(corsOptions)(req, res, async () => {
        if (req.method === 'OPTIONS') {
            return res.status(200).send();
        }
        if (req.method !== 'POST') {
            return res.status(405).json({ msg: 'Method Not Allowed' });
        }

        await createDefaultAdmin(connectDB, hashPassword); // Ensure admin exists on first API call

        await connectDB();
        const { username, password, userID } = req.body;

        try {
            const user = await User.findOne({ username, userID });
            const ipAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

            if (!user || !(await comparePasswords(password, user.password))) {
                await new LoginHistory({ username, success: false, ipAddress }).save();
                return res.status(400).json({ msg: 'Invalid Credentials' });
            }

            const payload = {
                id: user._id, // Use _id from Mongoose document
                username: user.username,
                userID: user.userID,
                role: user.role || 'user'
            };

            const token = generateAccessToken(payload);
            await new LoginHistory({ username, success: true, ipAddress }).save();

            res.json({ token, username: user.username, userID: user.userID, name: user.name });

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
};
