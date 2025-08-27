require('dotenv').config();
const connectDB = require('../utils/db');
const getPusherInstance = require('../utils/pusher');
const { authenticateToken, authorizeAdmin } = require('../utils/auth');
const cors = require('cors');

const corsOptions = {
    origin: [ 
        'http://localhost:3001', // Admin Dashboard Dev
        'https://your-admin-dashboard-vercel-app.vercel.app' // Replace with your Vercel URL
    ],
    methods: ['POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: true
};

module.exports = async (req, res) => {
    await cors(corsOptions)(req, res, async () => {
        if (req.method === 'OPTIONS') return res.status(200).send();
        if (req.method !== 'POST') return res.status(405).json({ msg: 'Method Not Allowed' });

        return await authenticateToken(authorizeAdmin(async (req, res) => {
            const { targetUserId, command, payload } = req.body; 

            if (!targetUserId || !command) {
                return res.status(400).json({ msg: 'Target User ID and command are required' });
            }

            try {
                const pusher = getPusherInstance();
                // We use a public channel for simplicity, but a private one is recommended.
                await pusher.trigger(`public-user-${targetUserId}`, 'admin-command', {
                    command,
                    payload,
                    sender: req.user.username 
                });
                res.json({ msg: `Command '${command}' sent to user ${targetUserId}` });
            } catch (err) {
                console.error('Pusher error:', err.message);
                res.status(500).send('Server Error dispatching command');
            }
        }))(req, res);
    });
};
