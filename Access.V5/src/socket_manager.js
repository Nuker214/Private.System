// your-project-name/src/socket_manager.js
const { Server } = require('socket.io');
const { logInfo, logWarn, logError, sendBotLog } = require('./utils/logging');

let io; // This variable will hold our Socket.IO server instance
// A Map to store the mapping between a unique dashboardId (from client) and its Socket.IO socket.id
const connectedDashboards = new Map(); // Format: Map<dashboardId: string, socket.id: string>

/**
 * Initializes the Socket.IO server.
 * This function should be called once, passing the HTTP server instance created by Express.
 * @param {http.Server} httpServer The HTTP server instance to attach Socket.IO to.
 */
function initSocketIO(httpServer) {
    if (io) {
        logWarn('Socket.IO already initialized. Skipping re-initialization.');
        return;
    }

    io = new Server(httpServer, {
        // CORS configuration is critical for production deployments.
        // On Render, your frontend and backend will typically be on the same Render service URL,
        // but often accessed from a different origin during local development or if you configure a custom domain.
        cors: {
            // In production on Render: Set origin to your actual Render frontend URL (e.g., https://your-app-name.onrender.com)
            // During local development: "*" allows all origins (less secure, but easy for testing)
            // You can use process.env.FRONTEND_URL for this if you set it in Render's environment variables.
            origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "*",
            methods: ["GET", "POST"],
            credentials: true // Important if you need to send cookies or authorization headers
        },
        // Optionally, configure ping intervals for better connection management
        pingInterval: 25000, // Send a ping every 25 seconds
        pingTimeout: 60000    // If no pong is received within 60 seconds, assume disconnect
    });

    // --- Socket.IO Connection Event Handler ---
    io.on('connection', (socket) => {
        logInfo(`A dashboard client connected: ${socket.id}`);

        // Client sends a 'registerDashboard' event to identify itself with its unique dashboardId
        socket.on('registerDashboard', (data) => {
            const dashboardId = data.dashboardId;
            if (dashboardId) {
                // Check if this dashboardId is already registered with a different socket
                if (connectedDashboards.has(dashboardId)) {
                    const oldSocketId = connectedDashboards.get(dashboardId);
                    if (oldSocketId !== socket.id) {
                        const oldSocket = io.sockets.sockets.get(oldSocketId);
                        if (oldSocket) {
                            logWarn(`Dashboard ID '${dashboardId}' already registered with old socket '${oldSocketId}'. Disconnecting old socket.`);
                            oldSocket.disconnect(true); // Force disconnect the old socket
                            sendBotLog('DISCONNECTED_STATUS', `🔴 Dashboard \`${dashboardId}\` (old session \`${oldSocketId}\`) replaced by new connection \`${socket.id}\`.`);
                        }
                    }
                }
                // Store the new mapping and add the socket to a room for easy targeting
                connectedDashboards.set(dashboardId, socket.id);
                socket.join(dashboardId); // Each dashboard gets its own room for targeted messages
                logInfo(`Dashboard '${dashboardId}' registered with socket '${socket.id}'. Total active: ${connectedDashboards.size}`);
                sendBotLog('CONNECTION_INFORMATION', `✅ Dashboard \`${dashboardId}\` connected. Socket ID: \`${socket.id}\` | IP: \`${socket.handshake.address}\``);
            } else {
                logWarn(`Dashboard client '${socket.id}' tried to register without a dashboardId.`);
                sendBotLog('ERROR_LOGGING_INFORMATION', `⚠️ Unregistered client \`${socket.id}\` connected without a dashboard ID.`);
            }
        });

        // --- Socket.IO Disconnection Event Handler ---
        socket.on('disconnect', (reason) => {
            logInfo(`A dashboard client disconnected: ${socket.id} (Reason: ${reason})`);
            // Find and remove the dashboard from our map
            for (let [dashboardId, storedSocketId] of connectedDashboards.entries()) {
                if (storedSocketId === socket.id) {
                    connectedDashboards.delete(dashboardId);
                    logInfo(`Dashboard '${dashboardId}' unregistered. Total active: ${connectedDashboards.size}`);
                    sendBotLog('DISCONNECTED_STATUS', `🔴 Dashboard \`${dashboardId}\` disconnected. Reason: \`${reason}\``);
                    break;
                }
            }
        });

        // --- Socket.IO Error Event Handler ---
        socket.on('error', (err) => {
            logError(`Socket error for '${socket.id}': ${err.message}`, err);
            // Attempt to find the dashboard ID associated with this socket for logging
            let dashboardId = 'unknown';
            for (let [id, storedSocketId] of connectedDashboards.entries()) {
                if (storedSocketId === socket.id) {
                    dashboardId = id;
                    break;
                }
            }
            sendBotLog('USER_ERRORS', `❌ Socket error for dashboard \`${dashboardId}\` (\`${socket.id}\`): \`${err.message}\``);
        });
    });
    logInfo('Socket.IO initialized and ready for connections.');
}

/**
 * Returns the initialized Socket.IO server instance.
 * @returns {Server} The Socket.IO server instance.
 * @throws {Error} If Socket.IO has not been initialized yet.
 */
function getIo() {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initSocketIO(httpServer) first in server.js.');
    }
    return io;
}

/**
 * Emits a real-time event to a specific connected dashboard.
 * @param {string} dashboardId The unique ID of the target dashboard (provided by client).
 * @param {string} eventName The name of the event to emit (e.g., 'dashboardUpdate', 'newNotification').
 * @param {object} data The payload to send with the event.
 * @returns {boolean} True if the message was emitted, false otherwise (e.g., dashboard not found).
 */
async function emitToDashboard(dashboardId, eventName, data) {
    if (!io) {
        logError('Socket.IO not initialized, cannot emit to dashboard.');
        return false;
    }

    // Emit to the specific room associated with the dashboardId.
    // This is robust as a client can join a room even if it has multiple tabs/windows,
    // and all instances of that dashboardId will receive the message.
    const roomExists = io.sockets.adapter.rooms.has(dashboardId);
    if (roomExists) {
        io.to(dashboardId).emit(eventName, data);
        logInfo(`Emitted event '${eventName}' to dashboard room '${dashboardId}'.`);
        return true;
    } else {
        logWarn(`Dashboard ID '${dashboardId}' is not currently connected (or room not found), cannot emit event '${eventName}'.`);
        return false;
    }
}

/**
 * Returns a list of all currently connected dashboard IDs.
 * @returns {string[]} An array of unique dashboard IDs.
 */
function getConnectedDashboardIds() {
    return Array.from(connectedDashboards.keys());
}

module.exports = {
    initSocketIO,
    getIo,
    emitToDashboard,
    getConnectedDashboardIds
};
