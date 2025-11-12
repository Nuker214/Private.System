require('dotenv').config(); // Ensure dotenv is loaded for local development if applicable
const Pusher = require('pusher');

let pusherInstance = null;

function getPusherInstance() {
    if (!pusherInstance) {
        if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_APP_KEY || !process.env.PUSHER_APP_SECRET || !process.env.PUSHER_APP_CLUSTER) {
            console.error('Pusher environment variables are not set. Real-time features will not work.');
            // Provide a mock Pusher for local dev without full env vars
            return {
                trigger: (channel, event, data) => console.log(`MOCK PUSHER: Triggered ${event} on ${channel} with`, data)
            };
        }
        pusherInstance = new Pusher({
            appId: process.env.PUSHER_APP_ID,
            key: process.env.PUSHER_APP_KEY,
            secret: process.env.PUSHER_APP_SECRET,
            cluster: process.env.PUSHER_APP_CLUSTER,
            useTLS: true,
        });
        console.log('Pusher initialized.');
    }
    return pusherInstance;
}

module.exports = getPusherInstance;
