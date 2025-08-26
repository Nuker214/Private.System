// your-project-name/src/utils/logging.js
const fs = require('node:fs');
const path = require('node:path');
const util = require('node:util'); // For util.inspect and util.format
const { format } = require('node:util'); // For util.format for string interpolation

// Defer requiring database and discord_client to avoid circular dependencies
// These modules might also need the logger, so we require them dynamically or as late as possible.
let discordClientModule;
let databaseModule;
try {
    discordClientModule = require('../discord/discord_client');
    databaseModule = require('../db/database');
} catch (e) {
    console.error(`[CRITICAL_LOGGER_INIT_ERROR] Failed to load dependent modules: ${e.message}`);
    // If these fail, Discord/DB logging will be disabled, but console/file can still work.
}

// --- Internal Configuration for the Logger Itself ---
const loggerConfig = {
    // Console Transport Settings
    console: {
        enabled: true,
        level: process.env.LOG_LEVEL_CONSOLE || 'info', // Default: info
        colors: {
            debug: '\x1b[90m', // Grey
            info: '\x1b[36m',  // Cyan
            warn: '\x1b[33m',  // Yellow
            error: '\x1b[31m', // Red
            critical: '\x1b[41m\x1b[37m', // Red Background, White Text
            reset: '\x1b[0m'
        }
    },
    // File Transport Settings
    file: {
        enabled: true,
        level: process.env.LOG_LEVEL_FILE || 'info', // Default: info
        directory: path.join(process.cwd(), 'logs'), // Log files stored in a 'logs' folder at project root
        filename: 'app-%DATE%.log', // %DATE% will be replaced by YYYY-MM-DD
        maxFileSize: 10 * 1024 * 1024, // 10 MB (not strictly used with daily rotation, but good for reference)
        maxFiles: 7 // Keep logs for 7 days (with daily rotation)
    },
    // Database Transport Settings
    database: {
        enabled: true,
        level: process.env.LOG_LEVEL_DATABASE || 'warn', // Default: warn
        tableName: 'application_logs',
        // Example schema for application_logs:
        // CREATE TABLE IF NOT EXISTS application_logs (
        //     id SERIAL PRIMARY KEY,
        //     timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        //     level VARCHAR(20) NOT NULL,
        //     message TEXT NOT NULL,
        //     context JSONB,
        //     stack TEXT,
        //     user_id VARCHAR(255),
        //     session_id VARCHAR(255),
        //     ip_address VARCHAR(255),
        //     dashboard_id VARCHAR(255)
        // );
    },
    // Discord Bot Transport Settings (uses src/config/discord_channels.json)
    discordBot: {
        enabled: true,
        level: process.env.LOG_LEVEL_DISCORD || 'warn', // Default: warn
        // `channelMappings` are loaded from discord_channels.json, no need to define here directly
        defaultAvatarUrl: 'https://i.imgur.com/4M34hih.png', // Default avatar for log embeds
        defaultUsername: 'System Logger' // Default username for log embeds
    },
    // General Logger Settings
    minLogLevel: process.env.LOG_LEVEL_GLOBAL || 'debug', // Overall minimum level to process
    sensitiveKeys: ['password', 'secret', 'token', 'auth', 'api_key'], // Keys to redact from context
    redactionMask: '********'
};

// --- Log Level Definitions ---
const LOG_LEVELS = {
    'debug': 0,
    'info': 1,
    'warn': 2,
    'error': 3,
    'critical': 4
};

// --- Cache for Discord channel IDs ---
let discordChannelCache;
try {
    discordChannelCache = require('../config/discord_channels.json');
} catch (e) {
    console.error(`[CRITICAL_LOGGER_INIT_ERROR] Failed to load discord_channels.json: ${e.message}. Discord bot logging will be disabled.`);
    loggerConfig.discordBot.enabled = false;
}

// --- Utility Functions for Logger ---

/**
 * Checks if a given log level should be processed based on the configured minimum level.
 * @param {string} currentLevel The level of the current log message.
 * @param {string} minLevel The minimum level configured for a transport.
 * @returns {boolean} True if the currentLevel is at or above the minLevel.
 */
function shouldLog(currentLevel, minLevel) {
    return LOG_LEVELS[currentLevel] >= LOG_LEVELS[minLevel];
}

/**
 * Formats a message and additional arguments into a single string.
 * Uses util.format for printf-style string interpolation.
 * @param {string} message The main message string.
 * @param {Array<any>} args Additional arguments.
 * @returns {string} The formatted log message.
 */
function formatMessage(message, args) {
    if (args.length > 0) {
        // Use util.format for string interpolation if args are present
        return util.format(message, ...args.map(arg => {
            if (typeof arg === 'object' && arg !== null && !(arg instanceof Error)) {
                // For objects, use util.inspect for better representation,
                // but limit depth to avoid extremely long output.
                return util.inspect(arg, { depth: 3, colors: false });
            }
            return arg;
        }));
    }
    return String(message);
}

/**
 * Safely stringifies an object for logging, handling circular references and sensitive data.
 * @param {object} obj The object to stringify.
 * @returns {string} The JSON stringified object.
 */
function safeStringify(obj) {
    const cache = new Set();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (cache.has(value)) {
                // Circular reference found, discard key
                return '[Circular]';
            }
            // Store value in our collection
            cache.add(value);
        }
        // Redact sensitive keys
        if (typeof key === 'string' && loggerConfig.sensitiveKeys.includes(key.toLowerCase())) {
            return loggerConfig.redactionMask;
        }
        return value;
    });
}

/**
 * Extracts and formats stack trace from an Error object.
 * @param {Error} error The error object.
 * @returns {string|null} The formatted stack trace or null if not available.
 */
function getStackTrace(error) {
    if (error && error.stack) {
        // Split stack into lines, clean up, and limit for brevity if needed
        return error.stack.split('\n').slice(1).join('\n').trim();
    }
    return null;
}

/**
 * Determines a suitable embed color for Discord based on log level.
 * @param {string} level The log level.
 * @returns {number} A hex color code (e.g., 0xFF0000 for red).
 */
function getEmbedColor(level) {
    switch (level) {
        case 'debug': return 0x99AAB5; // Grey
        case 'info': return 0x3498DB;  // Blue
        case 'warn': return 0xF1C40F;  // Yellow
        case 'error': return 0xE74C3C; // Red
        case 'critical': return 0x9B59B6; // Dark Purple
        default: return 0x7F8C8D; // Light Grey
    }
}

/**
 * Prepares the log context, redacting sensitive information.
 * @param {object} context The context object.
 * @returns {object} The sanitized context object.
 */
function sanitizeContext(context) {
    if (!context || typeof context !== 'object') {
        return context;
    }
    const sanitized = {};
    for (const key in context) {
        if (Object.prototype.hasOwnProperty.call(context, key)) {
            if (loggerConfig.sensitiveKeys.includes(key.toLowerCase())) {
                sanitized[key] = loggerConfig.redactionMask;
            } else if (typeof context[key] === 'object' && context[key] !== null) {
                sanitized[key] = sanitizeContext(context[key]); // Recursively sanitize nested objects
            } else {
                sanitized[key] = context[key];
            }
        }
    }
    return sanitized;
}

// --- Logger Transports ---

/**
 * Console transport: Logs messages to the standard console output.
 * @param {string} level The log level.
 * @param {string} formattedMessage The formatted log message.
 * @param {object} context The log context.
 * @param {string|null} stack The stack trace if available.
 */
function consoleTransport(level, formattedMessage, context, stack) {
    if (!loggerConfig.console.enabled || !shouldLog(level, loggerConfig.console.level)) {
        return;
    }
    const color = loggerConfig.console.colors[level] || loggerConfig.console.colors.reset;
    const resetColor = loggerConfig.console.colors.reset;
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false }); // Local time for console

    let output = `${color}[${level.toUpperCase()}]${resetColor} ${timestamp}: ${formattedMessage}`;
    if (Object.keys(context).length > 0) {
        output += ` ${color}(Context: ${util.inspect(sanitizeContext(context), { depth: 2, colors: true })})${resetColor}`;
    }
    if (stack) {
        output += `\n${color}Stack:${resetColor}\n${stack}`;
    }

    // Use appropriate console method based on level
    if (LOG_LEVELS[level] >= LOG_LEVELS['error']) {
        console.error(output);
    } else if (LOG_LEVELS[level] === LOG_LEVELS['warn']) {
        console.warn(output);
    } else {
        console.log(output);
    }
}

// Global variable for current file stream to allow appending
let logFileStream = null;
let currentLogFileName = '';

/**
 * Ensures the log directory exists and returns the full path for today's log file.
 * Handles daily rotation by creating a new file each day.
 * @returns {string} The full path to the current day's log file.
 */
function getDailyLogFilePath() {
    const logDir = loggerConfig.file.directory;
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(logDir, loggerConfig.file.filename.replace('%DATE%', date));
}

/**
 * File transport: Writes log messages to a daily rotating file.
 * @param {string} level The log level.
 * @param {string} formattedMessage The formatted log message.
 * @param {object} context The log context.
 * @param {string|null} stack The stack trace if available.
 */
function fileTransport(level, formattedMessage, context, stack) {
    if (!loggerConfig.file.enabled || !shouldLog(level, loggerConfig.file.level)) {
        return;
    }

    const logFilePath = getDailyLogFilePath();

    // Check if we need to open a new file stream (either first time or new day)
    if (!logFileStream || logFilePath !== currentLogFileName) {
        if (logFileStream) {
            logFileStream.end(); // Close previous stream
        }
        currentLogFileName = logFilePath;
        logFileStream = fs.createWriteStream(currentLogFileName, { flags: 'a', encoding: 'utf8' });
        logFileStream.on('error', (err) => {
            console.error(`[ERROR] File logging stream error for '${currentLogFileName}':`, err);
            // Optionally, disable file logging if persistent errors
            loggerConfig.file.enabled = false;
        });

        // Clean up old log files
        cleanupOldLogFiles();
    }

    const timestamp = new Date().toISOString(); // ISO string for file logs

    let logEntry = `[${level.toUpperCase()}] ${timestamp}: ${formattedMessage}`;
    if (Object.keys(context).length > 0) {
        logEntry += ` (Context: ${safeStringify(sanitizeContext(context))})`;
    }
    if (stack) {
        logEntry += `\nStack:\n${stack}`;
    }
    logFileStream.write(logEntry + '\n');
}

/**
 * Cleans up old log files based on `loggerConfig.file.maxFiles`.
 */
function cleanupOldLogFiles() {
    const logDir = loggerConfig.file.directory;
    const maxFiles = loggerConfig.file.maxFiles;

    fs.readdir(logDir, (err, files) => {
        if (err) {
            console.error(`[ERROR] Failed to read log directory for cleanup: ${err.message}`);
            return;
        }

        const logFiles = files.filter(file => file.startsWith('app-') && file.endsWith('.log'))
                              .map(file => ({
                                  name: file,
                                  path: path.join(logDir, file),
                                  date: new Date(file.substring(4, 14)) // Extract YYYY-MM-DD
                              }))
                              .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort newest first

        if (logFiles.length > maxFiles) {
            for (let i = maxFiles; i < logFiles.length; i++) {
                fs.unlink(logFiles[i].path, (unlinkErr) => {
                    if (unlinkErr) {
                        console.error(`[ERROR] Failed to delete old log file '${logFiles[i].name}': ${unlinkErr.message}`);
                    } else {
                        console.log(`[INFO] Deleted old log file: ${logFiles[i].name}`);
                    }
                });
            }
        }
    });
}


/**
 * Database transport: Stores log messages in a PostgreSQL table.
 * @param {string} level The log level.
 * @param {string} formattedMessage The formatted log message.
 * @param {object} context The log context.
 * @param {string|null} stack The stack trace if available.
 */
async function databaseTransport(level, formattedMessage, context, stack) {
    if (!loggerConfig.database.enabled || !shouldLog(level, loggerConfig.database.level)) {
        return;
    }
    if (!databaseModule || !databaseModule.queryDatabase) {
        // If DB module failed to load or isn't ready, disable DB logging
        loggerConfig.database.enabled = false;
        console.error('[ERROR] Database module not available for logging. Disabling DB transport.');
        return;
    }

    const tableName = loggerConfig.database.tableName;
    const sanitizedContext = sanitizeContext(context);

    // Extract common fields from context for dedicated columns if present
    const userId = sanitizedContext.userId || null;
    const sessionId = sanitizedContext.sessionId || null;
    const ipAddress = sanitizedContext.ipAddress || null;
    const dashboardId = sanitizedContext.dashboardId || null;

    try {
        await databaseModule.queryDatabase(
            `INSERT INTO ${tableName} (level, message, context, stack, user_id, session_id, ip_address, dashboard_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [level, formattedMessage, sanitizedContext, stack, userId, sessionId, ipAddress, dashboardId]
        );
    } catch (error) {
        console.error(`[ERROR] Failed to save log to database: ${error.message}`);
        // Consider disabling DB transport if errors are frequent to prevent DB overload
    }
}

/**
 * Discord Bot transport: Sends log messages as embeds to Discord channels.
 * Uses specific channel keys from `discord_channels.json`.
 * @param {string} level The log level.
 * @param {string} formattedMessage The formatted log message.
 * @param {object} context The log context.
 * @param {string|null} stack The stack trace if available.
 */
async function discordBotTransport(level, formattedMessage, context, stack) {
    if (!loggerConfig.discordBot.enabled || !shouldLog(level, loggerConfig.discordBot.level)) {
        return;
    }
    if (!discordClientModule || !discordClientModule.getDiscordClient) {
        loggerConfig.discordBot.enabled = false;
        console.error('[ERROR] Discord client module not available for logging. Disabling Discord bot transport.');
        return;
    }

    const client = discordClientModule.getDiscordClient();
    if (!client || client.ws.status !== 0) { // client.ws.status 0 means connected
        // console.warn(`[WARN] Discord client not ready for logging. Message: ${formattedMessage.substring(0, 50)}...`); // Too verbose
        return;
    }

    const channelKey = (level === 'critical' || level === 'error') ? 'ERROR_LOGGING_INFORMATION' : 'BOT_LOGGING_INFORMATION';
    const channelId = discordChannelCache[channelKey];

    if (!channelId) {
        console.error(`[ERROR] No Discord channel ID configured for key '${channelKey}' in discord_channels.json.`);
        return;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            console.error(`[ERROR] Discord channel '${channelId}' (key: '${channelKey}') not found or is not a text channel.`);
            return;
        }

        const embedColor = getEmbedColor(level);
        const description = formattedMessage.substring(0, 2048); // Discord embed description limit

        const fields = [];
        // Add context fields
        const sanitizedContext = sanitizeContext(context);
        for (const key in sanitizedContext) {
            if (Object.prototype.hasOwnProperty.call(sanitizedContext, key)) {
                // Limit context field value length and ensure inline status
                fields.push({
                    name: key.substring(0, 256),
                    value: String(sanitizedContext[key]).substring(0, 1024) || 'N/A',
                    inline: true // Try to make context fields inline
                });
            }
        }
        // Add stack trace as a field if available
        if (stack) {
            fields.push({
                name: 'Stack Trace',
                value: `\`\`\`${stack.substring(0, 1024)}\`\`\``, // Code block for stack, limit 1024 chars
                inline: false
            });
        }
        // Add a general timestamp field
        fields.push({ name: 'Timestamp', value: new Date().toISOString(), inline: false });

        // Discord embed has a field limit of 25. If there are too many, we might need to split or prioritize.
        // For now, we'll just trim if it's too much.
        const limitedFields = fields.slice(0, 25);

        const embed = {
            title: `[${level.toUpperCase()}] Log Entry`,
            description: description,
            color: embedColor,
            fields: limitedFields,
            footer: {
                text: `${loggerConfig.discordBot.defaultUsername} | Logged from Render Service`,
                icon_url: loggerConfig.discordBot.defaultAvatarUrl
            },
            timestamp: new Date().toISOString()
        };

        await channel.send({ embeds: [embed] });

    } catch (error) {
        console.error(`[ERROR] Failed to send Discord bot log to channel '${channelKey}':`, error.message);
        // Do not use sendBotLog here to avoid infinite loops if Discord itself is the issue
    }
}


// --- Main Logger Function ---

/**
 * The main logging function that dispatches messages to all enabled transports.
 * @param {string} level The log level ('debug', 'info', 'warn', 'error', 'critical').
 * @param {string} message The primary log message (can be printf-style).
 * @param {object} [context={}] An optional context object with additional data.
 * @param {...any} args Additional arguments for string interpolation in the message.
 */
function log(level, message, context = {}, ...args) {
    // Ensure the level is valid
    if (!LOG_LEVELS.hasOwnProperty(level)) {
        console.error(`[CRITICAL_LOGGER_ERROR] Invalid log level provided: ${level}. Message: ${message}`);
        level = 'error'; // Default to error if invalid
    }

    // Check if this log message should be processed at all based on global min level
    if (!shouldLog(level, loggerConfig.minLogLevel)) {
        return;
    }

    let error = null;
    // Check if the last argument is an Error object
    if (args.length > 0 && args[args.length - 1] instanceof Error) {
        error = args.pop(); // Extract the error object
    } else if (context instanceof Error && !args.length) { // Context *is* the error if only 2 args were given
        error = context;
        context = {}; // Reset context to empty object
    }

    const formattedMessage = formatMessage(message, args);
    const stack = error ? getStackTrace(error) : null;

    // --- Dispatch to Transports ---
    consoleTransport(level, formattedMessage, context, stack);
    fileTransport(level, formattedMessage, context, stack);
    // Database and Discord transports are async, so run them in the background
    databaseTransport(level, formattedMessage, context, stack).catch(e => console.error(`[LOGGER_DB_TRANSPORT_ERROR] ${e.message}`));
    discordBotTransport(level, formattedMessage, context, stack).catch(e => console.error(`[LOGGER_DISCORD_TRANSPORT_ERROR] ${e.message}`));
}

// --- Exported Logger Methods (Convenience Functions) ---

/**
 * Logs a debug message.
 * @param {string} message The primary log message.
 * @param {object} [context={}] Optional context object.
 * @param {...any} args Additional arguments.
 */
function debug(message, context, ...args) {
    if (typeof context !== 'object' || context instanceof Error || context === null) {
        return log('debug', message, {}, context, ...args);
    }
    log('debug', message, context, ...args);
}

/**
 * Logs an informational message.
 * @param {string} message The primary log message.
 * @param {object} [context={}] Optional context object.
 * @param {...any} args Additional arguments.
 */
function info(message, context, ...args) {
    if (typeof context !== 'object' || context instanceof Error || context === null) {
        return log('info', message, {}, context, ...args);
    }
    log('info', message, context, ...args);
}

/**
 * Logs a warning message.
 * @param {string} message The primary log message.
 * @param {object} [context={}] Optional context object.
 * @param {...any} args Additional arguments.
 */
function warn(message, context, ...args) {
    if (typeof context !== 'object' || context instanceof Error || context === null) {
        return log('warn', message, {}, context, ...args);
    }
    log('warn', message, context, ...args);
}

/**
 * Logs an error message.
 * @param {string} message The primary log message.
 * @param {object} [context={}] Optional context object.
 * @param {...any} args Additional arguments.
 */
function error(message, context, ...args) {
    if (typeof context !== 'object' || context instanceof Error || context === null) {
        return log('error', message, {}, context, ...args);
    }
    log('error', message, context, ...args);
}

/**
 * Logs a critical message (e.g., application-breaking errors).
 * @param {string} message The primary log message.
 * @param {object} [context={}] Optional context object.
 * @param {...any} args Additional arguments.
 */
function critical(message, context, ...args) {
    if (typeof context !== 'object' || context instanceof Error || context === null) {
        return log('critical', message, {}, context, ...args);
    }
    log('critical', message, context, ...args);
}

// --- Specific Discord Bot Logger (from previous version, adapted) ---
// This is kept separate for backward compatibility and specific bot-channel logic.
// It uses its own logic to map directly to discord_channels.json.
async function sendBotLogSpecific(channelKey, message, embed = null) {
    if (!loggerConfig.discordBot.enabled) {
        return false;
    }
    if (!discordChannelCache || !discordChannelCache[channelKey]) {
        // Fallback to console if channel ID is missing for critical bot logs
        error(`Attempted to send bot log to unknown channel key: '${channelKey}'. Message: '${message.substring(0, 50)}...'`);
        return false;
    }

    const channelId = discordChannelCache[channelKey];
    if (!discordClientModule || !discordClientModule.getDiscordClient) {
        loggerConfig.discordBot.enabled = false;
        error('[ERROR] Discord client module not available for sendBotLogSpecific. Disabling Discord bot transport.');
        return false;
    }

    const client = discordClientModule.getDiscordClient();
    if (!client || client.ws.status !== 0) {
        warn(`Discord client not ready to send specific log to '${channelKey}' (status: ${client ? client.ws.status : 'N/A'}).`);
        return false;
    }

    try {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
            const options = { content: message };
            if (embed) {
                options.embeds = Array.isArray(embed) ? embed : [embed];
            }
            await channel.send(options);
            return true;
        } else {
            error(`Target Discord channel with ID '${channelId}' (key: '${channelKey}') not found or is not a text channel.`);
            return false;
        }
    } catch (error) {
        error(`❌ Failed to send Discord bot specific log to channel '${channelKey}' (ID: ${channelId}):`, error);
        return false;
    }
}

// --- Export the extended logger ---
module.exports = {
    // General logging methods (preferred)
    debug,
    info,
    warn,
    error,
    critical,

    // Backward compatibility for logInfo, logError, logWarn (from previous iteration)
    // These will now just call the new `info`, `error`, `warn` functions.
    logInfo: info,
    logError: error,
    logWarn: warn,

    // Specific method for bot-originated logging to pre-configured channels (for bot status etc.)
    sendBotLog: sendBotLogSpecific,

    // Expose config for potential dynamic changes (use with caution)
    loggerConfig
};
