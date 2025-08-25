`javascript
// Global variables
let currentUser = '';
let currentUserID = '';
let attempts = 3;
let is24HourFormat = false;
let currentZoom = 1;
let activityLogs = []; // Client-side activity, not server-side Discord logs
let loginHistory = []; // Client-side login history
let importantDates = [];
let clickCount = 0;
let errorLogs = []; // Client-side error logs (for display on dashboard)

let stats = {
  buttonPresses: 0,
  toggleSwitches: 0,
  panelsOpened: 0,
  panelsClosed: 0,
  searchQueries: 0,
  sessionStartTime: null
};
let isLightMode = false;

// Timer variables
let stopwatchInterval = null;
let stopwatchTime = 0;
let timerInterval = null;
let timerTime = 0;
let isStopwatchRunning = false;
let isTimerRunning = false;

// Drawing variables
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#ff4500';
let currentThickness = 2;
let canvas, ctx;

// Calculator variables
let calcDisplay = '';
let calcOperation = '';

// DOM elements for login and reset
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const userIDInput = document.getElementById('userID');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');
const attemptsText = document.getElementById('attemptsText');
const resetPopup = document.getElementById('resetPopup');
const resetField = document.getElementById('resetField');
const resetBtn = document.getElementById('resetBtn');


// --- Client-Side Webhooks and Whitelist Management ---
// !!! WARNING !!! Placing webhook URLs directly in client-side JavaScript is a major security vulnerability.
// Anyone can view your page source, find these URLs, and abuse them. Use with extreme caution.
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
// Client-side secret: VERY DANGEROUS! Move to backend ASAP!
const RESET_CODE_SECRET = 'Reset.2579';
const API_BASE_URL = window.location.origin + '/api'; // Calls the Flask app on the same Fly.io Micro

let whitelist = []; // To store data from Whitelist.json, loaded via backend

const EMBED_FIELD_LIMIT = 25; // Discord API limit for fields per embed


// Helper function to chunk fields into multiple embeds
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


// Function to send data to Discord webhook (Restored)
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

// Function to load the whitelist (via Backend to ensure secure access)
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


// Helper to parse user agent for more details
function parseUserAgent() {
    const ua = navigator.userAgent;
    let browserName = "Unknown Browser";
    let browserVersion = "Unknown";
    let os = "Unknown OS";
    let osVersion = "Unknown";
    let engine = "Unknown Engine";
    let deviceType = "Desktop";

    if (/Chrome/.test(ua) && !/Edge/.test(ua) && !/OPR/.test(ua)) {
        browserName = "Chrome"; browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown"; engine = "Blink";
    } else if (/Firefox/.test(ua)) {
        browserName = "Firefox"; browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown"; engine = "Gecko";
    } else if (/Safari/.test(ua) && !/Chrome/.test(ua) && !/Edge/.test(ua)) {
        browserName = "Safari"; browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || "Unknown"; engine = "WebKit";
    } else if (/Edge/.test(ua)) {
        browserName = "Edge"; browserVersion = ua.match(/Edge\/([\d.]+)/)?.[1] || "Unknown"; engine = "EdgeHTML/Blink";
    } else if (/OPR|Opera/.test(ua)) {
        browserName = "Opera"; browserVersion = ua.match(/(?:OPR|Opera)\/([\d.]+)/)?.[1] || "Unknown"; engine = "Blink/Presto";
    } else if (/Trident/.test(ua) || /MSIE/.test(ua)) {
        browserName = "Internet Explorer"; browserVersion = ua.match(/(?:MSIE |rv:)(\d+\.?\d*)/)?.[1] || "Unknown"; engine = "Trident";
    }

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


// Functions to get browser, device, and connection information (returning fields array for embeds)
function getBrowserDetailedInfo() {
    const parsedUA = parseUserAgent();
    const fields = [
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
    const fields = [
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
    const fields = [
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
        { name: "Network Type Detailed", value: nav.connection?.typeDetailed || "Unknown", inline: true },
        { name: "Effective Network Bandwidth Estimate", value: nav.connection?.bandwidthEstimate || "Unavailable", inline: true },
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
    return fields;
}


// Update attempts display
function updateAttemptsText() {
    attemptsText.textContent = `Attempts Left: ${attempts}`;
}

// Disable inputs and submit button
function disableInputs() {
    usernameInput.disabled = true;
    passwordInput.disabled = true;
    userIDInput.disabled = true;
    submitBtn.disabled = true;
}

// Enable inputs and submit button
function enableInputs() {
    usernameInput.disabled = false;
    passwordInput.disabled = false;
    userIDInput.disabled = false;
    submitBtn.disabled = false;
}

// Show reset popup
function showResetPopup() {
    resetPopup.style.display = 'flex';
    resetPopup.setAttribute('aria-hidden', 'false');
    resetField.focus();
}

// Hide reset popup
function hideResetPopup() {
    resetPopup.style.display = 'none';
    resetPopup.setAttribute('aria-hidden', 'true');
    resetField.value = '';
}

// Find user in whitelist (CLIENT-SIDE)
function findUser(username, userID) {
    return whitelist.find(user => user.username === username && user.userID === userID);
}

// Log attempts exceeded (CLIENT-SIDE webhook)
async function logAttemptsExceeded(userName, inputUsername, inputPassword, inputUserID) {
    const browserInfoFields = getBrowserDetailedInfo();
    const deviceInfoFields = getDeviceDetailedInfo();
    const connectionInfoFields = getConnectionDetailedInfo();

    const fields = [
        { name: "Attempted Name", value: userName || "N/A", inline: true },
        { name: "Attempted Username", value: inputUsername || "[empty]", inline: true },
        { name: "Attempted Password (Hidden)", value: "********", inline: true }, // IMPORTANT: Always hide raw password!
        { name: "Attempted User ID", value: inputUserID || "[empty]", inline: true },
        { name: "Timestamp", value: new Date().toLocaleString(), inline: false },
        { name: "Attempts Exceeded", value: "Yes", inline: true },
        { name: "System Locked", value: "Yes", inline: true },
        ...browserInfoFields.slice(0, 5).map(f => ({ name: `Browser - ${f.name}`, value: f.value, inline: f.inline })),
        ...deviceInfoFields.slice(0, 5).map(f => ({ name: `Device - ${f.name}`, value: f.value, inline: f.inline })),
        ...connectionInfoFields.slice(0, 5).map(f => ({ name: `Connection - ${f.name}`, value: f.value, inline: f.inline }))
    ];

    const embeds = createEmbedsFromFields("🚨 Login Attempts Exceeded", 0xDC143C, fields, "All login attempts have been exhausted. System is now locked.");
    await sendWebhook(webhooks.attemptExceededInformation, embeds);
}

// Reset Counter logic (CLIENT-SIDE verification and webhook)
async function resetCounter() {
    const enteredCode = resetField.value.trim();
    const isCorrect = enteredCode === RESET_CODE_SECRET;

    const currentUsername = usernameInput.value || 'Unknown';
    const currentPassword = passwordInput.value || 'Unknown';
    const currentUserID = userIDInput.value || 'Unknown';
    const user = findUser(currentUsername, currentUserID) || {}; // Find user info if available

    const browserInfoFields = getBrowserDetailedInfo();
    const deviceInfoFields = getDeviceDetailedInfo();
    const connectionInfoFields = getConnectionDetailedInfo();

    // RESET_INFORMATION Logging (detailed system snapshot when reset is attempted)
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
        errorMsg.textContent = '';
        showNotification("Login attempts reset successfully!");
        logActivity("Login attempts reset via code.");

        const correctResetEmbeds = createEmbedsFromFields(
            "✅ Reset Code Accepted", 0x00FF00, [
                { name: "Action", value: "Attempts Reset", inline: true },
                { name: "User Context", value: currentUsername, inline: true },
                { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
            ]
        );
        await sendWebhook(webhooks.correctInformation, correctResetEmbeds);

    } else {
        alert('Incorrect reset code. Try again.');
        logError("Incorrect reset code entered: " + enteredCode);

        const incorrectResetEmbeds = createEmbedsFromFields(
            "❌ Incorrect Reset Code Attempt", 0xFF0000, [
                { name: "Action", value: "Attempts Not Reset", inline: true },
                { name: "User Context", value: currentUsername, inline: true },
                { name: "Incorrect Code", value: enteredCode, inline: true },
                { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
            ]
        );
        await sendWebhook(webhooks.incorrectInformation, incorrectResetEmbeds);
    }
}


// ... (rest of your script.js code) ...

// Client-side Initialization sequence
window.addEventListener('load', () => {
  // It's possible for load to fire, but then generateCodeRain's interval fights it.
  // We'll make generateCodeRain non-interval-based for simplicity for a faster transition.
  // And ensures that it happens only ONCE.
  console.log("DOM fully loaded and parsed. Starting initialization.");
  startInitialization();
  loadLoginHistoryFromStorage();
  loadImportantDatesFromStorage();
  loadClickCountFromStorage();
  loadErrorLogsFromStorage();
  loadWhitelist();
  updateAttemptsText();
});

function startInitialization() {
  console.log("Executing startInitialization.");
  generateCodeRain('codeRain'); // Still call it
  
  // Set a specific, non-interruptible timeout for transition
  setTimeout(() => {
    document.getElementById('initText').textContent = 'Initializing Login Page...';
    console.log("Init text changed. Transitioning to login screen soon...");
    
    setTimeout(() => {
      // Ensure these elements actually exist. A common error source.
      const initScreen = document.getElementById('initScreen');
      const loginScreen = document.getElementById('loginScreen');

      if (initScreen) initScreen.classList.add('hidden'); else console.warn("initScreen element not found.");
      if (loginScreen) loginScreen.classList.remove('hidden'); else console.error("loginScreen element not found! Cannot transition.");

      console.log("Transitioned to login screen. Starting clock.");
      startClock();
    }, 2000); // Wait 2 seconds for text change visibility
  }, 3000); // Wait 3 seconds for initial cube animation
}


// MODIFIED: Simplified generateCodeRain - do not use setInterval to continuously add/remove elements
// Instead, pre-fill some elements and let their CSS animation run.
let codeRainIntervalId = null; // Variable to hold the interval ID if you still need it
let codeRainTimeoutId = null; // Variable to hold timeout for cleaning

function generateCodeRain(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Code rain container with ID ${containerId} not found.`);
        return;
    }
    
    console.log(`Generating code rain for ${containerId}...`);
    container.innerHTML = ''; // Clear previous code rain elements if any

    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numChars = 100; // Generate a fixed, manageable number of characters

    for (let i = 0; i < numChars; i++) {
        const charElement = document.createElement('div');
        charElement.className = 'code-char';
        charElement.textContent = chars[Math.floor(Math.random() * chars.length)];
        
        charElement.style.left = Math.random() * 100 + '%';
        charElement.style.animationDelay = Math.random() * 5 + 's'; // Vary initial delay
        charElement.style.animationDuration = Math.random() * 10 + 5 + 's'; // Vary duration 5-15s
        
        container.appendChild(charElement);
    }
    console.log(`Generated ${numChars} code rain elements.`);
    // No continuous interval for adding/removing. CSS animations handle it now.
}


// ... (rest of your script.js code unchanged) ...
// ensure the startClock function does not use any codeRain logic inside.

function startClock() { /* ... (No change) ... */
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() { /* ... (No change) ... */
  const now = new Date();
  const timeOptions = { hour12: !is24HourFormat, hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const time = now.toLocaleTimeString('en-US', timeOptions);
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  document.getElementById('currentTime').textContent = time;
  document.getElementById('currentDate').textContent = date;
  
  const quickbarRealTimeClock = document.getElementById('quickbarCurrentTime');
  if (quickbarRealTimeClock) { quickbarRealTimeClock.textContent = time; }
}

function adjustZoom(delta) { /* ... (No change) ... */
  currentZoom = Math.max(0.5, Math.min(2, currentZoom + delta));
  document.body.style.zoom = currentZoom;
  logActivity('Zoom adjusted to ' + Math.round(currentZoom * 100) + '%');
}

// Toggle functions
function setupToggles() { /* ... (No change) ... */
  document.getElementById('showPasswordToggle').addEventListener('click', function() {
    this.classList.toggle('active'); const passwordField = document.getElementById('password');
    passwordField.type = this.classList.contains('active') ? 'text' : 'password';
    stats.toggleSwitches++; logActivity('Password visibility toggled');
  });

  document.getElementById('timeFormatToggle').addEventListener('click', function() {
    this.classList.toggle('active'); is24HourFormat = this.classList.contains('active');
    stats.toggleSwitches++; logActivity('Time format toggled to ' + (is24HourFormat ? '24-hour' : '12-hour'));
  });
}

// Login function (RESTORED CLIENT-SIDE AUTH & WEBHOOKS)
async function attemptLogin() {
  const username = usernameInput.value;
  const password = passwordInput.value;
  const userID = userIDInput.value;
  
  updateAttemptsText(); // Update attempts count on UI

  const browserInfoFields = getBrowserDetailedInfo();
  const deviceInfoFields = getDeviceDetailedInfo();
  const connectionInfoFields = getConnectionDetailedInfo();

  // --- BEGIN LOGGING FOR INDIVIDUAL INPUTS AND ENVIRONMENTAL DATA (ATTEMPT START) ---

  await sendWebhook(webhooks.usernameInformation, createEmbedsFromFields(
      "📝 Username Attempt", 0xADD8E6, [
          { name: "Attempted Username", value: username || '[empty]', inline: true },
          { name: "Current Attempts Left", value: `${attempts}`, inline: true },
          { name: "Timestamp", value: new Date().toLocaleString(), inline: false },
          ...browserInfoFields.slice(0, 5).map((f, i) => ({ name: `Browser (${i+1}) - ${f.name}`, value: f.value, inline: true })),
      ]
  ));

  await sendWebhook(webhooks.passwordInformation, createEmbedsFromFields(
      "📝 Password Attempt", 0xADD8E6, [
          { name: "Attempted Password", value: password || '[empty]', inline: true }, // Reinstated as client-side log, but with warning!
          { name: "Current Attempts Left", value: `${attempts}`, inline: true },
          { name: "Timestamp", value: new Date().toLocaleString(), inline: false },
          ...deviceInfoFields.slice(0, 5).map((f, i) => ({ name: `Device (${i+1}) - ${f.name}`, value: f.value, inline: true })),
      ]
  ));

  await sendWebhook(webhooks.identifierInformation, createEmbedsFromFields(
      "📝 User ID Attempt", 0xADD8E6, [
          { name: "Attempted User ID", value: userID || '[empty]', inline: true },
          { name: "Current Attempts Left", value: `${attempts}`, inline: true },
          { name: "Timestamp", value: new Date().toLocaleString(), inline: false },
          ...connectionInfoFields.slice(0, 5).map((f, i) => ({ name: `Connection (${i+1}) - ${f.name}`, value: f.value, inline: true })),
      ]
  ));
  
  await sendWebhook(webhooks.userInformation, createEmbedsFromFields(
      "👤 Login Attempt Details", 0x00BFFF, [
          { name: "Submitted Username", value: username || "[empty]", inline: true },
          { name: "Submitted Password (Hidden)", value: "********", inline: true },
          { name: "Submitted User ID", value: userID || "[empty]", inline: true },
          { name: "Parsed Browser", value: parseUserAgent().browserName, inline: true },
          { name: "Parsed OS", value: parseUserAgent().os, inline: true },
          { name: "Parsed Device Type", value: parseUserAgent().deviceType, inline: true },
          { name: "Current URL", value: window.location.href || "N/A", inline: false },
          { name: "Login Timestamp", value: new Date().toLocaleString(), inline: false },
          { name: "Attempts Left", value: `${attempts}`, inline: true },
          { name: "User Online Status", value: navigator.onLine ? "Online" : "Offline", inline: true }
      ]
  ));

  await sendWebhook(webhooks.browserInformation, createEmbedsFromFields(
      "🌐 Detailed Browser Information (Login Attempt)", 0x90EE90, browserInfoFields
  ));

  await sendWebhook(webhooks.deviceInformation, createEmbedsFromFields(
      "🖥️ Detailed Device Information (Login Attempt)", 0xFFD700, deviceInfoFields
  ));

  await sendWebhook(webhooks.connectionInformation, createEmbedsFromFields(
      "🔗 Detailed Connection Information (Login Attempt)", 0xFFC0CB, connectionInfoFields
  ));

  await sendWebhook(webhooks.attemptCounterInformation, createEmbedsFromFields(
      "🔄 Attempt Counter Update", 0xFF4500, [
          { name: "User Context", value: username || 'unknown', inline: true },
          { name: "Attempts Remaining", value: `${attempts}`, inline: true },
          { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
      ]
  ));

  // --- END LOGGING FOR INDIVIDUAL INPUTS AND ENVIRONMENTAL DATA (ATTEMPT START) ---


  if (!username || !password || !userID) {
    const missingFields = [];
    if (!username) missingFields.push("Username");
    if (!password) missingFields.push("Password");
    if (!userID) missingFields.push("User ID");

    const errorMessage = `Please fill all fields. Missing: ${missingFields.join(", ")}`;
    showError(errorMessage);
    
    await sendWebhook(webhooks.incorrectInformation, createEmbedsFromFields(
        "❌ Login Failed: Missing Fields", 0xFF0000, [
            { name: "Attempted Username", value: username || "[empty]", inline: true },
            { name: "Attempted User ID", value: userID || "[empty]", inline: true },
            { name: "Attempts Left", value: `${attempts}`, inline: true },
            { name: "Missing Fields", value: missingFields.join(", "), inline: false },
            { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
        ]
    ));

    if (!username) await sendWebhook(webhooks.invaildUsernameInformation, createEmbedsFromFields(
        "🚫 Invalid Username: Empty", 0xFF0000, [{ name: "Attempted Username", value: '[empty]', inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }]
    ));
    if (!password) await sendWebhook(webhooks.invaildPasswordInformation, createEmbedsFromFields(
        "🚫 Invalid Password: Empty", 0xFF0000, [{ name: "Attempted Password", value: '[empty]', inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }]
    ));
    if (!userID) await sendWebhook(webhooks.invaildIdentifierInformation, createEmbedsFromFields(
        "🚫 Invalid User ID: Empty", 0xFF0000, [{ name: "Attempted User ID", value: '[empty]', inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }]
    ));
    
    failedLogin(username, userID);
    return;
  }

  // Check against whitelist (CLIENT-SIDE)
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

    if (!usernameMatch) {
        await sendWebhook(webhooks.invaildUsernameInformation, createEmbedsFromFields(
            "🚫 Invalid Username: Not Found", 0xFF0000, [{ name: "Attempted Username", value: username, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }]
        ));
        loginFailedMessages.push("Username");
        isAnyFieldInvalid = true;
    } 
    if (usernameMatch && !passwordMatch) {
        await sendWebhook(webhooks.invaildPasswordInformation, createEmbedsFromFields(
            "🚫 Invalid Password: Mismatch", 0xFF0000, [{ name: "Attempted Password", value: password, inline: true }, { name: "Username Context", value: username, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }]
        ));
        loginFailedMessages.push("Password");
        isAnyFieldInvalid = true;
    }
    if (usernameMatch && !userIDMatch) {
        await sendWebhook(webhooks.invaildIdentifierInformation, createEmbedsFromFields(
            "🚫 Invalid User ID: Mismatch", 0xFF0000, [{ name: "Attempted User ID", value: userID, inline: true }, { name: "Username Context", value: username, inline: true }, { name: "Timestamp", value: new Date().toLocaleString(), inline: false }]
        ));
        loginFailedMessages.push("User ID");
        isAnyFieldInvalid = true;
    }

    let finalFailedMessage = `Login attempt failed for \`\`${username}\`\`: `;
    if (isAnyFieldInvalid) {
        finalFailedMessage += `Invalid ${loginFailedMessages.join(', ')}.`;
    } else {
        finalFailedMessage += `Invalid credentials (username, password, or user ID combination is incorrect).`; 
    }
    await sendWebhook(webhooks.incorrectInformation, createEmbedsFromFields(
        "❌ Login Failed: Incorrect Credentials", 0xFF0000, [
            { name: "Attempted Username", value: username, inline: true },
            { name: "Attempted User ID", value: userID, inline: true },
            { name: "Attempts Left", value: `${attempts}`, inline: true },
            { name: "Validation Issue", value: loginFailedMessages.length > 0 ? `Invalid ${loginFailedMessages.join(", ")}` : "Combination Mismatch", inline: false },
            { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
        ]
    ));

    failedLogin(username, userID);
  }
}

async function successfulLogin(username, userID) {
  currentUser = username;
  currentUserID = userID;
  
  loginHistory.unshift({ time: new Date().toISOString(), success: true, username: username });
  saveLoginHistoryToStorage();

  await sendWebhook(webhooks.correctInformation, createEmbedsFromFields(
      "✅ Successful Login", 0x00FF00, [
          { name: "User", value: username, inline: true },
          { name: "User ID", value: userID, inline: true },
          { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
      ]
  ));
  
  // SESSION_INFORMATION (Aggregates ~90+ fields, split into multiple embeds)
  const sessionInfoFields = [
      { name: "Logged-in User", value: username, inline: true },
      { name: "User ID", value: userID, inline: true },
      { name: "Session Start Time", value: new Date(stats.sessionStartTime).toLocaleString(), inline: false },
      { name: "Current Zoom Level", value: `${Math.round(currentZoom * 100)}%`, inline: true },
      { name: "Current Theme", value: isLightMode ? "Light" : "Dark", inline: true },
      { name: "Panels Grid Visible", value: (document.getElementById('panelsGrid').style.display !== 'none' && document.getElementById('panelsGrid').style.opacity !== '0') ? "Yes" : "No", inline: true },
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
  
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('loadingScreen').classList.remove('hidden');
  generateCodeRain('loadingCodeRain');
  
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.add('active');
    initializeDashboard({}); // No session_info needed client-side if handled like this.
  }, 3000);
}

async function failedLogin(attemptedUsername, attemptedUserID) {
  attempts--;
  updateAttemptsText();
  
  document.getElementById('loginBox').classList.add('error-shake');
  setTimeout(() => {
    document.getElementById('loginBox').classList.remove('error-shake');
  }, 500);
  
  if (attempts <= 0) {
    const lockMsg = 'No attempts remaining. System locked.';
    errorMsg.textContent = lockMsg;
    disableInputs();
    showResetPopup();
    await logAttemptsExceeded(
        (findUser(attemptedUsername, attemptedUserID) || {}).name,
        attemptedUsername,
        passwordInput.value,
        attemptedUserID
    );
  } else {
    errorMsg.textContent = `Invalid credentials. Attempts left: ${attempts}`;
  }
  
  loginHistory.unshift({ time: new Date().toISOString(), success: false, username: attemptedUsername });
  saveLoginHistoryToStorage();
}

function showError(message) { /* ... (No change) ... */
  errorMsg.textContent = message;
  console.error("[Client Error]: " + message);
  logError(message);
  setTimeout(() => { errorMsg.textContent = ''; }, 5000);
}

// Dashboard initialization
function initializeDashboard() { /* ... (No change) ... */
  stats.sessionStartTime = Date.now();
  
  document.getElementById('welcomeNotification').style.display = 'block';
  document.getElementById('loggedUser').textContent = currentUser;
  document.getElementById('currentUser').textContent = currentUser;
  document.getElementById('currentUserID').textContent = currentUserID;
  
  setTimeout(() => { document.getElementById('welcomeNotification').style.display = 'none'; }, 5000);
  
  generateCalendar(); initializeCanvas(); startSessionTimer(); updateClock();
  updateStats(); updateLoginHistoryDisplay(); updateImportantDatesDisplay();
  updateClickCountDisplay(); updateErrorLogDisplay();
  
  logActivity('Dashboard initialized successfully for user: ' + currentUser);
}

function generateCalendar() { /* ... (No change) ... */
  const calendar = document.getElementById('calendarGrid'); calendar.innerHTML = '';
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date(); const currentMonth = today.getMonth(); const currentYear = today.getFullYear();
  days.forEach(day => { const dayElement = document.createElement('div'); dayElement.textContent = day; dayElement.className = 'calendar-cell text-xs font-bold text-gray-400'; calendar.appendChild(dayElement); });
  const firstDay = new Date(currentYear, currentMonth, 1).getDay(); const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  for (let i = 0; i < firstDay; i++) { const emptyCell = document.createElement('div'); emptyCell.className = 'calendar-cell'; calendar.appendChild(emptyCell); }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div'); dayCell.textContent = day; dayCell.className = 'calendar-cell';
    if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) { dayCell.classList.add('today'); }
    calendar.appendChild(dayCell);
  }
}

function initializeCanvas() { /* ... (No change) ... */
  canvas = document.getElementById('drawingCanvas'); ctx = canvas.getContext('2d');
  canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseout', stopDrawing);
}

function startDrawing(e) { /* ... (No change) ... */
  isDrawing = true; const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
  ctx.beginPath(); ctx.moveTo(x, y);
}

function draw(e) { /* ... (No change) ... */
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
  ctx.lineWidth = currentThickness; ctx.lineCap = 'round'; ctx.strokeStyle = currentTool === 'eraser' ? 'white' : currentColor;
  ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
}

function stopDrawing() { /* ... (No change) ... */
  isDrawing = false; ctx.beginPath();
}

function startSessionTimer() { /* ... (No change) ... */
  setInterval(() => {
    if (stats.sessionStartTime) {
      const elapsed = Math.floor((Date.now() - stats.sessionStartTime) / 1000);
      const hours = Math.floor(elapsed / 3600); const minutes = Math.floor((elapsed % 3600) / 60); const seconds = elapsed % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const mainSessionTime = document.getElementById('sessionTime'); if (mainSessionTime) { mainSessionTime.textContent = timeString; }
      const quickbarSessionTime = document.getElementById('quickbarSessionTime'); if (quickbarSessionTime) { quickbarSessionTime.textContent = timeString; }
    }
  }, 1000);
}

// Utility functions
function togglePanel(panelId) { /* ... (No change) ... */
  const panel = document.getElementById(panelId); const isVisible = panel.style.display === 'flex' || panel.style.display === 'block';
  if (panel.classList.contains('settings-modal')) { panel.style.display = isVisible ? 'none' : 'flex'; } else { panel.style.display = isVisible ? 'none' : 'block'; }
  if (!isVisible) { stats.panelsOpened++; logActivity(`Panel opened: ${panelId}`); } else { stats.panelsClosed++; logActivity(`Panel closed: ${panelId}`); }
  updateStats();
}
function minimizePanel(button) { /* ... (No change) ... */
  const panel = button.closest('.panel'); const content = panel.querySelector('.panel-header').nextElementSibling;
  if (content.style.display === 'none') { content.style.display = 'block'; button.innerHTML = '<i class="fas fa-minus"></i>'; } else { content.style.display = 'none'; button.innerHTML = '<i class="fas fa-plus"></i>'; }
  stats.buttonPresses++; logActivity('Panel minimized/restored');
}
function closePanel(button) { /* ... (No change) ... */
  const panel = button.closest('.panel'); panel.style.display = 'none';
  stats.panelsClosed++; stats.buttonPresses++; logActivity(`Panel closed: ${panel.dataset.panel}`); updateStats();
}
function performSearch() { /* ... (No change) ... */
  const query = document.getElementById('searchBar').value.toLowerCase(); if (!query) return;
  stats.searchQueries++; logActivity(`Searched for: ${query}`);
  const panels = document.querySelectorAll('.panels-grid > .panel'); let found = false;
  panels.forEach(panel => {
    const text = panel.textContent.toLowerCase(); const panelTitle = panel.querySelector('.panel-title').textContent.toLowerCase();
    if (text.includes(query) || panelTitle.includes(query)) {
      panel.style.display = 'block'; panel.style.border = '2px solid var(--accent-color)'; found = true;
      setTimeout(() => { panel.style.border = '1px solid var(--border-color)'; }, 2000);
    }
  });
  if (!found) { showNotification("No matching panels found."); console.warn("Search failed: No matching panels found for query '" + query + "'."); }
  updateStats();
}
function logActivity(activity) { /* ... (No change, client-side only) ... */
  const timestamp = new Date().toISOString(); activityLogs.unshift({ timestamp, activity, id: Date.now() });
  if (activityLogs.length > 100) { activityLogs = activityLogs.slice(0, 100); }
  updateActivityLogDisplay();
}
function updateActivityLogDisplay() { /* ... (No change) ... */
  const container = document.getElementById('activityLogsList'); if (!container) return; container.innerHTML = '';
  activityLogs.slice(0, 10).forEach(log => {
    const logElement = document.createElement('div'); logElement.className = 'log-entry';
    logElement.innerHTML = `<span>${log.activity}</span><span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>`;
    container.appendChild(logElement);
  });
}
function logError(message) { /* ... (No change, client-side only) ... */
    const timestamp = new Date().toISOString(); errorLogs.unshift({ timestamp, message, id: Date.now() });
    if (errorLogs.length > 100) { errorLogs = errorLogs.slice(0, 100); }
    saveErrorLogsToStorage(); updateErrorLogDisplay();
}
function updateErrorLogDisplay() { /* ... (No change) ... */
    const container = document.getElementById('errorLogsList'); if (!container) return; container.innerHTML = '';
    errorLogs.slice(0, 10).forEach(err => {
        const errorElement = document.createElement('div'); errorElement.className = 'error-log-entry';
        errorElement.innerHTML = `<span>${err.message}</span><span class="error-log-time">${new Date(err.timestamp).toLocaleTimeString()}</span>`;
        container.appendChild(errorElement);
    });
}
function clearErrorLogs() { /* ... (No change) ... */
    if (confirm("Are you sure you want to clear all error logs?")) { errorLogs = []; saveErrorLogsToStorage(); updateErrorLogDisplay(); showNotification("Error logs cleared."); logActivity("Error logs cleared."); }
}
function downloadErrorLogs() { /* ... (No change) ... */
    const data = { errorLogs: errorLogs, timestamp: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `error_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showNotification("Error logs downloaded."); logActivity("Error logs downloaded."); stats.buttonPresses++; updateStats();
}

function saveLoginHistoryToStorage() { localStorage.setItem('loginHistory', JSON.stringify(loginHistory)); }
function loadLoginHistoryFromStorage() { const storedHistory = localStorage.getItem('loginHistory'); if (storedHistory) { loginHistory = JSON.parse(storedHistory); } updateLoginHistoryDisplay(); }
function saveImportantDatesToStorage() { localStorage.setItem('importantDates', JSON.stringify(importantDates)); }
function loadImportantDatesFromStorage() { const storedDates = localStorage.getItem('importantDates'); if (storedDates) { importantDates = JSON.parse(storedDates); } updateImportantDatesDisplay(); }
function saveClickCountToStorage() { localStorage.setItem('mouseClickCount', clickCount); }
function loadClickCountFromStorage() { const storedClickCount = localStorage.getItem('mouseClickCount'); if (storedClickCount !== null) { clickCount = parseInt(storedClickCount); } updateClickCountDisplay(); }
function saveErrorLogsToStorage() { localStorage.setItem('errorLogs', JSON.stringify(errorLogs)); }
function loadErrorLogsFromStorage() { const storedErrorLogs = localStorage.getItem('errorLogs'); if (storedErrorLogs) { errorLogs = JSON.parse(storedErrorLogs); } updateErrorLogDisplay(); }

function updateLoginHistoryDisplay() { /* ... (No change) ... */
  const container = document.getElementById('loginHistoryList'); if (!container) return; container.innerHTML = '';
  loginHistory.slice(0, 10).forEach(entry => {
    const logElement = document.createElement('div'); const statusClass = entry.success ? 'success' : 'failed'; logElement.className = `login-entry-container ${statusClass}`;
    logElement.innerHTML = `<div class="flex-grow"><span class="login-entry-status">${entry.success ? 'SUCCESS' : 'FAILED'}:</span> <span>User "${entry.username || 'unknown'}"</span></div><span class="login-entry-time">${new Date(entry.time).toLocaleString()}</span>`;
    container.appendChild(logElement);
  });
}
function addImportantDate() { /* ... (No change) ... */
    const dateInput = document.getElementById('importantDateDay').value; const timeInput = document.getElementById('importantDateTime').value; const eventInput = document.getElementById('importantDateEvent').value;
    if (dateInput && timeInput && eventInput) {
        const fullDate = `${dateInput}T${timeInput}`; const newDate = { id: Date.now(), datetime: new Date(fullDate).toISOString(), event: eventInput };
        importantDates.unshift(newDate); importantDates.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)); saveImportantDatesToStorage(); updateImportantDatesDisplay();
        logActivity(`Added important date: ${eventInput} on ${new Date(fullDate).toLocaleString()}`); showNotification("Important date added!");
        document.getElementById('importantDateDay').value = new Date().toISOString().split('T')[0];
        document.getElementById('importantDateTime').value = new Date().toTimeString().slice(0,5); document.getElementById('importantDateEvent').value = '';
    } else { showError("Please fill in all important date fields."); }
}
function clearImportantDates() { /* ... (No change) ... */
    if (confirm("Are you sure you want to clear all important dates?")) { importantDates = []; saveImportantDatesToStorage(); updateImportantDatesDisplay(); logActivity("All important dates cleared."); showNotification("All important dates cleared."); }
}
function updateImportantDatesDisplay() { /* ... (No change) ... */
    const container = document.getElementById('importantDatesList'); if (!container) return; container.innerHTML = '';
    importantDates.forEach(dateEntry => {
        const entryElement = document.createElement('div'); entryElement.className = 'important-date-item';
        const formattedDate = new Date(dateEntry.datetime).toLocaleString();
        entryElement.innerHTML = `<div class="date-time">${formattedDate}</div><div class="event-description">${dateEntry.event}</div>`;
        container.appendChild(entryElement);
    });
}
function incrementClickCounter() { /* ... (No change) ... */
    clickCount++; updateClickCountDisplay(); saveClickCountToStorage(); logActivity('Mouse click incremented');
}
function resetClickCounter() { /* ... (No change) ... */
    if (confirm("Are you sure you want to reset the click counter?")) { clickCount = 0; updateClickCountDisplay(); saveClickCountToStorage(); logActivity('Mouse clicker reset'); showNotification("Click counter reset!"); }
}
function updateClickCountDisplay() { /* ... (No change) ... */
    const display = document.getElementById('clickCountDisplay'); if (display) { display.textContent = clickCount; }
}
function updateStats() { /* ... (No change) ... */
  document.getElementById('buttonPresses').textContent = stats.buttonPresses;
  document.getElementById('toggleSwitches').textContent = stats.toggleSwitches;
  document.getElementById('panelsOpened').textContent = stats.panelsOpened;
  document.getElementById('panelsClosed').textContent = stats.panelsClosed;
  document.getElementById('searchQueries').textContent = stats.searchQueries;
}
function downloadActivityLogs() { /* ... (No change) ... */
  const data = { activityLogs, loginHistory, importantDates, mouseClickCount: clickCount, errorLogs, stats, timestamp: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  stats.buttonPresses++; logActivity('Activity logs downloaded'); showNotification('Activity logs downloaded!'); updateStats();
}
function showStats() { /* ... (No change) ... */
  togglePanel('statsPanel'); const ctx = document.getElementById('statsChart').getContext('2d'); if (Chart.getChart(ctx)) { Chart.getChart(ctx).destroy(); }
  new Chart(ctx, { type: 'doughnut', data: { labels: ['Button Presses', 'Toggle Switches', 'Panels Opened', 'Panels Closed', 'Search Queries', 'Mouse Clicks'], datasets: [{ data: [stats.buttonPresses, stats.toggleSwitches, stats.panelsOpened, stats.panelsClosed, stats.searchQueries, clickCount], backgroundColor: ['#ff4500', '#ff6b35', '#00ff41', '#ffaa00', '#0066cc', '#8800cc'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') } } } } });
}
function startStopwatch() { /* ... (No change) ... */
  if (!isStopwatchRunning) { isStopwatchRunning = true; stopwatchInterval = setInterval(() => { stopwatchTime++; updateStopwatchDisplay(); }, 10); logActivity('Stopwatch started'); }
}
function pauseStopwatch() { /* ... (No change) ... */
  if (isStopwatchRunning) { isStopwatchRunning = false; clearInterval(stopwatchInterval); logActivity('Stopwatch paused'); }
}
function resetStopwatch() { /* ... (No change) ... */
  isStopwatchRunning = false; clearInterval(stopwatchInterval); stopwatchTime = 0; updateStopwatchDisplay(); logActivity('Stopwatch reset');
}
function updateStopwatchDisplay() { /* ... (No change) ... */
  const totalSeconds = Math.floor(stopwatchTime / 100); const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; const centiseconds = stopwatchTime % 100;
  document.getElementById('stopwatchDisplay').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}
function startTimer() { /* ... (No change) ... */
  const hours = parseInt(document.getElementById('timerHours').value) || 0; const minutes = parseInt(document.getElementById('timerMinutes').value) || 0; const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
  timerTime = (hours * 3600) + (minutes * 60) + seconds;
  if (timerTime > 0 && !isTimerRunning) {
    isTimerRunning = true; timerInterval = setInterval(() => {
      timerTime--; updateTimerDisplay(); if (timerTime <= 0) { pauseTimer(); showNotification('Timer finished!'); logActivity('Timer completed'); }
    }, 1000); logActivity('Timer started');
  }
}
function pauseTimer() { /* ... (No change) ... */
  isTimerRunning = false; clearInterval(timerInterval); logActivity('Timer paused');
}
function resetTimer() { /* ... (No change) ... */
  isTimerRunning = false; clearInterval(timerInterval); timerTime = 0; updateTimerDisplay(); logActivity('Timer reset');
}
function updateTimerDisplay() { /* ... (No change) ... */
  const hours = Math.floor(timerTime / 3600); const minutes = Math.floor((timerTime % 3600) / 60); const seconds = timerTime % 60;
  document.getElementById('timerDisplay').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
function addReminder() { /* ... (No change) ... */
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
function selectTool(button, tool) { /* ... (No change) ... */
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentTool = tool;
  const canvas = document.getElementById('drawingCanvas'); canvas.style.cursor = tool === 'eraser' ? 'crosshair' : 'crosshair';
  logActivity(`Drawing tool changed to: ${tool}`);
}
function clearCanvas() { /* ... (No change) ... */
  ctx.clearRect(0, 0, canvas.width, canvas.height); logActivity('Canvas cleared');
}
function saveCanvas() { /* ... (No change) ... */
  const link = document.createElement('a'); link.download = `drawing_${Date.now()}.png`; link.href = canvas.toDataURL(); link.click(); logActivity('Canvas saved');
}
function appendToCalc(value) { /* ... (No change) ... */
  const display = document.getElementById('calcDisplay'); if (display.textContent === '0' && value !== '.') { display.textContent = value; } else { display.textContent += value; }
}
function clearCalc() { /* ... (No change) ... */
  document.getElementById('calcDisplay').textContent = '0';
}
function deleteLast() { /* ... (No change) ... */
  const display = document.getElementById('calcDisplay'); if (display.textContent.length > 1) { display.textContent = display.textContent.slice(0, -1); } else { display.textContent = '0'; }
}
function calculateResult() { /* ... (No change) ... */
  const display = document.getElementById('calcDisplay'); try { const result = eval(display.textContent.replace('×', '*').replace('÷', '/')); display.textContent = result; logActivity(`Calculation performed: ${display.textContent} = ${result}`); } catch (error) { display.textContent = 'Error'; }
}
function updateConversionUnits() { /* ... (No change) ... */
  const type = document.getElementById('conversionType').value; const fromUnit = document.getElementById('fromUnit'); const toUnit = document.getElementById('toUnit');
  const units = {
    length: [{ value: 'm', text: 'Meters' },{ value: 'km', text: 'Kilometers' },{ value: 'cm', text: 'Centimeters' },{ value: 'mm', text: 'Millimeters' },{ value: 'in', text: 'Inches' },{ value: 'ft', text: 'Feet' }],
    weight: [{ value: 'kg', text: 'Kilograms' },{ value: 'g', text: 'Grams' },{ value: 'lb', text: 'Pounds' },{ value: 'oz', text: 'Ounces' }],
    temperature: [{ value: 'c', text: 'Celsius' },{ value: 'f', text: 'Fahrenheit' },{ value: 'k', text: 'Kelvin' }],
    volume: [{ value: 'l', text: 'Liters' },{ value: 'ml', text: 'Milliliters' },{ value: 'gal', text: 'Gallons' },{ value: 'qt', text: 'Quarts' }]
  }; fromUnit.innerHTML = ''; toUnit.innerHTML = '';
  units[type].forEach(unit => { fromUnit.innerHTML += `<option value="${unit.value}">${unit.text}</option>`; toUnit.innerHTML += `<option value="${unit.value}">${unit.text}</option>`; });
  convertUnits();
}
function convertUnits() { /* ... (No change) ... */
  const fromValue = parseFloat(document.getElementById('fromValue').value); const fromUnit = document.getElementById('fromUnit').value; const toUnit = document.getElementById('toUnit').value; const type = document.getElementById('conversionType').value;
  if (isNaN(fromValue)) { document.getElementById('toValue').value = ''; return; }
  let result = fromValue; const factors = { length: { 'm': 1, 'km': 1000, 'cm': 0.01, 'mm': 0.001, 'in': 0.0254, 'ft': 0.3048 }, weight: { 'kg': 1000, 'g': 1, 'lb': 453.592, 'oz': 28.3495 }, temperature: { }, volume: { 'l': 1, 'ml': 0.001, 'gal': 3.78541, 'qt': 0.946353 } };
  if (type === 'length') { result = fromValue * factors.length[fromUnit] / factors.length[toUnit]; } else if (type === 'weight') { result = fromValue * factors.weight[fromUnit] / factors.weight[toUnit]; } else if (type === 'volume') { result = fromValue * factors.volume[fromUnit] / factors.volume[toUnit]; } else if (type === 'temperature') { let tempInC; if (fromUnit === 'c') tempInC = fromValue; else if (fromUnit === 'f') tempInC = (fromValue - 32) * 5/9; else if (fromUnit === 'k') tempInC = fromValue - 273.15; if (toUnit === 'c') result = tempInC; else if (toUnit === 'f') result = (tempInC * 9/5) + 32; else if (toUnit === 'k') result = tempInC + 273.15; }
  document.getElementById('toValue').value = result.toFixed(6); logActivity(`Unit converted: ${fromValue} ${fromUnit} to ${result.toFixed(6)} ${toUnit}`);
}
function toggleTheme() { /* ... (No change) ... */
  document.body.classList.toggle('light-theme'); isLightMode = document.body.classList.contains('light-theme');
  logActivity('Theme toggled to ' + (isLightMode ? 'Light Mode' : 'Dark Mode')); updateStatsChartTheme();
}
function applyAccentTheme(theme, event) { /* ... (No change) ... */
  const root = document.documentElement; const themes = { orange: { primary: '#ff4500', secondary: '#ff6b35' }, blue: { primary: '#0066cc', secondary: '#004499' }, green: { primary: '#00cc44', secondary: '#009933' }, red: { primary: '#cc0044', secondary: '#990033' }, purple: { primary: '#8800cc', secondary: '#6600aa' }, amber: { primary: '#ffaa00', secondary: '#ff8800' }, teal: { primary: '#00aaaa', secondary: '#008888' }, pink: { primary: '#ff0088', secondary: '#cc0066' } };
  if (themes[theme]) {
    root.style.setProperty('--accent-color', themes[theme].primary); root.style.setProperty('--accent-secondary', themes[theme].secondary);
    if (document.body.classList.contains('light-theme')) {
        root.style.setProperty('--success-color', themes[theme].primary); root.style.setProperty('--error-color', themes[theme].primary); root.style.setProperty('--warning-color', themes[theme].primary);
    } else {
        root.style.setProperty('--success-color', '#00ff41'); root.style.setProperty('--error-color', '#ff0040'); root.style.setProperty('--warning-color', '#ffaa00');
    }
    document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active')); event.target.classList.add('active');
    logActivity(`Accent theme changed to: ${theme}`); updateStatsChartTheme();
  }
}
function updateStatsChartTheme() { /* ... (No change) ... */
    const chart = Chart.getChart('statsChart'); if (chart) { chart.options.plugins.legend.labels.color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary'); chart.update(); }
}
function toggleSetting(toggle) { /* ... (No change) ... */
  toggle.classList.toggle('active'); stats.toggleSwitches++; logActivity(`Setting toggled: ${toggle.previousElementSibling.textContent}`); updateStats();
}
function refreshFact() { /* ... (No change) ... */
  const facts = ["Honey never spoils...", "A group of flamingos...", "Bananas are berries...", "The shortest war...", "A single cloud..."];
  document.getElementById('randomFact').textContent = facts[Math.floor(Math.random() * facts.length)]; logActivity('Random fact refreshed');
}
function refreshQuote() { /* ... (No change) ... */
  const quotes = ["\"The only way to do great work...\" - Steve Jobs", "\"Innovation distinguishes...\" - Steve Jobs", "\"Life is what happens...\" - John Lennon", "\"The future belongs...\" - Eleanor Roosevelt", "\"It is during our darkest moments...\" - Aristotle"];
  document.getElementById('dailyQuote').textContent = quotes[Math.floor(Math.random() * quotes.length)]; logActivity('Daily quote refreshed');
}
function clearNotifications() { /* ... (No change) ... */
  document.getElementById('notificationsList').innerHTML = ''; logActivity('Notifications cleared');
}
function clearActivityLogs() { /* ... (No change) ... */
  if (confirm("Are you sure you want to clear all activity logs?")) { activityLogs = []; updateActivityLogDisplay(); logActivity('Activity logs cleared'); }
}
function saveTextNotes() { /* ... (No change) ... */
  const notes = document.getElementById('textNotes').value; localStorage.setItem('textNotes', notes); showNotification('Notes saved successfully'); logActivity('Text notes saved');
}
function clearTextNotes() { /* ... (No change) ... */
  if (confirm("Are you sure you want to clear your text notes?")) { document.getElementById('textNotes').value = ''; logActivity('Text notes cleared'); }
}
function showNotification(message) { /* ... (No change) ... */
  const notification = document.createElement('div'); notification.className = 'notification'; notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
  document.body.appendChild(notification); setTimeout(() => { notification.remove(); }, 3000);
}
function logout() { /* ... (No change, client-side reload) ... */
  if (confirm('Are you sure you want to logout?')) { logActivity('System logged out'); location.reload(); }
}
function takeScreenshot() { /* ... (No change, client-side only) ... */
    html2canvas(document.body).then(function(canvas) {
        const link = document.createElement('a'); link.download = `screenshot_${Date.now()}.png`; link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showNotification('Screenshot saved!'); logActivity('Screenshot taken'); stats.buttonPresses++; updateStats();
    });
}
function togglePanelsGridVisibility() { /* ... (No change) ... */
    const panelsGrid = document.getElementById('panelsGrid');
    if (panelsGrid.style.display === 'none' || panelsGrid.style.opacity === '0') {
        panelsGrid.style.display = 'grid'; panelsGrid.style.opacity = '1'; showNotification('Sections are now visible.'); logActivity('Sections toggled ON');
    } else {
        panelsGrid.style.opacity = '0'; setTimeout(() => { panelsGrid.style.display = 'none'; }, 300); showNotification('Sections are now hidden.'); logActivity('Sections toggled OFF');
    } stats.buttonPresses++; updateStats();
}

// System Restart (now sends webhook directly from client-side)
async function restartSystem() {
    if (confirm('Are you sure you want to restart the system? You will be logged out and all unsaved data will be lost.')) {
        logActivity('System restarted (client-side)');
        const embeds = createEmbedsFromFields(
            "⚠️ System Restart Initiated", 0xFFFF00, [
                { name: "Triggered By", value: currentUser || "Unknown User (pre-login or guest)", inline: true },
                { name: "Location", value: "Dashboard", inline: true },
                { name: "Time", value: new Date().toLocaleString(), inline: false }
            ]
        );
        await sendWebhook(webhooks.resetInformation, embeds); // Send webhook directly from client
        localStorage.clear();
        location.reload();
    }
}


// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  setupToggles();
  submitBtn.addEventListener('click', (e) => {
    e.preventDefault();
    stats.buttonPresses++;
    attemptLogin();
  });

  resetBtn.addEventListener('click', resetCounter);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (resetPopup.style.display === 'flex') { resetCounter(); }
        else if (!document.getElementById('loginScreen').classList.contains('hidden')) { attemptLogin(); }
    }
  });
  
  document.getElementById('penColor').addEventListener('change', (e) => { currentColor = e.target.value; });
  document.getElementById('penThickness').addEventListener('input', (e) => { currentThickness = parseInt(e.target.value); });
  
  const savedNotes = localStorage.getItem('textNotes'); if (savedNotes) { document.getElementById('textNotes').value = savedNotes; }
  
  document.addEventListener('click', (e) => {
    if ((e.target.tagName === 'BUTTON' && !e.target.closest('.panel-controls') && !e.target.classList.contains('submit-btn')) || e.target.closest('.quick-btn')) {
        stats.buttonPresses++; updateStats();
    }
  });
  
  const today = new Date();
  document.getElementById('importantDateDay').value = today.toISOString().split('T')[0];
  document.getElementById('importantDateTime').value = "09:00";
});
