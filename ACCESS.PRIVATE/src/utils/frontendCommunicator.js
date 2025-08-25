const { Server } = require('socket.io');
const { logger } = require('./logging');

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

        // Handle incoming messages/events from the frontend if needed
        socket.on('frontendEvent', (data) => {
            logger.debug(`Received frontend event from ${socket.id}:`, data);
            // Example: If frontend sends a screenshot, process it here
            if (data.command === 'screenshotData' && data.userId && data.imageData) {
                logger.info(`Received screenshot data from user ${data.userId}.`);
                // Here you would process the screenshot, e.g., save it, send to Discord webhook
                // Example: sendDiscordWebhook(process.env.DISCORD_SCREENSHOT_WEBHOOK, { image: data.imageData });
                // For now, just log it.
                // You might want to save this to a file or upload it.
                // fs.writeFileSync(path.join(__dirname, `../../screenshots/${data.userId}_${Date.now()}.png`), data.imageData.split(',')[1], 'base64');
                // logger.info(`Screenshot saved for user ${data.userId}`);
            }
            // Example: If frontend sends logs, process them here
            if (data.command === 'userLogs' && data.userId && data.logType && data.logs) {
                logger.info(`Received ${data.logType} logs from user ${data.userId}. Log count: ${data.logs.length}`);
                // Here you would process the logs, e.g., save to database, send to Discord webhook
                // Example: sendDiscordWebhook(process.env.DISCORD_LOGS_WEBHOOK, { content: `Logs from ${data.userId}: ${JSON.stringify(data.logs)}` });
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
