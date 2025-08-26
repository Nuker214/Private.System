// your-project-name/src/utils/webhook.js
const axios = require('axios');
const webhookUrls = require('../config/webhook_urls.json'); // Contains mappings for webhook type keys to URLs
const { logError, logWarn } = require('./logging'); // Import basic console logging

/**
 * Sends a message or embeds to a Discord webhook URL.
 * This function is designed to be called from the backend.
 *
 * @param {string} type The key from `src/config/webhook_urls.json` (e.g., 'USERNAME_INFORMATION', 'ERROR_LOGGING_INFORMATION')
 *                      or a direct webhook URL if `customUrl` is used.
 * @param {object} data The payload data for the webhook. This object should contain:
 *                      - `content` (string, optional): The main text content of the message.
 *                      - `embeds` (Array<object>, optional): An array of Discord embed objects.
 *                      - `username` (string, optional): Overrides the default webhook username.
 *                      - `avatar_url` (string, optional): Overrides the default webhook avatar.
 * @param {string} [customUrl=null] An optional direct webhook URL to use instead of looking up in `webhook_urls.json`.
 * @returns {Promise<boolean>} True if the webhook was sent successfully, false otherwise.
 */
async function sendWebhook(type, data, customUrl = null) {
    const url = customUrl || webhookUrls[type];

    if (!url) {
        logWarn(`No Discord webhook URL configured for type: '${type}'. Cannot send webhook.`);
        return false;
    }

    // Prepare the payload based on Discord webhook API requirements
    const payload = {
        // Default username and avatar, can be overridden by `data`
        username: data.username || 'Backend Service Notifier',
        avatar_url: data.avatar_url || 'https://i.imgur.com/G4fBwB4.png', // Example default avatar URL

        // Message content (optional, only if `embeds` is not the only thing)
        content: data.content || '',

        // Embeds array (optional)
        embeds: data.embeds || []
    };

    // Discord API requires at least one of `content`, `embeds`, `file`
    // Ensure we send something meaningful if neither content nor embeds are explicitly provided.
    if (!payload.content && (!payload.embeds || payload.embeds.length === 0)) {
        logWarn(`Webhook payload for type '${type}' is empty (no content or embeds). Skipping send.`);
        return false;
    }

    try {
        const response = await axios.post(url, payload);

        // Discord API returns 200 OK for successful webhook sends
        if (response.status === 200 || response.status === 204) {
            // logInfo(`Webhook (${type}) sent successfully to Discord.`); // Too verbose
            return true;
        } else {
            // This case should ideally be caught by error.response in the catch block,
            // but including it for explicit status checks.
            logError(`Webhook (${type}) failed with unexpected status: ${response.status}. Response: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        logError(`❌ Error sending webhook (${type}):`, error.message);
        if (error.response) {
            // Log specific error details from Discord API response
            logError(`Discord API responded with status ${error.response.status}:`, JSON.stringify(error.response.data));
            // You might want to retry for certain status codes (e.g., 429 Too Many Requests)
        } else if (error.request) {
            // The request was made but no response was received
            logError(`No response received when sending webhook (${type}):`, error.request);
        } else {
            // Something else happened in setting up the request that triggered an Error
            logError(`Error setting up webhook request (${type}):`, error.message);
        }
        return false;
    }
}

module.exports = { sendWebhook };
