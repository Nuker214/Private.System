// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const http = require('http'); // <--- ADD THIS LINE to create an HTTP server
const path = require('path');
const { logger } = require('./utils/logging');
const { client } = require('./discord/discordClient');
const backendRoutes = require('./backend');
const { handleGitHubWebhook } = require('./utils/webhook');
const { connectDB } = require('./services/database');
const { initializeSocketIO } = require('./utils/frontendCommunicator'); // <--- ADD THIS LINE

const app = express();
const PORT = process.env.PORT || 3000;

// Create an HTTP server from the Express app
const httpServer = http.createServer(app); // <--- CREATE HTTP SERVER HERE

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
    initializeSocketIO(httpServer); // <--- INITIALIZE SOCKET.IO HERE

    // Start the HTTP server (not app.listen directly)
    httpServer.listen(PORT, () => { // <--- LISTEN ON HTTP SERVER
        logger.info(`Server is running on port ${PORT}`);
        logger.info(`Access frontend at http://localhost:${PORT}`);
    });
}).catch(error => {
    logger.error(`Failed to start server due to database connection error: ${error.message}`);
    process.exit(1);
});

// --- Global Error Handling ---
app.use((err, req, res, next) => {
    logger.error(`Unhandled application error: ${err.message}`, { stack: err.stack, requestUrl: req.originalUrl });
    res.status(500).send('An unexpected error occurred. Please try again later.');
});

module.exports = app;
