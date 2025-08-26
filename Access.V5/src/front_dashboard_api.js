// your-project-name/src/api/front_dashboard_api.js
const express = require('express');
const router = express.Router();
const { logInfo, logError, sendWebhook, sendBotLog } = require('../utils/logging');
const { getWelcomeMessageSettings, getThemeSetting, getEnabledFeatures, getAnnouncementMessage, setApplicationSetting } = require('../services/app_settings_service');
const { authenticateUser } = require('../services/user_service'); // For backend user authentication
const blacklistConfig = require('../config/blacklist.json'); // For server-side IP/user blacklisting
const whitelistConfig = require('../config/whitelist.json'); // Although authenticateUser uses it, direct access isn't needed here
const { getConnectedDashboardIds } = require('../socket_manager'); // To check connected dashboards (optional, could be for admin endpoints)

// --- Middleware for this Router ---
// This middleware runs for all routes defined in this file.
router.use((req, res, next) => {
    // Determine the client IP address. 'x-forwarded-for' is common when behind a proxy/load balancer like Render.
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    // --- IP Blacklisting Check ---
    if (blacklistConfig.includes(clientIp)) {
        // Send a webhook notification if a blacklisted IP attempts access
        sendWebhook('BLACKLIST_INFORMATION', {
            content: `🚨 **Blocked Blacklisted IP Attempt** from \`${clientIp}\` on API route: \`${req.method} ${req.path}\``,
            username: 'Security Monitor',
            embeds: [{
                title: '🚫 Access Denied - Blacklisted IP',
                description: `An attempt was made to access the dashboard API from a blacklisted IP address.`,
                color: 0xFF0000,
                fields: [
                    { name: 'IP Address', value: clientIp, inline: true },
                    { name: 'Attempted Route', value: `${req.method} ${req.path}`, inline: true },
                    { name: 'Timestamp', value: new Date().toISOString(), inline: false }
                ],
                footer: { text: `User Agent: ${req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 100) : 'N/A'}...` }
            }]
        });
        return res.status(403).json({ message: 'Access Denied: Your IP is blacklisted.' });
    }
    logInfo(`Dashboard API accessed: ${req.method} ${req.path} from ${clientIp}`);
    next(); // Proceed to the next middleware or route handler
});

// --- API for User Login Authentication ---
router.post('/login', async (req, res) => {
    const { username, password, userID, dashboardId } = req.body;
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    logInfo(`Login attempt received for username: ${username}, userID: ${userID} from IP: ${clientIp} on dashboard: ${dashboardId}`);

    // Delegate authentication logic to the user_service
    const authResult = await authenticateUser(username, password, userID, clientIp, dashboardId);

    if (authResult.success) {
        // On successful login, return a 200 OK
        res.status(200).json({ success: true, message: 'Login successful', user: authResult.user });
    } else {
        // On failed login, return a 401 Unauthorized with the specific message/reason
        // The authenticateUser service will handle all the granular webhook logging for failures.
        res.status(401).json({ success: false, message: authResult.message, reason: authResult.reason });
    }
});

// --- API for Resetting Login Attempts ---
router.post('/reset-attempts', async (req, res) => {
    const { resetCode, username, userID, dashboardId } = req.body;
    const clientIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    // **CRITICAL SECURITY WARNING:**
    // In a production application, `RESET_CODE_SECRET` MUST NOT be hardcoded here.
    // It should be stored securely, ideally as an environment variable (`process.env.RESET_CODE_SECRET`).
    // Additionally, a robust reset mechanism would involve:
    // 1. A unique, time-limited token sent to an authorized email/phone.
    // 2. Rate limiting to prevent brute-forcing of the reset code.
    const RESET_CODE_SECRET_SERVER = process.env.RESET_CODE_SECRET || 'Reset.2579'; // Fetch from ENV or use hardcoded fallback

    const isCorrect = resetCode === RESET_CODE_SECRET_SERVER;

    logInfo(`Reset attempt by ${username} (ID: ${userID}) from ${clientIp}. Code: ${resetCode}. Result: ${isCorrect ? 'SUCCESS' : 'FAILED'}.`);

    // Send a detailed webhook about the reset attempt
    const resetFields = [
        { name: 'User Context', value: username || 'N/A', inline: true },
        { name: 'User ID', value: userID || 'N/A', inline: true },
        { name: 'Client IP', value: clientIp, inline: true },
        { name: 'Entered Code', value: enteredCode, inline: false }, // Log the entered code for auditing
        { name: 'Result', value: isCorrect ? 'Success' : 'Failed', inline: true },
        { name: 'Dashboard ID', value: dashboardId || 'N/A', inline: true }
    ];

    await sendWebhook('RESET_INFORMATION', {
        content: `Reset attempt by **${username || 'N/A'}** (ID: ${userID || 'N/A'}) from \`${clientIp}\`. Code: \`${resetCode}\`. Result: ${isCorrect ? 'SUCCESS' : 'FAILED'}.`,
        username: 'Reset System',
        embeds: [{
            title: '🔔 Reset System Interaction',
            description: `Details of a reset code entry attempt for dashboard \`${dashboardId}\`.`,
            color: isCorrect ? 0x00FF00 : 0xFF0000, // Green for success, Red for failure
            fields: resetFields,
            timestamp: new Date().toISOString()
        }]
    });

    if (isCorrect) {
        // In a real system, you would also clear any persistent login attempt counters for this user in your database here.
        // For this example, we rely on the client-side 'attempts' variable to be reset,
        // but server-side state (e.g., in `user_service.js`) would also need to be updated.
        res.status(200).json({ success: true, message: 'Login attempts reset.' });
    } else {
        res.status(401).json({ success: false, message: 'Incorrect reset code.' });
    }
});

// --- API for Frontend Event Logging (Consolidates all client-side webhook triggers) ---
// This endpoint receives all client-side events that previously would have sent direct webhooks.
// It acts as a central point to process these events server-side and dispatch appropriate webhooks.
router.post('/log-event', async (req, res) => {
    // Extract relevant data from the frontend's request body
    const { eventType, dashboardId, username, userID, clientTimestamp, browserInfo, connectionInfo, data, logType } = req.body;
    // Get the actual server-side IP, as the client-side IP can be manipulated
    const serverIp = req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip;

    logInfo(`Received client event: ${eventType} from Dashboard: ${dashboardId} (User: ${username || 'Guest'}, IP: ${serverIp})`);

    let webhookKey = '';       // Key from src/config/webhook_urls.json
    let embedTitle = '';       // Title for the Discord embed
    let embedColor = 0x808080; // Default grey color for embed
    let webhookContent = '';   // Main content text for the webhook (optional)

    // Construct common fields for all events
    const commonFields = [
        { name: 'Event Type', value: eventType, inline: true },
        { name: 'Dashboard ID', value: dashboardId || 'N/A', inline: true },
        { name: 'User', value: username || 'Guest', inline: true },
        { name: 'User ID', value: userID || 'N/A', inline: true },
        { name: 'Client Timestamp', value: new Date(clientTimestamp).toLocaleString(), inline: false },
        { name: 'Server IP (Detected)', value: serverIp, inline: true },
        { name: 'Browser (Client)', value: browserInfo.name + ' ' + browserInfo.version, inline: true },
        { name: 'OS (Client)', value: browserInfo.os + ' ' + browserInfo.osVersion, inline: true },
        { name: 'Device Type (Client)', value: browserInfo.deviceType, inline: true },
        { name: 'Connection (Client)', value: (connectionInfo.type || 'unknown') + (connectionInfo.online ? ' (Online)' : ' (Offline)'), inline: true },
    ];

    // Add specific fields based on the event type
    let additionalFields = [];

    // --- Event Type Mapping and Customization ---
    // This `switch` statement maps the `eventType` from the frontend
    // to specific Discord webhook channels and customizes the embed details.
    switch (eventType) {
        case 'login_attempt_start':
            webhookKey = 'USER_INFORMATION'; // General channel for initial login data
            embedTitle = '👤 Login Attempt Details (Start)';
            embedColor = 0xADD8E6; // Light Blue
            webhookContent = `Login attempt for \`${data.submitted_username || 'N/A'}\` (ID: ${data.submitted_userID || 'N/A'}) from \`${serverIp}\`.`;
            additionalFields.push(
                { name: 'Submitted Username', value: data.submitted_username || '[empty]', inline: true },
                { name: 'Submitted Password Present', value: data.submitted_password_present ? 'Yes' : 'No', inline: true },
                { name: 'Submitted User ID', value: data.submitted_userID || '[empty]', inline: true },
                { name: 'Attempts Remaining (Client)', value: `${data.attempts_remaining}`, inline: true }
            );
            break;

        case 'login_failed_missing_fields':
            webhookKey = 'INCORRECT_INFORMATION';
            embedTitle = '❌ Login Failed: Missing Fields';
            embedColor = 0xFF0000; // Red
            webhookContent = `Failed login for \`${data.submitted_username || 'N/A'}\` (ID: ${data.submitted_userID || 'N/A'}) due to missing fields.`;
            additionalFields.push(
                { name: 'Missing Fields', value: data.missing_fields.join(', ') || 'N/A', inline: false },
                { name: 'Submitted Username', value: data.submitted_username || '[empty]', inline: true },
                { name: 'Submitted User ID', value: data.submitted_userID || '[empty]', inline: true }
            );
            // Optionally, also send to specific invalid channels if detailed enough
            if (data.missing_fields.includes("Username")) await sendWebhook('INVALID_USERNAME_INFORMATION', { content: `🚫 Empty username in failed login by ${data.submitted_username || 'N/A'} from \`${serverIp}\`.` });
            if (data.missing_fields.includes("Password")) await sendWebhook('INVALID_PASSWORD_INFORMATION', { content: `🚫 Empty password in failed login by ${data.submitted_username || 'N/A'} from \`${serverIp}\`.` });
            if (data.missing_fields.includes("User ID")) await sendWebhook('INVALID_IDENTIFIER_INFORMATION', { content: `🚫 Empty User ID in failed login by ${data.submitted_username || 'N/A'} from \`${serverIp}\`.` });
            break;

        case 'login_failed_backend_response':
            webhookKey = 'INCORRECT_INFORMATION';
            embedTitle = '❌ Login Failed: Backend Rejection';
            embedColor = 0xFF0000;
            webhookContent = `Failed login for \`${data.username || 'N/A'}\` (ID: ${data.userID || 'N/A'}). Reason: ${data.message || 'Backend validation failed'}.`;
            additionalFields.push(
                { name: 'Submitted Username', value: data.username || '[empty]', inline: true },
                { name: 'Submitted User ID', value: data.userID || '[empty]', inline: true },
                { name: 'Backend Message', value: data.message || 'N/A', inline: false },
                { name: 'Backend Reason', value: data.reason || 'N/A', inline: false }
            );
            // The `authenticateUser` function already sends specific webhooks for invalid credentials,
            // so this might be redundant or for a more general 'incorrect' log.

            break;

        case 'login_failed_server_error':
            webhookKey = 'ERROR_LOGGING_INFORMATION'; // Server-side error channel if backend failed
            embedTitle = '⚠️ Login Failed: Server Error';
            embedColor = 0xFF6347; // Tomato Red
            webhookContent = `Server-side error during login attempt for \`${data.username || 'N/A'}\` (ID: ${data.userID || 'N/A'}). Status: ${data.status || 'N/A'}. Message: ${data.message || 'N/A'}.`;
            additionalFields.push(
                { name: 'Submitted Username', value: data.username || '[empty]', inline: true },
                { name: 'Submitted User ID', value: data.userID || '[empty]', inline: true },
                { name: 'HTTP Status', value: `${data.status}`, inline: true },
                { name: 'Error Message', value: data.message || 'N/A', inline: false }
            );
            break;

        case 'login_failed_network_error':
            webhookKey = 'ERROR_LOGGING_INFORMATION'; // Network error affecting login
            embedTitle = '⚠️ Login Failed: Network Error';
            embedColor = 0xFF6347;
            webhookContent = `Network error during login attempt for \`${data.username || 'N/A'}\` (ID: ${data.userID || 'N/A'}). Error: ${data.error || 'N/A'}.`;
            additionalFields.push(
                { name: 'Submitted Username', value: data.username || '[empty]', inline: true },
                { name: 'Submitted User ID', value: data.userID || '[empty]', inline: true },
                { name: 'Network Error', value: data.error || 'N/A', inline: false }
            );
            break;

        case 'login_attempts_exceeded':
            webhookKey = 'ATTEMPT_EXCEEDED_INFORMATION';
            embedTitle = '🚨 Login Attempts Exceeded';
            embedColor = 0xDC143C; // Crimson Red
            webhookContent = `Max login attempts exceeded for \`${data.username || 'N/A'}\` (ID: ${data.userID || 'N/A'}) from \`${serverIp}\`. System locked for this user.`;
            additionalFields.push(
                { name: 'Affected Username', value: data.username || 'N/A', inline: true },
                { name: 'Affected User ID', value: data.userID || 'N/A', inline: true }
            );
            break;

        case 'login_success': // This is just frontend reporting successful login. Backend already logs via authenticateUser.
            webhookKey = 'CORRECT_INFORMATION'; // Logged by authenticateUser as well, this is a redundant confirmation.
            embedTitle = '✅ Successful Login (Client Confirmation)';
            embedColor = 0x00FF00;
            webhookContent = `Client confirmed successful login for **${username}** (ID: ${userID}).`;
            break;

        case 'system_logout':
            webhookKey = 'SESSION_INFORMATION'; // Or USER_ACTIVITY if preferred
            embedTitle = '🚪 User Logout';
            embedColor = 0xFFA500; // Orange
            webhookContent = `User **${username || 'N/A'}** (ID: ${userID || 'N/A'}) logged out from dashboard \`${dashboardId}\`.`;
            break;

        case 'system_restart_initiated':
            webhookKey = 'BOT_LOGGING_INFORMATION'; // Or create a specific channel "SYSTEM_RESTARTS"
            embedTitle = '🔄 Client-side System Restart Initiated';
            embedColor = 0xFFD700; // Gold
            webhookContent = `Client-side restart initiated by **${username || 'N/A'}** (ID: ${userID || 'N/A'}) on dashboard \`${dashboardId}\`.`;
            break;

        case 'client_error_log': // Client-side JS errors caught by the frontend
            webhookKey = 'USER_ERRORS';
            embedTitle = '⚠️ Client-Side Error Log';
            embedColor = 0xFF6347; // Tomato Red
            webhookContent = `A client-side JavaScript error occurred on dashboard \`${dashboardId}\`: ${data.error_message}.`;
            additionalFields.push(
                { name: 'Error Message', value: data.error_message, inline: false }
            );
            break;
        case 'clear_error_logs':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🧹 Client Error Logs Cleared';
            embedColor = 0x808080; // Grey
            webhookContent = `Client error logs cleared by ${username || 'N/A'} on dashboard \`${dashboardId}\`.`;
            break;
        case 'download_error_logs':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '📥 Client Error Logs Downloaded';
            embedColor = 0x6495ED; // Cornflower Blue
            webhookContent = `Client error logs downloaded by ${username || 'N/A'} from dashboard \`${dashboardId}\`.`;
            break;
        case 'clear_activity_logs':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🗑️ Client Activity Logs Cleared';
            embedColor = 0x808080;
            webhookContent = `Client activity logs cleared by ${username || 'N/A'} on dashboard \`${dashboardId}\`.`;
            break;
        case 'download_activity_logs':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '⬇️ Client Activity Logs Downloaded';
            embedColor = 0x6495ED;
            webhookContent = `Client activity logs downloaded by ${username || 'N/A'} from dashboard \`${dashboardId}\`.`;
            break;

        // --- General User Activity Events ---
        case 'dashboard_initialized':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🖥️ Dashboard Initialized';
            embedColor = 0x6495ED;
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
            webhookContent = `Panel \`${data.panel_id || 'N/A'}\` (Type: ${eventType}) by ${username || 'N/A'}.`;
            additionalFields.push(
                { name: 'Panel ID', value: data.panel_id || 'N/A', inline: true },
                { name: 'Action', value: eventType, inline: true }
            );
            break;
        case 'search_performed':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔍 Search Performed';
            embedColor = 0x6495ED;
            webhookContent = `User \`${username || 'N/A'}\` searched for: \`${data.query}\`.`;
            additionalFields.push({ name: 'Search Query', value: data.query, inline: false });
            break;
        case 'theme_toggle':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🎨 Theme Toggled';
            embedColor = 0x6495ED;
            webhookContent = `Theme toggled to \`${data.theme}\` by ${username || 'N/A'}.`;
            additionalFields.push({ name: 'New Theme', value: data.theme, inline: true });
            break;
        case 'accent_theme_change':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🌈 Accent Theme Changed';
            embedColor = 0x6495ED;
            webhookContent = `Accent theme changed to \`${data.theme}\` by ${username || 'N/A'}.`;
            additionalFields.push({ name: 'New Accent Theme', value: data.theme, inline: true });
            break;
        case 'setting_toggle':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '⚙️ Setting Toggled';
            embedColor = 0x6495ED;
            webhookContent = `Setting \`${data.setting_name}\` toggled to \`${data.active ? 'Active' : 'Inactive'}\` by ${username || 'N/A'}.`;
            additionalFields.push(
                { name: 'Setting Name', value: data.setting_name, inline: true },
                { name: 'Status', value: data.active ? 'Active' : 'Inactive', inline: true }
            );
            break;
        case 'mouse_click_increment':
        case 'mouse_click_reset':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🖱️ Mouse Clicker';
            embedColor = 0x6495ED;
            webhookContent = `Mouse clicker action: \`${eventType}\` by ${username || 'N/A'}. Count: ${data.count || 'N/A'}.`;
            additionalFields.push({ name: 'Action', value: eventType, inline: true });
            if (data.count !== undefined) additionalFields.push({ name: 'Current Count', value: `${data.count}`, inline: true });
            break;
        case 'stopwatch_start':
        case 'stopwatch_pause':
        case 'stopwatch_reset':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '⏱️ Stopwatch Control';
            embedColor = 0x6495ED;
            webhookContent = `Stopwatch \`${eventType}\` by ${username || 'N/A'}. Time: ${data.time || 'N/A'}.`;
            additionalFields.push({ name: 'Action', value: eventType, inline: true });
            if (data.time !== undefined) additionalFields.push({ name: 'Time', value: `${data.time}ms`, inline: true });
            break;
        case 'timer_start':
        case 'timer_pause':
        case 'timer_reset':
        case 'timer_complete':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '⏳ Timer Control';
            embedColor = 0x6495ED;
            webhookContent = `Timer \`${eventType}\` by ${username || 'N/A'}. Remaining: ${data.time_remaining || 'N/A'}.`;
            additionalFields.push({ name: 'Action', value: eventType, inline: true });
            if (data.initial_time !== undefined) additionalFields.push({ name: 'Initial Time', value: `${data.initial_time}s`, inline: true });
            if (data.time_remaining !== undefined) additionalFields.push({ name: 'Time Remaining', value: `${data.time_remaining}s`, inline: true });
            break;
        case 'reminder_set':
        case 'reminder_triggered':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔔 Reminder Event';
            embedColor = 0x6495ED;
            webhookContent = `Reminder \`${eventType}\`: "${data.text}" by ${username || 'N/A'}.`;
            additionalFields.push(
                { name: 'Action', value: eventType, inline: true },
                { name: 'Text', value: data.text, inline: false },
                { name: 'Time', value: new Date(data.time).toLocaleString(), inline: true }
            );
            break;
        case 'drawing_tool_select':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🎨 Drawing Tool Selection';
            embedColor = 0x6495ED;
            webhookContent = `Drawing tool changed to \`${data.tool}\` by ${username || 'N/A'}.`;
            additionalFields.push({ name: 'Tool', value: data.tool, inline: true });
            break;
        case 'drawing_color_change':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🎨 Drawing Color Changed';
            embedColor = 0x6495ED;
            webhookContent = `Drawing color changed to \`${data.color}\` by ${username || 'N/A'}.`;
            additionalFields.push({ name: 'New Color', value: data.color, inline: true });
            break;
        case 'drawing_thickness_change':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🎨 Drawing Thickness Changed';
            embedColor = 0x6495ED;
            webhookContent = `Drawing thickness changed to \`${data.thickness}\` by ${username || 'N/A'}.`;
            additionalFields.push({ name: 'New Thickness', value: `${data.thickness}px`, inline: true });
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
            additionalFields.push(
                { name: 'Expression', value: data.expression, inline: false },
                { name: 'Result', value: `${data.result}`, inline: true }
            );
            break;
        case 'calculator_error':
            webhookKey = 'USER_ERRORS';
            embedTitle = '🔢 Calculator Error';
            embedColor = 0xFF6347;
            webhookContent = `Calculator error for expression \`${data.expression}\` by ${username || 'N/A'}: ${data.error}.`;
            additionalFields.push(
                { name: 'Expression', value: data.expression, inline: false },
                { name: 'Error', value: data.error, inline: false }
            );
            break;
        case 'unit_converter_type_change':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔄 Unit Converter Type Change';
            embedColor = 0x6495ED;
            webhookContent = `Unit conversion type changed to \`${data.type}\` by ${username || 'N/A'}.`;
            additionalFields.push({ name: 'New Type', value: data.type, inline: true });
            break;
        case 'unit_converted':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔄 Units Converted';
            embedColor = 0x6495ED;
            webhookContent = `Units converted from \`${data.from_value} ${data.from_unit}\` to \`${data.result} ${data.to_unit}\` by ${username || 'N/A'}.`;
            additionalFields.push(
                { name: 'From Value', value: `${data.from_value}`, inline: true },
                { name: 'From Unit', value: data.from_unit, inline: true },
                { name: 'To Unit', value: data.to_unit, inline: true },
                { name: 'Result', value: `${data.result}`, inline: true }
            );
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
            additionalFields.push({ name: 'Visibility', value: data.visible ? 'Visible' : 'Hidden', inline: true });
            break;
        case 'add_important_date':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '⭐ Important Date Added';
            embedColor = 0x6495ED;
            webhookContent = `Important date "${data.event}" added for ${new Date(data.date).toLocaleString()} by ${username || 'N/A'}.`;
            additionalFields.push(
                { name: 'Event', value: data.event, inline: false },
                { name: 'Date', value: new Date(data.date).toLocaleString(), inline: true }
            );
            break;
        case 'clear_important_dates':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🗑️ Important Dates Cleared';
            embedColor = 0x808080;
            webhookContent = `All important dates cleared by ${username || 'N/A'}.`;
            break;
        case 'zoom_adjust':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔎 Zoom Adjusted';
            embedColor = 0x6495ED;
            webhookContent = `Zoom adjusted to \`${data.zoom_level * 100}%\` by ${username || 'N/A'}.`;
            additionalFields.push({ name: 'Zoom Level', value: `${data.zoom_level * 100}%`, inline: true });
            break;
        case 'password_visibility_toggle':
            webhookKey = 'USER_ACTIVITY';
            embedTitle = '🔒 Password Visibility Toggled';
            embedColor = 0x6495ED;
            webhookContent = `Password visibility toggled to \`${data.visible ? 'visible' : 'hidden'}\` by ${username || 'N/A'}.`;
            additionalFields.push({ name: 'Visibility', value: data.visible ? 'Visible' : 'Hidden', inline: true });
            break;

        default:
            webhookKey = 'BOT_LOGGING_INFORMATION'; // Fallback for any unhandled client events
            embedTitle = '❓ Unhandled Client Event';
            embedColor = 0x808080;
            webhookContent = `Received an unhandled client event \`${eventType}\` from dashboard \`${dashboardId}\`.`;
            additionalFields.push({ name: 'Raw Data', value: JSON.stringify(data, null, 2).substring(0, 1000), inline: false });
    }

    // Combine common fields and event-specific fields
    const finalFields = [...commonFields, ...additionalFields];

    // Send the constructed webhook using the utility function
    await sendWebhook(webhookKey, {
        content: webhookContent, // The primary message of the webhook
        username: 'Frontend Event Processor', // Custom webhook username
        avatar_url: 'https://i.imgur.com/4M34hih.png', // Custom avatar for the webhook
        embeds: [{
            title: embedTitle,
            description: `Event from Dashboard \`${dashboardId}\` for user \`${username || 'Guest'}\`.`,
            color: embedColor,
            fields: finalFields,
            timestamp: new Date().toISOString(),
            footer: {
                // Truncate User Agent to fit Discord embed footer limit (2048 chars total embed)
                text: `Client UA: ${browserInfo.userAgent.substring(0, Math.min(250, browserInfo.userAgent.length))}...`
            }
        }]
    });

    res.status(200).json({ status: 'success', message: 'Event logged successfully' });
});


// --- Existing API Endpoints for Frontend to Fetch Dynamic Content ---
// These endpoints allow the frontend to load initial application settings from the database.
router.get('/settings/welcome', async (req, res) => {
    try {
        const settings = await getWelcomeMessageSettings();
        res.json(settings);
    } catch (error) {
        logError('Error fetching welcome message settings from DB:', error);
        res.status(500).json({ error: 'Failed to retrieve welcome settings' });
    }
});

router.get('/settings/theme', async (req, res) => {
    try {
        const theme = await getThemeSetting();
        res.json({ theme });
    } catch (error) {
        logError('Error fetching theme setting from DB:', error);
        res.status(500).json({ error: 'Failed to retrieve theme' });
    }
});

router.get('/settings/features', async (req, res) => {
    try {
        const enabledFeatures = await getEnabledFeatures();
        res.json({ enabledFeatures });
    } catch (error) {
        logError('Error fetching enabled features from DB:', error);
        res.status(500).json({ error: 'Failed to retrieve features' });
    }
});

// NEW: Endpoint to get current announcement message
router.get('/settings/announcement', async (req, res) => {
    try {
        const announcement = await getAnnouncementMessage();
        res.json({ message: announcement });
    } catch (error) {
        logError('Error fetching announcement message from DB:', error);
        res.status(500).json({ error: 'Failed to retrieve announcement' });
    }
});

// --- Future Endpoints for User-Specific Data Persistence ---
// These would be used to save/load user-specific data (like activity logs, notes, click counts)
// from the PostgreSQL database, rather than client-side localStorage.
/*
router.post('/user/activity-logs', async (req, res) => {
    // Implement logic to save activity logs for a specific user to DB
    // Requires user authentication/session to identify the user
});
router.get('/user/activity-logs', async (req, res) => {
    // Implement logic to load activity logs for a specific user from DB
});
// ... similar endpoints for notes, important dates, click counts, user settings etc.
*/

module.exports = router;
