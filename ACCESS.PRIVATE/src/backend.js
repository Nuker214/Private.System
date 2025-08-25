const express = require('express');
const router = express.Router();
const { logger } = require('../utils/logging'); // Adjust path as needed
logger.info('This is an informational message.');
logger.warn('Something might be going wrong here.');
logger.error('An error occurred!', new Error('Detailed error message')); // You can pass an Error object
logger.debug('This is a debug message, visible in console but not info file.');
logger.http('Incoming request: GET /api/data');
const { emitToUser } = require('./utils/frontendCommunicator'); // To send commands to specific frontend users
const whitelist = require('../config/whitelist.json'); // For user validation
const fs = require('fs'); // To read/write JSON config files
const path = require('path'); // To resolve file paths

// Load environment variables for sensitive data like admin keys
require('dotenv').config();
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Store server start time for runtime calculation
const serverStartTime = new Date();

// --- Helper Functions ---

// Function to validate if a user exists in the whitelist
function isValidUser(targetUserId) {
    return whitelist.some(user => user.userID === targetUserId);
}

// Middleware for admin-only commands
function adminAuth(req, res, next) {
    const { adminKey } = req.body; // Expect adminKey in the request body for simplicity
    if (!adminKey || adminKey !== ADMIN_API_KEY) {
        logger.warn(`Unauthorized attempt to access admin command by user ${req.body.targetUserId || 'unknown'}`);
        return res.status(403).json({ success: false, message: 'Unauthorized: Admin privileges required.' });
    }
    next();
}

// Function to send a command to a specific user's frontend
function sendFrontendCommand(targetUserId, command, data = {}) {
    const success = emitToUser(targetUserId, 'backendCommand', { command, data });
    if (success) {
        logger.info(`Command '${command}' sent to user ${targetUserId}`);
    } else {
        logger.error(`Failed to send command '${command}' to user ${targetUserId}: User not connected or found.`);
    }
    return success;
}

// Function to read/write JSON files (e.g., for whitelist/blacklist, though whitelist is loaded once)
function readJsonFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        logger.error(`Error reading JSON file ${filePath}: ${error.message}`);
        return null;
    }
}

function writeJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        logger.error(`Error writing JSON file ${filePath}: ${error.message}`);
        return false;
    }
}

// --- API Endpoints for Frontend Commands ---

// 1. .Information (user): Shows detailed information about the user.
router.post('/user/info', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const user = whitelist.find(u => u.userID === targetUserId);
    const success = sendFrontendCommand(targetUserId, 'showUserInfo', { user });
    if (success) {
        res.json({ success: true, message: `Requested user info for ${targetUserId}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 2. .Logout (user): Logs out the user from the site.
router.post('/user/logout', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'logoutUser');
    if (success) {
        res.json({ success: true, message: `User ${targetUserId} logged out.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 3. .Panic (user), (redirect_url): Panics the user to a site or custom URL. Default is about:blank.
router.post('/user/panic', (req, res) => {
    const { targetUserId, redirect_url = 'about:blank' } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'panicRedirect', { url: redirect_url });
    if (success) {
        res.json({ success: true, message: `User ${targetUserId} panicked to ${redirect_url}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 4. .ZoomControl (user), (level): Controls the website zoom for the user (e.g., 100, 125, 75).
router.post('/user/zoom', (req, res) => {
    const { targetUserId, level } = req.body;
    if (!targetUserId || !isValidUser(targetUserId) || typeof level !== 'number' || level < 50 || level > 200) {
        return res.status(400).json({ success: false, message: 'Invalid targetUserId or zoom level (must be 50-200).' });
    }
    const success = sendFrontendCommand(targetUserId, 'setZoom', { level: level / 100 }); // Convert to ratio for frontend
    if (success) {
        res.json({ success: true, message: `User ${targetUserId} zoom set to ${level}%.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 5. .ClearUpdates (user): Clears the user's update logs on the site.
router.post('/user/clear/updates', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'clearUpdates');
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s updates cleared.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 6. .ClearNotifications (user): Clears the user's notifications.
router.post('/user/clear/notifications', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'clearNotifications');
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s notifications cleared.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 7. .ClearActivity (user): Clears the user's activity logs.
router.post('/user/clear/activity', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'clearActivity');
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s activity logs cleared.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 8. .ClearError (user): Clears error logs for the user.
router.post('/user/clear/error', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'clearErrorLogs');
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s error logs cleared.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 9. .ClearLoginHistory (user): Clears the user's login logs.
router.post('/user/clear/loginHistory', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'clearLoginHistory');
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s login history cleared.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 10. .ClearAll (user): Clears ALL logs/data for the user (USE WITH CAUTION).
router.post('/user/clear/all', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    // This command would trigger multiple clear functions on the frontend
    const success = sendFrontendCommand(targetUserId, 'clearAllUserData');
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s all data cleared (use with caution!).` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 11. .SetClicks (user), (number): Sets the user's click count.
router.post('/user/clicks/set', (req, res) => {
    const { targetUserId, number } = req.body;
    if (!targetUserId || !isValidUser(targetUserId) || typeof number !== 'number' || number < 0) {
        return res.status(400).json({ success: false, message: 'Invalid targetUserId or click number.' });
    }
    const success = sendFrontendCommand(targetUserId, 'setClickCount', { count: number });
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s click count set to ${number}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 12. .ClearClicks (user): Clears all click counts for the user.
router.post('/user/clicks/clear', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'clearClickCount');
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s click count cleared.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 13. .Stats (user): Shows all stats for the user.
router.post('/user/stats', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'showStatsPanel');
    if (success) {
        res.json({ success: true, message: `Requested stats panel for user ${targetUserId}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 14. .SessionTime (user): Shows the current session time for the user.
router.post('/user/sessionTime', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    // The frontend already displays this, this command would just highlight/refresh it
    const success = sendFrontendCommand(targetUserId, 'refreshSessionTime');
    if (success) {
        res.json({ success: true, message: `Requested session time refresh for user ${targetUserId}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 15. .SetAnnouncement (user), (message): Sets a custom announcement for the user.
router.post('/user/announcement/set', (req, res) => {
    const { targetUserId, message } = req.body;
    if (!targetUserId || !isValidUser(targetUserId) || !message) {
        return res.status(400).json({ success: false, message: 'Invalid targetUserId or missing message.' });
    }
    const success = sendFrontendCommand(targetUserId, 'setAnnouncement', { message });
    if (success) {
        res.json({ success: true, message: `Announcement set for user ${targetUserId}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 16. .Restart (user): Restarts their page/session.
router.post('/user/restart', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'restartPage');
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s page restarted.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 17. .Theme (user), (theme_name): Changes the user's theme (e.g., dark, light).
router.post('/user/theme/set', (req, res) => {
    const { targetUserId, theme_name } = req.body;
    if (!targetUserId || !isValidUser(targetUserId) || !['dark', 'light'].includes(theme_name)) {
        return res.status(400).json({ success: false, message: 'Invalid targetUserId or theme_name (must be "dark" or "light").' });
    }
    const success = sendFrontendCommand(targetUserId, 'setTheme', { theme: theme_name });
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s theme set to ${theme_name}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 18. .Screenshot (user): Shows an image of their screen. (Admin Only)
router.post('/user/screenshot', adminAuth, (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    // The frontend would take the screenshot and then send it back to the backend via another API endpoint
    const success = sendFrontendCommand(targetUserId, 'takeScreenshot');
    if (success) {
        res.json({ success: true, message: `Requested screenshot from user ${targetUserId}. Frontend will send it back.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 19. .Notes (user): Shows the user's notes.
router.post('/user/notes', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'showNotesPanel');
    if (success) {
        res.json({ success: true, message: `Requested notes panel for user ${targetUserId}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 20. .SetColor (user), (hex_code): Sets the user's dashboard color (e.g., #1abc9c).
router.post('/user/color/set', (req, res) => {
    const { targetUserId, hex_code } = req.body;
    // Basic hex code validation (e.g., #RRGGBB or #RGB)
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (!targetUserId || !isValidUser(targetUserId) || !hexRegex.test(hex_code)) {
        return res.status(400).json({ success: false, message: 'Invalid targetUserId or hex_code.' });
    }
    const success = sendFrontendCommand(targetUserId, 'setAccentColor', { color: hex_code });
    if (success) {
        res.json({ success: true, message: `User ${targetUserId}'s accent color set to ${hex_code}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 21. .Event (user), (event_name), (message): Sets a custom event for the user.
router.post('/user/event/add', (req, res) => {
    const { targetUserId, event_name, message } = req.body;
    if (!targetUserId || !isValidUser(targetUserId) || !event_name || !message) {
        return res.status(400).json({ success: false, message: 'Invalid targetUserId, event_name, or message.' });
    }
    const success = sendFrontendCommand(targetUserId, 'addImportantEvent', { eventName: event_name, message: message });
    if (success) {
        res.json({ success: true, message: `Custom event '${event_name}' added for user ${targetUserId}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 22. .Sections (user), (action), (section_name): Removes or enables website sections (e.g., enable banner, remove sidebar).
router.post('/user/sections', (req, res) => {
    const { targetUserId, action, section_name } = req.body;
    if (!targetUserId || !isValidUser(targetUserId) || !['enable', 'disable', 'toggle'].includes(action) || !section_name) {
        return res.status(400).json({ success: false, message: 'Invalid targetUserId, action (enable/disable/toggle), or section_name.' });
    }
    const success = sendFrontendCommand(targetUserId, 'controlSectionVisibility', { action, sectionName: section_name });
    if (success) {
        res.json({ success: true, message: `Section '${section_name}' ${action}d for user ${targetUserId}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 23. .Device (user): Shows the user's device information.
router.post('/user/deviceInfo', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'showDeviceInfo');
    if (success) {
        res.json({ success: true, message: `Requested device info for user ${targetUserId}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 24. .GetLogs (user), (log_type): Retrieves specific logs for the user.
router.post('/user/logs/get', (req, res) => {
    const { targetUserId, log_type } = req.body;
    if (!targetUserId || !isValidUser(targetUserId) || !['activity', 'error', 'login'].includes(log_type)) {
        return res.status(400).json({ success: false, message: 'Invalid targetUserId or log_type (must be activity, error, or login).' });
    }
    // The frontend would collect the logs and send them back to the backend via another API endpoint
    const success = sendFrontendCommand(targetUserId, 'requestLogs', { logType: log_type });
    if (success) {
        res.json({ success: true, message: `Requested '${log_type}' logs from user ${targetUserId}. Frontend will send them back.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 25. .SendNotification (user), (message): Sends a custom notification to the user.
router.post('/user/notification/send', (req, res) => {
    const { targetUserId, message } = req.body;
    if (!targetUserId || !isValidUser(targetUserId) || !message) {
        return res.status(400).json({ success: false, message: 'Invalid targetUserId or missing message.' });
    }
    const success = sendFrontendCommand(targetUserId, 'showCustomNotification', { message });
    if (success) {
        res.json({ success: true, message: `Custom notification sent to user ${targetUserId}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// --- NEW COMMANDS ---

// 26. .Website Status: Shows the operational status of the backend.
router.get('/status', (req, res) => {
    logger.info('Website status requested.');
    res.json({
        success: true,
        status: 'operational',
        message: 'Backend server is running and responsive.',
        timestamp: new Date().toISOString()
    });
});

// 27. .Ping: Responds to check if the backend is alive.
router.get('/ping', (req, res) => {
    logger.info('Ping received.');
    res.json({
        success: true,
        message: 'Pong!',
        timestamp: new Date().toISOString(),
        latency: `${Date.now() - req.requestTime}ms` // Assuming req.requestTime is set by a middleware
    });
});

// 28. .Runtime: Shows how long the backend server has been running.
router.get('/runtime', (req, res) => {
    logger.info('Runtime requested.');
    const uptimeSeconds = Math.floor((new Date() - serverStartTime) / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    res.json({
        success: true,
        message: `Server has been running for ${hours}h ${minutes}m ${seconds}s.`,
        serverStartTime: serverStartTime.toISOString(),
        uptimeSeconds: uptimeSeconds
    });
});

// 29. .Test Logs (user): Generates some dummy log entries on the user's site for testing.
router.post('/user/testlogs', (req, res) => {
    const { targetUserId } = req.body;
    if (!targetUserId || !isValidUser(targetUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing targetUserId.' });
    }
    const success = sendFrontendCommand(targetUserId, 'generateTestLogs');
    if (success) {
        res.json({ success: true, message: `Requested test log generation for user ${targetUserId}.` });
    } else {
        res.status(500).json({ success: false, message: `Failed to send command to user ${targetUserId}.` });
    }
});

// 30. .Kill Switch (Admin Only): Shuts down the Node.js server.
router.post('/admin/kill', adminAuth, (req, res) => {
    logger.warn(`Admin ${req.body.adminKey ? 'with key' : 'unknown'} initiated server shutdown.`);
    res.json({ success: true, message: 'Server is shutting down...' });
    // Give a small delay to ensure the response is sent before killing the process
    setTimeout(() => {
        process.exit(0); // Exit the Node.js process
    }, 1000);
});


module.exports = router;
