require('dotenv').config();
const connectDB = require('../utils/db');
const ErrorLog = require('../models/ErrorLog');
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
            const { message, stack } = req.body;
            try {
                const newError = new ErrorLog({
                    userId: req.user.id,
                    username: req.user.username,
                    message,
                    stack
                });
                await newError.save();
                res.status(201).json({ msg: 'Error logged' });
            } catch (err) {
                console.error(err.message);
                res.status(500).send('Server Error logging error');
            }
        })(req, res);
    });
};
