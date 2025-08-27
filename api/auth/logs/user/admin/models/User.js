const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    userID: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        default: 'User'
    },
    role: {
        type: String,
        enum: ['user', 'admin'], 
        default: 'user'
    }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
