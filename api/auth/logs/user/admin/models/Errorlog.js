const mongoose = require('mongoose');

const ErrorLogSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    message: { type: String, required: true },
    stack: { type: String },
}, { timestamps: true });

module.exports = mongoose.models.ErrorLog || mongoose.model('ErrorLog', ErrorLogSchema);
