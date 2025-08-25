const winston = require('winston');
const path = require('path');
// const fs = require('fs'); // Commented out as fs is no longer needed for file creation

// Define log levels and their associated colors (for console output)
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'white'
};

winston.addColors(colors);

// Determine the log directory - COMMENTED OUT FOR RENDER DEPLOYMENT
// const logDir = path.join(__dirname, '../../logs'); // logs directory at the project root
// if (!fs.existsSync(logDir)) {
//     fs.mkdirSync(logDir);
// }

// Define the format for log messages
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Include stack trace for errors
    winston.format.splat(), // Allows for string interpolation (e.g., logger.info('User %s logged in', username))
    winston.format.printf(
        ({ level, message, timestamp, stack }) => {
            // If there's a stack, append it to the message
            if (stack) {
                return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
            }
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        }
    )
);

// Create the logger instance
const logger = winston.createLogger({
    levels: levels,
    format: logFormat,
    transports: [
        // Console Transport: Logs to the console with colorization
        new winston.transports.Console({
            level: 'debug', // Log debug and above to console
            format: winston.format.combine(
                winston.format.colorize({ all: true }), // Apply colors to the entire log line
                logFormat
            )
        }),
        // File Transports are COMMENTED OUT for Render deployment
        // new winston.transports.File({
        //     filename: path.join(logDir, 'combined.log'),
        //     level: 'info',
        //     maxsize: 5 * 1024 * 1024, // 5MB
        //     maxFiles: 5,
        //     tailable: true
        // }),
        // new winston.transports.File({
        //     filename: path.join(logDir, 'error.log'),
        //     level: 'error',
        //     maxsize: 5 * 1024 * 1024, // 5MB
        //     maxFiles: 5,
        //     tailable: true
        // })
    ],
    // Handle uncaught exceptions to prevent Node.js process from crashing
    // These are also changed to rely on console output instead of files.
    exceptionHandlers: [
        new winston.transports.Console({ // Log exceptions to console
            format: winston.format.combine(
                winston.format.colorize({ all: true }),
                logFormat
            )
        }),
        // new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }) // Commented out
    ],
    // Handle unhandled rejections (promises that reject without a catch block)
    rejectionHandlers: [
        new winston.transports.Console({ // Log rejections to console
            format: winston.format.combine(
                winston.format.colorize({ all: true }),
                logFormat
            )
        }),
        // new winston.transports.File({ filename: path.join(logDir, 'rejections.log') }) // Commented out
    ]
});

// Export the logger
module.exports = { logger };
