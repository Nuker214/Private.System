require('dotenv').config();
const connectDB = require('../utils/db');
const ErrorLog = require('../models/ErrorLog');
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
                const logs = await ErrorLog.find().sort({ timestamp: -1 }).limit(100);
                res.json(logs);
            } catch (err) {
                console.error(err.message);
                res.status(500).send('Server Error fetching error logs');
            }
        }))(req, res);
    });
};
