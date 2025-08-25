const { Server } = require('socket.io');
const { logger } = require('./logging');
// const { sendWebhook, createEmbedsFromFields } = require('./discordWebhookSender'); // Only needed if frontendCommunicator itself sends webhooks directly

// Load environment variables (if needed for webhooks sent from here)
require('dotenv').config();
// const DISCORD_SCREENSHOT_WEBHOOK_URL = process.env.DISCORD_SCREENSHOT_WEBHOOK_URL; // Example if you add this later
// const DISCORD_USER_LOGS_WEBHOOK_URL = process.env.DISCORD_USER_LOGS_WEBHOOK_URL; // Example if you add this later

// A map to store connected clients, mapping userID to their Socket.IO socket ID
// This allows us to target specific users.
const connectedClients = new Map(); // Map<string, string> where key is userID, value is socket.id

let io; // Declare io variable to be accessible throughout the module

/**
 * Initializes the Socket.IO server.
 * This function should be called once, typically in app.js, after the HTTP server is created.
 * @param {object} httpServer The Node.js HTTP server instance (e.g., from app.listen).
 */
function initializeSocketIO(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow all origins for development. Restrict in production!
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket) => {
        logger.info(`Frontend client connected: ${socket.id}`);

        // When a client sends their userID, store it
        socket.on('registerUser', (userID) => {
            if (userID) {
                connectedClients.set(userID, socket.id);
                logger.info(`User ${userID} registered with socket ID: ${socket.id}`);
                // Optionally, send a confirmation back to the client
                socket.emit('registrationSuccess', `Successfully registered as ${userID}`);
            } else {
                logger.warn(`Client ${socket.id} attempted to register without a userID.`);
            }
        });

        socket.on('disconnect', () => {
            // Remove the disconnected client from our map
            let disconnectedUserId = null;
            for (let [userId, socketId] of connectedClients.entries()) {
                if (socketId === socket.id) {
                    disconnectedUserId = userId;
                    connectedClients.delete(userId);
                    break;
                }
            }
            if (disconnectedUserId) {
                logger.info(`User ${disconnectedUserId} (socket ID: ${socket.id}) disconnected.`);
            } else {
                logger.info(`Frontend client disconnected: ${socket.id} (unregistered user).`);
            }
        });

        // Handle incoming messages/events from the frontend
        // This is where frontend-initiated data (like screenshots, logs) is received.
        socket.on('frontendEvent', async (data) => { // Make this async
            logger.debug(`Received frontend event from ${socket.id}:`, data);
            
            // Example: If frontend sends a screenshot, process it here
            if (data.command === 'screenshotData' && data.userId && data.imageData) {
                logger.info(`Received screenshot data from user ${data.userId}.`);
                // Here you would process the screenshot, e.g., save it, send to Discord webhook
                // This logic could be moved to a dedicated API endpoint in backend.js
                // For now, just logging.
                // Example:
                // if (DISCORD_SCREENSHOT_WEBHOOK_URL) {
                //     const embed = createEmbedsFromFields("📸 User Screenshot", 0x0099FF, [
                //         { name: "User ID", value: data.userId, inline: true },
                //         { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
                //     ], "Screenshot received from user.");
                //     // You'd need to send the image data separately or as an attachment
                //     // This is more complex than a simple embed.
                //     // await sendWebhook(DISCORD_SCREENSHOT_WEBHOOK_URL, embed, "Screenshot Receiver");
                // }
            }
            // Example: If frontend sends logs, process them here
            if (data.command === 'userLogs' && data.userId && data.logType && data.logs) {
                logger.info(`Received ${data.logType} logs from user ${data.userId}. Log count: ${data.logs.length}`);
                // This logic could also be moved to a dedicated API endpoint in backend.js
                // For now, just logging.
                // Example:
                // if (DISCORD_USER_LOGS_WEBHOOK_URL) {
                //     const embed = createEmbedsFromFields(`📄 User ${data.logType} Logs`, 0x0099FF, [
                //         { name: "User ID", value: data.userId, inline: true },
                //         { name: "Log Type", value: data.logType, inline: true },
                //         { name: "Log Count", value: data.logs.length.toString(), inline: true },
                //         { name: "Timestamp", value: new Date().toLocaleString(), inline: false },
                //         { name: "Logs Snippet", value: JSON.stringify(data.logs.slice(0, 3), null, 2).substring(0, 1024), inline: false }
                //     ], `Received ${data.logType} logs from user ${data.userId}.`);
                //     await sendWebhook(DISCORD_USER_LOGS_WEBHOOK_URL, embed, "User Log Receiver");
                // }
            }
        });
    });

    logger.info('Socket.IO server initialized.');
}

/**
 * Emits an event to a specific connected frontend user.
 * @param {string} userID The ID of the target user.
 * @param {string} eventName The name of the event to emit.
 * @param {object} data The data to send with the event.
 * @returns {boolean} True if the event was emitted, false if the user is not connected.
 */
function emitToUser(userID, eventName, data) {
    if (!io) {
        logger.error('Socket.IO server not initialized. Cannot emit to user.');
        return false;
    }
    const socketId = connectedClients.get(userID);
    if (socketId) {
        io.to(socketId).emit(eventName, data);
        logger.debug(`Emitted event '${eventName}' to user ${userID} (socket ${socketId})`);
        return true;
    } else {
        logger.warn(`User ${userID} is not connected. Cannot emit event '${eventName}'.`);
        return false;
    }
}

/**
 * Emits an event to all connected frontend users.
 * @param {string} eventName The name of the event to emit.
 * @param {object} data The data to send with the event.
 */
function emitToAll(eventName, data) {
    if (!io) {
        logger.error('Socket.IO server not initialized. Cannot emit to all.');
        return;
    }
    io.emit(eventName, data);
    logger.debug(`Emitted event '${eventName}' to all connected clients.`);
}

module.exports = {
    initializeSocketIO,
    emitToUser,
    emitToAll
};
