const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

async function hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

async function comparePasswords(plainPassword, hashedPassword) {
    return bcrypt.compare(plainPassword, hashedPassword);
}

function generateAccessToken(userPayload) {
    return jwt.sign(userPayload, process.env.JWT_SECRET, { expiresIn: '1h' }); 
}

module.exports = {
    hashPassword,
    comparePasswords,
    generateAccessToken
};
