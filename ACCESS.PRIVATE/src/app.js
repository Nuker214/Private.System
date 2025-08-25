// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const { logger } = require('./utils/logging');
const { client } = require('./discord/discordClient');
const backendRoutes = require('./backend');
const { handleGitHubWebhook } = require('./utils/webhook');
const { connectDB } = require('./services/database');
const { initializeSocketIO } = require('./utils/frontendCommunicator');
const { sendWebhook, createEmbedsFromFields } = require('./utils/discordWebhookSender'); // For backend-initiated webhooks

const app = express();
const PORT = process.env.PORT || 3000;

// Create an HTTP server from the Express app
const httpServer = http.createServer(app);

// --- Middleware Setup ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
logger.info(`Serving static files from: ${path.join(__dirname, '../public')}`);

// --- API Routes ---
app.use('/api', backendRoutes);
logger.info('Backend API routes mounted under /api');

// --- Webhook Routes ---
app.post('/webhook/github', (req, res) => {
    const githubEvent = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];

    if (!githubEvent || !signature) {
        logger.warn('Received GitHub webhook without event or signature header.');
        return res.status(400).send('Missing X-GitHub-Event or X-Hub-Signature-256 header');
    }
    handleGitHubWebhook(req, res);
});
logger.info('GitHub webhook route /webhook/github configured.');

// --- Discord Bot Initialization ---
if (process.env.DISCORD_BOT_TOKEN) {
    client.login(process.env.DISCORD_BOT_TOKEN)
        .then(() => logger.info('Discord bot login initiated successfully.'))
        .catch(error => logger.error(`Failed to log in to Discord: ${error.message}`));
} else {
    logger.error('DISCORD_BOT_TOKEN not found in environment variables. Discord bot will not start.');
}

// --- Server Start ---

// Connect to the database before starting the Express server
connectDB().then(() => {
    // Initialize Socket.IO after the HTTP server is created
    initializeSocketIO(httpServer);

    // Start the HTTP server (not app.listen directly)
    httpServer.listen(PORT, async () => {
        logger.info(`Server is running on port ${PORT}`);
        logger.info(`Access frontend at http://localhost:${PORT}`);

        // Send Backend Server Online Status to HOLDING_AREA via webhook
        const embed = createEmbedsFromFields(
            "✅ Backend Server Online",
            0x00FF00, // Green
            [
                { name: "Timestamp", value: new Date().toLocaleString(), inline: false },
                { name: "Port", value: PORT.toString(), inline: true },
                { name: "Service URL", value: process.env.BACKEND_URL ? process.env.BACKEND_URL.replace('/api', '') : 'N/A', inline: true }
            ],
            `The Node.js backend server is now online and accessible.`
        );
        // Use the webhook URL for holding area from .env
        const holdingAreaWebhookUrl = process.env.DISCORD_HOLDING_AREA_WEBHOOK_URL; // Assuming you'll add this to .env
        if (holdingAreaWebhookUrl) {
            await sendWebhook(holdingAreaWebhookUrl, embed, "Backend Status Reporter");
        } else {
            logger.warn("DISCORD_HOLDING_AREA_WEBHOOK_URL not set in .env. Backend online status not sent to Discord.");
        }
    });
}).catch(error => {
    // Add a console.error here to ensure it gets printed even if logger has issues
    console.error(`CRITICAL ERROR: Failed to start server due to database connection error: ${error.message}`);
    // Also try to log with stack for more info
    logger.error(`Failed to start server due to database connection error: ${error.message}`, { stack: error.stack });
    process.exit(1);
});
// --- Global Error Handling ---
app.use((err, req, res, next) => {
    logger.error(`Unhandled application error: ${err.message}`, { stack: err.stack, requestUrl: req.originalUrl });
    res.status(500).send('An unexpected error occurred. Please try again later.');
});

module.exports = app;
