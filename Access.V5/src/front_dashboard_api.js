// your-project-name/src/api/front_dashboard_api.js
const express = require('express');
const router = express.Router();
const { info, warn, error, critical, sendBotLog, loggerConfig } = require('../utils/logging'); // Using extended logger
const { sendWebhook, buildEmbed, truncate } = require('../utils/webhook'); // Using extended webhook sender
const { getWelcomeMessageSettings, getThemeSetting, getEnabledFeatures, getAnnouncementMessage, setApplicationSetting } = require('../services/app_settings_service');
const { authenticateUser, getUserProfile } = require('../services/user_service'); // For backend user authentication
const { queryDatabase } = require('../db/database'); // Directly interact with DB for user data persistence
const blacklistConfig = require('../config/blacklist.json'); // For server-side IP/user blacklisting

// --- Internal Configuration and Constants ---
const MAX_LOG_MESSAGE_LENGTH = 1500; // Max length for message/context in DB logs
const API_RATE_LIMIT_WINDOW_MS = parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000'); // 1 minute
const API_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS || '100'); // 100 requests per minute per IP

// In-memory simple rate limiter (!!! REPLACE WITH PERSISTENT DB/REDIS FOR PRODUCTION !!!)
const ipRequestCounts = new Map(); // Map<ip: string, { count: number, resetTime: number }>

// --- Middleware: Session and Authentication (Placeholder) ---
// In a real application, this middleware would parse a JWT or session cookie,
// validate it, and attach `req.user` with user information.
// For now, we'll assume successful login establishes a context for `username` and `userID`.
async function authenticateApiRequest(req, res, next) {
    // !!! IMPORTANT: THIS IS A SIMPLIFIED PLACEHOLDER !!!
    // A real system would use JWT, session cookies, OAuth, etc.
    // For this example, we might assume a valid token is passed or user context is set
    // from a previous login or is inferred.
    // We'll pass `username` and `userID` from the request body/params for now
    // which is NOT secure for identifying users without actual auth.

    // For APIs that require a logged-in user, you would check req.session.user or validate a token
    if (req.path.startsWith('/login') || req.path.startsWith('/reset-attempts') || req.path.startsWith('/log-event')) {
        return next(); // Allow public access to login, reset, and log events
    }

    // Placeholder for a real authentication check:
    // const token = req.headers.authorization?.split(' ')[1]; // Assuming Bearer token
    // if (!token) {
    //     warn('API access denied: No authentication token.', { path: req.path, ip: req.ip });
    //     return res.status(401).json({ message: 'Authentication required.' });
    // }
    // try {
    //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //     req.user = decoded; // Attach user info
    //     next();
    // } catch (err) {
    //     error('API access denied: Invalid authentication token.', err, { path: req.path, ip: req.ip });
    //     return res.status(403).json({ message: 'Invalid or expired token.' });
    // }

    // For now, we allow access and rely on `username`/`userID` in body/params
    // for user-specific data, but this is INSECURE for identifying *who* is performing the action.
    next();
}


// --- Middleware: IP-based Rate Limiting (Simple In-Memory) ---
function ipRateLimitMiddleware(req, res, next) {
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;
    const now = Date.now();

    let clientData = ipRequestCounts.get(clientIp);

    if (!clientData || now > clientData.resetTime) {
        clientData = { count: 1, resetTime: now + API_RATE_LIMIT_WINDOW_MS };
        ipRequestCounts.set(clientIp, clientData);
    } else {
        clientData.count++;
        ipRequestCounts.set(clientIp, clientData);
    }

    if (clientData.count > API_RATE_LIMIT_MAX_REQUESTS) {
        warn(`API rate limit exceeded for IP: ${clientIp}. Path: ${req.method} ${req.path}`, { ip: clientIp, path: req.path });
        return res.status(429).json({ message: 'Too Many Requests: Please try again later.' });
    }
    next();
}

// --- Apply Middleware ---
router.use(ipRateLimitMiddleware);
router.use(authenticateApiRequest); // Apply authentication middleware to all routes in this router

// --- Middleware for IP Blacklisting ---
router.use((req, res, next) => {
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    if (blacklistConfig.includes(clientIp)) {
        warn(`Blocked blacklisted IP attempt: ${clientIp} on API route: ${req.method} ${req.path}`, { ip: clientIp, path: req.path });
        sendWebhook('BLACKLIST_INFORMATION', {
            content: `🚨 **Blocked Blacklisted IP Attempt** from \`${clientIp}\` on API route: \`${req.method} ${req.path}\``,
            username: 'Security Monitor',
            embeds: [buildEmbed({
                title: '🚫 Access Denied - Blacklisted IP',
                description: `An attempt was made to access the dashboard API from a blacklisted IP address.`,
                color: 0xFF0000,
                fields: [
                    { name: 'IP Address', value: clientIp, inline: true },
                    { name: 'Attempted Route', value: `${req.method} ${req.path}`, inline: true }
                ]
            })]
        });
        return res.status(403).json({ message: 'Access Denied: Your IP is blacklisted.' });
    }
    info(`Dashboard API accessed: ${req.method} ${req.path} from ${clientIp}`);
    next();
});

// --- API: User Login Authentication ---
router.post('/login', async (req, res) => {
    const { username, password, userID, dashboardId } = req.body;
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    if (!username || !password || !userID) {
        warn('Login attempt with missing credentials.', { ip: clientIp, dashboardId });
        return res.status(400).json({ success: false, message: 'Missing username, password, or user ID.' });
    }

    info(`Login attempt received for username: ${username}, userID: ${userID} from IP: ${clientIp} on dashboard: ${dashboardId}`);

    try {
        const authResult = await authenticateUser(username, password, userID, clientIp, dashboardId);

        if (authResult.success) {
            // In a real app, you would generate a JWT or set a session cookie here
            // res.cookie('session_token', jwt.sign({ userId: authResult.user.userID }, process.env.JWT_SECRET, { expiresIn: '1h' }), { httpOnly: true });
            res.status(200).json({ success: true, message: 'Login successful', user: authResult.user });
        } else {
            res.status(401).json({ success: false, message: authResult.message, reason: authResult.reason });
        }
    } catch (err) {
        error('Error during login authentication:', err, { username, userID, ip: clientIp, dashboardId });
        sendWebhook('ERROR_LOGGING_INFORMATION', { content: `Login API Error for ${username}: ${err.message}` });
        res.status(500).json({ success: false, message: 'Internal server error during login.' });
    }
});

// --- API: Resetting Login Attempts ---
router.post('/reset-attempts', async (req, res) => {
    const { resetCode, username, userID, dashboardId } = req.body;
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    if (!resetCode) {
        warn('Reset attempt with missing reset code.', { ip: clientIp, username, userID });
        return res.status(400).json({ success: false, message: 'Reset code is required.' });
    }

    const RESET_CODE_SECRET_SERVER = process.env.RESET_CODE_SECRET; // CRITICAL: From ENV

    if (!RESET_CODE_SECRET_SERVER) {
        critical('RESET_CODE_SECRET_SERVER is not configured in environment variables!', { component: 'Auth' });
        sendBotLog('ERROR_LOGGING_INFORMATION', '🚨 `RESET_CODE_SECRET` is missing in environment variables. Reset attempts will fail.');
        return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }

    const isCorrect = resetCode === RESET_CODE_SECRET_SERVER;

    info(`Reset attempt by ${username} (ID: ${userID}) from ${clientIp}. Code: ${resetCode}. Result: ${isCorrect ? 'SUCCESS' : 'FAILED'}.`, { username, userID, ip: clientIp, dashboardId });

    const resetFields = [
        { name: 'User Context', value: username || 'N/A', inline: true },
        { name: 'User ID', value: userID || 'N/A', inline: true },
        { name: 'Client IP', value: clientIp, inline: true },
        { name: 'Entered Code (Hidden)', value: truncate(resetCode, 50), inline: false }, // Don't log full code if sensitive
        { name: 'Result', value: isCorrect ? 'Success' : 'Failed', inline: true },
        { name: 'Dashboard ID', value: dashboardId || 'N/A', inline: true }
    ];

    await sendWebhook('RESET_INFORMATION', {
        content: `Reset attempt by **${username || 'N/A'}** (ID: ${userID || 'N/A'}) from \`${clientIp}\`. Result: ${isCorrect ? 'SUCCESS' : 'FAILED'}.`,
        username: 'Reset System',
        embeds: [buildEmbed({
            title: isCorrect ? '✅ Reset Code Accepted' : '❌ Incorrect Reset Code',
            description: `Details of a reset code entry attempt for dashboard \`${dashboardId}\`.`,
            color: isCorrect ? 0x00FF00 : 0xFF0000, // Green for success, Red for failure
            fields: resetFields
        })]
    });

    if (isCorrect) {
        // In a real system, you would call `await resetLoginAttempts(username);` from `user_service`.
        res.status(200).json({ success: true, message: 'Login attempts reset.' });
    } else {
        res.status(401).json({ success: false, message: 'Incorrect reset code.' });
    }
});

// --- API: Centralized Frontend Event Logging ---
// This endpoint receives all client-side events, processes them, and dispatches webhooks/DB logs.
router.post('/log-event', async (req, res) => {
    const { eventType, dashboardId, username, userID, clientTimestamp, browserInfo, connectionInfo, data, logType } = req.body;
    const serverIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    if (!eventType) {
        warn('Received /log-event without eventType.', { body: req.body, ip: serverIp });
        return res.status(400).json({ status: 'error', message: 'eventType is required.' });
    }

    info(`Received client event: ${eventType} from Dashboard: ${dashboardId} (User: ${username || 'Guest'}, IP: ${serverIp})`);

    let webhookKey = 'USER_ACTIVITY'; // Default webhook for general activity
    let embedTitle = '📊 Frontend Activity';
    let embedColor = 0x6495ED; // Cornflower Blue (Default for activity)
    let webhookContent = `Activity: ${eventType}`;
    let dbLogLevel = 'info'; // Default log level for database persistence

    // Common fields for all embeds and DB logs
    const commonFields = [
        { name: 'Event Type', value: eventType, inline: true },
        { name: 'Dashboard ID', value: dashboardId || 'N/A', inline: true },
        { name: 'User', value: username || 'Guest', inline: true },
        { name: 'User ID', value: userID || 'N/A', inline: true },
        { name: 'Client Timestamp', value: new Date(clientTimestamp).toLocaleString(), inline: false },
        { name: 'Server IP (Detected)', value: serverIp, inline: true },
        { name: 'Browser', value: `${browserInfo.name} ${browserInfo.version}`, inline: true },
        { name: 'OS', value: `${browserInfo.os} ${browserInfo.osVersion}`, inline: true },
        { name: 'Device Type', value: browserInfo.deviceType, inline: true },
        { name: 'Connection', value: `${connectionInfo.type} (${connectionInfo.online ? 'Online' : 'Offline'})`, inline: true },
    ];
    let specificFields = []; // Fields specific to the event type

    // --- Event Type Mapping and Customization (Webhook & DB Log) ---
    switch (eventType) {
        // --- Login/Auth Related Events (Handled by user_service, but client might confirm) ---
        case 'login_attempt_start':
            webhookKey = 'USER_INFORMATION';
            embedTitle = '👤 Login Attempt Details (Start)';
            embedColor = 0xADD8E6;
            webhookContent = `Login attempt by \`${data.submitted_username || 'N/A'}\` (ID: ${data.submitted_userID || 'N/A'}) from \`${serverIp}\`.`;
            dbLogLevel = 'info';
            specificFields = [
                { name: 'Submitted Username', value: data.submitted_username || '[empty]', inline: true },
                { name: 'Submitted Password Present', value: data.submitted_password_present ? 'Yes' : 'No', inline: true },
                { name: 'Submitted User ID', value: data.submitted_userID || '[empty]', inline: true },
                { name: 'Attempts Remaining (Client)', value: `${data.attempts_remaining}`, inline: true },
                { name: 'All Fields Present', value: data.all_fields_present ? 'Yes' : 'No', inline: true }
            ];
            break;
        case 'login_failed_missing_fields':
        case 'login_failed_backend_response':
        case 'login_failed_server_error':
        case 'login_failed_network_error':
            webhookKey = 'INCORRECT_INFORMATION';
            embedTitle = `❌ Login Failed: ${eventType.replace('login_failed_', '').replace('_', ' ')}`;
            embedColor = 0xFF0000;
            dbLogLevel = 'warn';
            webhookContent = `Failed login for \`${data.submitted_username || username || 'N/A'}\` (ID: ${data.submitted_userID || userID || 'N/A'}). Reason: ${data.message || data.error || 'N/A'}.`;
            specificFields = [
                { name: 'Submitted Username', value: data.submitted_username || username || '[empty]', inline: true },
                { name: 'Submitted User ID', value: data.submitted_userID || userID || '[empty]', inline: true },
                { name: 'Reason', value: data.message || data.error || 'N/A', inline: false },
            ];
            if (data.missing_fields) specificFields.push({ name: 'Missing Fields', value: data.missing_fields.join(', '), inline: false });
            if (data.status) specificFields.push({ name: 'HTTP Status', value: `${data.status}`, inline: true });
            // More granular webhooks for invalid fields are handled in user_service.js, this is a general failure log.
            break;
        case 'login_attempts_exceeded':
            webhookKey = 'ATTEMPT_EXCEEDED_INFORMATION';
            embedTitle = '🚨 Login Attempts Exceeded (Client)';
            embedColor = 0xDC143C;
            dbLogLevel = 'error';
            webhookContent = `Max login attempts exceeded for \`${data.username || username || 'N/A'}\` (ID: ${data.userID || userID || 'N/A'}) from \`${serverIp}\`. Client reports locked.`;
            specificFields = [
                { name: 'Affected Username', value: data.username || username || 'N/A', inline: true },
                { name: 'Affected User ID', value: data.userID || userID || 'N/A', inline: true }
            ];
            break;
        case 'login_success':
            webhookKey = 'CORRECT_INFORMATION'; // Client's confirmation of success
            embedTitle = '✅ Successful Login (Client Confirmed)';
            embedColor = 0x00FF00;
            dbLogLevel = 'info';
            webhookContent = `Client confirmed successful login for **${username}** (ID: ${userID}).`;
            // `authenticateUser` in user_service also logs a server-side confirmation.
            break;
        case 'system_logout':
            webhookKey = 'SESSION_INFORMATION';
            embedTitle = '🚪 User Logout (Client)';
            embedColor = 0xFFA500;
            dbLogLevel = 'info';
            webhookContent = `User **${username || 'N/A'}** (ID: ${userID || 'N/A'}) logged out from dashboard \`${dashboardId}\`.`;
            break;
        case 'system_restart_initiated':
            webhookKey = 'MONITORING_INFORMATION'; // Or BOT_LOGGING_INFORMATION
            embedTitle = '🔄 Client-side System Restart';
            embedColor = 0xFFD700;
            dbLogLevel = 'warn';
            webhookContent = `Client-side restart initiated by **${username || 'N/A'}** (ID: ${userID || 'N/A'}) on dashboard \`${dashboardId}\`.`;
            break;

        // --- Client-Side Error Logging ---
        case 'client_error_log':
            webhookKey = 'USER_ERRORS';
            embedTitle = '⚠️ Client-Side Error Log';
            embedColor = 0xFF6347;
            dbLogLevel = 'error';
            webhookContent = `A client-side JavaScript error occurred on dashboard \`${dashboardId}\`: ${data.error_message}.`;
            specificFields.push(
                { name: 'Error Message', value: truncate(data.error_message, 1024), inline: false },
                { name: 'Stack Trace (Client)', value: truncate(data.stack_trace || 'N/A', 1024), inline: false }
            );
            break;

        // --- Activity-Related Events ---
        case 'dashboard_initialized':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🖥️ Dashboard Initialized';
            embedColor = 0x3498DB;
            webhookContent = `Dashboard for **${username}** (ID: ${userID}) initialized.`;
            break;
        case 'panel_opened':
        case 'panel_closed':
        case 'panel_minimize_toggle':
        case 'panel_closed_button':
        case 'subpanel_opened':
        case 'subpanel_closed':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '📊 Panel Interaction';
            embedColor = 0x6495ED;
            webhookContent = `Panel \`${data.panel_id || 'N/A'}\` interaction by ${username || 'N/A'}. Action: ${eventType}.`;
            specificFields = [
                { name: 'Panel ID', value: data.panel_id || 'N/A', inline: true },
                { name: 'Action', value: eventType, inline: true }
            ];
            break;
        case 'search_performed':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔍 Search Performed';
            embedColor = 0x6495ED;
            webhookContent = `User \`${username || 'N/A'}\` searched for: \`${data.query}\`.`;
            specificFields.push({ name: 'Search Query', value: truncate(data.query, 256), inline: false });
            break;
        case 'theme_toggle':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🎨 Theme Toggled';
            embedColor = 0x6495ED;
            webhookContent = `Theme toggled to \`${data.theme}\` by ${username || 'N/A'}.`;
            specificFields.push({ name: 'New Theme', value: data.theme, inline: true });
            break;
        case 'accent_theme_change':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🌈 Accent Theme Changed';
            embedColor = 0x6495ED;
            webhookContent = `Accent theme changed to \`${data.theme}\` by ${username || 'N/A'}.`;
            specificFields.push({ name: 'New Accent Theme', value: data.theme, inline: true });
            break;
        case 'setting_toggle':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '⚙️ Setting Toggled';
            embedColor = 0x6495ED;
            webhookContent = `Setting \`${data.setting_name}\` toggled to \`${data.active ? 'Active' : 'Inactive'}\` by ${username || 'N/A'}.`;
            specificFields = [
                { name: 'Setting Name', value: data.setting_name, inline: true },
                { name: 'Status', value: data.active ? 'Active' : 'Inactive', inline: true }
            ];
            break;
        case 'mouse_click_increment':
        case 'mouse_click_reset':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🖱️ Mouse Clicker';
            embedColor = 0x6495ED;
            webhookContent = `Mouse clicker action: \`${eventType}\` by ${username || 'N/A'}. Count: ${data.count || 'N/A'}.`;
            specificFields = [{ name: 'Action', value: eventType, inline: true }];
            if (data.count !== undefined) specificFields.push({ name: 'Current Count', value: `${data.count}`, inline: true });
            break;
        case 'stopwatch_start':
        case 'stopwatch_pause':
        case 'stopwatch_reset':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '⏱️ Stopwatch Control';
            embedColor = 0x6495ED;
            webhookContent = `Stopwatch \`${eventType}\` by ${username || 'N/A'}. Time: ${data.time || 'N/A'}.`;
            specificFields = [{ name: 'Action', value: eventType, inline: true }];
            if (data.time !== undefined) specificFields.push({ name: 'Time', value: `${data.time}ms`, inline: true });
            break;
        case 'timer_start':
        case 'timer_pause':
        case 'timer_reset':
        case 'timer_complete':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '⏳ Timer Control';
            embedColor = 0x6495ED;
            webhookContent = `Timer \`${eventType}\` by ${username || 'N/A'}. Remaining: ${data.time_remaining || 'N/A'}.`;
            specificFields = [{ name: 'Action', value: eventType, inline: true }];
            if (data.initial_time !== undefined) specificFields.push({ name: 'Initial Time', value: `${data.initial_time}s`, inline: true });
            if (data.time_remaining !== undefined) specificFields.push({ name: 'Time Remaining', value: `${data.time_remaining}s`, inline: true });
            break;
        case 'reminder_set':
        case 'reminder_triggered':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔔 Reminder Event';
            embedColor = 0x6495ED;
            webhookContent = `Reminder \`${eventType}\`: "${data.text}" by ${username || 'N/A'}.`;
            specificFields = [
                { name: 'Action', value: eventType, inline: true },
                { name: 'Text', value: truncate(data.text, 500), inline: false },
                { name: 'Time', value: new Date(data.time).toLocaleString(), inline: true }
            ];
            break;
        case 'drawing_tool_select':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🎨 Drawing Tool Selection';
            embedColor = 0x6495ED;
            webhookContent = `Drawing tool changed to \`${data.tool}\` by ${username || 'N/A'}.`;
            specificFields.push({ name: 'Tool', value: data.tool, inline: true });
            break;
        case 'drawing_color_change':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🎨 Drawing Color Changed';
            embedColor = 0x6495ED;
            webhookContent = `Drawing color changed to \`${data.color}\` by ${username || 'N/A'}.`;
            specificFields.push({ name: 'New Color', value: data.color, inline: true });
            break;
        case 'drawing_thickness_change':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🎨 Drawing Thickness Changed';
            embedColor = 0x6495ED;
            webhookContent = `Drawing thickness changed to \`${data.thickness}\` by ${username || 'N/A'}.`;
            specificFields.push({ name: 'New Thickness', value: `${data.thickness}px`, inline: true });
            break;
        case 'canvas_clear':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🗑️ Canvas Cleared';
            embedColor = 0x6495ED;
            webhookContent = `Canvas cleared by ${username || 'N/A'}.`;
            break;
        case 'canvas_save':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '💾 Canvas Saved';
            embedColor = 0x6495ED;
            webhookContent = `Canvas saved by ${username || 'N/A'}.`;
            break;
        case 'calculator_clear':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔢 Calculator Cleared';
            embedColor = 0x6495ED;
            webhookContent = `Calculator display cleared by ${username || 'N/A'}.`;
            break;
        case 'calculator_delete_last':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔢 Calculator Delete Last';
            embedColor = 0x6495ED;
            webhookContent = `Last character deleted on calculator by ${username || 'N/A'}.`;
            break;
        case 'calculation_performed':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🧮 Calculation Performed';
            embedColor = 0x6495ED;
            webhookContent = `Calculation \`${data.expression}\` resulted in \`${data.result}\` by ${username || 'N/A'}.`;
            specificFields = [
                { name: 'Expression', value: truncate(data.expression, 500), inline: false },
                { name: 'Result', value: `${data.result}`, inline: true }
            ];
            break;
        case 'calculator_error':
            webhookKey = 'USER_ERRORS';
            embedTitle = '🔢 Calculator Error';
            embedColor = 0xFF6347;
            dbLogLevel = 'error';
            webhookContent = `Calculator error for expression \`${data.expression}\` by ${username || 'N/A'}: ${data.error}.`;
            specificFields = [
                { name: 'Expression', value: truncate(data.expression, 500), inline: false },
                { name: 'Error', value: truncate(data.error, 500), inline: false }
            ];
            break;
        case 'unit_converter_type_change':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔄 Unit Converter Type Change';
            embedColor = 0x6495ED;
            webhookContent = `Unit conversion type changed to \`${data.type}\` by ${username || 'N/A'}.`;
            specificFields.push({ name: 'New Type', value: data.type, inline: true });
            break;
        case 'unit_converted':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔄 Units Converted';
            embedColor = 0x6495ED;
            webhookContent = `Units converted from \`${data.from_value} ${data.from_unit}\` to \`${data.result} ${data.to_unit}\` by ${username || 'N/A'}.`;
            specificFields = [
                { name: 'From Value', value: `${data.from_value}`, inline: true },
                { name: 'From Unit', value: data.from_unit, inline: true },
                { name: 'To Unit', value: data.to_unit, inline: true },
                { name: 'Result', value: `${data.result}`, inline: true }
            ];
            break;
        case 'random_fact_refresh':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '💡 Random Fact Refreshed';
            embedColor = 0x6495ED;
            webhookContent = `Random fact refreshed by ${username || 'N/A'}.`;
            break;
        case 'daily_quote_refresh':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '💬 Daily Quote Refreshed';
            embedColor = 0x6495ED;
            webhookContent = `Daily quote refreshed by ${username || 'N/A'}.`;
            break;
        case 'clear_notifications':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🗑️ Client Notifications Cleared';
            embedColor = 0x6495ED;
            webhookContent = `Client notifications cleared by ${username || 'N/A'}.`;
            break;
        case 'clear_activity_logs':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🗑️ Client Activity Logs Cleared';
            embedColor = 0x6495ED;
            webhookContent = `Client activity logs cleared by ${username || 'N/A'}.`;
            break;
        case 'download_activity_logs':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '⬇️ Client Activity Logs Downloaded';
            embedColor = 0x6495ED;
            webhookContent = `Client activity logs downloaded by ${username || 'N/A'} from dashboard \`${dashboardId}\`.`;
            break;
        case 'screenshot_taken':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '📸 Screenshot Taken';
            embedColor = 0x6495ED;
            webhookContent = `Screenshot taken by ${username || 'N/A'} on dashboard \`${dashboardId}\`.`;
            break;
        case 'panels_grid_visibility_toggle':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '👁️ Panel Grid Toggled';
            embedColor = 0x6495ED;
            webhookContent = `Panel grid visibility toggled to \`${data.visible ? 'visible' : 'hidden'}\` by ${username || 'N/A'}.`;
            specificFields.push({ name: 'Visibility', value: data.visible ? 'Visible' : 'Hidden', inline: true });
            break;
        case 'add_important_date':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '⭐ Important Date Added';
            embedColor = 0x6495ED;
            webhookContent = `Important date "${data.event}" added for ${new Date(data.date).toLocaleString()} by ${username || 'N/A'}.`;
            specificFields = [
                { name: 'Event', value: truncate(data.event, 500), inline: false },
                { name: 'Date', value: new Date(data.date).toLocaleString(), inline: true }
            ];
            break;
        case 'clear_important_dates':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🗑️ Important Dates Cleared';
            embedColor = 0x6495ED;
            webhookContent = `All important dates cleared by ${username || 'N/A'}.`;
            break;
        case 'zoom_adjust':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔎 Zoom Adjusted';
            embedColor = 0x6495ED;
            webhookContent = `Zoom adjusted to \`${data.zoom_level * 100}%\` by ${username || 'N/A'}.`;
            specificFields.push({ name: 'Zoom Level', value: `${data.zoom_level * 100}%`, inline: true });
            break;
        case 'password_visibility_toggle':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔒 Password Visibility Toggled';
            embedColor = 0x6495ED;
            webhookContent = `Password visibility toggled to \`${data.visible ? 'visible' : 'hidden'}\` by ${username || 'N/A'}.`;
            specificFields.push({ name: 'Visibility', value: data.visible ? 'Visible' : 'Hidden', inline: true });
            break;
        case 'text_notes_save':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '📝 Text Notes Saved';
            embedColor = 0x6495ED;
            webhookContent = `Text notes saved by ${username || 'N/A'}. Length: ${data.notes_length}.`;
            specificFields.push({ name: 'Notes Length', value: `${data.notes_length}`, inline: true });
            break;
        case 'text_notes_clear':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🗑️ Text Notes Cleared';
            embedColor = 0x6495ED;
            webhookContent = `Text notes cleared by ${username || 'N/A'}.`;
            break;

        default:
            warn(`Received unhandled client event: ${eventType}.`, { eventType, dashboardId, username, userID, ip: serverIp });
            webhookKey = 'BOT_LOGGING_INFORMATION'; // Fallback for any unhandled client events
            embedTitle = '❓ Unhandled Client Event';
            embedColor = 0x808080;
            webhookContent = `Received an unhandled client event \`${eventType}\` from dashboard \`${dashboardId}\`.`;
            specificFields.push({ name: 'Raw Data', value: truncate(JSON.stringify(data, null, 2), 1024), inline: false });
            dbLogLevel = 'warn'; // Warn level for unhandled events
    }

    const finalEmbedFields = [...commonFields, ...specificFields];

    // --- Send Webhook ---
    await sendWebhook(webhookKey, {
        content: webhookContent,
        username: 'Frontend Event Processor',
        avatar_url: 'https://i.imgur.com/G4fBwB4.png',
        embeds: [buildEmbed({
            title: embedTitle,
            description: `Event from Dashboard \`${dashboardId}\` for user \`${username || 'Guest'}\`.`,
            color: embedColor,
            fields: finalEmbedFields,
            footer: {
                text: `Client UA: ${browserInfo.userAgent.substring(0, Math.min(250, browserInfo.userAgent.length))}...`
            }
        })]
    });

    // --- Persist Log to Database ---
    try {
        const sanitizedData = loggerConfig.sensitiveKeys ? loggerConfig.sensitiveKeys.reduce((acc, key) => {
            const regex = new RegExp(`"${key}":\\s*"[^"]*"`, 'gi');
            return acc.replace(regex, `"${key}":"${loggerConfig.redactionMask}"`);
        }, JSON.stringify(data || {})) : JSON.stringify(data || {});

        await queryDatabase(
            `INSERT INTO application_logs (level, message, context, user_id, session_id, ip_address, dashboard_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                dbLogLevel,
                truncate(webhookContent, MAX_LOG_MESSAGE_LENGTH), // Use webhook content as primary message
                {
                    eventType,
                    clientTimestamp,
                    browserInfo,
                    connectionInfo,
                    data: JSON.parse(sanitizedData) // Re-parse sanitized data
                },
                userID,
                null, // No server-side session ID tracked here yet
                serverIp,
                dashboardId
            ]
        );
    } catch (dbErr) {
        error('Failed to save log-event to database:', dbErr, { eventType, dashboardId, userID, ip: serverIp });
        sendBotLog('ERROR_LOGGING_INFORMATION', `❌ DB Save Failed for \`/log-event\` (\`${eventType}\`): \`${dbErr.message}\``);
    }

    res.status(200).json({ status: 'success', message: 'Event logged and processed.' });
});

// --- API: Retrieve Application Settings ---
router.get('/settings/welcome', async (req, res) => {
    try {
        const settings = await getWelcomeMessageSettings();
        info('Fetched welcome message settings.', { user: req.user?.username, ip: req.ip });
        res.json(settings);
    } catch (err) {
        error('Error fetching welcome message settings from DB:', err, { user: req.user?.username, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve welcome settings.' });
    }
});

router.get('/settings/theme', async (req, res) => {
    try {
        const theme = await getThemeSetting();
        info('Fetched theme setting.', { user: req.user?.username, ip: req.ip });
        res.json({ theme });
    } catch (err) {
        error('Error fetching theme setting from DB:', err, { user: req.user?.username, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve theme.' });
    }
});

router.get('/settings/features', async (req, res) => {
    try {
        const enabledFeatures = await getEnabledFeatures();
        info('Fetched enabled features.', { user: req.user?.username, ip: req.ip });
        res.json({ enabledFeatures });
    } catch (err) {
        error('Error fetching enabled features from DB:', err, { user: req.user?.username, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve features.' });
    }
});

router.get('/settings/announcement', async (req, res) => {
    try {
        const announcement = await getAnnouncementMessage();
        info('Fetched announcement message.', { user: req.user?.username, ip: req.ip });
        res.json({ message: announcement });
    } catch (err) {
        error('Error fetching announcement message from DB:', err, { user: req.user?.username, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve announcement.' });
    }
});

// --- API: User-Specific Data Persistence (Requires `req.user` from auth middleware) ---
// Note: For all these user-specific endpoints, a real authentication system
// would ensure `req.user.userID` or similar is available and validated.
// For now, we'll assume `req.body.userID` is reliable, but this is a security risk without proper auth.

// Helper to validate user ID in body
function validateUserID(req, res, next) {
    const userID = req.body.userID || req.params.userID;
    if (!userID) {
        warn('API call missing userID for user-specific data.', { path: req.path, ip: req.ip });
        return res.status(400).json({ message: 'User ID is required.' });
    }
    // In a real system, you'd verify this userID against req.user.userID
    next();
}

router.use('/user/:userID/*', validateUserID); // Apply to all user-specific data routes

// --- User Activity Logs ---
router.get('/user/:userID/activity-logs', async (req, res) => {
    const { userID } = req.params;
    try {
        // Fetch logs from DB for this user (max 100, ordered by timestamp desc)
        const result = await queryDatabase('SELECT timestamp, activity FROM user_activity_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 100', [userID]);
        info(`Fetched ${result.rowCount} activity logs for user: ${userID}.`, { userID, ip: req.ip });
        res.json(result.rows);
    } catch (err) {
        error(`Error fetching activity logs for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve activity logs.' });
    }
});

router.post('/user/:userID/activity-logs', async (req, res) => {
    const { userID } = req.params;
    const { activity } = req.body;
    if (!activity) {
        return res.status(400).json({ message: 'Activity message is required.' });
    }
    try {
        await queryDatabase('INSERT INTO user_activity_logs (user_id, activity) VALUES ($1, $2)', [userID, activity]);
        info(`Saved activity log for user: ${userID}.`, { userID, activity, ip: req.ip });
        res.status(201).json({ message: 'Activity log saved.' });
    } catch (err) {
        error(`Error saving activity log for user ${userID}:`, err, { userID, activity, ip: req.ip });
        res.status(500).json({ error: 'Failed to save activity log.' });
    }
});

router.delete('/user/:userID/activity-logs', async (req, res) => {
    const { userID } = req.params;
    try {
        await queryDatabase('DELETE FROM user_activity_logs WHERE user_id = $1', [userID]);
        info(`Cleared all activity logs for user: ${userID}.`, { userID, ip: req.ip });
        res.status(200).json({ message: 'Activity logs cleared.' });
    } catch (err) {
        error(`Error clearing activity logs for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to clear activity logs.' });
    }
});

// --- User Error Logs ---
router.get('/user/:userID/error-logs', async (req, res) => {
    const { userID } = req.params;
    try {
        const result = await queryDatabase('SELECT timestamp, message FROM user_error_logs WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 100', [userID]);
        info(`Fetched ${result.rowCount} error logs for user: ${userID}.`, { userID, ip: req.ip });
        res.json(result.rows);
    } catch (err) {
        error(`Error fetching error logs for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve error logs.' });
    }
});

router.post('/user/:userID/error-logs', async (req, res) => {
    const { userID } = req.params;
    const { message, stack_trace } = req.body;
    if (!message) {
        return res.status(400).json({ message: 'Error message is required.' });
    }
    try {
        await queryDatabase('INSERT INTO user_error_logs (user_id, message, stack_trace) VALUES ($1, $2, $3)', [userID, message, stack_trace]);
        info(`Saved error log for user: ${userID}.`, { userID, message, ip: req.ip });
        res.status(201).json({ message: 'Error log saved.' });
    } catch (err) {
        error(`Error saving error log for user ${userID}:`, err, { userID, message, ip: req.ip });
        res.status(500).json({ error: 'Failed to save error log.' });
    }
});

router.delete('/user/:userID/error-logs', async (req, res) => {
    const { userID } = req.params;
    try {
        await queryDatabase('DELETE FROM user_error_logs WHERE user_id = $1', [userID]);
        info(`Cleared all error logs for user: ${userID}.`, { userID, ip: req.ip });
        res.status(200).json({ message: 'Error logs cleared.' });
    } catch (err) {
        error(`Error clearing error logs for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to clear error logs.' });
    }
});

// --- User Login History ---
router.get('/user/:userID/login-history', async (req, res) => {
    const { userID } = req.params;
    try {
        const result = await queryDatabase('SELECT timestamp, success, username FROM user_login_history WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 100', [userID]);
        info(`Fetched ${result.rowCount} login history entries for user: ${userID}.`, { userID, ip: req.ip });
        res.json(result.rows);
    } catch (err) {
        error(`Error fetching login history for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve login history.' });
    }
});

// Note: Login history is typically recorded by the /login endpoint, not the frontend directly.
// This POST endpoint might be used for adding a manual entry if needed, but not for regular logins.
router.post('/user/:userID/login-history', async (req, res) => {
    const { userID } = req.params;
    const { success, username, timestamp } = req.body; // timestamp can be client-provided or server-generated
    if (typeof success !== 'boolean' || !username) {
        return res.status(400).json({ message: 'Success status and username are required.' });
    }
    try {
        await queryDatabase('INSERT INTO user_login_history (user_id, username, success, timestamp) VALUES ($1, $2, $3, $4)',
            [userID, username, success, timestamp ? new Date(timestamp) : new Date()]);
        info(`Added login history entry for user: ${userID}.`, { userID, username, success, ip: req.ip });
        res.status(201).json({ message: 'Login history entry added.' });
    } catch (err) {
        error(`Error adding login history for user ${userID}:`, err, { userID, username, success, ip: req.ip });
        res.status(500).json({ error: 'Failed to add login history entry.' });
    }
});


// --- User Important Dates ---
router.get('/user/:userID/important-dates', async (req, res) => {
    const { userID } = req.params;
    try {
        const result = await queryDatabase('SELECT id, datetime, event FROM user_important_dates WHERE user_id = $1 ORDER BY datetime ASC LIMIT 100', [userID]);
        info(`Fetched ${result.rowCount} important dates for user: ${userID}.`, { userID, ip: req.ip });
        res.json(result.rows);
    } catch (err) {
        error(`Error fetching important dates for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve important dates.' });
    }
});

router.post('/user/:userID/important-dates', async (req, res) => {
    const { userID } = req.params;
    const { datetime, event } = req.body;
    if (!datetime || !event) {
        return res.status(400).json({ message: 'Datetime and event description are required.' });
    }
    try {
        await queryDatabase('INSERT INTO user_important_dates (user_id, datetime, event) VALUES ($1, $2, $3)', [userID, new Date(datetime), event]);
        info(`Added important date for user: ${userID}.`, { userID, event, datetime, ip: req.ip });
        res.status(201).json({ message: 'Important date added.' });
    } catch (err) {
        error(`Error adding important date for user ${userID}:`, err, { userID, event, datetime, ip: req.ip });
        res.status(500).json({ error: 'Failed to add important date.' });
    }
});

router.delete('/user/:userID/important-dates', async (req, res) => {
    const { userID } = req.params;
    try {
        await queryDatabase('DELETE FROM user_important_dates WHERE user_id = $1', [userID]);
        info(`Cleared all important dates for user: ${userID}.`, { userID, ip: req.ip });
        res.status(200).json({ message: 'Important dates cleared.' });
    } catch (err) {
        error(`Error clearing important dates for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to clear important dates.' });
    }
});

// --- User Text Notes ---
router.get('/user/:userID/notes/text', async (req, res) => {
    const { userID } = req.params;
    try {
        // Assuming a table `user_notes` with `user_id` and `text_content`
        const result = await queryDatabase('SELECT text_content FROM user_notes WHERE user_id = $1', [userID]);
        info(`Fetched text notes for user: ${userID}.`, { userID, ip: req.ip });
        res.json({ text_content: result.rows[0]?.text_content || '' });
    } catch (err) {
        error(`Error fetching text notes for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve text notes.' });
    }
});

router.put('/user/:userID/notes/text', async (req, res) => {
    const { userID } = req.params;
    const { text_content } = req.body;
    if (typeof text_content !== 'string') {
        return res.status(400).json({ message: 'Text content is required and must be a string.' });
    }
    try {
        // UPSERT: Insert if not exists, update if exists
        await queryDatabase(`
            INSERT INTO user_notes (user_id, text_content) VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET text_content = $2, updated_at = CURRENT_TIMESTAMP;
        `, [userID, text_content]);
        info(`Saved text notes for user: ${userID}.`, { userID, length: text_content.length, ip: req.ip });
        res.status(200).json({ message: 'Text notes saved.' });
    } catch (err) {
        error(`Error saving text notes for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to save text notes.' });
    }
});

router.delete('/user/:userID/notes/text', async (req, res) => {
    const { userID } = req.params;
    try {
        await queryDatabase('UPDATE user_notes SET text_content = \'\' WHERE user_id = $1', [userID]);
        info(`Cleared text notes for user: ${userID}.`, { userID, ip: req.ip });
        res.status(200).json({ message: 'Text notes cleared.' });
    } catch (err) => {
        error(`Error clearing text notes for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to clear text notes.' });
    }
});

// --- User Canvas Drawing (saving as base64 string) ---
router.get('/user/:userID/notes/drawing', async (req, res) => {
    const { userID } = req.params;
    try {
        // Assuming user_notes table also has a `drawing_data` column
        const result = await queryDatabase('SELECT drawing_data FROM user_notes WHERE user_id = $1', [userID]);
        info(`Fetched drawing data for user: ${userID}.`, { userID, ip: req.ip });
        res.json({ drawing_data: result.rows[0]?.drawing_data || '' });
    } catch (err) {
        error(`Error fetching drawing data for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve drawing data.' });
    }
});

router.put('/user/:userID/notes/drawing', async (req, res) => {
    const { userID } = req.params;
    const { drawing_data } = req.body; // Expecting a base64 string
    if (typeof drawing_data !== 'string') {
        return res.status(400).json({ message: 'Drawing data is required and must be a string.' });
    }
    try {
        await queryDatabase(`
            INSERT INTO user_notes (user_id, drawing_data) VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET drawing_data = $2, updated_at = CURRENT_TIMESTAMP;
        `, [userID, drawing_data]);
        info(`Saved drawing data for user: ${userID}.`, { userID, length: drawing_data.length, ip: req.ip });
        res.status(200).json({ message: 'Drawing data saved.' });
    } catch (err) {
        error(`Error saving drawing data for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to save drawing data.' });
    }
});

router.delete('/user/:userID/notes/drawing', async (req, res) => {
    const { userID } = req.params;
    try {
        await queryDatabase('UPDATE user_notes SET drawing_data = \'\' WHERE user_id = $1', [userID]);
        info(`Cleared drawing data for user: ${userID}.`, { userID, ip: req.ip });
        res.status(200).json({ message: 'Drawing data cleared.' });
    } catch (err) {
        error(`Error clearing drawing data for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to clear drawing data.' });
    }
});


// --- User Click Counter ---
router.get('/user/:userID/click-count', async (req, res) => {
    const { userID } = req.params;
    try {
        // Assuming a table `user_stats` with `user_id` and `click_count`
        const result = await queryDatabase('SELECT click_count FROM user_stats WHERE user_id = $1', [userID]);
        info(`Fetched click count for user: ${userID}.`, { userID, ip: req.ip });
        res.json({ click_count: result.rows[0]?.click_count || 0 });
    } catch (err) {
        error(`Error fetching click count for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve click count.' });
    }
});

router.put('/user/:userID/click-count', async (req, res) => {
    const { userID } = req.params;
    const { click_count } = req.body;
    if (typeof click_count !== 'number' || click_count < 0) {
        return res.status(400).json({ message: 'Click count is required and must be a non-negative number.' });
    }
    try {
        await queryDatabase(`
            INSERT INTO user_stats (user_id, click_count) VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET click_count = $2, updated_at = CURRENT_TIMESTAMP;
        `, [userID, click_count]);
        info(`Saved click count for user: ${userID}.`, { userID, click_count, ip: req.ip });
        res.status(200).json({ message: 'Click count saved.' });
    } catch (err) {
        error(`Error saving click count for user ${userID}:`, err, { userID, click_count, ip: req.ip });
        res.status(500).json({ error: 'Failed to save click count.' });
    }
});

router.delete('/user/:userID/click-count', async (req, res) => {
    const { userID } = req.params;
    try {
        await queryDatabase('UPDATE user_stats SET click_count = 0 WHERE user_id = $1', [userID]);
        info(`Reset click count for user: ${userID}.`, { userID, ip: req.ip });
        res.status(200).json({ message: 'Click count reset.' });
    } catch (err) {
        error(`Error resetting click count for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to reset click count.' });
    }
});

// --- User Stats (General) ---
router.get('/user/:userID/stats', async (req, res) => {
    const { userID } = req.params;
    try {
        // This would join data from multiple tables (activity_logs, error_logs, user_stats)
        // For simplicity, let's fetch individual components and combine them.
        const activityCount = (await queryDatabase('SELECT COUNT(*) FROM user_activity_logs WHERE user_id = $1', [userID])).rows[0].count;
        const errorCount = (await queryDatabase('SELECT COUNT(*) FROM user_error_logs WHERE user_id = $1', [userID])).rows[0].count;
        const loginHistoryCount = (await queryDatabase('SELECT COUNT(*) FROM user_login_history WHERE user_id = $1', [userID])).rows[0].count;
        const importantDatesCount = (await queryDatabase('SELECT COUNT(*) FROM user_important_dates WHERE user_id = $1', [userID])).rows[0].count;
        const clickCount = (await queryDatabase('SELECT click_count FROM user_stats WHERE user_id = $1', [userID])).rows[0]?.click_count || 0;
        const sessionStartTime = (await queryDatabase('SELECT login_time FROM user_sessions WHERE user_id = $1 ORDER BY login_time DESC LIMIT 1', [userID])).rows[0]?.login_time || null;


        // Placeholder for other stats like button presses, toggle switches, etc.,
        // which would either be aggregated from activity logs or explicitly stored.
        // For now, these client-side stats (`stats` object in frontend) are client-only.
        const combinedStats = {
            activityLogsCount: parseInt(activityCount),
            errorLogsCount: parseInt(errorCount),
            loginHistoryCount: parseInt(loginHistoryCount),
            importantDatesCount: parseInt(importantDatesCount),
            clickCount: parseInt(clickCount),
            sessionStartTime: sessionStartTime ? new Date(sessionStartTime).toISOString() : null,
            // These would come from a more complex logging/metrics system or be sent from client
            buttonPresses: 0, // Frontend tracked
            toggleSwitches: 0, // Frontend tracked
            panelsOpened: 0, // Frontend tracked
            panelsClosed: 0, // Frontend tracked
            searchQueries: 0 // Frontend tracked
        };

        info(`Fetched combined stats for user: ${userID}.`, { userID, ip: req.ip });
        res.json(combinedStats);
    } catch (err) {
        error(`Error fetching combined stats for user ${userID}:`, err, { userID, ip: req.ip });
        res.status(500).json({ error: 'Failed to retrieve combined stats.' });
    }
});


module.exports = router;
