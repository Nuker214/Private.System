// your-project-name/src/services/user_service.js
const { queryDatabase } = require('../db/database'); // Placeholder for future DB interaction
const { logInfo, logError, sendWebhook } = require('../utils/logging');
const whitelistConfig = require('../config/whitelist.json'); // Import server-side whitelist
// const bcrypt = require('bcrypt'); // Uncomment and install 'bcrypt' for password hashing in a real app

// --- Configuration ---
const MAX_LOGIN_ATTEMPTS = 3; // Maximum allowed failed login attempts

// In-memory store for login attempts.
// !!! WARNING: This is NOT persistent. For production, store in your PostgreSQL database. !!!
const userLoginAttempts = new Map(); // Map<username: string, attempts: number>

/**
 * Retrieves the current number of failed login attempts for a given username.
 * @param {string} username The username to check.
 * @returns {Promise<number>} The number of failed attempts.
 */
async function getLoginAttempts(username) {
    // !!! TODO: Replace with fetching from your PostgreSQL database !!!
    // Example: SELECT attempts FROM users WHERE username = $1;
    return userLoginAttempts.get(username) || 0;
}

/**
 * Increments the failed login attempt counter for a given username.
 * @param {string} username The username whose attempts to increment.
 * @returns {Promise<number>} The new number of failed attempts.
 */
async function incrementLoginAttempts(username) {
    // !!! TODO: Replace with updating in your PostgreSQL database !!!
    // Example: UPDATE users SET attempts = attempts + 1 WHERE username = $1;
    const currentAttempts = (userLoginAttempts.get(username) || 0) + 1;
    userLoginAttempts.set(username, currentAttempts);
    return currentAttempts;
}

/**
 * Resets the failed login attempt counter for a given username.
 * @param {string} username The username whose attempts to reset.
 * @returns {Promise<void>}
 */
async function resetLoginAttempts(username) {
    // !!! TODO: Replace with updating in your PostgreSQL database !!!
    // Example: UPDATE users SET attempts = 0 WHERE username = $1;
    userLoginAttempts.delete(username);
}

/**
 * Helper to send detailed login attempt webhooks from the server.
 * This centralizes webhook formatting for all login-related events.
 *
 * @param {string} webhookKey The key from `webhook_urls.json` (e.g., 'CORRECT_INFORMATION').
 * @param {string} title The title for the Discord embed.
 * @param {number} color The color code for the Discord embed (e.g., 0x00FF00 for green).
 * @param {Array<object>} fields An array of Discord embed field objects.
 * @param {string} description An optional description for the embed.
 * @param {string} content The main text content of the webhook message.
 * @returns {Promise<boolean>} True if webhook sent, false otherwise.
 */
async function sendLoginAttemptWebhook(webhookKey, title, color, fields, description = null, content = '') {
    // Ensure all fields are valid according to Discord API limits if they came from client
    const sanitizedFields = fields.map(f => ({
        name: f.name.substring(0, 256),
        value: String(f.value).substring(0, 1024),
        inline: f.inline
    }));

    return await sendWebhook(webhookKey, {
        content: content,
        username: 'Auth Service Monitor', // Consistent webhook username
        avatar_url: 'https://i.imgur.com/G4fBwB4.png', // Consistent avatar
        embeds: [{
            title: title.substring(0, 256),
            description: description ? description.substring(0, 4096) : null,
            color: color,
            fields: sanitizedFields,
            timestamp: new Date().toISOString(),
            footer: {
                text: `Auth Event | IP: ${fields.find(f => f.name === 'Client IP')?.value || 'N/A'}`.substring(0, 2048)
            }
        }]
    });
}

/**
 * Authenticates a user against the server-side whitelist.
 * Handles login attempts, lockout logic, and dispatches detailed webhooks.
 *
 * @param {string} username The submitted username.
 * @param {string} password The submitted password.
 * @param {string} userID The submitted user identifier.
 * @param {string} clientIp The client's IP address (as detected by the server).
 * @param {string} dashboardId The unique ID of the client's dashboard session.
 * @returns {Promise<{success: boolean, message: string, reason: string, user?: object}>}
 *          An object indicating success/failure, a message, reason, and user data if successful.
 */
async function authenticateUser(username, password, userID, clientIp, dashboardId) {
    logInfo(`Server authentication request for user: ${username} (ID: ${userID}) from IP: ${clientIp}`);

    let message = 'Invalid credentials.';
    let reason = 'unknown_failure';
    let isSuccess = false;
    let authenticatedUser = null;

    const commonEmbedFields = [
        { name: 'Username Attempt', value: username || 'N/A', inline: true },
        { name: 'User ID Attempt', value: userID || 'N/A', inline: true },
        { name: 'Client IP', value: clientIp, inline: true },
        { name: 'Dashboard ID', value: dashboardId || 'N/A', inline: true }
    ];

    const currentAttempts = await getLoginAttempts(username);

    // 1. Check for lockout due to excessive attempts
    if (currentAttempts >= MAX_LOGIN_ATTEMPTS) {
        message = 'Account locked due to too many failed attempts.';
        reason = 'attempts_exceeded';
        logWarn(`Login for user '${username}' locked due to max attempts.`);
        await sendLoginAttemptWebhook(
            'ATTEMPT_EXCEEDED_INFORMATION',
            '🚨 Login Locked: Max Attempts Reached',
            0xDC143C, // Crimson Red
            [...commonEmbedFields, { name: 'Attempts Made', value: `${currentAttempts}`, inline: true }],
            message,
            `User **${username}** locked (ID: ${userID}) - Max attempts reached from \`${clientIp}\`.`
        );
        return { success: false, message, reason };
    }

    // 2. Validate credentials against the server-side whitelist
    const userFound = whitelistConfig.find(user =>
        user.username === username &&
        user.password === password && // !!! INSECURE: REPLACE WITH HASH COMPARISON !!!
        user.userID === userID
    );

    if (userFound) {
        isSuccess = true;
        message = 'Login successful!';
        reason = 'credentials_match';
        authenticatedUser = { username: userFound.username, userID: userFound.userID, name: userFound.name };
        await resetLoginAttempts(username); // Reset attempts on successful login

        logInfo(`User '${username}' authenticated successfully.`);
        await sendLoginAttemptWebhook(
            'CORRECT_INFORMATION',
            '✅ Successful Login',
            0x00FF00, // Green
            [...commonEmbedFields, { name: 'Attempts Before Success', value: `${currentAttempts}`, inline: true }],
            `User **${username}** (ID: ${userID}) logged in successfully from \`${clientIp}\`.`,
            `Successful login for **${username}** (ID: ${userID}) from \`${clientIp}\`.`
        );
        // Also send general session start info
        await sendLoginAttemptWebhook(
            'SESSION_INFORMATION',
            '🚀 New Session Started',
            0x00BFFF, // Light Blue
            [...commonEmbedFields, { name: 'Session Start Time', value: new Date().toISOString(), inline: false }],
            `New session started for **${username}** (ID: ${userID}) from \`${clientIp}\`.`,
            `New session for **${username}** (ID: ${userID}) from \`${clientIp}\`.`
        );

    } else {
        // Login failed
        const newAttempts = await incrementLoginAttempts(username);
        const attemptsLeft = MAX_LOGIN_ATTEMPTS - newAttempts;
        message = `Invalid credentials. Attempts left: ${attemptsLeft}.`;
        reason = 'invalid_credentials';
        logWarn(`Failed login for user '${username}'. Attempts left: ${attemptsLeft}.`);

        let invalidFields = []; // Track which fields were incorrect
        const usernameMatch = whitelistConfig.some(u => u.username === username);

        if (!usernameMatch) {
            invalidFields.push("Username");
            await sendLoginAttemptWebhook(
                'INVALID_USERNAME_INFORMATION',
                '🚫 Invalid Username Attempt',
                0xFF0000, // Red
                [...commonEmbedFields, { name: 'Reason', value: 'Username not found', inline: true }],
                `Username \`${username}\` not found during login attempt from \`${clientIp}\`.`,
                `Invalid username \`${username}\` from \`${clientIp}\`.`
            );
        } else {
            const matchedUser = whitelistConfig.find(u => u.username === username);
            if (matchedUser.password !== password) { // !!! INSECURE: REPLACE WITH HASH COMPARISON !!!
                invalidFields.push("Password");
                await sendLoginAttemptWebhook(
                    'INVALID_PASSWORD_INFORMATION',
                    '🚫 Invalid Password Attempt',
                    0xFF0000,
                    [...commonEmbedFields, { name: 'Reason', value: 'Password mismatch', inline: true }],
                    `Incorrect password for \`${username}\` from \`${clientIp}\`.`,
                    `Invalid password for \`${username}\` from \`${clientIp}\`.`
                );
            }
            if (matchedUser.userID !== userID) {
                invalidFields.push("User ID");
                await sendLoginAttemptWebhook(
                    'INVALID_IDENTIFIER_INFORMATION',
                    '🚫 Invalid User ID Attempt',
                    0xFF0000,
                    [...commonEmbedFields, { name: 'Reason', value: 'User ID mismatch', inline: true }],
                    `Incorrect User ID \`${userID}\` for \`${username}\` from \`${clientIp}\`.`,
                    `Invalid User ID \`${userID}\` for \`${username}\` from \`${clientIp}\`.`
                );
            }
        }

        // Send a general 'incorrect information' webhook for the overall failure
        await sendLoginAttemptWebhook(
            'INCORRECT_INFORMATION',
            '❌ Login Failed: Incorrect Credentials',
            0xFF0000, // Red
            [
                ...commonEmbedFields,
                { name: 'Invalid Fields', value: invalidFields.join(', ') || 'N/A', inline: false },
                { name: 'Attempts Left', value: `${attemptsLeft}`, inline: true },
                { name: 'Attempts Made (Total)', value: `${newAttempts}`, inline: true }
            ],
            `Failed login for \`${username}\` (ID: ${userID || 'N/A'}) from \`${clientIp}\`. Invalid fields: ${invalidFields.join(', ') || 'credentials mismatch'}. Attempts left: ${attemptsLeft}.`,
            `Login failed for \`${username}\` from \`${clientIp}\`. Attempts left: ${attemptsLeft}.`
        );

        // Also log attempt counter
        await sendLoginAttemptWebhook(
            'ATTEMPT_COUNTER_INFORMATION',
            '🔄 Attempt Counter Update',
            0xFF4500, // Orange-Red
            [
                { name: 'User Context', value: username, inline: true },
                { name: 'Attempts Remaining', value: `${attemptsLeft}`, inline: true },
                { name: 'Attempts Made', value: `${newAttempts}`, inline: true },
                { name: 'Client IP', value: clientIp, inline: true },
                { name: 'Dashboard ID', value: dashboardId || 'N/A', inline: true }
            ],
            `Login attempt counter for \`${username}\`: ${attemptsLeft} remaining.`,
            `Attempts for \`${username}\`: ${attemptsLeft} left.`
        );
    }

    return { success: isSuccess, message, reason, user: authenticatedUser };
}

// Placeholder for other user-related functions
async function getUserProfile(userId) {
    logInfo(`Fetching user profile for user ID: ${userId}`);
    try {
        // !!! TODO: Replace with querying your PostgreSQL database for user profiles !!!
        const result = await queryDatabase('SELECT id, username, email, full_name, role FROM users WHERE id = $1', [userId]);
        return result.rows[0] || null;
    } catch (error) {
        logError(`Error fetching user profile for ${userId}:`, error);
        return null;
    }
}

module.exports = {
    authenticateUser,
    getUserProfile,
    // Add other user management functions here (e.g., createUser, updateUser, deleteUser)
};
