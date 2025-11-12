require('dotenv').config();
const connectDB = require('../utils/db');
const OnlineStatus = require('../models/OnlineStatus');
const User = require('../models/User'); 
const { authenticateToken, authorizeAdmin } = require('../utils/auth');
const cors = require('cors');

const corsOptions = {
    origin: [ 
        'http://localhost:3001', // Admin Dashboard Dev
        'https://your-admin-dashboard-vercel-app.vercel.app' // Replace with your Vercel URL
    ],
    methods: ['GET', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: true
};

module.exports = async (req, res) => {
    await cors(corsOptions)(req, res, async () => {
        if (req.method === 'OPTIONS') return res.status(200).send();
        if (req.method !== 'GET') return res.status(405).json({ msg: 'Method Not Allowed' });

        return await authenticateToken(authorizeAdmin(async (req, res) => {
            await connectDB();
            try {
                const activeThreshold = new Date(Date.now() - 60 * 1000); // Users active in the last 60 seconds
                const onlineStatuses = await OnlineStatus.find({ lastActive: { $gte: activeThreshold } }).lean();

                const allUsers = await User.find().select('username userID name').lean();
                const userMap = new Map(allUsers.map(u => [u.userID, u]));

                const onlineUsers = onlineStatuses.map(status => {
                    const userDetails = userMap.get(status.userId) || { name: 'Unknown User', username: `(ID: ${status.userId})` };
                    return {
                        userId: status.userId,
                        username: userDetails.username,
                        name: userDetails.name,
                        lastActivity: status.lastActive
                    };
                });

                res.json(onlineUsers);
            } catch (err) {
                console.error(err.message);
                res.status(500).send('Server Error fetching online users');
            }
        }))(req, res);
    });
};
