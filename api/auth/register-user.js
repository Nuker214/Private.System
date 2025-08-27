require('dotenv').config();
const connectDB = require('../utils/db');
const User = require('../models/User');
const { hashPassword } = require('../utils/helpers');
const { authenticateToken, authorizeAdmin } = require('../utils/auth');
const cors = require('cors');

const corsOptions = {
    origin: [
        'http://localhost:3001', // Admin dashboard
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

        return await authenticateToken(authorizeAdmin(async (req, res) => {
            await connectDB();
            const { username, password, userID, name } = req.body;

            try {
                let user = await User.findOne({ username });
                if (user) {
                    return res.status(400).json({ msg: 'User with this username already exists' });
                }
                
                let userByID = await User.findOne({ userID });
                if (userByID) {
                    return res.status(400).json({ msg: 'User with this ID already exists' });
                }


                const hashedPassword = await hashPassword(password);
                user = new User({ username, password: hashedPassword, userID, name });
                await user.save();
                res.status(201).json({ msg: 'User registered successfully' });
            } catch (err) {
                console.error(err.message);
                res.status(500).send('Server Error');
            }
        }))(req, res);
    });
};
```
