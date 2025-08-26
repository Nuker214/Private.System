// your-project-name/src/backend_core.js
const { info, warn, error, critical, sendBotLog, loggerConfig } = require('./utils/logging');
const { queryDatabase, getApplicationSetting, setApplicationSetting } = require('./db/database');
const { sendWebhook, buildEmbed, truncate } = require('./utils/webhook');
const { recordUptimeEvent, checkSslExpiry } = require('./services/monitoring_service');
const { getIo } = require('./socket_manager'); // For global Socket.IO emissions
const { getAnnouncementMessage, getThemeSetting, getWelcomeMessageSettings } = require('./services/app_settings_service'); // For pushing current settings

// --- Configuration and Constants for Scheduled Tasks ---
const TASK_CHECK_INTERVAL_MS = parseInt(process.env.TASK_CHECK_INTERVAL_MS || '15000'); // Check for tasks to run every 15 seconds
const MIN_TASK_INTERVAL_MS = 10000; // Minimum 10 seconds between runs for any task
const MAX_CONTEXT_LENGTH = 1500; // Max length for context data stored in DB/logs

// Default task definitions (these will be loaded from/synced with DB)
const DEFAULT_TASKS_CONFIG = [
    {
        name: 'session_cleanup',
        description: 'Cleans up expired user sessions from the database.',
        interval_ms: parseInt(process.env.TASK_SESSION_CLEANUP_INTERVAL || '3600000'), // 1 hour
        is_enabled: true
    },
    {
        name: 'ssl_expiry_check',
        description: 'Checks SSL certificate expiry for configured domains and alerts if nearing expiry.',
        interval_ms: parseInt(process.env.TASK_SSL_CHECK_INTERVAL || '86400000'), // 24 hours
        is_enabled: true,
        context_data: { domains: [process.env.APP_DOMAIN || 'your-app-name.onrender.com'] } // Domain(s) to check
    },
    {
        name: 'db_health_check',
        description: 'Performs a basic health check on the database connection and performance.',
        interval_ms: parseInt(process.env.TASK_DB_HEALTH_INTERVAL || '300000'), // 5 minutes
        is_enabled: true
    },
    {
        name: 'frontend_global_sync',
        description: 'Periodically pushes global settings (theme, announcement) to all connected dashboards.',
        interval_ms: parseInt(process.env.TASK_FRONTEND_SYNC_INTERVAL || '60000'), // 1 minute
        is_enabled: true
    },
    {
        name: 'simulate_disk_monitor',
        description: 'Simulates monitoring disk usage and sends alerts if low.',
        interval_ms: parseInt(process.env.TASK_DISK_MONITOR_INTERVAL || '1800000'), // 30 minutes
        is_enabled: true,
        context_data: { simulated_threshold: 0.15 } // 15% remaining is low
    },
    {
        name: 'simulate_cpu_memory_monitor',
        description: 'Simulates monitoring CPU/Memory usage and sends alerts if high.',
        interval_ms: parseInt(process.env.TASK_CPU_MEM_INTERVAL || '60000'), // 1 minute
        is_enabled: true,
        context_data: { simulated_cpu_threshold: 0.8, simulated_mem_threshold: 0.9 }
    },
    {
        name: 'archive_old_activity_logs',
        description: 'Archives (and potentially purges) old activity logs from the database.',
        interval_ms: parseInt(process.env.TASK_ARCHIVE_LOGS_INTERVAL || '604800000'), // 7 days
        is_enabled: false, // Disabled by default, enable if you implement archiving
        context_data: { days_to_keep: 30 }
    },
    {
        name: 'system_info_report',
        description: 'Generates a periodic system health report.',
        interval_ms: parseInt(process.env.TASK_SYSTEM_REPORT_INTERVAL || '86400000'), // 24 hours
        is_enabled: true
    }
];

// --- In-Memory State for Running Tasks ---
const runningTaskTimers = new Map(); // Map<task_name: string, timerId: NodeJS.Timeout>

/**
 * Initializes the `scheduled_tasks` table in the database if it doesn't exist.
 * This should be called once at application startup.
 */
async function ensureScheduledTasksTable() {
    try {
        await queryDatabase(`
            CREATE TABLE IF NOT EXISTS scheduled_tasks (
                id SERIAL PRIMARY KEY,
                task_name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                is_enabled BOOLEAN DEFAULT TRUE,
                interval_ms INTEGER, -- In milliseconds
                context_data JSONB, -- For task-specific configuration (e.g., domains to check)
                last_run_time TIMESTAMP WITH TIME ZONE,
                next_run_time TIMESTAMP WITH TIME ZONE,
                last_run_status VARCHAR(50), -- e.g., 'success', 'failed', 'skipped', 'running'
                last_error TEXT,
                last_run_duration_ms INTEGER,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        info('Ensured `scheduled_tasks` table exists.');

        // Insert default tasks if they don't exist
        for (const task of DEFAULT_TASKS_CONFIG) {
            await queryDatabase(`
                INSERT INTO scheduled_tasks (task_name, description, is_enabled, interval_ms, context_data)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (task_name) DO UPDATE SET
                    description = EXCLUDED.description,
                    is_enabled = EXCLUDED.is_enabled, -- Can update default enabled status if needed
                    interval_ms = EXCLUDED.interval_ms,
                    context_data = EXCLUDED.context_data,
                    updated_at = CURRENT_TIMESTAMP;
            `, [task.name, task.description, task.is_enabled, task.interval_ms, task.context_data || {}]);
        }
        info('Default scheduled tasks synchronized with database.');

    } catch (err) {
        critical('Failed to ensure `scheduled_tasks` table or synchronize defaults:', err, { component: 'BackendCore' });
        sendBotLog('ERROR_LOGGING_INFORMATION', `🚨 **BackendCore Init Error: Scheduled Tasks!**\n\`\`\`${err.message}\`\`\``);
        throw err; // Re-throw to indicate a critical startup failure
    }
}

/**
 * Retrieves all scheduled tasks from the database.
 * @returns {Promise<Array<object>>} An array of task configurations.
 */
async function getAllScheduledTasks() {
    try {
        const result = await queryDatabase('SELECT * FROM scheduled_tasks ORDER BY task_name');
        return result.rows;
    } catch (err) {
        error('Failed to retrieve scheduled tasks from database:', err, { component: 'BackendCore' });
        return [];
    }
}

/**
 * Updates a task's status and metadata in the database.
 * @param {string} taskName The name of the task.
 * @param {object} updates An object containing fields to update (e.g., last_run_time, last_run_status).
 */
async function updateTaskStatus(taskName, updates) {
    const fields = [];
    const values = [];
    let i = 1;

    for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
            fields.push(`${key} = $${i++}`);
            values.push(updates[key]);
        }
    }

    if (fields.length === 0) {
        return; // No updates to apply
    }

    values.push(taskName); // For the WHERE clause
    values.push(new Date()); // For updated_at

    try {
        await queryDatabase(`
            UPDATE scheduled_tasks
            SET ${fields.join(', ')}, updated_at = $${i++}
            WHERE task_name = $${i++};
        `, values);
        debug(`Updated status for task: ${taskName}`, { updates });
    } catch (err) {
        error(`Failed to update status for task '${taskName}':`, err, { updates, component: 'BackendCore' });
        sendBotLog('ERROR_LOGGING_INFORMATION', `⚠️ Failed to update DB status for task \`${taskName}\`: \`${err.message}\``);
    }
}

// --- Task Definitions (The actual work functions) ---

/**
 * Task: Cleans up expired user sessions.
 */
async function executeSessionCleanup() {
    const startTime = Date.now();
    info('Executing session cleanup task...', { component: 'SessionCleanup' });
    try {
        // Assume 'user_sessions' table exists with an 'expires_at' column
        const result = await queryDatabase('DELETE FROM user_sessions WHERE expires_at < NOW() RETURNING session_id');
        const cleanedCount = result.rowCount;
        info(`Session cleanup completed. Removed ${cleanedCount} expired sessions.`, { cleanedCount, component: 'SessionCleanup' });
        if (cleanedCount > 0) {
            sendBotLog('MONITORING_INFORMATION', `🧹 Session cleanup: Removed **${cleanedCount}** expired sessions.`);
            sendWebhook('LOGGING_INFORMATION', { content: `Scheduled task: ${cleanedCount} old sessions cleaned.` });
        }
        return { status: 'success', message: `Cleaned ${cleanedCount} sessions.`, duration_ms: Date.now() - startTime };
    } catch (err) {
        error('Session cleanup task failed:', err, { component: 'SessionCleanup' });
        return { status: 'failed', message: `Cleanup failed: ${err.message}`, error: err.message, duration_ms: Date.now() - startTime };
    }
}

/**
 * Task: Checks SSL certificate expiry for configured domains.
 */
async function executeSslExpiryCheck(domains) {
    const startTime = Date.now();
    info(`Executing SSL expiry check for domains: ${domains.join(', ')}...`, { component: 'SSLExpiryCheck' });
    const results = [];
    let successCount = 0;
    let failureCount = 0;

    for (const domain of domains) {
        try {
            const daysRemaining = await checkSslExpiry(domain); // Uses monitoring_service
            results.push({ domain, daysRemaining, status: 'success' });
            successCount++;
            if (daysRemaining <= 30) {
                warn(`SSL for ${domain} expires in ${daysRemaining} days!`, { domain, daysRemaining, component: 'SSLExpiryCheck' });
                // `checkSslExpiry` in monitoring_service already sends bot logs/webhooks
            }
        } catch (err) {
            error(`Failed to check SSL for ${domain}:`, err, { domain, component: 'SSLExpiryCheck' });
            results.push({ domain, status: 'failed', error: err.message });
            failureCount++;
            sendBotLog('ERROR_LOGGING_INFORMATION', `❌ SSL Check Failed for \`${domain}\`: \`${err.message}\``);
        }
    }
    info(`SSL expiry check completed. Success: ${successCount}, Failed: ${failureCount}.`, { results, component: 'SSLExpiryCheck' });
    return { status: failureCount === 0 ? 'success' : 'failed', message: `Checked ${domains.length} domains. Success: ${successCount}, Failed: ${failureCount}.`, details: results, duration_ms: Date.now() - startTime };
}

/**
 * Task: Performs a basic database health check.
 */
async function executeDbHealthCheck() {
    const startTime = Date.now();
    info('Executing database health check...', { component: 'DBHealthCheck' });
    try {
        await queryDatabase('SELECT 1'); // Simple query to check connection
        const tableCountResult = await queryDatabase("SELECT count(*) FROM pg_tables WHERE schemaname = 'public'");
        const tableCount = tableCountResult.rows[0].count;
        info(`Database health check successful. Connected, ${tableCount} tables found.`, { tableCount, component: 'DBHealthCheck' });
        sendBotLog('MONITORING_INFORMATION', `🟢 Database health check successful. ${tableCount} tables found.`);
        return { status: 'success', message: `DB connected, ${tableCount} tables.`, duration_ms: Date.now() - startTime };
    } catch (err) {
        critical('Database health check FAILED:', err, { component: 'DBHealthCheck' });
        sendBotLog('ERROR_LOGGING_INFORMATION', `🚨 **Database Health Check FAILED!**\n\`\`\`${err.message}\`\`\``);
        sendWebhook('ERROR_LOGGING_INFORMATION', {
            content: `🚨 Database Health Check FAILED!`,
            embeds: [buildEmbed({
                title: 'Database Critical Alert',
                description: `Connection or query failed: ${err.message}`,
                color: 0xFF0000,
                fields: [{ name: 'Stack', value: truncate(err.stack, 1024), inline: false }]
            })]
        });
        return { status: 'failed', message: `DB check failed: ${err.message}`, error: err.message, duration_ms: Date.now() - startTime };
    }
}

/**
 * Task: Periodically pushes global settings to all connected dashboards via Socket.IO.
 */
async function executeFrontendGlobalSync() {
    const startTime = Date.now();
    info('Executing frontend global sync...', { component: 'FrontendSync' });
    try {
        const io = getIo(); // Get the Socket.IO server instance
        if (!io) {
            warn('Socket.IO not initialized, skipping frontend global sync.', { component: 'FrontendSync' });
            return { status: 'skipped', message: 'Socket.IO not ready.', duration_ms: Date.now() - startTime };
        }

        const currentTheme = await getThemeSetting();
        const welcomeSettings = await getWelcomeMessageSettings();
        const announcementMessage = await getAnnouncementMessage();

        const connectedClients = io.engine.clientsCount;

        // Emit a general update event to all connected clients
        io.emit('dashboardUpdate', {
            type: 'globalSettingsSync',
            message: 'Global settings updated.',
            theme: currentTheme,
            welcome: welcomeSettings,
            announcement: announcementMessage
        });

        info(`Frontend global sync complete. Pushed updates to ${connectedClients} clients.`, { connectedClients, currentTheme, component: 'FrontendSync' });
        sendBotLog('BOT_LOGGING_INFORMATION', `🔄 Global settings pushed to **${connectedClients}** dashboards.`);
        return { status: 'success', message: `Synced with ${connectedClients} clients.`, duration_ms: Date.now() - startTime };
    } catch (err) {
        error('Frontend global sync task failed:', err, { component: 'FrontendSync' });
        return { status: 'failed', message: `Sync failed: ${err.message}`, error: err.message, duration_ms: Date.now() - startTime };
    }
}

/**
 * Task: Simulates disk usage monitoring.
 */
async function executeSimulateDiskMonitor(threshold) {
    const startTime = Date.now();
    info(`Simulating disk usage monitor with threshold ${threshold * 100}%...`, { component: 'DiskMonitor' });
    const simulatedDiskFree = Math.random() * 0.5 + 0.05; // 5% to 55% free
    const isLow = simulatedDiskFree < threshold;
    const message = isLow
        ? `🚨 CRITICAL: Disk space low! Only ${Math.round(simulatedDiskFree * 100)}% free.`
        : `Disk space OK: ${Math.round(simulatedDiskFree * 100)}% free.`;

    if (isLow) {
        critical(message, { free: simulatedDiskFree, threshold, component: 'DiskMonitor' });
        sendBotLog('ERROR_LOGGING_INFORMATION', `🚨 **${message}**`);
        sendWebhook('MONITORING_INFORMATION', {
            content: `🚨 Disk Space Alert: **${Math.round(simulatedDiskFree * 100)}% free**!`,
            embeds: [buildEmbed({
                title: 'Disk Space Critical Alert',
                description: message,
                color: 0xFF0000,
                fields: [{ name: 'Free Space', value: `${(simulatedDiskFree * 100).toFixed(2)}%`, inline: true }]
            })]
        });
    } else {
        info(message, { free: simulatedDiskFree, component: 'DiskMonitor' });
        // sendBotLog('MONITORING_INFORMATION', message); // Don't spam for OK status
    }
    return { status: isLow ? 'warning' : 'success', message, duration_ms: Date.now() - startTime };
}

/**
 * Task: Simulates CPU and Memory usage monitoring.
 */
async function executeSimulateCpuMemoryMonitor(cpuThreshold, memThreshold) {
    const startTime = Date.now();
    info(`Simulating CPU/Memory monitor (CPU > ${cpuThreshold * 100}%, Mem > ${memThreshold * 100}%)...`, { component: 'CpuMemMonitor' });

    const simulatedCpuUsage = Math.random() * 0.6 + 0.3; // 30% to 90%
    const simulatedMemUsage = Math.random() * 0.5 + 0.4; // 40% to 90%

    const isCpuHigh = simulatedCpuUsage > cpuThreshold;
    const isMemHigh = simulatedMemUsage > memThreshold;

    let status = 'success';
    let message = `CPU: ${Math.round(simulatedCpuUsage * 100)}%, Mem: ${Math.round(simulatedMemUsage * 100)}%. System OK.`;

    if (isCpuHigh || isMemHigh) {
        status = 'warning';
        message = `⚠️ ALERT: High usage detected! CPU: ${Math.round(simulatedCpuUsage * 100)}% (${isCpuHigh ? 'HIGH' : 'OK'}), Mem: ${Math.round(simulatedMemUsage * 100)}% (${isMemHigh ? 'HIGH' : 'OK'}).`;
        warn(message, { cpu: simulatedCpuUsage, mem: simulatedMemUsage, component: 'CpuMemMonitor' });
        sendBotLog('MONITORING_INFORMATION', `⚠️ **${message}**`);
        sendWebhook('MONITORING_INFORMATION', {
            content: `⚠️ High Usage Alert!`,
            embeds: [buildEmbed({
                title: 'System Usage Alert',
                description: message,
                color: 0xF1C40F, // Yellow
                fields: [
                    { name: 'CPU Usage', value: `${(simulatedCpuUsage * 100).toFixed(2)}%`, inline: true },
                    { name: 'Memory Usage', value: `${(simulatedMemUsage * 100).toFixed(2)}%`, inline: true }
                ]
            })]
        });
    } else {
        info(message, { cpu: simulatedCpuUsage, mem: simulatedMemUsage, component: 'CpuMemMonitor' });
    }
    return { status, message, duration_ms: Date.now() - startTime };
}

/**
 * Task: Archives (and potentially purges) old activity logs from the database.
 * !!! Placeholder: Actual implementation would involve complex DB operations. !!!
 */
async function executeArchiveOldActivityLogs(daysToKeep) {
    const startTime = Date.now();
    info(`Executing old activity logs archiving task (keeping ${daysToKeep} days)...`, { component: 'LogArchive' });
    try {
        // !!! Placeholder for actual archiving/purging logic !!!
        // Example: Move old logs to an archive table or delete them.
        // For now, simulate some action.
        const simulatedArchivedCount = Math.floor(Math.random() * 100);
        info(`Simulated archiving of ${simulatedArchivedCount} old activity log entries older than ${daysToKeep} days.`, { simulatedArchivedCount, daysToKeep, component: 'LogArchive' });
        sendBotLog('MONITORING_INFORMATION', `🗄️ Log Archive: Simulated archiving of **${simulatedArchivedCount}** entries older than ${daysToKeep} days.`);
        return { status: 'success', message: `Simulated archiving ${simulatedArchivedCount} entries.`, duration_ms: Date.now() - startTime };
    } catch (err) {
        error('Activity log archiving task failed:', err, { component: 'LogArchive' });
        return { status: 'failed', message: `Archiving failed: ${err.message}`, error: err.message, duration_ms: Date.now() - startTime };
    }
}

/**
 * Task: Generates and reports periodic system information.
 */
async function executeSystemInfoReport() {
    const startTime = Date.now();
    info('Generating system information report...', { component: 'SysInfoReport' });
    try {
        const os = require('node:os');
        const process = require('node:process');

        const uptimeSecs = process.uptime();
        const totalMemoryMB = Math.round(os.totalmem() / (1024 * 1024));
        const freeMemoryMB = Math.round(os.freemem() / (1024 * 1024));
        const usedMemoryPercentage = ((totalMemoryMB - freeMemoryMB) / totalMemoryMB * 100).toFixed(2);
        const cpuCount = os.cpus().length;
        const loadAvg = os.loadavg(); // [1min, 5min, 15min]

        const reportMessage = `System uptime: ${Math.round(uptimeSecs / 3600)}h ${Math.round((uptimeSecs % 3600) / 60)}m. Memory: ${usedMemoryPercentage}% used (${freeMemoryMB}/${totalMemoryMB}MB free). CPUs: ${cpuCount}. Load Avg (1/5/15min): ${loadAvg.map(n => n.toFixed(2)).join('/')}.`;

        info(reportMessage, { component: 'SysInfoReport' });
        sendBotLog('MONITORING_INFORMATION', `📝 **Daily System Report:** ${reportMessage}`);
        sendWebhook('MONITORING_INFORMATION', {
            content: `📝 Daily System Report for ${process.env.APP_NAME || 'Render Service'}`,
            embeds: [buildEmbed({
                title: 'Daily System Health Report',
                description: reportMessage,
                color: 0x3498DB,
                fields: [
                    { name: 'Process Uptime', value: `${Math.round(uptimeSecs)}s`, inline: true },
                    { name: 'Total Memory', value: `${totalMemoryMB}MB`, inline: true },
                    { name: 'Free Memory', value: `${freeMemoryMB}MB`, inline: true },
                    { name: 'Used Memory %', value: `${usedMemoryPercentage}%`, inline: true },
                    { name: 'CPU Cores', value: `${cpuCount}`, inline: true },
                    { name: 'Load Average (1m/5m/15m)', value: loadAvg.map(n => n.toFixed(2)).join('/'), inline: true },
                    { name: 'Node.js Version', value: process.version, inline: true },
                    { name: 'Platform', value: os.platform(), inline: true }
                ]
            })]
        });
        return { status: 'success', message: reportMessage, duration_ms: Date.now() - startTime };
    } catch (err) {
        error('System info report task failed:', err, { component: 'SysInfoReport' });
        return { status: 'failed', message: `Report failed: ${err.message}`, error: err.message, duration_ms: Date.now() - startTime };
    }
}

// --- Task Runner Mapping ---
const taskRunners = {
    'session_cleanup': executeSessionCleanup,
    'ssl_expiry_check': (task) => executeSslExpiryCheck(task.context_data?.domains || []),
    'db_health_check': executeDbHealthCheck,
    'frontend_global_sync': executeFrontendGlobalSync,
    'simulate_disk_monitor': (task) => executeSimulateDiskMonitor(task.context_data?.simulated_threshold || 0.15),
    'simulate_cpu_memory_monitor': (task) => executeSimulateCpuMemoryMonitor(task.context_data?.simulated_cpu_threshold || 0.8, task.context_data?.simulated_mem_threshold || 0.9),
    'archive_old_activity_logs': (task) => executeArchiveOldActivityLogs(task.context_data?.days_to_keep || 30),
    'system_info_report': executeSystemInfoReport
};

/**
 * Executes a single scheduled task and updates its status in the database.
 * @param {object} task The task configuration object from the database.
 */
async function runScheduledTask(task) {
    const taskName = task.task_name;
    const taskLoggerContext = { taskName, component: 'ScheduledTaskRunner' };
    info(`Starting scheduled task: ${taskName}`, taskLoggerContext);

    if (!taskRunners[taskName]) {
        error(`No runner defined for task: ${taskName}. Skipping.`, taskLoggerContext);
        await updateTaskStatus(taskName, {
            last_run_time: new Date(),
            last_run_status: 'skipped',
            last_error: `No runner function defined for '${taskName}'.`
        });
        sendBotLog('ERROR_LOGGING_INFORMATION', `❌ Task Runner Missing: \`${taskName}\` has no associated function.`);
        return;
    }

    let result = { status: 'failed', message: 'Unknown error', error: 'Unknown error', duration_ms: 0 };
    const runStart = Date.now();
    try {
        await updateTaskStatus(taskName, { last_run_status: 'running' }); // Mark as running

        // Call the task's runner function
        result = await taskRunners[taskName](task); // Pass task object if runner needs context_data
        
        info(`Finished task: ${taskName} with status '${result.status}'.`, { ...taskLoggerContext, ...result });
    } catch (err) {
        error(`Critical error during task '${taskName}' execution:`, err, taskLoggerContext);
        result = { status: 'failed', message: `Critical error: ${err.message}`, error: err.message, duration_ms: Date.now() - runStart };
        sendBotLog('ERROR_LOGGING_INFORMATION', `🚨 **Critical Task Failure: \`${taskName}\`**\n\`\`\`${err.message}\n${err.stack ? err.stack.substring(0, 1000) : 'No stack'}\`\`\``);
    } finally {
        // Update task status in DB
        await updateTaskStatus(taskName, {
            last_run_time: new Date(),
            last_run_status: result.status,
            last_error: result.error ? truncate(result.error, 2048) : null,
            last_run_duration_ms: result.duration_ms
        });
    }
}

/**
 * Checks for tasks that are due to run and executes them.
 */
async function checkForDueTasks() {
    debug('Checking for due scheduled tasks...', { component: 'Scheduler' });
    const tasks = await getAllScheduledTasks();
    const now = Date.now();

    for (const task of tasks) {
        if (!task.is_enabled) {
            debug(`Task '${task.task_name}' is disabled. Skipping.`, { component: 'Scheduler' });
            continue;
        }

        const interval = Math.max(task.interval_ms || DEFAULT_TASKS_CONFIG.find(t => t.name === task.task_name)?.interval_ms || MIN_TASK_INTERVAL_MS, MIN_TASK_INTERVAL_MS);
        const lastRunTime = task.last_run_time ? new Date(task.last_run_time).getTime() : 0;
        const nextExpectedRun = lastRunTime + interval;

        // Skip if task is already explicitly running or not yet due
        if (runningTaskTimers.has(task.task_name)) {
            debug(`Task '${task.task_name}' is already running. Skipping this check cycle.`, { component: 'Scheduler' });
            continue;
        }
        if (now < nextExpectedRun) {
            debug(`Task '${task.task_name}' not yet due. Next run in ${Math.round((nextExpectedRun - now) / 1000)}s.`, { component: 'Scheduler' });
            continue;
        }

        // Task is due! Add it to the running tasks map and execute.
        info(`Task '${task.task_name}' is due. Initiating execution.`, { component: 'Scheduler' });
        runningTaskTimers.set(task.task_name, true); // Mark as running
        runScheduledTask(task)
            .finally(() => {
                runningTaskTimers.delete(task.task_name); // Remove from running tasks when finished
            });
    }
}

let schedulerIntervalId = null;

/**
 * Starts the main scheduler loop.
 */
async function startScheduler() {
    info('Starting BackendCore scheduler...', { component: 'Scheduler' });
    await ensureScheduledTasksTable(); // Ensure DB table is ready and defaults exist
    // Run initial check immediately
    await checkForDueTasks();

    // Set up interval to periodically check for due tasks
    schedulerIntervalId = setInterval(checkForDueTasks, TASK_CHECK_INTERVAL_MS);
    sendBotLog('BOT_ONLINE_STATUS', `⚙️ BackendCore Scheduler started with check interval: \`${TASK_CHECK_INTERVAL_MS / 1000}s\`.`);
}

/**
 * Stops the main scheduler loop.
 */
function stopScheduler() {
    if (schedulerIntervalId) {
        clearInterval(schedulerIntervalId);
        schedulerIntervalId = null;
        info('BackendCore scheduler stopped.', { component: 'Scheduler' });
        sendBotLog('BOT_ONLINE_STATUS', `🛑 BackendCore Scheduler stopped.`);
    }
    // Clear any still-running task timers (if they were implemented with timers)
    // For this implementation, tasks run immediately when due, so no need to clear separate timers.
    runningTaskTimers.clear();
}

module.exports = {
    startScheduler,
    stopScheduler,
    getAllScheduledTasks, // Expose for admin/debugging purposes
    updateTaskStatus // Expose for admin/debugging purposes
};
