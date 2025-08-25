const crypto = require('crypto');
const { logger } = require('./logging'); // Your centralized logging utility
const { emitToAll, emitToUser } = require('./frontendCommunicator'); // For sending events to frontend

// Load environment variables
require('dotenv').config();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * Verifies the signature of an incoming GitHub webhook request.
 * @param {string} signature The 'X-Hub-Signature-256' header value.
 * @param {string} payload The raw request body.
 * @returns {boolean} True if the signature is valid, false otherwise.
 */
function verifyGitHubSignature(signature, payload) {
    if (!WEBHOOK_SECRET) {
        logger.error('WEBHOOK_SECRET is not set in environment variables. GitHub webhook verification skipped!');
        return false; // Or throw an error, depending on desired strictness
    }

    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    
    // Use crypto.timingSafeEqual to prevent timing attacks
    try {
        return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
    } catch (e) {
        logger.error(`Error during timingSafeEqual for GitHub webhook: ${e.message}`);
        return false;
    }
}

/**
 * Handles incoming GitHub webhook requests.
 * This function is called by app.js when a POST request hits /webhook/github.
 * @param {object} req The Express request object.
 * @param {object} res The Express response object.
 */
async function handleGitHubWebhook(req, res) {
    const githubEvent = req.headers['x-github-event'];
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body); // GitHub sends JSON, so req.body is already parsed

    logger.info(`Received GitHub webhook event: ${githubEvent}`);

    // 1. Verify Signature
    if (!verifyGitHubSignature(signature, payload)) {
        logger.warn('GitHub webhook signature verification failed.');
        return res.status(401).send('Signature verification failed.');
    }
    logger.info('GitHub webhook signature verified successfully.');

    // 2. Process the event based on 'x-github-event' header
    try {
        switch (githubEvent) {
            case 'ping':
                // GitHub sends a 'ping' event when you set up the webhook
                logger.info('GitHub ping event received. Webhook is active.');
                res.status(200).send('Pong!');
                break;

            case 'push':
                const branch = req.body.ref.split('/').pop(); // e.g., 'main'
                const pusher = req.body.pusher.name;
                const commitMessage = req.body.head_commit.message;
                logger.info(`GitHub Push event on branch '${branch}' by ${pusher}: "${commitMessage}"`);

                // Example: Send a notification to all connected frontend users
                emitToAll('showCustomNotification', {
                    message: `New code pushed to '${branch}' by ${pusher}: "${commitMessage.substring(0, 50)}..."`
                });
                // You could also send a Discord webhook here if you want to notify a Discord channel
                // await sendDiscordWebhook(process.env.DISCORD_GITHUB_WEBHOOK, {
                //     content: `New push to \`${branch}\` by **${pusher}**: \`${commitMessage}\``
                // });

                res.status(200).send('Push event processed.');
                break;

            case 'issues':
                const issueAction = req.body.action; // e.g., 'opened', 'closed'
                const issueTitle = req.body.issue.title;
                const issueNumber = req.body.issue.number;
                const issueUrl = req.body.issue.html_url;
                logger.info(`GitHub Issue event: Issue #${issueNumber} '${issueTitle}' ${issueAction}.`);

                emitToAll('showCustomNotification', {
                    message: `Issue #${issueNumber} ${issueAction}: "${issueTitle}"`
                });

                res.status(200).send('Issue event processed.');
                break;

            // Add more cases for other GitHub events you want to handle (e.g., 'pull_request', 'star')
            // case 'pull_request':
            //     logger.info('Pull request event received.');
            //     res.status(200).send('Pull request event processed.');
            //     break;

            default:
                logger.info(`Unhandled GitHub event type: ${githubEvent}`);
                res.status(200).send(`Event type ${githubEvent} received but not handled.`);
                break;
        }
    } catch (error) {
        logger.error(`Error processing GitHub webhook event '${githubEvent}': ${error.message}`, { stack: error.stack, payload: req.body });
        res.status(500).send('Error processing webhook.');
    }
}

// You can add other webhook handlers here if you have more services
// For example:
// async function handleStripeWebhook(req, res) { /* ... */ }

module.exports = {
    handleGitHubWebhook,
    // If you have other handlers, export them too
    // handleStripeWebhook,
};
