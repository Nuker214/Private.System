// your-project-name/src/utils/webhook.js
const axios = require('axios');
const path = require('node:path');
const fs = require('node:fs');
const util = require('node:util'); // For util.inspect

// --- Defer requiring logger to avoid circular dependencies ---
// The logger module itself might use webhooks, so we require it dynamically.
let logger;
try {
    logger = require('./logging'); // Assuming logging.js exports the extended logger
} catch (e) {
    console.error(`[CRITICAL_WEBHOOK_INIT_ERROR] Failed to load logging module: ${e.message}. Fallback to console.log/error.`);
    logger = {
        info: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.log,
        critical: console.error
    };
}

// --- Webhook URL Configuration ---
let webhookUrlsConfig = {};
try {
    webhookUrlsConfig = require('../config/webhook_urls.json');
} catch (e) {
    logger.critical(`[WEBHOOK_CONFIG_ERROR] Failed to load webhook_urls.json: ${e.message}. Webhook sending will be severely limited.`);
}

// --- Global Webhook Service Configuration ---
const webhookServiceConfig = {
    // General Defaults
    defaultUsername: process.env.WEBHOOK_DEFAULT_USERNAME || 'Backend System Monitor',
    defaultAvatarUrl: process.env.WEBHOOK_DEFAULT_AVATAR || 'https://i.imgur.com/G4fBwB4.png', // A neutral, system-like icon
    defaultEmbedColor: parseInt(process.env.WEBHOOK_DEFAULT_COLOR || '0x3498DB'), // Default blue

    // Rate Limiting & Retry Configuration (Crucial for Discord API)
    rateLimit: {
        globalIntervalMs: 5000, // Discord's global rate limit is often 5 requests per 5 seconds
        globalMaxRequests: 5,
        webhookBucketIntervalMs: 2000, // Per-webhook rate limit (often 1 request per 2 seconds, but can burst)
        webhookBucketMaxRequests: 1, // Start strict, can be adjusted with better bucket management

        retryAttempts: 5, // How many times to retry a failed webhook
        initialBackoffMs: 1000, // 1 second initial delay for retries
        maxBackoffMs: 60000, // Max 1 minute delay between retries
        exponentialFactor: 2, // Backoff = initialBackoff * (factor ^ attempt)
    },

    // Payload Customization
    maxEmbedsPerMessage: 10, // Discord API limit
    maxFieldsPerEmbed: 25,   // Discord API limit
    maxDescriptionLength: 4096, // Discord API limit for embed description
    maxContentLength: 2000, // Discord API limit for top-level message content
    maxFieldValueLength: 1024, // Discord API limit for embed field value
    maxFieldNameLength: 256,   // Discord API limit for embed field name

    // Health Checks / Internal Monitoring
    queueMonitorIntervalMs: 30000, // Check queue status every 30 seconds
};

// --- Webhook Queue & Rate Limiting State ---
const webhookQueue = [];
let isProcessingQueue = false;
const webhookCooldowns = new Map(); // Map<webhookUrl: string, timestampOfNextAllowedSend: number>
const globalCooldown = {
    lastSendTime: 0,
    requestsInWindow: 0,
    resetTime: 0 // Timestamp when current window resets
};

// --- Helper Functions for Rate Limiting and Queue Management ---

/**
 * Calculates the exponential backoff delay for retries.
 * @param {number} attempt The current retry attempt number (0-indexed).
 * @returns {number} The delay in milliseconds.
 */
function calculateBackoffDelay(attempt) {
    const delay = webhookServiceConfig.rateLimit.initialBackoffMs * Math.pow(webhookServiceConfig.rateLimit.exponentialFactor, attempt);
    return Math.min(delay, webhookServiceConfig.rateLimit.maxBackoffMs);
}

/**
 * Adds a webhook payload to the processing queue.
 * @param {object} payload The full webhook payload object.
 * @param {string} url The target webhook URL.
 * @param {number} [retryCount=0] Current retry attempt count.
 */
function enqueueWebhook(payload, url, retryCount = 0) {
    webhookQueue.push({ payload, url, retryCount, timestamp: Date.now() });
    logger.debug(`Webhook enqueued. Queue size: ${webhookQueue.length}. URL: ${url}`);
    if (!isProcessingQueue) {
        processWebhookQueue();
    }
}

/**
 * Processes the webhook queue, respecting rate limits and retry logic.
 */
async function processWebhookQueue() {
    if (isProcessingQueue) {
        return; // Already processing
    }
    isProcessingQueue = true;
    logger.debug('Starting webhook queue processing.');

    while (webhookQueue.length > 0) {
        const { payload, url, retryCount, timestamp } = webhookQueue[0]; // Peek at the first item

        // Check global rate limit
        const now = Date.now();
        if (now < globalCooldown.resetTime && globalCooldown.requestsInWindow >= webhookServiceConfig.rateLimit.globalMaxRequests) {
            const delay = globalCooldown.resetTime - now;
            logger.warn(`Global rate limit hit. Pausing queue for ${delay}ms.`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Re-check after delay
        }

        // Check per-webhook URL rate limit
        const nextAllowedSendTime = webhookCooldowns.get(url) || 0;
        if (now < nextAllowedSendTime) {
            const delay = nextAllowedSendTime - now;
            logger.debug(`Webhook URL '${url}' rate limit hit. Pausing queue for ${delay}ms.`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Re-check after delay
        }

        // --- OK to Send ---
        webhookQueue.shift(); // Remove from queue as we're processing it now

        try {
            // Update global cooldown state
            if (now >= globalCooldown.resetTime) { // Start new window
                globalCooldown.resetTime = now + webhookServiceConfig.rateLimit.globalIntervalMs;
                globalCooldown.requestsInWindow = 0;
            }
            globalCooldown.requestsInWindow++;
            globalCooldown.lastSendTime = now;

            const response = await axios.post(url, payload, {
                // Add headers for Discord's rate limit information
                headers: { 'User-Agent': 'RenderBackendWebhookClient/1.0.0' }
            });

            // Update per-webhook URL cooldown based on Discord's 'x-ratelimit-reset-after' header
            const rateLimitResetAfter = parseFloat(response.headers['x-ratelimit-reset-after']) * 1000; // In milliseconds
            if (rateLimitResetAfter) {
                webhookCooldowns.set(url, Date.now() + rateLimitResetAfter);
            } else {
                webhookCooldowns.set(url, Date.now() + webhookServiceConfig.rateLimit.webhookBucketIntervalMs); // Fallback
            }

            logger.info(`Webhook successfully sent to Discord (URL: ${url}, Queue Left: ${webhookQueue.length}). Status: ${response.status}`);

        } catch (error) {
            logger.error(`Error sending webhook to Discord (URL: ${url}): ${error.message}`);
            if (error.response) {
                logger.error(`Discord API responded with status ${error.response.status}: ${util.inspect(error.response.data, { depth: 2, colors: false })}`);

                if (error.response.status === 429) { // Rate limit hit, usually a specific webhook's bucket
                    const retryAfterMs = (parseInt(error.response.headers['retry-after']) || 1) * 1000;
                    logger.warn(`Rate limit 429 from Discord. Retrying after ${retryAfterMs}ms.`);
                    // Push back to front of queue and apply cooldown
                    webhookQueue.unshift({ payload, url, retryCount, timestamp: Date.now() });
                    webhookCooldowns.set(url, Date.now() + retryAfterMs);
                    await new Promise(resolve => setTimeout(resolve, retryAfterMs)); // Pause processing
                    continue; // Re-check queue
                } else if (error.response.status >= 400 && error.response.status < 500) {
                    // Client error (e.g., 400 Bad Request, 403 Forbidden, 404 Not Found)
                    // These are often unrecoverable with the same payload/URL.
                    logger.error(`Unrecoverable client error for webhook (URL: ${url}). Not retrying.`);
                    // Log to a dedicated error channel via logging.js if available
                    if (logger.sendBotLog) {
                        logger.sendBotLog('ERROR_LOGGING_INFORMATION', `🚨 **Webhook Unrecoverable Error!**\nURL: \`${url}\`\nStatus: \`${error.response.status}\`\nError: \`${error.response.data?.message || JSON.stringify(error.response.data)}\``);
                    }
                } else if (retryCount < webhookServiceConfig.rateLimit.retryAttempts) {
                    // Server error (5xx) or other transient errors, retry
                    const delay = calculateBackoffDelay(retryCount);
                    logger.warn(`Transient error for webhook (URL: ${url}). Retrying in ${delay}ms (Attempt ${retryCount + 1}/${webhookServiceConfig.rateLimit.retryAttempts}).`);
                    webhookQueue.unshift({ payload, url, retryCount: retryCount + 1, timestamp: Date.now() + delay }); // Push back with increased retry count
                    await new Promise(resolve => setTimeout(resolve, delay)); // Pause processing
                    continue; // Re-check queue
                } else {
                    logger.error(`Max retries reached for webhook (URL: ${url}). Giving up.`);
                    if (logger.sendBotLog) {
                        logger.sendBotLog('ERROR_LOGGING_INFORMATION', `🚨 **Webhook Max Retries Reached!**\nURL: \`${url}\`\nLast Error: \`${error.message}\``);
                    }
                }
            } else if (retryCount < webhookServiceConfig.rateLimit.retryAttempts) {
                // Network error, request timeout, etc.
                const delay = calculateBackoffDelay(retryCount);
                logger.warn(`Network error for webhook (URL: ${url}). Retrying in ${delay}ms (Attempt ${retryCount + 1}/${webhookServiceConfig.rateLimit.retryAttempts}).`);
                webhookQueue.unshift({ payload, url, retryCount: retryCount + 1, timestamp: Date.now() + delay });
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else {
                logger.error(`Max retries reached for webhook (URL: ${url}). Giving up due to network/request error.`);
                if (logger.sendBotLog) {
                    logger.sendBotLog('ERROR_LOGGING_INFORMATION', `🚨 **Webhook Max Retries Reached (Network Error)!**\nURL: \`${url}\`\nLast Error: \`${error.message}\``);
                }
            }
        }
    }
    isProcessingQueue = false;
    logger.debug('Finished webhook queue processing. Queue is empty.');
}

// Start a monitoring interval for the queue
setInterval(() => {
    if (webhookQueue.length > 0 && !isProcessingQueue) {
        logger.debug(`Queue monitor: Found ${webhookQueue.length} items in queue, starting processing.`);
        processWebhookQueue();
    } else if (webhookQueue.length > 0) {
        logger.debug(`Queue monitor: ${webhookQueue.length} items in queue, but already processing.`);
    }
}, webhookServiceConfig.queueMonitorIntervalMs);


// --- Embed and Payload Construction Helpers ---

/**
 * Chunks an array of fields into multiple arrays, each respecting Discord's field limit per embed.
 * @param {Array<object>} fields The array of embed field objects.
 * @returns {Array<Array<object>>} An array of field chunks.
 */
function chunkFields(fields) {
    const chunks = [];
    for (let i = 0; i < fields.length; i += webhookServiceConfig.maxFieldsPerEmbed) {
        chunks.push(fields.slice(i, i + webhookServiceConfig.maxFieldsPerEmbed));
    }
    return chunks;
}

/**
 * Truncates text to fit Discord's length limits.
 * @param {string} text The text to truncate.
 * @param {number} maxLength The maximum allowed length.
 * @returns {string} The truncated text.
 */
function truncate(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

/**
 * Builds a single Discord embed object, handling truncation and default values.
 * @param {object} options Options for the embed.
 * @param {string} [options.title] Embed title.
 * @param {string} [options.description] Embed description.
 * @param {number} [options.color] Embed color (hex).
 * @param {Array<object>} [options.fields] Array of field objects { name, value, inline }.
 * @param {object} [options.author] Author object { name, icon_url, url }.
 * @param {object} [options.footer] Footer object { text, icon_url }.
 * @param {string} [options.timestamp] ISO timestamp string.
 * @param {string} [options.imageUrl] URL for the main image.
 * @param {string} [options.thumbnailUrl] URL for the thumbnail image.
 * @returns {object} The constructed Discord embed object.
 */
function buildEmbed(options = {}) {
    const embed = {
        title: truncate(options.title || 'Notification', webhookServiceConfig.maxFieldNameLength),
        description: truncate(options.description || '', webhookServiceConfig.maxDescriptionLength),
        color: options.color || webhookServiceConfig.defaultEmbedColor,
        timestamp: options.timestamp || new Date().toISOString(),
        footer: options.footer ? {
            text: truncate(options.footer.text || '', webhookServiceConfig.maxFieldValueLength),
            icon_url: options.footer.icon_url
        } : undefined,
        author: options.author ? {
            name: truncate(options.author.name || '', webhookServiceConfig.maxFieldNameLength),
            icon_url: options.author.icon_url,
            url: options.author.url
        } : undefined,
        image: options.imageUrl ? { url: options.imageUrl } : undefined,
        thumbnail: options.thumbnailUrl ? { url: options.thumbnailUrl } : undefined,
    };

    // Process fields, ensuring truncation and limits
    if (options.fields && Array.isArray(options.fields)) {
        embed.fields = options.fields.map(field => ({
            name: truncate(field.name || 'N/A', webhookServiceConfig.maxFieldNameLength),
            value: truncate(String(field.value) || 'N/A', webhookServiceConfig.maxFieldValueLength),
            inline: field.inline === true // Ensure boolean
        }));
    }

    return embed;
}

/**
 * Prepares the full webhook payload, including handling multiple embeds for many fields.
 * @param {object} data The raw data provided to sendWebhook.
 * @returns {Array<object>} An array of formatted webhook payload objects (potentially multiple for many embeds).
 */
function prepareWebhookPayloads(data) {
    const basePayload = {
        username: data.username || webhookServiceConfig.defaultUsername,
        avatar_url: data.avatar_url || webhookServiceConfig.defaultAvatarUrl,
        content: truncate(data.content || '', webhookServiceConfig.maxContentLength),
    };

    if (!data.embeds || data.embeds.length === 0) {
        // If no embeds, send a single payload with just content
        if (!basePayload.content) {
            // Must have content if no embeds
            basePayload.content = truncate(data.title || 'No specific content provided.', webhookServiceConfig.maxContentLength);
        }
        return [{ ...basePayload }];
    }

    const embedsToProcess = Array.isArray(data.embeds) ? data.embeds : [data.embeds];
    const finalPayloads = [];

    let currentEmbedBatch = [];
    let currentEmbedBatchFieldsCount = 0;

    for (const rawEmbed of embedsToProcess) {
        const builtEmbed = buildEmbed(rawEmbed);
        const fields = builtEmbed.fields || [];
        const fieldChunks = chunkFields(fields);

        if (fieldChunks.length > 1) {
            // If an embed has too many fields, split it into multiple embeds
            for (const [idx, chunk] of fieldChunks.entries()) {
                const chunkEmbed = { ...builtEmbed, fields: chunk };
                chunkEmbed.title = truncate(`${builtEmbed.title} (Part ${idx + 1})`, webhookServiceConfig.maxFieldNameLength);
                
                if (currentEmbedBatch.length < webhookServiceConfig.maxEmbedsPerMessage && 
                    currentEmbedBatchFieldsCount + chunk.length <= (webhookServiceConfig.maxEmbedsPerMessage * webhookServiceConfig.maxFieldsPerEmbed)
                ) {
                    currentEmbedBatch.push(chunkEmbed);
                    currentEmbedBatchFieldsCount += chunk.length;
                } else {
                    finalPayloads.push({ ...basePayload, embeds: currentEmbedBatch });
                    currentEmbedBatch = [chunkEmbed];
                    currentEmbedBatchFieldsCount = chunk.length;
                }
            }
        } else {
            // Embed fits into a single embed
            if (currentEmbedBatch.length < webhookServiceConfig.maxEmbedsPerMessage && 
                currentEmbedBatchFieldsCount + fields.length <= (webhookServiceConfig.maxEmbedsPerMessage * webhookServiceConfig.maxFieldsPerEmbed)
            ) {
                currentEmbedBatch.push(builtEmbed);
                currentEmbedBatchFieldsCount += fields.length;
            } else {
                finalPayloads.push({ ...basePayload, embeds: currentEmbedBatch });
                currentEmbedBatch = [builtEmbed];
                currentEmbedBatchFieldsCount = fields.length;
            }
        }
    }

    if (currentEmbedBatch.length > 0) {
        finalPayloads.push({ ...basePayload, embeds: currentEmbedBatch });
    }

    // Ensure content is only in the first message if multiple payloads are sent
    if (finalPayloads.length > 1) {
        for(let i = 1; i < finalPayloads.length; i++) {
            finalPayloads[i].content = ''; // Clear content for subsequent messages
        }
    } else if (finalPayloads.length === 0 && (basePayload.content || embedsToProcess.length === 0)) {
        // Fallback: If no embeds were truly processed and there's content, send just content
        return [{ ...basePayload, embeds: [] }];
    }
    
    // Final check for empty payloads
    return finalPayloads.filter(p => p.content || (p.embeds && p.embeds.length > 0));
}


// --- Main `sendWebhook` Function ---

/**
 * Sends a message or embeds to a Discord webhook URL, utilizing queueing and rate limiting.
 * This is the primary function to call for sending Discord notifications from the backend.
 *
 * @param {string} type The key from `src/config/webhook_urls.json` (e.g., 'USERNAME_INFORMATION')
 *                      or a direct webhook URL if `customUrl` is used.
 * @param {object} data The payload data for the webhook. This object can contain:
 *                      - `content` (string, optional): The main text message.
 *                      - `embeds` (Array<object>|object, optional): An array of Discord embed objects, or a single embed object.
 *                      - `username` (string, optional): Overrides the default webhook username.
 *                      - `avatar_url` (string, optional): Overrides the default webhook avatar.
 *                      - `title` (string, optional): A fallback title for embeds if not provided.
 *                      - `color` (number, optional): A fallback color for embeds if not provided.
 * @param {string} [customUrl=null] An optional direct webhook URL to use instead of lookup.
 * @returns {Promise<boolean>} True if the webhook(s) were successfully enqueued, false otherwise.
 */
async function sendWebhook(type, data, customUrl = null) {
    const url = customUrl || webhookUrlsConfig[type];

    if (!url) {
        logger.warn(`No Discord webhook URL configured for type: '${type}'. Cannot send webhook.`);
        return false;
    }

    // Prepare one or more payloads based on the input data and Discord API limits
    const payloads = prepareWebhookPayloads(data);

    if (payloads.length === 0) {
        logger.warn(`Generated an empty webhook payload for type '${type}'. Skipping send.`);
        return false;
    }

    for (const payload of payloads) {
        enqueueWebhook(payload, url);
    }

    return true; // Successfully enqueued
}

// --- Health Check for Webhook Config ---
if (Object.keys(webhookUrlsConfig).length === 0) {
    logger.warn('No webhook URLs found in webhook_urls.json. Webhook notifications will be disabled.');
} else {
    logger.info(`Loaded ${Object.keys(webhookUrlsConfig).length} webhook URL configurations.`);
}

module.exports = {
    sendWebhook,
    buildEmbed, // Expose embed builder for advanced usage
    truncate, // Expose truncate for consistency
    // Expose config for potential dynamic changes or monitoring
    webhookServiceConfig,
    _webhookQueue: webhookQueue, // For internal inspection/testing
    _webhookCooldowns: webhookCooldowns // For internal inspection/testing
};
