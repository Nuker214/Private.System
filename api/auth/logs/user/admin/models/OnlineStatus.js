const mongoose = require('mongoose');

const OnlineStatusSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    lastActive: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.OnlineStatus || mongoose.model('OnlineStatus', OnlineStatusSchema);
