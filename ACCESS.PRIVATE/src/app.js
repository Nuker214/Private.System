// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const path = require('path');
const { logger } = require('./utils/logging'); // Your centralized logging utility

logger.info('This is an informational message.');
logger.warn('Something might be going wrong here.');
logger.error('An error occurred!', new Error('Detailed error message')); // You can pass an Error object
logger.debug('This is a debug message, visible in console but not info file.');
logger.http('Incoming request: GET /api/data');
const { client } = require('./discord/discordClient'); // Your Discord bot client
const backendRoutes = require('./backend'); // Your core backend API routes
const { handleGitHubWebhook } = require('./utils/webhook'); // Your webhook handler

const app = express();
const PORT = process.env.PORT || 3000; // Use port from .env or default to 3000

// --- Middleware Setup ---

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
// This makes your index.html, script.js, and style.css accessible
app.use(express.static(path.join(__dirname, '../public')));
logger.info(`Serving static files from: ${path.join(__dirname, '../public')}`);

// --- API Routes ---

// Mount your backend API routes under the /api path
app.use('/api', backendRoutes);
logger.info('Backend API routes mounted under /api');

// --- Webhook Routes ---

// Example: Route for handling GitHub webhooks
// The secret should be configured in your GitHub webhook settings and .env
app.post('/webhook/github', (req, res) => {
    // Basic validation for GitHub webhooks (optional but recommended)
    const githubEvent = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256']; // GitHub's new signature header

    if (!githubEvent || !signature) {
        logger.warn('Received GitHub webhook without event or signature header.');
        return res.status(400).send('Missing X-GitHub-Event or X-Hub-Signature-256 header');
    }

    // Pass to your dedicated webhook handler
    handleGitHubWebhook(req, res);
});
logger.info('GitHub webhook route /webhook/github configured.');

// --- Discord Bot Initialization ---

// Log in to Discord with your client's token
// The token should be in your .env file as DISCORD_BOT_TOKEN
if (process.env.DISCORD_BOT_TOKEN) {
    client.login(process.env.DISCORD_BOT_TOKEN)
        .then(() => logger.info('Discord bot login initiated successfully.'))
        .catch(error => logger.error(`Failed to log in to Discord: ${error.message}`));
} else {
    logger.error('DISCORD_BOT_TOKEN not found in environment variables. Discord bot will not start.');
}


// --- Server Start ---

// Start the Express server
app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Access frontend at http://localhost:${PORT}`);
});

// --- Global Error Handling ---

// Catch-all for unhandled errors
app.use((err, req, res, next) => {
    logger.error(`Unhandled application error: ${err.message}`, { stack: err.stack, requestUrl: req.originalUrl });
    res.status(500).send('An unexpected error occurred. Please try again later.');
});

// Export the app for testing or other modules if needed
module.exports = app;
