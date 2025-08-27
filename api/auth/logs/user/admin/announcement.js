require('dotenv').config();
const connectDB = require('../utils/db');
const Announcement = require('../models/Announcement');
const getPusherInstance = require('../utils/pusher'); 
const { authenticateToken, authorizeAdmin } = require('../utils/auth');
const cors = require('cors');

const corsOptions = {
    origin: [ 
        'http://localhost:3001', // Admin Dashboard Dev
        'https://your-admin-dashboard-vercel-app.vercel.app' // Replace with your Vercel URL
    ],
    methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], credentials: true
};

module.exports = async (req, res) => {
    await cors(corsOptions)(req, res, async () => {
        if (req.method === 'OPTIONS') return res.status(200).send();
        
        await connectDB();

        if (req.method === 'GET') {
            return await authenticateToken(authorizeAdmin(async (req, res) => {
                try {
                    const announcement = await Announcement.findOne();
                    res.json(announcement || { text: "No active announcement.", isActive: false });
                } catch (err) {
                    console.error(err.message);
                    res.status(500).send('Server Error fetching announcement');
                }
            }))(req, res);
        } else if (req.method === 'POST') {
            return await authenticateToken(authorizeAdmin(async (req, res) => {
                const { text, isActive } = req.body;
                try {
                    let announcement = await Announcement.findOne();
                    if (!announcement) {
                        announcement = new Announcement({ text, isActive, updatedBy: req.user.username });
                    } else {
                        announcement.text = text;
                        announcement.isActive = isActive;
                        announcement.lastUpdated = Date.now();
                        announcement.updatedBy = req.user.username;
                    }
                    await announcement.save();

                    const pusher = getPusherInstance();
                    await pusher.trigger('public-broadcast', 'setAnnouncement', { text: announcement.text, isActive: announcement.isActive });

                    res.json({ msg: 'Announcement updated and broadcasted', announcement });
                } catch (err) {
                    console.error(err.message);
                    res.status(500).send('Server Error updating announcement');
                }
            }))(req, res);
        } else {
            res.status(405).json({ msg: 'Method Not Allowed' });
        }
    });
};
