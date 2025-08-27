require('dotenv').config();
const connectDB = require('../utils/db');
const ActivityLog = require('../models/ActivityLog');
const ErrorLog = require('../models/ErrorLog');
const LoginHistory = require('../models/LoginHistory');
const { authenticateToken, authorizeAdmin } = require('../utils/auth');
const cors = require('cors');

const corsOptions = {
    origin: [ 
        'http://localhost:3001', // Admin Dashboard Dev
        'https://your-admin-dashboard-vercel-app.vercel.app' // Replace with your Vercel URL
    ],
    methods: ['DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: true
};

module.exports = async (req, res) => {
    await cors(corsOptions)(req, res, async () => {
        if (req.method === 'OPTIONS') return res.status(200).send();
        if (req.method !== 'DELETE') return res.status(405).json({ msg: 'Method Not Allowed' });

        return await authenticateToken(authorizeAdmin(async (req, res) => {
            await connectDB();
            const { type } = req.query; // Use req.query for /api/logs/clear-logs?type=activity
            let LogModel;

            switch (type) {
                case 'activity': LogModel = ActivityLog; break;
                case 'error': LogModel = ErrorLog; break;
                case 'login-history': LogModel = LoginHistory; break;
                default: return res.status(400).json({ msg: 'Invalid log type' });
            }

            try {
                await LogModel.deleteMany({});
                res.json({ msg: `${type} logs cleared` });
            } catch (err) {
                console.error(err.message);
                res.status(500).send('Server Error clearing logs');
            }
        }))(req, res);
    });
};
