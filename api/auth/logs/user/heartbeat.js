require('dotenv').config();
const connectDB = require('../utils/db');
const OnlineStatus = require('../models/OnlineStatus');
const { authenticateToken } = require('../utils/auth');
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
        if (req.method === 'OPTIONS') return res.status(200).send();
        if (req.method !== 'POST') return res.status(405).json({ msg: 'Method Not Allowed' });

        return await authenticateToken(async (req, res) => {
            await connectDB();
            const { id: userId, username } = req.user; // From JWT payload
            try {
                await OnlineStatus.findOneAndUpdate(
                    { userId },
                    { username, lastActive: Date.now() },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                );
                res.status(200).json({ msg: 'Heartbeat received' });
            } catch (err) {
                console.error(err.message);
                res.status(500).send('Server Error processing heartbeat');
            }
        })(req, res);
    });
};
