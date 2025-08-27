const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    activity: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
