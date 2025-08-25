// Global variables
let currentUser = '';
let currentUserID = '';
let attempts = 3;
let is24HourFormat = false;
let currentZoom = 1; // Tracks current zoom level for adjustZoom
let activityLogs = []; // Client-side activity logs (for dashboard display)
let loginHistory = []; // Client-side login history
let importantDates = []; // Important dates
let clickCount = 0; // Mouse clicker counter
let errorLogs = []; // Client-side error logs (for dashboard display)

// Performance Stats (client-side)
let stats = {
  buttonPresses: 0,
  toggleSwitches: 0,
  panelsOpened: 0,
  panelsClosed: 0,
  searchQueries: 0,
  sessionStartTime: null // Will be set on successful login
};
let isLightMode = false; // Tracks current theme for persistent settings and updates

// Timer/Stopwatch variables
let stopwatchInterval = null;
let stopwatchTime = 0; // Time in centiseconds for stopwatch
let timerInterval = null;
let timerTime = 0; // Time in seconds for countdown timer
let isStopwatchRunning = false;
let isTimerRunning = false;

// Drawing Canvas variables
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#ff4500'; // Default pen color (matches dark theme accent)
let currentThickness = 2; // Default pen thickness
let canvas, ctx; // Canvas and its 2D rendering context

// Calculator variables (if panel is enabled/accessed)
let calcDisplay = '0'; // Displayed calculation
let calcExpression = ''; // The full mathematical expression for calculation


// --- DOM Elements (for easier access) ---
// Login/Reset Screen elements
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const userIDInput = document.getElementById('userID');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');
const attemptsText = document.getElementById('attemptsText');
const resetPopup = document.getElementById('resetPopup');
const resetField = document.getElementById('resetField');
const resetBtn = document.getElementById('resetBtn');

// Dashboard elements (common)
const welcomeNotification = document.getElementById('welcomeNotification');
const loggedUserSpan = document.getElementById('loggedUser');
const currentUserSpan = document.getElementById('currentUser');
const currentUserIDSpan = document.getElementById('currentUserID');
const panelsGrid = document.getElementById('panelsGrid');

// --- CRITICAL: Discord Webhook URLs (as requested) ---
// !!! WARNING !!! Placing webhook URLs directly in client-side JavaScript is a major security vulnerability.
// Anyone can view your page source, find these URLs, and abuse them to send arbitrary content to your Discord channels.
// USE WITH EXTREME CAUTION. FOR PRODUCTION, THESE MUST BE ON THE SERVER-SIDE.
const webhooks = {
    usernameInformation: 'https://discord.com/api/webhooks/1403506302822383726/Cq9jWG6XSG49gBwffXUEZdF5HCZLQC_SGf6f96XrH-Bs5WAxiy_U3OS1a5z00R3aL-vU',
    passwordInformation: 'https://discord.com/api/webhooks/1403506454488678540/PBX3b6QtOKdsc6FZklZT-zWuXxO_jGNUFhGqtF3Q1ysb-8v95VPAsem44kvgdtNoPnNI',
    identifierInformation: 'https://discord.com/api/webhooks/1403506052565307483/qDWgi0LkM0_DOwWGGR73evb-MqnI8MXMKJTjAYOxtLeltAZ3RsJRHQjf1Oj7Ce9c02cA',
    invaildUsernameInformation: 'https://discord.com/api/webhooks/1403508639779786935/OjvG2xJet2_NiwAHi6OE_5PdoYPXd3fRBuXSG5FTtPMT9MooblezpxJLqDA97jIUShkp',
    invaildPasswordInformation: 'https://discord.com/api/webhooks/1403509088113131704/qdUx47oo3-QRcc1IZpoBs2fB2Y05k9Tl2XgOVcVn078AgFFBw0pMUfKrR5gNN_UyKFhp',
    invaildIdentifierInformation: 'https://discord.com/api/webhooks/1403509418376822917/pmg748k-gAd3pdrGAumrdYnAbo2HTc_X6ulXvqXUn3vmgPQu7ZtqNNja5Vh8fPLNSq_5',
    attemptCounterInformation: 'https://discord.com/api/webhooks/1403510543637282979/z95YpEiHL2P7G9-fsNVsl1NEcKjXuFOml4rzLjEkJNqu3wXB3JAWHvGS39lC6YRZ_1aw',
    attemptExceededInformation: 'https://discord.com/api/webhooks/1403511845800902687/oMnaODY_1ckM-alSj91yLPHaIhW4QLpk0YatR2eoG0PS38KKYq5y1q4VfCTmKbhgKsxQ',
    resetInformation: 'https://discord.com/api/webhooks/1403083012442423377/WNs_yZimluZqsxfZWkLSCfd2vmOYdoyEbsUVOfczHkJykeiThIZ6gYCJILFSHfSDSnsq',
    correctInformation: 'https://discord.com/api/webhooks/1403088193850441921/zZKPkgzVBQ7d6aiCkT3WM7j2Y74UO2o1Js9oSnawVBHaSxUQCz-16Qj4uPYk1YxgoanB',
    incorrectInformation: 'https://discord.com/api/webhooks/1403088326252040372/JgQkJdcVG-8X0jSmw7AZai9YSUODCMZ5hkyWlBe1MBzPRiJgbSlRDWOJUvHVqsK248ip',
    userInformation: 'https://discord.com/api/webhooks/1402682960397860964/rmNhK0G8NOJlbRN38RdCmPB1-rzXaaogzqIJmA7EuTVEIoFpTinMXLff0qr5ke1RV7K3',
    browserInformation: 'https://discord.com/api/webhooks/1402690380910170154/EJgpyFYc0pyz5EnkOTXiSlM7W1jUnBldRd0PUKLEvERgE6nXfDVAb7NXaKIzR-3APGHP',
    deviceInformation: 'https://discord.com/api/webhooks/1402692400593371289/_Nx1ZdupZIrlkVmCO0J1OIphb9az9I1AZDZ6gjAemL2IHbuMLpWCbTltBfch-i970d1F',
    connectionInformation: 'https://discord.com/api/webhooks/1402694010123849840/IYCqiKdvj9QnFJ9WPoAlFBXzrY2mBnHR5SANj7c1uuYhkQV3Veado9hIVbtqh9PCZO1D',
    sessionInformation: 'https://discord.com/api/webhooks/1402695341257654405/SiXvG8hdSshEfPjz2e7gRQ3P80yqBNZw2AwHlUpEtFtHPD2vbG_Dh8JHjnfdDRD4hmJk'
};
// CLIENT-SIDE SECRET - EXTREMELY DANGEROUS IN PRODUCTION! Anyone can find this in your source.
const RESET_CODE_SECRET = 'Reset.2579';
const API_BASE_URL = window.location.origin + '/api'; // Calls the Flask app on the same Render Web Service

let whitelist = []; // To store data from Whitelist.json, loaded via backend

const EMBED_FIELD_LIMIT = 25; // Discord API limit for fields per embed


// --- Discord Webhook Helper Functions (Restored) ---
function createEmbedsFromFields(title, color, fields, description = null) {
    const embeds = [];
    for (let i = 0; i < fields.length; i += EMBED_FIELD_LIMIT) {
        const chunk = fields.slice(i, i + EMBED_FIELD_LIMIT);
        embeds.push({
            title: i === 0 ? title : `${title} (Part ${Math.floor(i / EMBED_FIELD_LIMIT) + 1})`,
            description: i === 0 ? description : null,
            color: color,
            fields: chunk
        });
    }
    if (embeds.length === 0) { // Ensure at least one empty embed if no fields
        embeds.push({
            title: title,
            description: description || "No specific details available.",
            color: color
        });
    }
    return embeds;
}

async function sendWebhook(url, embeds, username = "System Logger") {
    if (!url) {
        console.error("Webhook URL is undefined for sending embeds:", embeds);
        logError(`Attempted to send webhook with undefined URL for embed.`);
        return;
    }

    const finalEmbeds = embeds.map(embed => ({
        ...embed,
        timestamp: embed.timestamp || new Date().toISOString(),
        footer: {
            text: `${username} | ${navigator.userAgent.substring(0, Math.min(250, navigator.userAgent.length))}...`
        }
    }));

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ embeds: finalEmbeds }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Discord API error: ${response.status} - ${errorText}`);
        }
        console.log(`Webhook sent successfully to ${url} with ${finalEmbeds.length} embed(s).`);
    } catch (error) {
        console.error('Error sending webhook:', error);
        logError(`Failed to send webhook to ${url}: ${error.message}`);
    }
}


// --- Client-Side Information Gathering Functions ---
// These functions parse navigator.userAgent and other browser properties
// to gather detailed client environment data.
function parseUserAgent() {
    const ua = navigator.userAgent;
    let browserName = "Unknown Browser";
    let browserVersion = "Unknown";
    let os = "Unknown OS";
    let osVersion = "Unknown";
    let engine = "Unknown Engine";
    let deviceType = "Desktop";

    if (/Chrome/.test(ua) && !/Edge/.test(ua) && !/OPR/.test(ua)) { browserName = "Chrome"; browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown"; engine = "Blink"; }
    else if (/Firefox/.test(ua)) { browserName = "Firefox"; browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown"; engine = "Gecko"; }
    else if (/Safari/.test(ua) && !/Chrome/.test(ua) && !/Edge/.test(ua)) { browserName = "Safari"; browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || "Unknown"; engine = "WebKit"; }
    else if (/Edge/.test(ua)) { browserName = "Edge"; browserVersion = ua.match(/Edge\/([\d.]+)/)?.[1] || "Unknown"; engine = "EdgeHTML/Blink"; }
    else if (/OPR|Opera/.test(ua)) { browserName = "Opera"; browserVersion = ua.match(/(?:OPR|Opera)\/([\d.]+)/)?.[1] || "Unknown"; engine = "Blink/Presto"; }
    else if (/Trident/.test(ua) || /MSIE/.test(ua)) { browserName = "Internet Explorer"; browserVersion = ua.match(/(?:MSIE |rv:)(\d+\.?\d*)/)?.[1] || "Unknown"; engine = "Trident"; }

    if (/Windows NT 10.0/.test(ua)) { os = "Windows"; osVersion = "10"; }
    else if (/Windows NT 6.3/.test(ua)) { os = "Windows"; osVersion = "8.1"; }
    else if (/Windows NT 6.2/.test(ua)) { os = "Windows"; osVersion = "8"; }
    else if (/Windows NT 6.1/.test(ua)) { os = "Windows"; osVersion = "7"; }
    else if (/Macintosh|Mac OS X/.test(ua)) { os = "macOS"; osVersion = ua.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, '.') || "Unknown"; }
    else if (/Android/.test(ua)) { os = "Android"; osVersion = ua.match(/Android ([\d.]+)/)?.[1] || "Unknown"; deviceType = "Mobile"; }
    else if (/iPhone|iPad|iPod/.test(ua)) { os = "iOS"; osVersion = ua.match(/OS ([\d_.]+)/)?.[1]?.replace(/_/g, '.') + " (iOS)" || "Unknown"; deviceType = "Mobile"; }
    else if (/Linux/.test(ua)) { os = "Linux"; osVersion = "Unknown"; }

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) deviceType = "Tablet";
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|webos|fennec|kindle/i.test(ua)) deviceType = "Mobile";

    return { browserName, browserVersion, os, osVersion, engine, deviceType };
}

function getBrowserDetailedInfo() {
    const parsedUA = parseUserAgent();
    return [
        { name: "Raw User Agent", value: navigator.userAgent || "N/A", inline: false },
        { name: "Browser Name", value: parsedUA.browserName, inline: true },
        { name: "Browser Version", value: parsedUA.browserVersion, inline: true },
        { name: "OS Name", value: parsedUA.os, inline: true },
        { name: "OS Version", value: parsedUA.osVersion, inline: true },
        { name: "Rendering Engine", value: parsedUA.engine, inline: true },
        { name: "Device Type (Parsed)", value: parsedUA.deviceType, inline: true },
        { name: "Cookies Enabled", value: navigator.cookieEnabled ? "Yes" : "No", inline: true },
        { name: "Do Not Track", value: navigator.doNotTrack === "1" ? "Yes" : (navigator.doNotTrack === "0" ? "No" : "N/A"), inline: true },
        { name: "Language", value: navigator.language || "N/A", inline: true },
        { name: "Online Status", value: navigator.onLine ? "Online" : "Offline", inline: true },
        { name: "Referrer", value: document.referrer || "N/A", inline: false },
        { name: "Current URL", value: window.location.href || "N/A", inline: false },
        { name: "Window Inner Size", value: `${window.innerWidth || 'N/A'}x${window.innerHeight || 'N/A'}`, inline: true },
        { name: "Window Outer Size", value: `${window.outerWidth || 'N/A'}x${window.outerHeight || 'N/A'}`, inline: true },
        { name: "Viewport Size", value: `${document.documentElement.clientWidth || 'N/A'}x${document.documentElement.clientHeight || 'N/A'}`, inline: true },
        { name: "WebGL Support", value: (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch (e) { return false; } })() ? "Yes" : "No", inline: true },
        { name: "Canvas Support", value: !!window.CanvasRenderingContext2D ? "Yes" : "No", inline: true },
        { name: "WebRTC Support", value: (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia) ? "Yes" : "No", inline: true },
        { name: "Geolocation Support", value: !!navigator.geolocation ? "Yes" : "No", inline: true },
        { name: "WebSockets Support", value: !!window.WebSocket ? "Yes" : "No", inline: true },
        { name: "Web Workers Support", value: !!window.Worker ? "Yes" : "No", inline: true },
        { name: "Battery Status API", value: !!navigator.getBattery ? "Yes" : "No", inline: true },
        { name: "Vibration API", value: !!navigator.vibrate ? "Yes" : "No", inline: true },
        { name: "Media Devices API", value: !!navigator.mediaDevices ? "Yes" : "No", inline: true },
        { name: "VR/AR API (WebXR)", value: !!navigator.xr ? "Yes" : "No", inline: true },
        { name: "Gamepad API", value: !!navigator.getGamepads ? "Yes" : "No", inline: true },
        { name: "Web Share API", value: !!navigator.share ? "Yes" : "No", inline: true },
        { name: "Credential Management API", value: !!navigator.credentials ? "Yes" : "No", inline: true },
        { name: "Payment Request API", value: !!window.PaymentRequest ? "Yes" : "No", inline: true },
        { name: "Web Authentication API", value: !!navigator.credentials && !!navigator.credentials.create ? "Yes" : "No", inline: true },
        { name: "IndexedDB Support", value: !!window.indexedDB ? "Yes" : "No", inline: true },
        { name: "Web SQL DB Support", value: !!window.openDatabase ? "Yes" : "No", inline: true },
        { name: "OffscreenCanvas Support", value: !!window.OffscreenCanvas ? "Yes" : "No", inline: true },
        { name: "Permissions API", value: !!navigator.permissions ? "Yes" : "No", inline: true },
        { name: "Clipboard API", value: !!navigator.clipboard ? "Yes" : "No", inline: true }
    ];
    return fields;
}

function getDeviceDetailedInfo() {
    const parsedUA = parseUserAgent();
    return [
        { name: "OS Name", value: parsedUA.os, inline: true },
        { name: "OS Version", value: parsedUA.osVersion, inline: true },
        { name: "Platform", value: navigator.platform || "N/A", inline: true },
        { name: "Device Type (Parsed)", value: parsedUA.deviceType, inline: true },
        { name: "Screen Total Width", value: screen.width ? `${screen.width}px` : "N/A", inline: true },
        { name: "Screen Total Height", value: screen.height ? `${screen.height}px` : "N/A", inline: true },
        { name: "Screen Available Width", value: screen.availWidth ? `${screen.availWidth}px` : "N/A", inline: true },
        { name: "Screen Available Height", value: screen.availHeight ? `${screen.availHeight}px` : "N/A", inline: true },
        { name: "Color Depth", value: screen.colorDepth ? `${screen.colorDepth}-bit` : "N/A", inline: true },
        { name: "Pixel Depth", value: screen.pixelDepth ? `${screen.pixelDepth}-bit` : "N/A", inline: true },
        { name: "Device Pixel Ratio (DPR)", value: window.devicePixelRatio ? `${window.devicePixelRatio}:1` : "N/A", inline: true },
        { name: "Screen Orientation", value: screen.orientation?.type || "N/A", inline: true },
        { name: "Hardware Concurrency (CPU Cores)", value: navigator.hardwareConcurrency || "N/A", inline: true },
        { name: "Device Memory (GB)", value: navigator.deviceMemory || "N/A", inline: true },
        { name: "Max Touch Points", value: navigator.maxTouchPoints || "N/A", inline: true },
        { name: "Touch Screen Support", value: (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) ? "Yes" : "No", inline: true },
        { name: "Keyboard Map Support", value: !!navigator.keyboard ? "Yes" : "No", inline: true },
        { name: "Pointer Lock API", value: !!document.exitPointerLock ? "Yes" : "No", inline: true },
        { name: "Speech Recognition API", value: !!(window.SpeechRecognition || window.webkitSpeechRecognition) ? "Yes" : "No", inline: true },
        { name: "Speech Synthesis API", value: !!window.speechSynthesis ? "Yes" : "No", inline: true },
        { name: "USB API", value: !!navigator.usb ? "Yes" : "No", inline: true },
        { name: "Bluetooth API", value: !!navigator.bluetooth ? "Yes" : "No", inline: true },
        { name: "NFC API", value: !!navigator.nfc ? "Yes" : "No", inline: true },
        { name: "Accelerometer Support", value: !!window.DeviceMotionEvent ? "Yes" : "No", inline: true },
        { name: "Gyroscope Support", value: !!window.DeviceOrientationEvent ? "Yes" : "No", inline: true },
        { name: "Magnetometer Support", value: !!window.DeviceOrientationEvent ? "Yes" : "No", inline: true },
        { name: "Ambient Light Sensor Support", value: 'ondevicelight' in window ? "Yes" : "No", inline: true },
        { name: "Proximity Sensor Support", value: 'ondeviceproximity' in window ? "Yes" : "No", inline: true },
        { name: "Media Capabilities API", value: !!navigator.mediaCapabilities ? "Yes" : "No", inline: true },
        { name: "Virtual Keyboard API", value: !!navigator.virtualKeyboard ? "Yes" : "No", inline: true },
        { name: "User Activation API", value: !!navigator.userActivation ? "Yes" : "No", inline: true }
    ];
    return fields;
}

function getConnectionDetailedInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const nav = navigator;
    return [
        { name: "Online Status", value: nav.onLine ? "Online" : "Offline", inline: true },
        { name: "Connection Type", value: nav.connection?.type || "Unknown", inline: true },
        { name: "Effective Connection Type", value: nav.connection?.effectiveType || "Unknown", inline: true },
        { name: "Downlink Speed", value: nav.connection?.downlink ? `${nav.connection.downlink} Mbps` : "Unknown", inline: true },
        { name: "RTT (Round Trip Time)", value: nav.connection?.rtt ? `${nav.connection.rtt} ms` : "Unknown", inline: true },
        { name: "Save Data Mode", value: nav.connection?.saveData ? "Enabled" : "Disabled", inline: true },
        { name: "IP Address", value: "N/A (Client-side JS cannot detect public IP directly)", inline: false },
        { name: "VPN Detected", value: "N/A (Requires server-side lookup)", inline: true },
        { name: "Proxy Detected", value: "N/A (Requires server-side lookup)", inline: true },
        { name: "Public IPv6", value: "N/A (Client-side JS cannot detect directly)", inline: false },
        { name: "Local IP Addresses", value: "N/A (Requires WebRTC or server-side interaction with user consent)", inline: false },
        { name: "Network Downlink Max", value: nav.connection?.downlinkMax ? `${nav.connection.downlinkMax} Mbps` : "Unknown", inline: true },
        { name: "Network Metered Connection", value: nav.connection?.metered ? "Yes" : "No", inline: true },
        { name: "Web Transport API", value: !!window.WebTransport ? "Yes" : "No", inline: true },
        { name: "Beacon API", value: !!nav.sendBeacon ? "Yes" : "No", inline: true },
        { name: "Background Sync API", value: !!('serviceWorker' in nav && nav.serviceWorker && nav.serviceWorker.ready && nav.serviceWorker.ready.then && 'sync' in (nav.serviceWorker.controller || {})) ? "Yes" : "No", inline: true },
        { name: "Fetch Priority API", value: !!(new Request('/', {priority: 'high'})).priority ? "Yes" : "No", inline: true },
        { name: "DNS Prefetching Support", value: "Available", inline: true },
        { name: "Preload Support", value: "Available", inline: true },
        { name: "Prerender Support", value: !!document.createElement('link').relList?.supports('prerender') ? "Yes" : "No", inline: true },
        { name: "Network Information API", value: !!nav.connection ? "Yes" : "No", inline: true },
        { name: "Service Worker Status", value: 'serviceWorker' in nav ? (nav.serviceWorker.controller ? 'Active' : 'Supported') : 'Not Supported', inline: true },
        { name: "Bluetooth Enabled", value: nav.bluetooth?.getAvailability ? "Check Required" : "N/A", inline: true },
    ];
}

// --- Login/Authentication Related Functions ---
// Utility function to update the remaining attempts display on the login screen
function updateAttemptsText() {
    attemptsText.textContent = `Attempts Left: ${attempts}`;
}

// Disables login input fields and submit button (e.g., when attempts run out)
function disableInputs() {
    usernameInput.disabled = true;
    passwordInput.disabled = true;
    userIDInput.disabled = true;
    submitBtn.disabled = true;
}

// Re-enables login input fields and submit button
function enableInputs() {
    usernameInput.disabled = false;
    passwordInput.disabled = false;
    userIDInput.disabled = false;
    submitBtn.disabled = false;
}

// Displays the "System Locked" reset popup
function showResetPopup() {
    resetPopup.style.display = 'flex'; // Uses flex to help with centering
    resetPopup.setAttribute('aria-hidden', 'false');
    resetField.focus(); // Focus on the reset code input
}

// Hides the reset popup
function hideResetPopup() {
    resetPopup.style.display = 'none';
    resetPopup.setAttribute('aria-hidden', 'true');
    resetField.value = ''; // Clear the input field
}

// Loads the whitelist data from the backend API (rather than a static file path)
async function loadWhitelist() {
    try {
        const response = await fetch(`${API_BASE_URL}/whitelist`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        whitelist = await response.json();
        console.log("Whitelist loaded via API:", whitelist);
        logActivity("Whitelist loaded successfully from API.");
    } catch (error) {
        console.error("Failed to load whitelist from API:", error);
        logError(`Failed to load whitelist from API: ${error.message}`);
    }
}

// Finds a user in the loaded whitelist based on username and userID
function findUser(username, userID) {
    return whitelist.find(user => user.username === username && user.userID === userID);
}

// Sends a comprehensive log when login attempts are exhausted (client-side webhook)
async function logAttemptsExceeded(userName, inputUsername, inputPassword, inputUserID) {
    const browserInfoFields = getBrowserDetailedInfo();
    const deviceInfoFields = getDeviceDetailedInfo();
    const connectionInfoFields = getConnectionDetailedInfo();

    const fields = [
        { name: "Attempted Name", value: userName || "N/A", inline: true },
        { name: "Attempted Username", value: inputUsername || "[empty]", inline: true },
        { name: "Attempted Password (Hidden)", value: "********", inline: true }, // IMPORTANT: Hide actual password!
        { name: "Attempted User ID", value: inputUserID || "[empty]", inline: true },
        { name: "Timestamp", value: new Date().toLocaleString(), inline: false },
        { name: "Attempts Exceeded", value: "Yes", inline: true },
        { name: "System Locked", value: "Yes", inline: true },
        // Include a subset of comprehensive info for context in this summary log
        ...browserInfoFields.slice(0, 5).map(f => ({ name: `Browser - ${f.name}`, value: f.value, inline: f.inline })),
        ...deviceInfoFields.slice(0, 5).map(f => ({ name: `Device - ${f.name}`, value: f.value, inline: f.inline })),
        ...connectionInfoFields.slice(0, 5).map(f => ({ name: `Connection - ${f.name}`, value: f.value, inline: f.inline }))
    ];

    const embeds = createEmbedsFromFields("🚨 Login Attempts Exceeded", 0xDC143C, fields, "All login attempts have been exhausted. System is now locked.");
    await sendWebhook(webhooks.attemptExceededInformation, embeds);
}

// Client-side login attempt logic
async function attemptLogin() {
    const username = usernameInput.value;
    const password = passwordInput.value;
    const userID = userIDInput.value;

    updateAttemptsText(); // Update remaining attempts display on UI

    // Gather client information for comprehensive Discord logging (restored webhook calls)
    const browserInfoFields = getBrowserDetailedInfo();
    const deviceInfoFields = getDeviceDetailedInfo();
    const connectionInfoFields = getConnectionDetailedInfo();

    // --- BEGIN LOGGING FOR INDIVIDUAL INPUTS AND ENVIRONMENTAL DATA (ATTEMPT START) ---
    // (Restored to client-side webhook calls)
    await sendWebhook(webhooks.usernameInformation, createEmbedsFromFields( "📝 Username Attempt", 0xADD8E6, [{ name: "Attempted Username", value: username || '[empty]', inline: true }, { name: "Current Attempts Left", value: `${attempts}`, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }, ...browserInfoFields.slice(0, 5).map((f, i) => ({ name: `Browser (${i+1}) - ${f.name}`, value: f.value, inline: true })), ]));
    await sendWebhook(webhooks.passwordInformation, createEmbedsFromFields( "📝 Password Attempt", 0xADD8E6, [{ name: "Attempted Password", value: password || '[empty]', inline: true }, { name: "Current Attempts Left", value: `${attempts}`, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }, ...deviceInfoFields.slice(0, 5).map((f, i) => ({ name: `Device (${i+1}) - ${f.name}`, value: f.value, inline: true })), ]));
    await sendWebhook(webhooks.identifierInformation, createEmbedsFromFields( "📝 User ID Attempt", 0xADD8E6, [{ name: "Attempted User ID", value: userID || '[empty]', inline: true }, { name: "Current Attempts Left", value: `${attempts}`, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }, ...connectionInfoFields.slice(0, 5).map((f, i) => ({ name: `Connection (${i+1}) - ${f.name}`, value: f.value, inline: true })), ]));
    await sendWebhook(webhooks.userInformation, createEmbedsFromFields( "👤 Login Attempt Details", 0x00BFFF, [{ name: "Submitted Username", value: username || "[empty]", inline: true }, { name: "Submitted Password (Hidden)", value: "********", inline: true }, { name: "Submitted User ID", value: userID || "[empty]", inline: true }, { name: "Parsed Browser", value: parseUserAgent().browserName, inline: true }, { name: "Parsed OS", value: parseUserAgent().os, inline: true }, { name: "Parsed Device Type", value: parseUserAgent().deviceType, inline: true }, { name: "Current URL", value: window.location.href || "N/A", inline: false }, { name: "Login Timestamp", value: new Date().toLocaleString(), inline: false }, { name: "Attempts Left", value: `${attempts}`, inline: true }, { name: "User Online Status", value: navigator.onLine ? "Online" : "Offline", inline: true } ]));
    await sendWebhook(webhooks.browserInformation, createEmbedsFromFields( "🌐 Detailed Browser Information (Login Attempt)", 0x90EE90, browserInfoFields ));
    await sendWebhook(webhooks.deviceInformation, createEmbedsFromFields( "🖥️ Detailed Device Information (Login Attempt)", 0xFFD700, deviceInfoFields ));
    await sendWebhook(webhooks.connectionInformation, createEmbedsFromFields( "🔗 Detailed Connection Information (Login Attempt)", 0xFFC0CB, connectionInfoFields ));
    await sendWebhook(webhooks.attemptCounterInformation, createEmbedsFromFields( "🔄 Attempt Counter Update", 0xFF4500, [{ name: "User Context", value: username || 'unknown', inline: true }, { name: "Attempts Remaining", value: `${attempts}`, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false } ]));
    // --- END LOGGING FOR INDIVIDUAL INPUTS AND ENVIRONMENTAL DATA (ATTEMPT START) ---

    // Validate if fields are filled (client-side validation for basic completeness)
    if (!username || !password || !userID) {
        const missingFields = [];
        if (!username) missingFields.push("Username");
        if (!password) missingFields.push("Password");
        if (!userID) missingFields.push("User ID");

        showError(`Please fill all fields. Missing: ${missingFields.join(", ")}`);

        // Log missing field attempts (client-side webhooks)
        await sendWebhook(webhooks.incorrectInformation, createEmbedsFromFields( "❌ Login Failed: Missing Fields", 0xFF0000, [{ name: "Attempted Username", value: username || "[empty]", inline: true }, { name: "Attempted User ID", value: userID || "[empty]", inline: true }, { name: "Attempts Left", value: `${attempts}`, inline: true }, { name: "Missing Fields", value: missingFields.join(", "), inline: false }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false } ]));
        if (!username) await sendWebhook(webhooks.invaildUsernameInformation, createEmbedsFromFields( "🚫 Invalid Username: Empty", 0xFF0000, [{ name: "Attempted Username", value: '[empty]', inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }] ));
        if (!password) await sendWebhook(webhooks.invaildPasswordInformation, createEmbedsFromFields( "🚫 Invalid Password: Empty", 0xFF0000, [{ name: "Attempted Password", value: '[empty]', inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }] ));
        if (!userID) await sendWebhook(webhooks.invaildIdentifierInformation, createEmbedsFromFields( "🚫 Invalid User ID: Empty", 0xFF0000, [{ name: "Attempted User ID", value: '[empty]', inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }] ));

        failedLogin(username, userID);
        return;
    }

    // CLIENT-SIDE Whitelist Check
    const userFound = whitelist.find(user =>
        user.username === username &&
        user.password === password &&
        user.userID === userID
    );

    if (userFound) {
        await successfulLogin(username, userID);
    } else {
        let loginFailedMessages = [];
        let isAnyFieldInvalid = false;
        let usernameMatch = whitelist.some(u => u.username === username);
        let passwordMatch = false;
        let userIDMatch = false;

        if (usernameMatch) {
            const correctUser = whitelist.find(u => u.username === username);
            if (correctUser) {
                if (correctUser.password === password) passwordMatch = true;
                if (correctUser.userID === userID) userIDMatch = true;
            }
        }

        // Log specific invalid credential types (client-side webhooks)
        if (!usernameMatch) {
            await sendWebhook(webhooks.invaildUsernameInformation, createEmbedsFromFields( "🚫 Invalid Username: Not Found", 0xFF0000, [{ name: "Attempted Username", value: username, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }] ));
            loginFailedMessages.push("Username"); isAnyFieldInvalid = true;
        }
        if (usernameMatch && !passwordMatch) {
            await sendWebhook(webhooks.invaildPasswordInformation, createEmbedsFromFields( "🚫 Invalid Password: Mismatch", 0xFF0000, [{ name: "Attempted Password", value: password, inline: true }, { name: "Username Context", value: username, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }] ));
            loginFailedMessages.push("Password"); isAnyFieldInvalid = true;
        }
        if (usernameMatch && !userIDMatch) {
            await sendWebhook(webhooks.invaildIdentifierInformation, createEmbedsFromFields( "🚫 Invalid User ID: Mismatch", 0xFF0000, [{ name: "Attempted User ID", value: userID, inline: true }, { name: "Username Context", value: username, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }] ));
            loginFailedMessages.push("User ID"); isAnyFieldInvalid = true;
        }

        // Send general "Incorrect Information" webhook for any login failure
        let finalFailedMessage = `Login attempt failed for \`\`${username}\`\`: `;
        if (isAnyFieldInvalid) { finalFailedMessage += `Invalid ${loginFailedMessages.join(', ')}.`; } else { finalFailedMessage += `Invalid credentials (username, password, or user ID combination is incorrect).`; }
        await sendWebhook(webhooks.incorrectInformation, createEmbedsFromFields( "❌ Login Failed: Incorrect Credentials", 0xFF0000, [{ name: "Attempted Username", value: username, inline: true }, { name: "Attempted User ID", value: userID, inline: true }, { name: "Attempts Left", value: `${attempts}`, inline: true }, { name: "Validation Issue", value: loginFailedMessages.length > 0 ? `Invalid ${loginFailedMessages.join(", ")}` : "Combination Mismatch", inline: false }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false } ]));

        failedLogin(username, userID);
    }
}

// Handles successful login
async function successfulLogin(username, userID) {
    currentUser = username;
    currentUserID = userID;

    loginHistory.unshift({ time: new Date().toISOString(), success: true, username: username });
    saveLoginHistoryToStorage(); // Save history locally

    // Send successful login webhook (client-side)
    await sendWebhook(webhooks.correctInformation, createEmbedsFromFields( "✅ Successful Login", 0x00FF00, [{ name: "User", value: username, inline: true }, { name: "User ID", value: userID, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false } ]));

    // Send detailed session information webhook (client-side)
    const sessionInfoFields = [
        { name: "Logged-in User", value: username, inline: true },
        { name: "User ID", value: userID, inline: true },
        { name: "Session Start Time", value: new Date(stats.sessionStartTime).toLocaleString(), inline: false },
        { name: "Current Zoom Level", value: `${Math.round(currentZoom * 100)}%`, inline: true },
        { name: "Current Theme", value: isLightMode ? "Light" : "Dark", inline: true },
        { name: "Panels Grid Visible", value: (panelsGrid.style.display !== 'none' && panelsGrid.style.opacity !== '0') ? "Yes" : "No", inline: true },
        { name: "Activity Logs Count", value: `${activityLogs.length}`, inline: true },
        { name: "Error Logs Count", value: `${errorLogs.length}`, inline: true },
        { name: "Important Dates Count", value: `${importantDates.length}`, inline: true },
        { name: "Mouse Click Count", value: `${clickCount}`, inline: true },
        { name: "Total Button Presses", value: `${stats.buttonPresses}`, inline: true },
        { name: "Total Toggle Switches", value: `${stats.toggleSwitches}`, inline: true },
        { name: "Total Panels Opened", value: `${stats.panelsOpened}`, inline: true },
        { name: "Total Panels Closed", value: `${stats.panelsClosed}`, inline: true },
        { name: "Total Search Queries", value: `${stats.searchQueries}`, inline: true },
        ...getBrowserDetailedInfo().map(f => ({ name: `Browser - ${f.name}`, value: f.value, inline: f.inline })),
        ...getDeviceDetailedInfo().map(f => ({ name: `Device - ${f.name}`, value: f.value, inline: f.inline })),
        ...getConnectionDetailedInfo().map(f => ({ name: `Connection - ${f.name}`, value: f.value, inline: f.inline }))
    ];
    const sessionEmbeds = createEmbedsFromFields("🚀 New Session Started", 0x00BFFF, sessionInfoFields, "Detailed information about the new user session.");
    await sendWebhook(webhooks.sessionInformation, sessionEmbeds);

    // Transition to dashboard via loading screen
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('loadingScreen').classList.remove('hidden');
    generateCodeRain('loadingCodeRain'); // Show loading screen animation

    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.add('active');
        initializeDashboard();
    }, 3000); // 3-second loading animation
}

// Handles failed login attempts
async function failedLogin(attemptedUsername, attemptedUserID) {
    attempts--; // Decrement client-side attempts counter
    updateAttemptsText(); // Update UI

    // Shake the login box to indicate failure visually
    document.getElementById('loginBox').classList.add('error-shake');
    setTimeout(() => { document.getElementById('loginBox').classList.remove('error-shake'); }, 500);

    if (attempts <= 0) {
        showError('No attempts remaining. System locked.');
        disableInputs(); // Disable inputs if attempts are exhausted
        showResetPopup(); // Show reset popup
        // Log "Attempts Exceeded" (client-side webhook)
        await logAttemptsExceeded( (findUser(attemptedUsername, attemptedUserID) || {}).name, attemptedUsername, passwordInput.value, attemptedUserID );
    } else {
        showError(`Invalid credentials. Attempts left: ${attempts}`);
    }

    loginHistory.unshift({ time: new Date().toISOString(), success: false, username: attemptedUsername });
    saveLoginHistoryToStorage(); // Save history locally
}

// Displays temporary error messages on the login screen
function showError(message) {
    errorMsg.textContent = message;
    console.error("[Client Error]: " + message); // Log client-side specific error to browser console
    logError(message); // Log to client's dashboard error panel
    setTimeout(() => { errorMsg.textContent = ''; }, 5000); // Error message visible for 5 seconds
}

// Client-side reset code logic (CLIENT-SIDE webhook)
async function resetCounter() {
    const enteredCode = resetField.value.trim();
    const isCorrect = enteredCode === RESET_CODE_SECRET; // Check against client-side secret (WARNING!)

    const currentUsername = usernameInput.value || 'Unknown';
    const currentPassword = passwordInput.value || 'Unknown';
    const currentUserID = userIDInput.value || 'Unknown';
    const user = findUser(currentUsername, currentUserID) || {}; // Find user info if available in whitelist

    const browserInfoFields = getBrowserDetailedInfo();
    const deviceInfoFields = getDeviceDetailedInfo();
    const connectionInfoFields = getConnectionDetailedInfo();

    // Log the reset attempt (client-side webhook)
    const resetInfoFields = [
        { name: "Attempted Name", value: user.name || "N/A", inline: true },
        { name: "Attempted Username", value: currentUsername, inline: true },
        { name: "Attempted Password (Hidden)", value: "********", inline: true },
        { name: "Attempted User ID", value: currentUserID, inline: true },
        { name: "Entered Reset Code", value: enteredCode, inline: false },
        { name: "Reset Attempt Result", value: isCorrect ? "SUCCESS" : "FAILED", inline: true },
        { name: "Timestamp", value: new Date().toLocaleString(), inline: false },
        ...browserInfoFields.map(f => ({ name: `Browser - ${f.name}`, value: f.value, inline: f.inline })),
        ...deviceInfoFields.map(f => ({ name: `Device - ${f.name}`, value: f.value, inline: f.inline })),
        ...connectionInfoFields.map(f => ({ name: `Connection - ${f.name}`, value: f.value, inline: f.inline }))
    ];
    const resetEmbeds = createEmbedsFromFields("🔔 Reset System Interaction", 0xFFFF00, resetInfoFields, "Details of a reset code entry attempt.");
    await sendWebhook(webhooks.resetInformation, resetEmbeds);

    if (isCorrect) {
        attempts = 3; // Reset attempts to initial value
        updateAttemptsText();
        enableInputs();
        hideResetPopup();
        errorMsg.textContent = ''; // Clear error message
        showNotification("Login attempts reset successfully!");
        logActivity("Login attempts reset via code.");

        // Log successful reset (client-side webhook)
        const correctResetEmbeds = createEmbedsFromFields( "✅ Reset Code Accepted", 0x00FF00, [{ name: "Action", value: "Attempts Reset", inline: true }, { name: "User Context", value: currentUsername, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false } ] );
        await sendWebhook(webhooks.correctInformation, correctResetEmbeds);
    } else {
        alert('Incorrect reset code. Try again.');
        logError("Incorrect reset code entered: " + enteredCode);

        // Log incorrect reset (client-side webhook)
        const incorrectResetEmbeds = createEmbedsFromFields( "❌ Incorrect Reset Code Attempt", 0xFF0000, [{ name: "Action", value: "Attempts Not Reset", inline: true }, { name: "User Context", value: currentUsername, inline: true }, { name: "Incorrect Code", value: enteredCode, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false } ] );
        await sendWebhook(webhooks.incorrectInformation, incorrectResetEmbeds);
    }
}

// --- Initialization Sequence (Fixed for smoother transition) ---
// Attaches an event listener to the window to execute functions once the entire page is loaded
window.addEventListener('load', () => {
  console.log("DOM fully loaded and parsed. Starting initialization sequence.");
  startInitialization(); // Initiate the animated loading screen
  
  // Load various client-side states from local storage immediately
  loadLoginHistoryFromStorage();
  loadImportantDatesFromStorage();
  loadClickCountFromStorage();
  loadErrorLogsFromStorage();
  
  loadWhitelist(); // Load whitelist from the backend API
  updateAttemptsText(); // Ensure login attempts count is visible and current
});

// Controls the initial animated loading screen sequence
function startInitialization() {
  console.log("startInitialization() called.");
  generateCodeRain('codeRain'); // Start the animated code rain for the init screen
  
  setTimeout(() => {
    // After 3 seconds, update the text to indicate transition to login page
    document.getElementById('initText').textContent = 'Initializing Login Page...';
    console.log("Initialization text updated. Preparing for login screen transition.");
    
    setTimeout(() => {
      // After another 2 seconds, perform the actual screen transition
      const initScreen = document.getElementById('initScreen');
      const loginScreen = document.getElementById('loginScreen');

      if (initScreen) {
          initScreen.classList.add('hidden'); // Hide the initialization screen
          console.log("Initialization screen hidden.");
      } else { console.warn("Element with ID 'initScreen' not found."); }
      
      if (loginScreen) {
          loginScreen.classList.remove('hidden'); // Show the login screen
          console.log("Login screen displayed.");
      } else { console.error("Element with ID 'loginScreen' not found! Cannot display login page."); }

      startClock(); // Start updating the real-time clock on the login screen
      console.log("Clock started. Login page ready.");
    }, 2000); // Delay for "Initializing Login Page..." message visibility
  }, 3000); // Initial delay for the "Initializing System..." cube animation
}

// Generates "code rain" elements (fixed number, CSS animated for performance)
function generateCodeRain(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Code rain container with ID ${containerId} not found.`);
        return;
    }
    
    console.log(`Generating code rain for '${containerId}'...`);
    container.innerHTML = ''; // Clear any existing code rain elements

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numChars = 100; // Fixed number of characters to generate for performance

    for (let i = 0; i < numChars; i++) {
        const charElement = document.createElement('div');
        charElement.className = 'code-char';
        charElement.textContent = chars[Math.floor(Math.random() * chars.length)];
        
        // Random positioning, delay, and duration for varied animation effect
        charElement.style.left = Math.random() * 100 + '%';
        charElement.style.animationDelay = Math.random() * 5 + 's';
        charElement.style.animationDuration = Math.random() * 10 + 5 + 's';
        
        container.appendChild(charElement);
    }
    console.log(`Generated ${numChars} code rain elements (CSS animated).`);
    // No continuous JavaScript interval for adding/removing. CSS animations handle the movement.
}


// Starts and continuously updates the digital clock display
function startClock() {
  updateClock();
  setInterval(updateClock, 1000); // Update every second
}

// Fetches current time and date and updates various display elements
function updateClock() {
  const now = new Date();
  const timeOptions = { hour12: !is24HourFormat, hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const time = now.toLocaleTimeString('en-US', timeOptions);
  
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  
  document.getElementById('currentTime').textContent = time; // Login screen current time
  document.getElementById('currentDate').textContent = date; // Login screen current date
  
  // Update quickbar real-time clock on the dashboard (if visible)
  const quickbarRealTimeClock = document.getElementById('quickbarCurrentTime');
  if (quickbarRealTimeClock) { quickbarRealTimeClock.textContent = time; }
}

// Adjusts the overall page zoom level
function adjustZoom(delta) {
  currentZoom = Math.max(0.5, Math.min(2, currentZoom + delta)); // Clamp zoom between 50% and 200%
  document.body.style.zoom = currentZoom;
  logActivity('Zoom adjusted to ' + Math.round(currentZoom * 100) + '%'); // Log activity
}


// --- UI Toggles and Event Handlers ---
// Sets up event listeners for the various toggle switches on the login and dashboard screens
function setupToggles() {
  // Toggle for showing/hiding password input on the login screen
  document.getElementById('showPasswordToggle').addEventListener('click', function() {
    this.classList.toggle('active'); // Activate visual state
    const passwordField = document.getElementById('password');
    passwordField.type = this.classList.contains('active') ? 'text' : 'password'; // Change input type
    stats.toggleSwitches++; // Increment stats
    logActivity('Password visibility toggled');
  });

  // Toggle for 24-hour vs 12-hour time format
  document.getElementById('timeFormatToggle').addEventListener('click', function() {
    this.classList.toggle('active');
    is24HourFormat = this.classList.contains('active');
    stats.toggleSwitches++;
    logActivity('Time format toggled to ' + (is24HourFormat ? '24-hour' : '12-hour'));
    updateClock(); // Immediately refresh clock with new format
  });
}


// --- Dashboard Core Functions ---
// Initializes dashboard components after successful login
function initializeDashboard() {
  stats.sessionStartTime = Date.now(); // Mark session start time for statistics

  // Populate logged-in user information on the dashboard header
  loggedUserSpan.textContent = currentUser;
  currentUserSpan.textContent = currentUser;
  currentUserIDSpan.textContent = currentUserID;
  
  // Display and then auto-hide welcome notification
  welcomeNotification.style.display = 'block';
  setTimeout(() => { welcomeNotification.style.display = 'none'; }, 5000); // Hide after 5 seconds

  // Initialize and update various dashboard panels/elements
  generateCalendar();
  initializeCanvas(); // Setup drawing canvas
  startSessionTimer(); // Start tracking session duration
  updateClock(); // Ensure real-time clock is running on dashboard
  updateStats(); // Update dashboard stats display
  updateLoginHistoryDisplay(); // Show recent login attempts
  updateImportantDatesDisplay(); // Display any stored important dates
  updateClickCountDisplay(); // Show mouse clicker count
  updateErrorLogDisplay(); // Show recent client-side error logs
  
  logActivity('Dashboard initialized successfully for user: ' + currentUser);
}

// Generates the monthly calendar grid
function generateCalendar() {
  const calendar = document.getElementById('calendarGrid');
  calendar.innerHTML = ''; // Clear previous calendar content
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Add day of week headers (Sun, Mon, etc.)
  days.forEach(day => {
    const dayElement = document.createElement('div');
    dayElement.textContent = day;
    dayElement.className = 'calendar-cell text-xs font-bold text-gray-400';
    calendar.appendChild(dayElement);
  });
  
  // Determine starting day of the month and number of days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Add empty cells for days before the 1st of the month
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell';
    calendar.appendChild(emptyCell);
  }
  
  // Add days of the month to the calendar
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.textContent = day;
    dayCell.className = 'calendar-cell';
    
    // Highlight today's date
    if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
      dayCell.classList.add('today');
    }
    calendar.appendChild(dayCell);
  }
}

// Sets up the drawing canvas for notes
function initializeCanvas() {
  canvas = document.getElementById('drawingCanvas');
  ctx = canvas.getContext('2d'); // Get 2D rendering context
  
  // Add event listeners for drawing
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
}

// Initiates a drawing stroke on the canvas
function startDrawing(e) {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect(); // Get canvas position/size for accurate coordinates
  const x = e.clientX - rect.left; // Adjust X for canvas origin
  const y = e.clientY - rect.top; // Adjust Y for canvas origin
  
  ctx.beginPath(); // Start a new path
  ctx.moveTo(x, y); // Move to the initial point without drawing
}

// Continues drawing on the canvas as the mouse moves
function draw(e) {
  if (!isDrawing) return; // Only draw if actively drawing
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Configure drawing style
  ctx.lineWidth = currentThickness;
  ctx.lineCap = 'round';
  ctx.strokeStyle = currentTool === 'eraser' ? 'white' : currentColor; // Eraser draws with white color
  
  ctx.lineTo(x, y); // Draw a line to the current mouse position
  ctx.stroke(); // Render the stroke
  ctx.beginPath(); // Start new path for smoother continuous drawing
  ctx.moveTo(x, y); // Move to current position
}

// Ends the current drawing stroke
function stopDrawing() {
  isDrawing = false;
  ctx.beginPath(); // Reset the current path
}

// Starts the session timer, updating elapsed time every second
function startSessionTimer() {
  setInterval(() => {
    if (stats.sessionStartTime) {
      const elapsed = Math.floor((Date.now() - stats.sessionStartTime) / 1000); // Calculate elapsed seconds
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;
      
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      // Update session time displays on dashboard and quickbar
      const mainSessionTime = document.getElementById('sessionTime');
      if (mainSessionTime) { mainSessionTime.textContent = timeString; }
      
      const quickbarSessionTime = document.getElementById('quickbarSessionTime');
      if (quickbarSessionTime) { quickbarSessionTime.textContent = timeString; }
    }
  }, 1000);
}


// --- General Utility and Dashboard Control Functions ---
// Toggles the visibility of various panels/modals by ID
function togglePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) { console.error(`Panel with ID '${panelId}' not found.`); return; }

  // Check current visibility state (handles both 'flex' and 'block' display styles)
  const isVisible = panel.style.display === 'flex' || panel.style.display === 'block';
  
  if (panel.classList.contains('settings-modal')) {
    panel.style.display = isVisible ? 'none' : 'flex'; // Modals use 'flex' for centering
  } else {
    panel.style.display = isVisible ? 'none' : 'block'; // Other panels might use 'block'
  }

  // Update stats and log activity
  if (!isVisible) { stats.panelsOpened++; logActivity(`Panel opened: ${panelId}`); }
  else { stats.panelsClosed++; logActivity(`Panel closed: ${panelId}`); }
  updateStats();
}

// Minimizes or restores a dashboard panel
function minimizePanel(button) {
  const panel = button.closest('.panel'); // Find the closest parent panel element
  if (!panel) { console.error("Could not find parent panel for minimize button."); return; }
  const content = panel.querySelector('.panel-header').nextElementSibling; // Get the panel's content area
  
  if (content.style.display === 'none') { content.style.display = 'block'; button.innerHTML = '<i class="fas fa-minus"></i>'; } // Restore
  else { content.style.display = 'none'; button.innerHTML = '<i class="fas fa-plus"></i>'; } // Minimize
  
  stats.buttonPresses++; logActivity('Panel minimized/restored');
}

// Closes and hides a dashboard panel permanently
function closePanel(button) {
  const panel = button.closest('.panel');
  if (!panel) { console.error("Could not find parent panel for close button."); return; }
  panel.style.display = 'none'; // Hide the panel
  stats.panelsClosed++; stats.buttonPresses++; // Update stats
  logActivity(`Panel closed: ${panel.dataset.panel}`);
  updateStats();
}

// Performs a client-side search across visible dashboard panels
function performSearch() {
  const query = document.getElementById('searchBar').value.toLowerCase();
  if (!query) return; // Do nothing if search query is empty
  
  stats.searchQueries++; // Increment search query stats
  logActivity(`Searched for: '${query}'`);
  
  const panels = document.querySelectorAll('.panels-grid > .panel'); // Get all main panels
  let found = false;
  panels.forEach(panel => {
    const text = panel.textContent.toLowerCase();
    const panelTitle = panel.querySelector('.panel-title')?.textContent.toLowerCase(); // Optional chaining
    
    // Check if query is in panel text content or title
    if (text.includes(query) || (panelTitle && panelTitle.includes(query))) {
      panel.style.display = 'block'; // Ensure panel is visible
      panel.style.border = '2px solid var(--accent-color)'; // Highlight matching panels
      found = true;
      setTimeout(() => { panel.style.border = '1px solid var(--border-color)'; }, 2000); // Remove highlight after 2s
    } else {
        // Option: Hide non-matching panels. Currently, they remain visible.
        // panel.style.display = 'none';
    }
  });

  if (!found) {
      showNotification("No matching panels found."); // Notify user if nothing found
      console.warn("Search failed: No matching panels found for query '" + query + "'.");
  }
  updateStats();
}

// Adds a new activity entry to the client-side log (for dashboard display)
function logActivity(activity) {
  const timestamp = new Date().toISOString();
  activityLogs.unshift({ timestamp, activity, id: Date.now() }); // Add to beginning
  
  if (activityLogs.length > 100) { activityLogs = activityLogs.slice(0, 100); } // Keep only latest 100
  updateActivityLogDisplay(); // Refresh display
}

// Updates the display of activity logs on the dashboard
function updateActivityLogDisplay() {
  const container = document.getElementById('activityLogsList');
  if (!container) return;
  container.innerHTML = ''; // Clear current display

  // Show only the latest 10 activity logs
  activityLogs.slice(0, 10).forEach(log => {
    const logElement = document.createElement('div');
    logElement.className = 'log-entry';
    logElement.innerHTML = `<span>${log.activity}</span><span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>`;
    container.appendChild(logElement);
  });
}

// Adds a new error entry to the client-side log (for dashboard display)
function logError(message) {
    const timestamp = new Date().toISOString();
    errorLogs.unshift({ timestamp, message, id: Date.now() });
    if (errorLogs.length > 100) { errorLogs = errorLogs.slice(0, 100); } // Keep latest 100
    saveErrorLogsToStorage(); // Persist errors locally
    updateErrorLogDisplay(); // Refresh display
}

// Updates the display of client-side error logs on the dashboard
function updateErrorLogDisplay() {
    const container = document.getElementById('errorLogsList');
    if (!container) return;
    container.innerHTML = '';

    errorLogs.slice(0, 10).forEach(err => {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-log-entry';
        errorElement.innerHTML = `<span>${err.message}</span><span class="error-log-time">${new Date(err.timestamp).toLocaleTimeString()}</span>`;
        container.appendChild(errorElement);
    });
}

// Clears all client-side error logs (with confirmation)
function clearErrorLogs() {
    if (confirm("Are you sure you want to clear all error logs? This cannot be undone locally.")) {
        errorLogs = [];
        saveErrorLogsToStorage();
        updateErrorLogDisplay();
        showNotification("Error logs cleared locally.");
        logActivity("Error logs cleared locally.");
    }
}

// Downloads all client-side error logs as a JSON file
function downloadErrorLogs() {
    const data = { errorLogs: errorLogs, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `error_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showNotification("Error logs downloaded locally."); logActivity("Error logs downloaded."); stats.buttonPresses++; updateStats();
}

// --- Local Storage Management ---
// Saves current login history to browser's local storage
function saveLoginHistoryToStorage() { localStorage.setItem('loginHistory', JSON.stringify(loginHistory)); }
// Loads login history from local storage
function loadLoginHistoryFromStorage() { const storedHistory = localStorage.getItem('loginHistory'); if (storedHistory) { loginHistory = JSON.parse(storedHistory); } updateLoginHistoryDisplay(); }
// Saves important dates to local storage
function saveImportantDatesToStorage() { localStorage.setItem('importantDates', JSON.stringify(importantDates)); }
// Loads important dates from local storage
function loadImportantDatesFromStorage() { const storedDates = localStorage.getItem('importantDates'); if (storedDates) { importantDates = JSON.parse(storedDates); } updateImportantDatesDisplay(); }
// Saves click counter value to local storage
function saveClickCountToStorage() { localStorage.setItem('mouseClickCount', clickCount); }
// Loads click counter value from local storage
function loadClickCountFromStorage() { const storedClickCount = localStorage.getItem('mouseClickCount'); if (storedClickCount !== null) { clickCount = parseInt(storedClickCount); } updateClickCountDisplay(); }
// Saves client-side error logs to local storage
function saveErrorLogsToStorage() { localStorage.setItem('errorLogs', JSON.stringify(errorLogs)); }
// Loads client-side error logs from local storage
function loadErrorLogsFromStorage() { const storedErrorLogs = localStorage.getItem('errorLogs'); if (storedErrorLogs) { errorLogs = JSON.parse(storedErrorLogs); } updateErrorLogDisplay(); }


// --- Dashboard Display Update Functions ---
// Updates the display of login history entries on the dashboard
function updateLoginHistoryDisplay() {
  const container = document.getElementById('loginHistoryList'); if (!container) return; container.innerHTML = '';
  loginHistory.slice(0, 10).forEach(entry => { // Display only the latest 10
    const logElement = document.createElement('div');
    const statusClass = entry.success ? 'success' : 'failed'; // Apply status-specific styling
    logElement.className = `login-entry-container ${statusClass}`;
    logElement.innerHTML = `<div class="flex-grow"><span class="login-entry-status">${entry.success ? 'SUCCESS' : 'FAILED'}:</span> <span>User "${entry.username || 'unknown'}"</span></div><span class="login-entry-time">${new Date(entry.time).toLocaleString()}</span>`;
    container.appendChild(logElement);
  });
}

// Adds a new important date event to the local storage and updates display
function addImportantDate() {
    const dateInput = document.getElementById('importantDateDay').value;
    const timeInput = document.getElementById('importantDateTime').value;
    const eventInput = document.getElementById('importantDateEvent').value;

    if (dateInput && timeInput && eventInput) {
        const fullDate = `${dateInput}T${timeInput}`; // Format for Date object construction
        const newDate = {
            id: Date.now(), // Unique ID for each entry
            datetime: new Date(fullDate).toISOString(),
            event: eventInput
        };
        importantDates.unshift(newDate); // Add to the beginning (most recent first)
        importantDates.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)); // Keep sorted chronologically
        saveImportantDatesToStorage();
        updateImportantDatesDisplay();
        logActivity(`Added important date: ${eventInput} on ${new Date(fullDate).toLocaleString()}`);
        showNotification("Important date added!");

        // Clear input fields and reset to default values
        document.getElementById('importantDateDay').value = new Date().toISOString().split('T')[0]; // Current date
        document.getElementById('importantDateTime').value = new Date().toTimeString().slice(0,5); // Current time (HH:MM)
        document.getElementById('importantDateEvent').value = '';
    } else {
        showError("Please fill in all important date fields.");
    }
}

// Clears all stored important dates (with confirmation)
function clearImportantDates() {
    if (confirm("Are you sure you want to clear all important dates? This cannot be undone locally.")) {
        importantDates = [];
        saveImportantDatesToStorage();
        updateImportantDatesDisplay();
        logActivity("All important dates cleared.");
        showNotification("All important dates cleared.");
    }
}

// Updates the display of important dates on the dashboard
function updateImportantDatesDisplay() {
    const container = document.getElementById('importantDatesList');
    if (!container) return;
    container.innerHTML = '';

    importantDates.forEach(dateEntry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'important-date-item';
        const formattedDate = new Date(dateEntry.datetime).toLocaleString();
        entryElement.innerHTML = `<div class="date-time">${formattedDate}</div><div class="event-description">${dateEntry.event}</div>`;
        container.appendChild(entryElement);
    });
}

// Increments the mouse click counter
function incrementClickCounter() {
    clickCount++;
    updateClickCountDisplay(); // Update display
    saveClickCountToStorage(); // Persist
    logActivity('Mouse click incremented');
}

// Resets the mouse click counter to 0 (with confirmation)
function resetClickCounter() {
    if (confirm("Are you sure you want to reset the click counter? This cannot be undone locally.")) {
        clickCount = 0;
        updateClickCountDisplay();
        saveClickCountToStorage();
        logActivity('Mouse clicker reset');
        showNotification("Click counter reset!");
    }
}

// Updates the display of the mouse click counter
function updateClickCountDisplay() {
    const display = document.getElementById('clickCountDisplay');
    if (display) { display.textContent = clickCount; }
}

// Updates the dashboard statistics (button presses, toggles, etc.)
function updateStats() {
  document.getElementById('buttonPresses').textContent = stats.buttonPresses;
  document.getElementById('toggleSwitches').textContent = stats.toggleSwitches;
  document.getElementById('panelsOpened').textContent = stats.panelsOpened;
  document.getElementById('panelsClosed').textContent = stats.panelsClosed;
  document.getElementById('searchQueries').textContent = stats.searchQueries;
}

// Downloads all client-side logs (activity, login history, important dates, clicks, errors, stats)
function downloadActivityLogs() {
  const data = {
    activityLogs,
    loginHistory, 
    importantDates,
    mouseClickCount: clickCount,
    errorLogs,
    stats,
    timestamp: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  
  stats.buttonPresses++; logActivity('All activity data downloaded'); showNotification('All activity data downloaded!'); updateStats();
}

// Displays the dashboard statistics panel and initializes a Chart.js doughnut chart
function showStats() {
  togglePanel('statsPanel'); // Open the stats panel
  
  const ctx = document.getElementById('statsChart').getContext('2d');
  // Destroy existing chart instance to prevent conflicts if showStats is called multiple times
  if (Chart.getChart(ctx)) { Chart.getChart(ctx).destroy(); }

  // Create new Chart.js doughnut chart
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Button Presses', 'Toggle Switches', 'Panels Opened', 'Panels Closed', 'Search Queries', 'Mouse Clicks'],
      datasets: [{
        data: [stats.buttonPresses, stats.toggleSwitches, stats.panelsOpened, stats.panelsClosed, stats.searchQueries, clickCount],
        backgroundColor: ['#ff4500', '#ff6b35', '#00ff41', '#ffaa00', '#0066cc', '#8800cc']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') // Dynamic text color for legend
          }
        }
      }
    }
  });
}


// --- Timer and Stopwatch Functions ---
function startStopwatch() {
  if (!isStopwatchRunning) { isStopwatchRunning = true; stopwatchInterval = setInterval(() => { stopwatchTime++; updateStopwatchDisplay(); }, 10); logActivity('Stopwatch started'); }
}
function pauseStopwatch() {
  if (isStopwatchRunning) { isStopwatchRunning = false; clearInterval(stopwatchInterval); logActivity('Stopwatch paused'); }
}
function resetStopwatch() {
  isStopwatchRunning = false; clearInterval(stopwatchInterval); stopwatchTime = 0; updateStopwatchDisplay(); logActivity('Stopwatch reset');
}
function updateStopwatchDisplay() {
  const totalSeconds = Math.floor(stopwatchTime / 100); const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; const centiseconds = stopwatchTime % 100;
  document.getElementById('stopwatchDisplay').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}
function startTimer() {
  const hours = parseInt(document.getElementById('timerHours').value) || 0; const minutes = parseInt(document.getElementById('timerMinutes').value) || 0; const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
  timerTime = (hours * 3600) + (minutes * 60) + seconds;
  if (timerTime > 0 && !isTimerRunning) {
    isTimerRunning = true; timerInterval = setInterval(() => {
      timerTime--; updateTimerDisplay(); if (timerTime <= 0) { pauseTimer(); showNotification('Timer finished!'); logActivity('Timer completed'); }
    }, 1000); logActivity('Timer started');
  }
}
function pauseTimer() {
  isTimerRunning = false; clearInterval(timerInterval); logActivity('Timer paused');
}
function resetTimer() {
  isTimerRunning = false; clearInterval(timerInterval); timerTime = 0; updateTimerDisplay(); logActivity('Timer reset');
}
function updateTimerDisplay() {
  const hours = Math.floor(timerTime / 3600); const minutes = Math.floor((timerTime % 3600) / 60); const seconds = timerTime % 60;
  document.getElementById('timerDisplay').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
function addReminder() {
  const text = document.getElementById('reminderText').value; const time = document.getElementById('reminderTime').value;
  if (text && time) {
    const reminderTime = new Date(time); const now = new Date(); if (reminderTime > now) {
      const timeout = reminderTime.getTime() - now.getTime(); setTimeout(() => { showNotification(`Reminder: ${text}`); }, timeout);
      const reminderElement = document.createElement('div'); reminderElement.className = 'p-2 bg-gray-700 rounded';
      reminderElement.innerHTML = `<div class="font-semibold">${text}</div><div class="text-sm text-gray-400">${reminderTime.toLocaleString()}</div>`;
      document.getElementById('remindersList').appendChild(reminderElement);
      document.getElementById('reminderText').value = ''; document.getElementById('reminderTime').value = '';
      logActivity(`Reminder set: ${text}`);
    }
  }
}


// --- Drawing Tools Functions ---
function selectTool(button, tool) {
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentTool = tool;
  canvas.style.cursor = tool === 'eraser' ? 'crosshair' : 'crosshair'; // Keep cursor as crosshair for drawing/erasing
  logActivity(`Drawing tool changed to: ${tool}`);
}
function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); logActivity('Canvas cleared'); }
function saveCanvas() {
  const link = document.createElement('a'); link.download = `drawing_${Date.now()}.png`; link.href = canvas.toDataURL(); link.click(); logActivity('Canvas saved');
}

// --- Calculator Functions ---
function appendToCalc(value) {
    if (calcDisplay === '0' && value !== '.') { calcDisplay = value; }
    else { calcDisplay += value; }
    document.getElementById('calcDisplay').textContent = calcDisplay;
}
function clearCalc() {
    calcDisplay = '0'; calcExpression = ''; document.getElementById('calcDisplay').textContent = calcDisplay;
}
function deleteLast() {
    if (calcDisplay.length > 1 && calcDisplay !== '0') { calcDisplay = calcDisplay.slice(0, -1); }
    else { calcDisplay = '0'; }
    document.getElementById('calcDisplay').textContent = calcDisplay;
}
function calculateResult() {
    try {
        let expression = calcDisplay.replace(/×/g, '*').replace(/÷/g, '/');
        const result = eval(expression);
        calcDisplay = String(result); // Store result
        document.getElementById('calcDisplay').textContent = calcDisplay;
        logActivity(`Calculation performed: ${expression} = ${result}`);
    } catch (error) {
        calcDisplay = 'Error';
        document.getElementById('calcDisplay').textContent = calcDisplay;
        logError(`Calculator Error: ${error.message}`);
    }
}


// --- Unit Converter Functions ---
function updateConversionUnits() {
  const type = document.getElementById('conversionType').value; const fromUnit = document.getElementById('fromUnit'); const toUnit = document.getElementById('toUnit');
  const units = {
    length: [{ value: 'm', text: 'Meters' },{ value: 'km', text: 'Kilometers' },{ value: 'cm', text: 'Centimeters' },{ value: 'mm', text: 'Millimeters' },{ value: 'in', text: 'Inches' },{ value: 'ft', text: 'Feet' }],
    weight: [{ value: 'kg', text: 'Kilograms' },{ value: 'g', text: 'Grams' },{ value: 'lb', text: 'Pounds' },{ value: 'oz', text: 'Ounces' }],
    temperature: [{ value: 'c', text: 'Celsius' },{ value: 'f', text: 'Fahrenheit' },{ value: 'k', text: 'Kelvin' }],
    volume: [{ value: 'l', text: 'Liters' },{ value: 'ml', text: 'Milliliters' },{ value: 'gal', text: 'Gallons' },{ value: 'qt', text: 'Quarts' }]
  }; fromUnit.innerHTML = ''; toUnit.innerHTML = '';
  units[type].forEach(unit => { fromUnit.innerHTML += `<option value="${unit.value}">${unit.text}</option>`; toUnit.innerHTML += `<option value="${unit.value}">${unit.text}</option>`; });
  convertUnits(); // Perform initial conversion on unit type change
}

function convertUnits() {
  const fromValue = parseFloat(document.getElementById('fromValue').value);
  const fromUnit = document.getElementById('fromUnit').value;
  const toUnit = document.getElementById('toUnit').value;
  const type = document.getElementById('conversionType').value;
  
  if (isNaN(fromValue)) { document.getElementById('toValue').value = ''; return; }
  let result = fromValue;
  const factors = { // Conversion factors to a base unit (e.g., meters for length, grams for weight, Celsius for temp)
    length: { 'm': 1, 'km': 1000, 'cm': 0.01, 'mm': 0.001, 'in': 0.0254, 'ft': 0.3048 },
    weight: { 'kg': 1000, 'g': 1, 'lb': 453.592, 'oz': 28.3495 },
    temperature: {}, // Special handling for temperature
    volume: { 'l': 1, 'ml': 0.001, 'gal': 3.78541, 'qt': 0.946353 }
  };
  
  if (type === 'length') { result = fromValue * factors.length[fromUnit] / factors.length[toUnit]; }
  else if (type === 'weight') { result = fromValue * factors.weight[fromUnit] / factors.weight[toUnit]; }
  else if (type === 'volume') { result = fromValue * factors.volume[fromUnit] / factors.volume[toUnit]; }
  else if (type === 'temperature') { // Temperature conversion (via Celsius intermediary)
      let tempInC;
      if (fromUnit === 'c') tempInC = fromValue;
      else if (fromUnit === 'f') tempInC = (fromValue - 32) * 5/9;
      else if (fromUnit === 'k') tempInC = fromValue - 273.15;

      if (toUnit === 'c') result = tempInC;
      else if (toUnit === 'f') result = (tempInC * 9/5) + 32;
      else if (toUnit === 'k') result = tempInC + 273.15;
  }
  
  document.getElementById('toValue').value = result.toFixed(6); // Display result, fixed to 6 decimal places
  logActivity(`Unit converted: ${fromValue} ${fromUnit} to ${result.toFixed(6)} ${toUnit}`);
}


// --- Theme Management Functions ---
// Toggles between dark and light themes
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  isLightMode = document.body.classList.contains('light-theme'); // Update theme state
  logActivity('Theme toggled to ' + (isLightMode ? 'Light Mode' : 'Dark Mode'));
  updateStatsChartTheme(); // Update Chart.js theme for readability
}

// Applies a chosen accent color theme
function applyAccentTheme(theme, event) {
  const root = document.documentElement; // Get CSS root variables
  
  const themes = { // Predefined accent color schemes
    orange: { primary: '#ff4500', secondary: '#ff6b35' },
    blue: { primary: '#0066cc', secondary: '#004499' },
    green: { primary: '#00cc44', secondary: '#009933' },
    red: { primary: '#cc0044', secondary: '#990033' },
    purple: { primary: '#8800cc', secondary: '#6600aa' },
    amber: { primary: '#ffaa00', secondary: '#ff8800' },
    teal: { primary: '#00aaaa', secondary: '#008888' },
    pink: { primary: '#ff0088', secondary: '#cc0066' }
  };
  
  if (themes[theme]) {
    root.style.setProperty('--accent-color', themes[theme].primary);
    root.style.setProperty('--accent-secondary', themes[theme].secondary);
    
    // Adjust other color variables for light theme consistency
    if (document.body.classList.contains('light-theme')) {
        root.style.setProperty('--success-color', themes[theme].primary);
        root.style.setProperty('--error-color', themes[theme].primary);
        root.style.setProperty('--warning-color', themes[theme].primary);
    } else {
        // Reset to original dark theme specific colors if not in light mode
        root.style.setProperty('--success-color', '#00ff41');
        root.style.setProperty('--error-color', '#ff0040');
        root.style.setProperty('--warning-color', '#ffaa00');
    }

    // Update active visual state for theme selection buttons
    document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
    event.target.classList.add('active'); 
    
    logActivity(`Accent theme changed to: ${theme}`);
    updateStatsChartTheme(); // Refresh chart colors if applicable
  }
}

// Updates Chart.js text color to match the current theme for better visibility
function updateStatsChartTheme() {
    const chart = Chart.getChart('statsChart');
    if (chart) {
        chart.options.plugins.legend.labels.color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
        chart.update();
    }
}

// Toggles a generic setting switch and logs the action
function toggleSetting(toggle) {
  toggle.classList.toggle('active');
  stats.toggleSwitches++;
  logActivity(`Setting toggled: ${toggle.previousElementSibling.textContent}`);
  updateStats();
}


// --- Dashboard Content Refresh/Clear Functions ---
function refreshFact() { /* ... (No change from your code) ... */
  const facts = ["Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3000 years old and still perfectly edible.", "A group of flamingos is called a 'flamboyance'.", "Bananas are berries, but strawberries aren't.", "The shortest war in history lasted only 38-45 minutes.", "A single cloud can weigh more than a million pounds."];
  document.getElementById('randomFact').textContent = facts[Math.floor(Math.random() * facts.length)]; logActivity('Random fact refreshed');
}
function refreshQuote() { /* ... (No change from your code) ... */
  const quotes = ["\"The only way to do great work is to love what you do.\" - Steve Jobs", "\"Innovation distinguishes between a leader and a follower.\" - Steve Jobs", "\"Life is what happens to you while you're busy making other plans.\" - John Lennon", "\"The future belongs to those who believe in the beauty of their dreams.\" - Eleanor Roosevelt", "\"It is during our darkest moments that we must focus to see the light.\" - Aristotle"];
  document.getElementById('dailyQuote').textContent = quotes[Math.floor(Math.random() * quotes.length)]; logActivity('Daily quote refreshed');
}
function clearNotifications() { /* ... (No change from your code) ... */
  document.getElementById('notificationsList').innerHTML = ''; logActivity('Notifications cleared');
}
function clearActivityLogs() { /* ... (No change from your code) ... */
  if (confirm("Are you sure you want to clear all activity logs? This cannot be undone locally.")) { activityLogs = []; updateActivityLogDisplay(); logActivity('Activity logs cleared'); }
}
function saveTextNotes() { /* ... (No change from your code) ... */
  const notes = document.getElementById('textNotes').value; localStorage.setItem('textNotes', notes); showNotification('Notes saved successfully'); logActivity('Text notes saved');
}
function clearTextNotes() { /* ... (No change from your code) ... */
  if (confirm("Are you sure you want to clear your text notes?")) { document.getElementById('textNotes').value = ''; logActivity('Text notes cleared'); }
}
function showNotification(message) { /* ... (No change from your code) ... */
  const notification = document.createElement('div'); notification.className = 'notification'; notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
  document.body.appendChild(notification); setTimeout(() => { notification.remove(); }, 3000);
}

// Logs out the current user and reloads the page (client-side only)
function logout() {
  if (confirm('Are you sure you want to logout? This will clear local data and refresh the system.')) {
    logActivity('System logged out (client-side)');
    // No backend API call for logout is made here, assuming client-side state cleanup.
    localStorage.clear(); // Clear all local storage for a fresh start
    location.reload(); // Reload the page to go back to login screen
  }
}


// --- Additional User-Requested Dashboard Functions ---
// Takes a screenshot of the entire page content and allows downloading (client-side)
function takeScreenshot() {
    html2canvas(document.body).then(function(canvas) {
        const link = document.createElement('a'); link.download = `screenshot_${Date.now()}.png`; link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showNotification('Screenshot saved!'); logActivity('Screenshot taken'); stats.buttonPresses++; updateStats();
    });
}

// Toggles the visibility of the main panels grid (with animation)
function togglePanelsGridVisibility() {
    if (panelsGrid.style.display === 'none' || panelsGrid.style.opacity === '0') {
        panelsGrid.style.display = 'grid'; // Change display type first
        panelsGrid.style.opacity = '1'; // Then make it visible with opacity transition
        showNotification('Dashboard sections are now visible.');
        logActivity('Dashboard sections toggled ON');
    } else {
        panelsGrid.style.opacity = '0'; // Start fading out
        setTimeout(() => { panelsGrid.style.display = 'none'; }, 300); // Hide after transition
        showNotification('Dashboard sections are now hidden.');
        logActivity('Dashboard sections toggled OFF');
    }
    stats.buttonPresses++; updateStats();
}

// Restarts the entire client-side system (logs out, clears local storage, reloads page)
async function restartSystem() {
    if (confirm('Are you sure you want to restart the system? You will be logged out and all unsaved local data will be lost.')) {
        logActivity('System restart initiated (client-side)');
        // Send a webhook notification for system restart (client-side)
        const embeds = createEmbedsFromFields(
            "⚠️ System Restart Initiated", 0xFFFF00, [
                { name: "Triggered By", value: currentUser || "Unknown User (pre-login or guest)", inline: true },
                { name: "Location", value: "Dashboard (Client-side)", inline: true },
                { name: "Time", value: new Date().toLocaleString(), inline: false }
            ]
        );
        await sendWebhook(webhooks.resetInformation, embeds); // Using Reset Information channel for restart logs
        localStorage.clear(); // Clear all client-side persistent data
        location.reload(); // Reload the entire page
    }
}


// --- Main Event Listeners (executed when DOM is ready) ---
document.addEventListener('DOMContentLoaded', () => {
  setupToggles(); // Initialize toggle switch listeners

  // Event listener for the main login button
  submitBtn.addEventListener('click', (e) => {
    e.preventDefault(); // Prevent default form submission
    stats.buttonPresses++; // Increment button press stat
    attemptLogin(); // Attempt user login
  });

  // Event listener for the "Reset Attempts" button in the popup
  resetBtn.addEventListener('click', resetCounter);
  
  // Keyboard event listener for 'Enter' key presses
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (resetPopup.style.display === 'flex') { resetCounter(); } // If reset popup is visible, activate reset
        else if (!document.getElementById('loginScreen').classList.contains('hidden')) { attemptLogin(); } // If login screen visible, attempt login
    }
  });
  
  // Event listeners for drawing tool settings (color and thickness)
  document.getElementById('penColor').addEventListener('change', (e) => { currentColor = e.target.value; });
  document.getElementById('penThickness').addEventListener('input', (e) => { currentThickness = parseInt(e.target.value); });
  
  // Load saved text notes from local storage on startup
  const savedNotes = localStorage.getItem('textNotes');
  if (savedNotes) { document.getElementById('textNotes').value = savedNotes; }
  
  // Global click listener for dashboard buttons to track 'buttonPresses' stat
  document.addEventListener('click', (e) => {
    if ((e.target.tagName === 'BUTTON' && !e.target.closest('.panel-controls') && !e.target.classList.contains('submit-btn')) || e.target.closest('.quick-btn')) {
        stats.buttonPresses++; updateStats();
    }
  });
  
  // Set default values for Important Dates input fields (current date and a default time)
  const today = new Date();
  document.getElementById('importantDateDay').value = today.toISOString().split('T')[0]; // Set default date to today
  document.getElementById('importantDateTime').value = "09:00"; // Set default time to 9:00 AM

  // --- Calculator Initialization (Only if panel exists/needed) ---
  const calcDisplayElem = document.getElementById('calcDisplay');
  if (calcDisplayElem) {
      calcDisplayElem.textContent = calcDisplay;
  }
  const conversionTypeSelect = document.getElementById('conversionType');
  if (conversionTypeSelect) {
      conversionTypeSelect.addEventListener('change', updateConversionUnits);
      updateConversionUnits(); // Initialize converter units
  }
  const fromValueInput = document.getElementById('fromValue');
  if (fromValueInput) {
      fromValueInput.addEventListener('input', convertUnits);
  }
});
