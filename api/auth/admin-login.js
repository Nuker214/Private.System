require('dotenv').config();
const connectDB = require('../utils/db');
const Admin = require('../models/Admin');
const { generateAccessToken, comparePasswords, hashPassword } = require('../utils/helpers');
const { createDefaultAdmin } = require('../utils/auth'); // For initial setup
const cors = require('cors');

const corsOptions = {
    origin: [
        'http://localhost:3001', // Admin Dashboard Dev
        'https://your-admin-dashboard-vercel-app.vercel.app' // Replace with your Vercel URL
    ],
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

module.exports = async (req, res) => {
    await cors(corsOptions)(req, res, async () => {
        if (req.method === 'OPTIONS') return res.status(200).send();
        if (req.method !== 'POST') return res.status(405).json({ msg: 'Method Not Allowed' });

        await createDefaultAdmin(connectDB, hashPassword); // Ensure admin exists on first API call

        await connectDB();
        const { username, password } = req.body;

        try {
            const admin = await Admin.findOne({ username });

            if (!admin || !(await comparePasswords(password, admin.password))) {
                return res.status(400).json({ msg: 'Invalid Admin Credentials' });
            }

            const payload = {
                id: admin._id,
                username: admin.username,
                userID: admin.userID,
                role: admin.role
            };

            const token = generateAccessToken(payload);
            res.json({ token, username: admin.username, userID: admin.userID, name: admin.name });

        } catch (err) {
            console.error(err.message);
            res.status(500).send('Server Error');
        }
    });
};
