// your-project-name/src/db/database.js
const { Pool } = require('pg');
const { logInfo, logError, sendBotLog } = require('../utils/logging'); // Using sendBotLog for critical DB errors

let pool; // Declare a variable to hold our PostgreSQL connection pool

/**
 * Initializes the PostgreSQL database connection pool and ensures necessary tables exist.
 * This function should be called once at application startup.
 * It also handles creating default settings if they don't already exist.
 * @throws {Error} If there's a critical error connecting to or initializing the database.
 */
async function initDatabase() {
    if (pool) {
        logInfo('Database pool already initialized. Skipping re-initialization.');
        return; // Already initialized, prevent re-initialization
    }

    logInfo('Attempting to initialize database connection pool...');

    // Create a new PostgreSQL connection pool
    pool = new Pool({
        connectionString: process.env.DATABASE_URL, // DATABASE_URL must be set in .env (local) or Render environment variables
        // Required for Render's PostgreSQL databases which often enforce SSL
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // --- Event Listener for Pool Errors ---
    // Log any unexpected errors on idle clients in the pool.
    // A critical error here usually means the database connection is severely broken,
    // so we exit the process to allow Render to restart the service.
    pool.on('error', (err) => {
        logError('‼️ Unexpected error on idle PostgreSQL client:', err);
        sendBotLog('ERROR_LOGGING_INFORMATION', `🚨 **Database Pool Error!**\n\`\`\`${err.message}\n${err.stack}\`\`\``);
        process.exit(-1); // Exit process with failure code
    });

    try {
        // --- Test Connection and Ensure Schema ---
        // Acquire a client from the pool to test the connection and run schema migrations/checks.
        const client = await pool.connect();

        // 1. Create `application_settings` table if it does not exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS application_settings (
                key VARCHAR(255) PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        logInfo('Checked/created application_settings table.');

        // 2. Insert default application settings if they don't already exist
        // This uses `ON CONFLICT (key) DO NOTHING` to prevent errors if the keys already exist.
        await client.query(`
            INSERT INTO application_settings (key, value)
            VALUES ('welcome_message', 'Welcome to your Render-controlled Dashboard!'),
                   ('tagline', 'Manage everything via Discord commands.'),
                   ('app_title', 'Enhanced Private System'),
                   ('theme', 'default-theme'),
                   ('enabled_features', '[]'),
                   ('announcement_message', 'Important System Announcement: Scheduled maintenance this weekend. System may experience brief interruptions. Please save your work regularly!')
            ON CONFLICT (key) DO NOTHING;
        `);
        logInfo('Initialized default application settings.');

        // 3. (Optional) Create a `user_sessions` table if needed for tracking user login state
        // This is a common table for session management or tracking active users.
        await client.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                session_id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                username VARCHAR(255) NOT NULL,
                ip_address VARCHAR(255),
                login_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP WITH TIME ZONE,
                dashboard_id VARCHAR(255) -- Link to client-side dashboard ID
            );
        `);
        logInfo('Checked/created user_sessions table.');


        // Release the client back to the pool after successful operations
        client.release();
        logInfo('Database connected and schema initialized successfully.');
    } catch (err) {
        logError('❌ Critical: Error connecting to or initializing database:', err);
        sendBotLog('ERROR_LOGGING_INFORMATION', `🚨 **Critical Database Init Failure!**\n\`\`\`${err.message}\n${err.stack}\`\`\``);
        throw err; // Re-throw the error to indicate a critical application startup failure
    }
}

/**
 * Executes a SQL query against the database pool.
 * @param {string} text The SQL query string.
 * @param {Array<any>} [params] Optional array of parameters for the query.
 * @returns {Promise<QueryResult>} The result of the query.
 * @throws {Error} If the database pool is not initialized or the query fails.
 */
async function queryDatabase(text, params) {
    if (!pool) {
        throw new Error('Database pool not initialized. Call initDatabase() first.');
    }
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        logInfo('Executed DB query:', { text, duration: `${duration}ms`, rows: res.rowCount });
        return res;
    } catch (error) {
        logError(`❌ Error executing query: ${text}`, error);
        sendBotLog('ERROR_LOGGING_INFORMATION', `⚠️ DB Query Failed: \`${text}\`\nError: \`${error.message}\``);
        throw error; // Re-throw query errors for caller to handle
    }
}

/**
 * Retrieves an application setting by its key from the `application_settings` table.
 * Attempts to parse the value as JSON if it's a string, otherwise returns it as-is.
 * @param {string} key The key of the setting to retrieve.
 * @param {any} [defaultValue=null] The default value to return if the setting is not found or an error occurs.
 * @returns {Promise<any>} The setting's value, or the defaultValue if not found/error.
 */
async function getApplicationSetting(key, defaultValue = null) {
    try {
        const res = await queryDatabase('SELECT value FROM application_settings WHERE key = $1', [key]);
        if (res.rows.length > 0) {
            const storedValue = res.rows[0].value;
            // Attempt to parse JSON if it looks like JSON (starts with { or [)
            if (typeof storedValue === 'string' && (storedValue.startsWith('{') || storedValue.startsWith('['))) {
                try {
                    return JSON.parse(storedValue);
                } catch (e) {
                    logWarn(`Failed to parse JSON for setting '${key}'. Returning as string.`);
                    return storedValue; // Not valid JSON, return as string
                }
            }
            return storedValue; // Return non-JSON string or other types directly
        }
        logWarn(`Application setting '${key}' not found. Returning default value.`);
        return defaultValue;
    } catch (error) {
        logError(`Error getting application setting '${key}':`, error);
        return defaultValue;
    }
}

/**
 * Sets (inserts or updates) an application setting in the `application_settings` table.
 * Converts objects/arrays to JSON strings before storing.
 * @param {string} key The key of the setting to set.
 * @param {any} value The value to store for the setting.
 * @returns {Promise<boolean>} True if the setting was successfully saved/updated, false otherwise.
 */
async function setApplicationSetting(key, value) {
    try {
        // Convert objects/arrays to JSON string for storage
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        await queryDatabase(
            'INSERT INTO application_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
            [key, stringValue]
        );
        logInfo(`Application setting '${key}' updated successfully.`);
        return true;
    } catch (error) {
        logError(`Error setting application setting '${key}' to '${value}':`, error);
        return false;
    }
}

module.exports = {
    initDatabase,
    queryDatabase,
    getApplicationSetting,
    setApplicationSetting
};
