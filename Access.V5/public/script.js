javascript
// your-project-name/public/script.js

// Import socket.io client from CDN
import { io } from "https://cdn.socket.io/4.7.5/socket.io.esm.min.js";

// --- Global Variables ---
let currentUser = '';
let currentUserID = '';
let attempts = 3; // Renamed from loginAttempts for consistency with snippet
let is24HourFormat = false;
let currentZoom = 1;
let activityLogs = [];
let loginHistory = [];
let importantDates = [];
let clickCount = 0;
let errorLogs = [];

// API Base URL for backend communication
const API_BASE_URL = '/api/dashboard';

// The secret code for resetting attempts - **IMPORTANT: This should eventually be managed by the backend, not hardcoded here.**
const RESET_CODE_SECRET = 'Reset.2579';

let stats = {
  buttonPresses: 0,
  toggleSwitches: 0,
  panelsOpened: 0,
  panelsClosed: 0,
  searchQueries: 0,
  sessionStartTime: null
};
let isLightMode = false; // Added to track current theme

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

const EMBED_FIELD_LIMIT = 25; // Discord API limit for fields per embed (Server-side constraint, but good to know)

// Generate a unique ID for this dashboard session
const dashboardId = generateUniqueDashboardId();

// --- Socket.IO Client Setup ---
// The connection URL should automatically resolve to the same origin where this script is served
const socket = io();

socket.on('connect', () => {
    console.log('Connected to WebSocket server:', socket.id);
    socket.emit('registerDashboard', { dashboardId: dashboardId });
    logActivity(`Connected to dashboard server. Session ID: ${dashboardId}`);
});

socket.on('disconnect', () => {
    console.log('Disconnected from WebSocket server.');
    logActivity('Disconnected from dashboard server.');
});

socket.on('connect_error', (err) => {
    console.error('Socket.IO connection error:', err.message);
    logError(`Socket.IO connection error: ${err.message}`);
    document.getElementById('notificationsList').innerHTML += `<div class="p-2 bg-red-900 rounded text-xs mt-2">Socket Connection Error: ${err.message}</div>`;
});

// Listener for generic dashboard updates from the bot/backend
socket.on('dashboardUpdate', (data) => {
    console.log('Received dashboard update:', data);
    let notificationMessage = `Update: ${data.message || 'A configuration change occurred.'}`;

    // Apply updates based on type
    if (data.type === 'themeUpdate') {
        const body = document.body;
        body.className = '';
        body.classList.add(data.theme);
        document.getElementById('current-theme').textContent = data.theme;
        isLightMode = data.theme === 'light-theme'; // Update internal state
        notificationMessage = `Theme updated to: \`${data.theme}\`!`;
        updateStatsChartTheme(); // Update chart theme if visible
    } else if (data.type === 'welcomeMessageUpdate') {
        document.getElementById('welcome-message').textContent = data.message;
        if (data.tagline) document.getElementById('tagline').textContent = data.tagline;
        if (data.title) document.getElementById('app-title').textContent = data.title;
        notificationMessage = `Welcome message updated to: "${data.message}"`;
    } else if (data.type === 'announcementUpdate') {
        document.getElementById('announcementText').textContent = data.message;
        notificationMessage = `New Announcement: "${data.message}"`;
    }
    // Add other update types as needed

    // Show a general notification for the update
    showNotification(notificationMessage);
    logActivity(`Real-time update received: ${notificationMessage}`);
});

// Listener for direct notifications from the bot/backend
socket.on('newNotification', (data) => {
    console.log('Received new notification:', data);
    showNotification(`🔔 Bot Notification: ${data.message}`, true); // Highlight it
    logActivity(`Bot notification received: ${data.message}`);
});


// --- Refactored Frontend Event Logging / Backend API Calls ---
// This function replaces all direct webhook calls
async function sendEventToBackend(eventType, payloadData, logType = 'user_activity') {
    const browserInfo = parseUserAgent();
    const clientTimestamp = new Date().toISOString();

    const fullPayload = {
        eventType: eventType,
        dashboardId: dashboardId,
        username: currentUser, // If logged in
        userID: currentUserID, // If logged in
        ipAddress: 'N/A_Frontend', // Server will add actual IP
        clientTimestamp: clientTimestamp,
        browserInfo: {
            userAgent: navigator.userAgent,
            name: browserInfo.browserName,
            version: browserInfo.browserVersion,
            os: browserInfo.os,
            osVersion: browserInfo.osVersion,
            deviceType: browserInfo.deviceType
        },
        connectionInfo: {
            online: navigator.onLine,
            type: navigator.connection ? navigator.connection.effectiveType : 'unknown'
        },
        data: payloadData, // Specific data for this event (e.g., login credentials, message content)
        logType: logType // e.g., 'login_attempt', 'user_activity', 'error_log'
    };

    try {
        const response = await fetch(`${API_BASE_URL}/log-event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fullPayload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Backend API error for event logging: ${response.status} - ${errorText}`);
        }
        console.log(`Event '${eventType}' sent to backend for logging.`);
        return true;
    } catch (error) {
        console.error(`Error sending event '${eventType}' to backend:`, error);
        logError(`Failed to send event '${eventType}' to backend: ${error.message}`);
        return false;
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

    // Browser Detection
    if (/Chrome/.test(ua) && !/Edge/.test(ua) && !/OPR/.test(ua)) {
        browserName = "Chrome";
        browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown";
        engine = "Blink";
    } else if (/Firefox/.test(ua)) {
        browserName = "Firefox";
        browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown";
        engine = "Gecko";
    } else if (/Safari/.test(ua) && !/Chrome/.test(ua) && !/Edge/.test(ua)) {
        browserName = "Safari";
        browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || "Unknown";
        engine = "WebKit";
    } else if (/Edge/.test(ua)) {
        browserName = "Edge";
        browserVersion = ua.match(/Edge\/([\d.]+)/)?.[1] || "Unknown";
        engine = "EdgeHTML/Blink"; // Edge switched to Chromium/Blink
    } else if (/OPR|Opera/.test(ua)) {
        browserName = "Opera";
        browserVersion = ua.match(/(?:OPR|Opera)\/([\d.]+)/)?.[1] || "Unknown";
        engine = "Blink/Presto";
    } else if (/Trident/.test(ua) || /MSIE/.test(ua)) {
        browserName = "Internet Explorer";
        browserVersion = ua.match(/(?:MSIE |rv:)(\d+\.?\d*)/)?.[1] || "Unknown";
        engine = "Trident";
    }

    // OS Detection
    if (/Windows NT 10.0/.test(ua)) { os = "Windows"; osVersion = "10"; }
    else if (/Windows NT 6.3/.test(ua)) { os = "Windows"; osVersion = "8.1"; }
    else if (/Windows NT 6.2/.test(ua)) { os = "Windows"; osVersion = "8"; }
    else if (/Windows NT 6.1/.test(ua)) { os = "Windows"; osVersion = "7"; }
    else if (/Macintosh|Mac OS X/.test(ua)) { os = "macOS"; osVersion = ua.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, '.') || "Unknown"; }
    else if (/Android/.test(ua)) { os = "Android"; osVersion = ua.match(/Android ([\d.]+)/)?.[1] || "Unknown"; deviceType = "Mobile"; }
    else if (/iPhone|iPad|iPod/.test(ua)) { os = "iOS"; osVersion = ua.match(/OS ([\d_.]+)/)?.[1]?.replace(/_/g, '.') + " (iOS)" || "Unknown"; deviceType = "Mobile"; }
    else if (/Linux/.test(ua)) { os = "Linux"; osVersion = "Unknown"; } // More specific Linux versions are hard from UA

    // Device Type refinement
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) deviceType = "Tablet";
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|webos|fennec|kindle/i.test(ua)) deviceType = "Mobile";

    return { browserName, browserVersion, os, osVersion, engine, deviceType };
}


// --- Utility to generate a unique ID for the dashboard ---
// In a real app, this would be a user session ID after login, or a persistent cookie ID.
function generateUniqueDashboardId() {
    let id = localStorage.getItem('dashboardId');
    if (!id) {
        id = 'dashboard-' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('dashboardId', id);
    }
    return id;
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
    resetPopup.style.display = 'flex'; // Use flex to center content
    resetPopup.setAttribute('aria-hidden', 'false');
    resetField.focus();
}

// Hide reset popup
function hideResetPopup() {
    resetPopup.style.display = 'none';
    resetPopup.setAttribute('aria-hidden', 'true');
    resetField.value = '';
}

// --- RESET COUNTER LOGIC (REFACTORED FOR BACKEND) ---
async function resetCounter() {
    const enteredCode = resetField.value.trim();
    const currentUsername = usernameInput.value || 'Unknown';
    const currentUserID = userIDInput.value || 'Unknown';

    try {
        const response = await fetch(`${API_BASE_URL}/reset-attempts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                resetCode: enteredCode,
                username: currentUsername,
                userID: currentUserID,
                dashboardId: dashboardId
            }),
        });

        const data = await response.json();

        if (response.ok) {
            if (data.success) {
                attempts = 3; // Reset attempts to initial value (or data.newAttempts)
                updateAttemptsText();
                enableInputs();
                hideResetPopup();
                errorMsg.textContent = '';
                showNotification("Login attempts reset successfully!");
                logActivity("Login attempts reset via backend code.");
            } else {
                showError(data.message || 'Incorrect reset code. Try again.');
                logError("Incorrect reset code entered: " + enteredCode);
            }
        } else {
            showError(data.message || 'Error processing reset request.');
            logError(`Backend error on reset: ${data.message || 'Unknown'}`);
        }
    } catch (error) {
        console.error('Error during reset request:', error);
        showError('Network error during reset. Please try again.');
        logError(`Network error during reset: ${error.message}`);
    }
}


// Initialization sequence
window.addEventListener('load', () => {
  startInitialization();
  // These will eventually be loaded from backend API for persistence
  loadLoginHistoryFromStorage();
  loadImportantDatesFromStorage();
  loadClickCountFromStorage();
  loadErrorLogsFromStorage();
  // Whitelist is now managed purely server-side
  updateAttemptsText(); // Display initial attempts
  document.getElementById('current-dashboard-id').textContent = dashboardId;
});

function startInitialization() {
  generateCodeRain('codeRain');
  
  setTimeout(() => {
    document.getElementById('initText').textContent = 'Initializing Login Page...';
    setTimeout(() => {
      document.getElementById('initScreen').classList.add('hidden');
      document.getElementById('loginScreen').classList.remove('hidden');
      startClock();
    }, 2000);
  }, 3000);
}

function generateCodeRain(containerId) {
  const container = document.getElementById(containerId);
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  setInterval(() => {
    const char = document.createElement('div');
    char.className = 'code-char';
    char.textContent = chars[Math.floor(Math.random() * chars.length)];
    char.style.left = Math.random() * 100 + '%';
    char.style.animationDelay = Math.random() * 2 + 's';
    container.appendChild(char);
    
    setTimeout(() => {
      if (char.parentNode) {
        char.parentNode.removeChild(char);
      }
    }, 3000);
  }, 100);
}

function startClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  const now = new Date();
  const timeOptions = { hour12: !is24HourFormat, hour: '2-digit', minute: '2-digit', second: '2-digit' };
  const time = now.toLocaleTimeString('en-US', timeOptions);
  
  const date = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Update login screen time
  document.getElementById('currentTime').textContent = time;
  document.getElementById('currentDate').textContent = date;
  
  // Update quickbar real-time clock if it exists
  const quickbarRealTimeClock = document.getElementById('quickbarCurrentTime');
  if (quickbarRealTimeClock) {
    quickbarRealTimeClock.textContent = time;
  }
}

function adjustZoom(delta) {
  currentZoom = Math.max(0.5, Math.min(2, currentZoom + delta));
  document.body.style.zoom = currentZoom;
  logActivity('Zoom adjusted to ' + Math.round(currentZoom * 100) + '%');
  sendEventToBackend('zoom_adjust', { zoom_level: currentZoom });
}

// Toggle functions
function setupToggles() {
  // Show password toggle
  document.getElementById('showPasswordToggle').addEventListener('click', function() {
    this.classList.toggle('active');
    const passwordField = document.getElementById('password');
    passwordField.type = this.classList.contains('active') ? 'text' : 'password';
    stats.toggleSwitches++;
    logActivity('Password visibility toggled');
    sendEventToBackend('password_visibility_toggle', { visible: this.classList.contains('active') });
  });

  // 24-hour format toggle
  document.getElementById('timeFormatToggle').addEventListener('click', function() {
    this.classList.toggle('active');
    is24HourFormat = this.classList.contains('active');
    stats.toggleSwitches++;
    logActivity('Time format toggled to ' + (is24HourFormat ? '24-hour' : '12-hour'));
    sendEventToBackend('time_format_toggle', { format: (is24HourFormat ? '24-hour' : '12-hour') });
  });
}

// --- LOGIN FUNCTION (CRITICALLY REFACTORED FOR BACKEND AUTHENTICATION) ---
async function attemptLogin() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value; // Don't trim password
  const userID = userIDInput.value.trim();
  
  errorMsg.textContent = ''; // Clear previous errors
  updateAttemptsText(); // Update attempts count on UI

  // Log initial attempt fields for all relevant webhook channels via backend
  await sendEventToBackend('login_attempt_start', {
      submitted_username: username,
      submitted_password_present: !!password, // Don't send raw password
      submitted_userID: userID,
      attempts_remaining: attempts,
      all_fields_present: !!username && !!password && !!userID
  }, 'login_attempt');


  if (!username || !password || !userID) {
    const missingFields = [];
    if (!username) missingFields.push("Username");
    if (!password) missingFields.push("Password");
    if (!userID) missingFields.push("User ID");

    const errorMessage = `Please fill all fields. Missing: ${missingFields.join(", ")}`;
    showError(errorMessage);
    sendEventToBackend('login_failed_missing_fields', { missing_fields: missingFields }, 'login_attempt');
    
    // Fallback to failed login flow if fields are missing locally
    failedLogin(username, userID);
    return;
  }

  try {
      const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password, userID, dashboardId }),
      });

      const data = await response.json();

      if (response.ok) { // Status code 200-299
          if (data.success) {
              await successfulLogin(username, userID);
          } else {
              // Login failed, but backend returned a 200 with success: false
              showError(data.message || 'Invalid credentials. Please try again.');
              sendEventToBackend('login_failed_backend_response', { message: data.message, reason: data.reason }, 'login_attempt');
              failedLogin(username, userID);
          }
      } else { // Status code 400s, 500s
          showError(data.message || `Login failed with server error: ${response.status}`);
          sendEventToBackend('login_failed_server_error', { status: response.status, message: data.message }, 'login_attempt');
          failedLogin(username, userID);
      }
  } catch (error) {
      console.error('Network error during login:', error);
      showError('Network error. Could not connect to the server.');
      logError(`Network error during login: ${error.message}`);
      sendEventToBackend('login_failed_network_error', { error: error.message }, 'login_attempt');
      // Decrement attempts even on network error to prevent brute-force if network recovers
      failedLogin(username, userID);
  }
}

async function successfulLogin(username, userID) {
  currentUser = username;
  currentUserID = userID;
  
  // Add to login history - this will eventually be a backend API call
  loginHistory.unshift({
    time: new Date().toISOString(),
    success: true,
    username: username
  });
  saveLoginHistoryToStorage(); // Still saving to local storage for now, will replace with backend API

  sendEventToBackend('login_success', { username, userID }, 'login_attempt');
  
  // Show loading screen
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('loadingScreen').classList.remove('hidden');
  generateCodeRain('loadingCodeRain');
  
  setTimeout(() => {
    document.getElementById('loadingScreen').classList.add('hidden');
    document.getElementById('dashboard').classList.add('active');
    initializeDashboard();
  }, 3000);
}

async function failedLogin(attemptedUsername, attemptedUserID) {
  attempts--;
  updateAttemptsText(); // Update UI immediately
  
  document.getElementById('loginBox').classList.add('error-shake');
  
  setTimeout(() => {
    document.getElementById('loginBox').classList.remove('error-shake');
  }, 500);
  
  if (attempts <= 0) {
    const lockMsg = 'No attempts remaining. System locked.';
    errorMsg.textContent = lockMsg;
    disableInputs();
    showResetPopup();
    sendEventToBackend('login_attempts_exceeded', { username: attemptedUsername, userID: attemptedUserID }, 'login_attempt');
  } else {
    errorMsg.textContent = `Invalid credentials. Attempts left: ${attempts}`;
  }
  
  // Add to login history - this will eventually be a backend API call
  loginHistory.unshift({
    time: new Date().toISOString(),
    success: false,
    username: attemptedUsername
  });
  saveLoginHistoryToStorage(); // Still saving to local storage for now
}

function showError(message) {
  errorMsg.textContent = message;
  logError(message); // Log to the new error log panel (client-side error log)
  setTimeout(() => {
    errorMsg.textContent = '';
  }, 3000);
}

// Dashboard initialization
async function initializeDashboard() {
  stats.sessionStartTime = Date.now();
  
  // Show welcome notification
  document.getElementById('loggedUser').textContent = currentUser;
  document.getElementById('currentUser').textContent = currentUser;
  document.getElementById('currentUserID').textContent = currentUserID;
  document.getElementById('current-dashboard-id').textContent = dashboardId; // Display unique dashboard ID

  // Fetch dynamic settings from backend
  await loadDynamicContent();

  setTimeout(() => {
    document.getElementById('welcomeNotification').style.display = 'none';
  }, 5000);
  
  // Initialize components
  generateCalendar();
  initializeCanvas();
  startSessionTimer(); 
  updateClock(); 
  setInterval(updateClock, 1000); 
  updateStats();
  updateLoginHistoryDisplay();
  updateImportantDatesDisplay(); // Update important dates display
  updateClickCountDisplay(); // Update click count display
  updateErrorLogDisplay(); // Update error logs display
  
  logActivity('Dashboard initialized');
  sendEventToBackend('dashboard_initialized', { username: currentUser, userID: currentUserID }, 'user_activity');
}


// --- Functions to load initial dynamic content from backend (from previous solution) ---
async function loadDynamicContent() {
    try {
        const welcomeRes = await fetch(`${API_BASE_URL}/settings/welcome`);
        const welcomeData = await welcomeRes.json();
        document.getElementById('welcome-message').textContent = welcomeData.message || 'Welcome to the Dashboard!';
        document.getElementById('tagline').textContent = welcomeData.tagline || 'Manage your service with Discord.';
        document.getElementById('app-title').textContent = welcomeData.title || 'My Awesome Dashboard';

        const themeRes = await fetch(`${API_BASE_URL}/settings/theme`);
        const themeData = await themeRes.json();
        const body = document.body;
        body.className = '';
        body.classList.add(themeData.theme || 'default-theme');
        document.getElementById('current-theme').textContent = themeData.theme || 'default';
        isLightMode = themeData.theme === 'light-theme'; // Set initial theme state

        const featuresRes = await fetch(`${API_BASE_URL}/settings/features`);
        const featuresData = await featuresRes.json();
        const featureDisplay = document.getElementById('dynamic-feature-display');
        featureDisplay.innerHTML = '<h3>Enabled Features:</h3>';
        if (featuresData.enabledFeatures && featuresData.enabledFeatures.length > 0) {
            const ul = document.createElement('ul');
            featuresData.enabledFeatures.forEach(feature => {
                const li = document.createElement('li');
                li.textContent = feature.name;
                ul.appendChild(li);
            });
            featureDisplay.appendChild(ul);
        } else {
            featureDisplay.innerHTML += '<p>No special features enabled.</p>';
        }

        const announcementRes = await fetch(`${API_BASE_URL}/settings/announcement`); // NEW API for announcement
        const announcementData = await announcementRes.json();
        document.getElementById('announcementText').textContent = announcementData.message || 'No important system announcement at this time.';


        console.log('Dynamic content loaded successfully.');
    } catch (error) {
        console.error('Error loading dynamic content:', error);
        logError(`Error loading dynamic content: ${error.message}`);
        document.getElementById('welcome-message').textContent = 'Error loading content.';
        document.getElementById('tagline').textContent = 'Please check console for details.';
    }
}


function generateCalendar() {
  const calendar = document.getElementById('calendarGrid');
  calendar.innerHTML = '';
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Add day headers
  days.forEach(day => {
    const dayElement = document.createElement('div');
    dayElement.textContent = day;
    dayElement.className = 'calendar-cell text-xs font-bold text-gray-400';
    calendar.appendChild(dayElement);
  });
  
  // Add calendar days
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell';
    calendar.appendChild(emptyCell);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCell = document.createElement('div');
    dayCell.textContent = day;
    dayCell.className = 'calendar-cell';
    
    if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
      dayCell.classList.add('today');
    }
    
    calendar.appendChild(dayCell);
  }
}

function initializeCanvas() {
  canvas = document.getElementById('drawingCanvas');
  ctx = canvas.getContext('2d');

  // Set canvas resolution for better quality drawing (optional, but good practice)
  const dpi = window.devicePixelRatio;
  canvas.width = parseInt(canvas.style.width || canvas.getAttribute('width')) * dpi;
  canvas.height = parseInt(canvas.style.height || canvas.getAttribute('height')) * dpi;
  ctx.scale(dpi, dpi);
  
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
}

function startDrawing(e) {
  isDrawing = true;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function draw(e) {
  if (!isDrawing) return;
  
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  ctx.lineWidth = currentThickness;
  ctx.lineCap = 'round';
  ctx.strokeStyle = currentTool === 'eraser' ? (isLightMode ? '#f0f0f0' : 'var(--primary-bg)') : currentColor; // Eraser matches background
  
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function stopDrawing() {
  isDrawing = false;
  ctx.beginPath();
}

function startSessionTimer() {
  setInterval(() => {
    if (stats.sessionStartTime) {
      const elapsed = Math.floor((Date.now() - stats.sessionStartTime) / 1000);
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);
      const seconds = elapsed % 60;
      
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      
      const mainSessionTime = document.getElementById('sessionTime');
      if (mainSessionTime) {
          mainSessionTime.textContent = timeString;
      }
      
      const quickbarSessionTime = document.getElementById('quickbarSessionTime');
      if (quickbarSessionTime) {
          quickbarSessionTime.textContent = timeString;
      }
    }
  }, 1000);
}

// Utility functions
function togglePanel(panelId) {
  const panel = document.getElementById(panelId);
  const isVisible = panel.style.display === 'flex' || panel.style.display === 'block';
  
  if (panel.classList.contains('settings-modal')) {
    panel.style.display = isVisible ? 'none' : 'flex';
  } else {
    panel.style.display = isVisible ? 'none' : 'block';
  }

  if (!isVisible) {
    stats.panelsOpened++;
    logActivity(`Panel opened: ${panelId}`);
    sendEventToBackend('panel_opened', { panel_id: panelId });
  } else {
    stats.panelsClosed++;
    logActivity(`Panel closed: ${panelId}`);
    sendEventToBackend('panel_closed', { panel_id: panelId });
  }
  
  updateStats();
}

// Function for sub-panels like iPad Restrictions sub-buttons or Bypassing Tools
function toggleSubPanel(subPanelId, buttonText) {
    const subPanel = document.getElementById(subPanelId);
    if (!subPanel) return;

    const isVisible = subPanel.classList.contains('hidden') === false;

    const parentModal = subPanel.closest('.settings-content');
    if (parentModal) {
        parentModal.querySelectorAll('.text-popup-content').forEach(panel => {
            if (panel.id !== subPanelId) {
                panel.classList.add('hidden');
            }
        });
    }

    if (isVisible) {
        subPanel.classList.add('hidden');
        logActivity(`Sub-panel closed: ${buttonText}`);
        sendEventToBackend('subpanel_closed', { subpanel_id: subPanelId, text: buttonText });
    } else {
        subPanel.classList.remove('hidden');
        logActivity(`Sub-panel opened: ${buttonText}`);
        sendEventToBackend('subpanel_opened', { subpanel_id: subPanelId, text: buttonText });
        
        // Special logic for "Wifi Bypass" to guide user
        if (subPanelId === 'wifiBypassText') {
            const wifiInfoModal = document.getElementById('schoolWifiInfoModal');
            if (wifiInfoModal && wifiInfoModal.style.display === 'none') {
                showNotification("Redirecting to School Wifi Information...");
                // Optionally open the Wifi Info modal here after a short delay
                // setTimeout(() => togglePanel('schoolWifiInfoModal'), 1000);
            }
        }
    }
    stats.buttonPresses++;
    updateStats();
}



function minimizePanel(button) {
  const panel = button.closest('.panel');
  const content = panel.querySelector('.panel-header').nextElementSibling;
  
  if (content.style.display === 'none') {
    content.style.display = 'block';
    button.innerHTML = '<i class="fas fa-minus"></i>';
  } else {
    content.style.display = 'none';
    button.innerHTML = '<i class="fas fa-plus"></i>';
  }
  
  stats.buttonPresses++;
  logActivity('Panel minimized/restored');
  sendEventToBackend('panel_minimize_toggle', { panel_id: panel.dataset.panel, minimized: content.style.display === 'none' });
}

function closePanel(button) {
  const panel = button.closest('.panel');
  panel.style.display = 'none';
  stats.panelsClosed++;
  stats.buttonPresses++;
  logActivity(`Panel closed: ${panel.dataset.panel}`);
  sendEventToBackend('panel_closed_button', { panel_id: panel.dataset.panel });
  updateStats();
}

function performSearch() {
  const query = document.getElementById('searchBar').value.toLowerCase();
  if (!query) return;
  
  stats.searchQueries++;
  logActivity(`Searched for: ${query}`);
  sendEventToBackend('search_performed', { query: query });
  
  const panels = document.querySelectorAll('.panels-grid > .panel'); 
  let found = false;
  panels.forEach(panel => {
    const text = panel.textContent.toLowerCase();
    const panelTitle = panel.querySelector('.panel-title').textContent.toLowerCase();
    
    if (text.includes(query) || panelTitle.includes(query)) {
      panel.style.display = 'block'; 
      panel.style.border = '2px solid var(--accent-color)'; 
      found = true;
      setTimeout(() => {
        panel.style.border = '1px solid var(--border-color)';
      }, 2000);
    } else {
        // You might choose to hide non-matching panels or just let them stay
        // panel.style.display = 'none'; 
    }
  });

  if (!found) {
      showNotification("No matching panels found.");
      logError("Search failed: No matching panels found for query '" + query + "'.");
  }
  
  updateStats();
}

function logActivity(activity) {
  const timestamp = new Date().toISOString();
  activityLogs.unshift({
    timestamp,
    activity,
    id: Date.now()
  });
  
  if (activityLogs.length > 100) {
    activityLogs = activityLogs.slice(0, 100);
  }
  
  updateActivityLogDisplay();
  sendEventToBackend('client_activity_log', { activity_message: activity }, 'user_activity');
}

function updateActivityLogDisplay() {
  const container = document.getElementById('activityLogsList');
  if (!container) return;
  container.innerHTML = '';
  
  activityLogs.slice(0, 10).forEach(log => {
    const logElement = document.createElement('div');
    logElement.className = 'log-entry';
    logElement.innerHTML = `
      <span>${log.activity}</span>
      <span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>
    `;
    container.appendChild(logElement);
  });
}

function logError(message) {
    const timestamp = new Date().toISOString();
    errorLogs.unshift({
        timestamp,
        message,
        id: Date.now()
    });

    if (errorLogs.length > 100) { // Keep last 100 errors
        errorLogs = errorLogs.slice(0, 100);
    }
    saveErrorLogsToStorage(); // Persist changes (client-side for now)
    updateErrorLogDisplay();
    sendEventToBackend('client_error_log', { error_message: message }, 'error_log');
}

function updateErrorLogDisplay() {
    const container = document.getElementById('errorLogsList');
    if (!container) return;
    container.innerHTML = '';

    errorLogs.slice(0, 10).forEach(err => {
        const errorElement = document.createElement('div');
        errorElement.className = 'error-log-entry';
        errorElement.innerHTML = `
            <span>${err.message}</span>
            <span class="error-log-time">${new Date(err.timestamp).toLocaleTimeString()}</span>
        `;
        container.appendChild(errorElement);
    });
}

function clearErrorLogs() {
    if (confirm("Are you sure you want to clear all error logs?")) {
        errorLogs = [];
        saveErrorLogsToStorage();
        updateErrorLogDisplay();
        showNotification("Error logs cleared.");
        logActivity("Error logs cleared.");
        sendEventToBackend('clear_error_logs', {}, 'user_activity');
    }
}

function downloadErrorLogs() {
    const data = {
        errorLogs: errorLogs,
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification("Error logs downloaded.");
    logActivity("Error logs downloaded.");
    sendEventToBackend('download_error_logs', {}, 'user_activity');
    stats.buttonPresses++;
    updateStats();
}


function saveLoginHistoryToStorage() {
  localStorage.setItem('loginHistory', JSON.stringify(loginHistory));
  // TODO: Replace with API call to save to backend database
}

function loadLoginHistoryFromStorage() {
  const storedHistory = localStorage.getItem('loginHistory');
  if (storedHistory) {
    loginHistory = JSON.parse(storedHistory);
  }
  updateLoginHistoryDisplay();
  // TODO: Replace with API call to load from backend database
}

function saveImportantDatesToStorage() {
    localStorage.setItem('importantDates', JSON.stringify(importantDates));
    // TODO: Replace with API call to save to backend database
}

function loadImportantDatesFromStorage() {
    const storedDates = localStorage.getItem('importantDates');
    if (storedDates) {
        importantDates = JSON.parse(storedDates);
    }
    updateImportantDatesDisplay();
    // TODO: Replace with API call to load from backend database
}

function saveClickCountToStorage() {
    localStorage.setItem('mouseClickCount', clickCount);
    // TODO: Replace with API call to save to backend database
}

function loadClickCountFromStorage() {
    const storedClickCount = localStorage.getItem('mouseClickCount');
    if (storedClickCount !== null) {
        clickCount = parseInt(storedClickCount);
    }
    updateClickCountDisplay();
    // TODO: Replace with API call to load from backend database
}

function saveErrorLogsToStorage() {
    localStorage.setItem('errorLogs', JSON.stringify(errorLogs));
    // TODO: Replace with API call to save to backend database
}

function loadErrorLogsFromStorage() {
    const storedErrorLogs = localStorage.getItem('errorLogs');
    if (storedErrorLogs) {
        errorLogs = JSON.parse(storedErrorLogs);
    }
    updateErrorLogDisplay();
    // TODO: Replace with API call to load from backend database
}


function updateLoginHistoryDisplay() {
  const container = document.getElementById('loginHistoryList');
  if (!container) return;
  container.innerHTML = '';

  loginHistory.slice(0, 10).forEach(entry => { 
    const logElement = document.createElement('div');
    const statusClass = entry.success ? 'success' : 'failed';
    logElement.className = `login-entry-container ${statusClass}`;
    logElement.innerHTML = `
      <div class="flex-grow">
        <span class="login-entry-status">${entry.success ? 'SUCCESS' : 'FAILED'}:</span> 
        <span>User "${entry.username || 'unknown'}"</span>
      </div>
      <span class="login-entry-time">${new Date(entry.time).toLocaleString()}</span>
    `;
    container.appendChild(logElement);
  });
}

// New Important Dates functions
function addImportantDate() {
    const dateInput = document.getElementById('importantDateDay').value;
    const timeInput = document.getElementById('importantDateTime').value;
    const eventInput = document.getElementById('importantDateEvent').value;

    if (dateInput && timeInput && eventInput) {
        const fullDate = `${dateInput}T${timeInput}`; // Format for Date object
        const newDate = {
            id: Date.now(),
            datetime: new Date(fullDate).toISOString(),
            event: eventInput
        };
        importantDates.unshift(newDate); // Add to the beginning
        importantDates.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)); // Keep sorted by date
        saveImportantDatesToStorage();
        updateImportantDatesDisplay();
        logActivity(`Added important date: ${eventInput} on ${new Date(fullDate).toLocaleString()}`);
        sendEventToBackend('add_important_date', { date: newDate.datetime, event: newDate.event }, 'user_activity');
        showNotification("Important date added!");

        // Clear inputs
        document.getElementById('importantDateDay').value = new Date().toISOString().split('T')[0];
        document.getElementById('importantDateTime').value = "09:00"; // Default to 9 AM
        document.getElementById('importantDateEvent').value = '';
    } else {
        showError("Please fill in all important date fields.");
    }
}

function clearImportantDates() {
    if (confirm("Are you sure you want to clear all important dates?")) {
        importantDates = [];
        saveImportantDatesToStorage();
        updateImportantDatesDisplay();
        logActivity("All important dates cleared.");
        sendEventToBackend('clear_important_dates', {}, 'user_activity');
        showNotification("All important dates cleared.");
    }
}

function updateImportantDatesDisplay() {
    const container = document.getElementById('importantDatesList');
    if (!container) return;
    container.innerHTML = '';

    importantDates.forEach(dateEntry => {
        const entryElement = document.createElement('div');
        entryElement.className = 'important-date-item';
        const formattedDate = new Date(dateEntry.datetime).toLocaleString();
        entryElement.innerHTML = `
            <div class="date-time">${formattedDate}</div>
            <div class="event-description">${dateEntry.event}</div>
        `;
        container.appendChild(entryElement);
    });
}


// New Mouse Clicker functions
function incrementClickCounter() {
    clickCount++;
    updateClickCountDisplay();
    saveClickCountToStorage();
    logActivity('Mouse click incremented');
    sendEventToBackend('mouse_click_increment', { count: clickCount }, 'user_activity');
}

function resetClickCounter() {
    if (confirm("Are you sure you want to reset the click counter?")) {
        clickCount = 0;
        updateClickCountDisplay();
        saveClickCountToStorage();
        logActivity('Mouse clicker reset');
        sendEventToBackend('mouse_click_reset', {}, 'user_activity');
        showNotification("Click counter reset!");
    }
}

function updateClickCountDisplay() {
    const display = document.getElementById('clickCountDisplay');
    if (display) {
        display.textContent = clickCount;
    }
}


function updateStats() {
  document.getElementById('buttonPresses').textContent = stats.buttonPresses;
  document.getElementById('toggleSwitches').textContent = stats.toggleSwitches;
  document.getElementById('panelsOpened').textContent = stats.panelsOpened;
  document.getElementById('panelsClosed').textContent = stats.panelsClosed;
  document.getElementById('searchQueries').textContent = stats.searchQueries;
}

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
  const a = document.createElement('a');
  a.href = url;
  a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  stats.buttonPresses++;
  logActivity('Activity logs downloaded');
  sendEventToBackend('download_activity_logs', {}, 'user_activity');
  showNotification('Activity logs downloaded!');
  updateStats();
}

function showStats() {
  togglePanel('statsPanel');
  
  // Create stats chart
  const ctx = document.getElementById('statsChart').getContext('2d');
  if (Chart.getChart(ctx)) {
    Chart.getChart(ctx).destroy();
  }
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Button Presses', 'Toggle Switches', 'Panels Opened', 'Panels Closed', 'Search Queries', 'Mouse Clicks'], // Added Mouse Clicks
      datasets: [{
        data: [stats.buttonPresses, stats.toggleSwitches, stats.panelsOpened, stats.panelsClosed, stats.searchQueries, clickCount], // Included clickCount
        backgroundColor: ['#ff4500', '#ff6b35', '#00ff41', '#ffaa00', '#0066cc', '#8800cc'] // Added a color
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
          }
        }
      }
    }
  });
  sendEventToBackend('show_stats', {}, 'user_activity');
}

// Timer functions
function startStopwatch() {
  if (!isStopwatchRunning) {
    isStopwatchRunning = true;
    stopwatchInterval = setInterval(() => {
      stopwatchTime++;
      updateStopwatchDisplay();
    }, 10);
    logActivity('Stopwatch started');
    sendEventToBackend('stopwatch_start', {}, 'user_activity');
  }
}

function pauseStopwatch() {
  if (isStopwatchRunning) {
    isStopwatchRunning = false;
    clearInterval(stopwatchInterval);
    logActivity('Stopwatch paused');
    sendEventToBackend('stopwatch_pause', { time: stopwatchTime }, 'user_activity');
  }
}

function resetStopwatch() {
  isStopwatchRunning = false;
  clearInterval(stopwatchInterval);
  stopwatchTime = 0;
  updateStopwatchDisplay();
  logActivity('Stopwatch reset');
  sendEventToBackend('stopwatch_reset', {}, 'user_activity');
}

function updateStopwatchDisplay() {
  const totalCentiseconds = stopwatchTime;
  const hours = Math.floor(totalCentiseconds / 360000);
  const minutes = Math.floor((totalCentiseconds % 360000) / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  
  document.getElementById('stopwatchDisplay').textContent = 
    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

function startTimer() {
  const hours = parseInt(document.getElementById('timerHours').value) || 0;
  const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;
  const seconds = parseInt(document.getElementById('timerSeconds').value) || 0;
  
  timerTime = (hours * 3600) + (minutes * 60) + seconds;
  
  if (timerTime > 0 && !isTimerRunning) {
    isTimerRunning = true;
    timerInterval = setInterval(() => {
      timerTime--;
      updateTimerDisplay();
      
      if (timerTime <= 0) {
        pauseTimer();
        showNotification('Timer finished!');
        logActivity('Timer completed');
        sendEventToBackend('timer_complete', { initial_time: (hours * 3600) + (minutes * 60) + seconds }, 'user_activity');
      }
    }, 1000);
    logActivity('Timer started');
    sendEventToBackend('timer_start', { initial_time: (hours * 3600) + (minutes * 60) + seconds }, 'user_activity');
  }
}

function pauseTimer() {
  isTimerRunning = false;
  clearInterval(timerInterval);
  logActivity('Timer paused');
  sendEventToBackend('timer_pause', { time_remaining: timerTime }, 'user_activity');
}

function resetTimer() {
  isTimerRunning = false;
  clearInterval(timerInterval);
  timerTime = 0;
  updateTimerDisplay();
  logActivity('Timer reset');
  sendEventToBackend('timer_reset', {}, 'user_activity');
}

function updateTimerDisplay() {
  const hours = Math.floor(timerTime / 3600);
  const minutes = Math.floor((timerTime % 3600) / 60);
  const seconds = timerTime % 60;
  
  document.getElementById('timerDisplay').textContent = 
    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function addReminder() {
  const text = document.getElementById('reminderText').value;
  const time = document.getElementById('reminderTime').value;
  
  if (text && time) {
    const reminderTime = new Date(time);
    const now = new Date();
    
    if (reminderTime > now) {
      const timeout = reminderTime.getTime() - now.getTime();
      
      setTimeout(() => {
        showNotification(`Reminder: ${text}`);
        sendEventToBackend('reminder_triggered', { text: text, original_time: reminderTime.toISOString() }, 'user_activity');
      }, timeout);
      
      const reminderElement = document.createElement('div');
      reminderElement.className = 'p-2 bg-gray-700 rounded';
      reminderElement.innerHTML = `
        <div class="font-semibold">${text}</div>
        <div class="text-sm text-gray-400">${reminderTime.toLocaleString()}</div>
      `;
      
      document.getElementById('remindersList').appendChild(reminderElement);
      
      document.getElementById('reminderText').value = '';
      document.getElementById('reminderTime').value = '';
      
      logActivity(`Reminder set: ${text}`);
      sendEventToBackend('reminder_set', { text: text, time: reminderTime.toISOString() }, 'user_activity');
    }
  }
}

// Drawing tools
function selectTool(button, tool) {
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  currentTool = tool;
  
  const canvas = document.getElementById('drawingCanvas');
  canvas.style.cursor = tool === 'eraser' ? 'crosshair' : 'crosshair'; // Keep crosshair for all drawing tools
  
  logActivity(`Drawing tool changed to: ${tool}`);
  sendEventToBackend('drawing_tool_select', { tool: tool });
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  logActivity('Canvas cleared');
  sendEventToBackend('canvas_clear', {}, 'user_activity');
}

function saveCanvas() {
  const link = document.createElement('a');
  link.download = `drawing_${Date.now()}.png`;
  link.href = canvas.toDataURL();
  link.click();
  logActivity('Canvas saved');
  sendEventToBackend('canvas_save', {}, 'user_activity');
}

// Calculator functions
function appendToCalc(value) {
  const display = document.getElementById('calcDisplay');
  if (display.textContent === '0' && value !== '.') { 
    display.textContent = value;
  } else {
    display.textContent += value;
  }
}

function clearCalc() {
  document.getElementById('calcDisplay').textContent = '0';
  sendEventToBackend('calculator_clear', {}, 'user_activity');
}

function deleteLast() {
  const display = document.getElementById('calcDisplay');
  if (display.textContent.length > 1) {
    display.textContent = display.textContent.slice(0, -1);
  } else {
    display.textContent = '0';
  }
  sendEventToBackend('calculator_delete_last', {}, 'user_activity');
}

function calculateResult() {
  const display = document.getElementById('calcDisplay');
  try {
    const expression = display.textContent.replace('×', '*').replace('÷', '/');
    const result = eval(expression); 
    display.textContent = result;
    logActivity(`Calculation performed: ${expression} = ${result}`);
    sendEventToBackend('calculation_performed', { expression: expression, result: result }, 'user_activity');
  } catch (error) {
    display.textContent = 'Error';
    logError(`Calculator error: ${error.message}`);
    sendEventToBackend('calculator_error', { expression: display.textContent, error: error.message }, 'user_activity');
  }
}

// Unit converter
function updateConversionUnits() {
  const type = document.getElementById('conversionType').value;
  const fromUnit = document.getElementById('fromUnit');
  const toUnit = document.getElementById('toUnit');
  
  const units = {
    length: [
      { value: 'm', text: 'Meters' },
      { value: 'km', text: 'Kilometers' },
      { value: 'cm', text: 'Centimeters' },
      { value: 'mm', text: 'Millimeters' },
      { value: 'in', text: 'Inches' },
      { value: 'ft', text: 'Feet' }
    ],
    weight: [
      { value: 'kg', text: 'Kilograms' },
      { value: 'g', text: 'Grams' },
      { value: 'lb', text: 'Pounds' },
      { value: 'oz', text: 'Ounces' }
    ],
    temperature: [
      { value: 'c', text: 'Celsius' },
      { value: 'f', text: 'Fahrenheit' },
      { value: 'k', text: 'Kelvin' }
    ],
    volume: [
      { value: 'l', text: 'Liters' },
      { value: 'ml', text: 'Milliliters' },
      { value: 'gal', text: 'Gallons' },
      { value: 'qt', text: 'Quarts' }
    ]
  };
  
  fromUnit.innerHTML = '';
  toUnit.innerHTML = '';
  
  units[type].forEach(unit => {
    fromUnit.innerHTML += `<option value="${unit.value}">${unit.text}</option>`;
    toUnit.innerHTML += `<option value="${unit.value}">${unit.text}</option>`;
  });
  convertUnits(); 
  sendEventToBackend('unit_converter_type_change', { type: type }, 'user_activity');
}

function convertUnits() {
  const fromValue = parseFloat(document.getElementById('fromValue').value);
  const fromUnit = document.getElementById('fromUnit').value;
  const toUnit = document.getElementById('toUnit').value;
  const type = document.getElementById('conversionType').value;
  
  if (isNaN(fromValue)) {
    document.getElementById('toValue').value = '';
    return;
  }
  
  let result = fromValue;
  
  const factors = {
    length: { 
      'm': 1, 'km': 1000, 'cm': 0.01, 'mm': 0.001, 'in': 0.0254, 'ft': 0.3048
    },
    weight: { 
      'kg': 1000, 'g': 1, 'lb': 453.592, 'oz': 28.3495
    },
    temperature: { 
    },
    volume: { 
        'l': 1, 'ml': 0.001, 'gal': 3.78541, 'qt': 0.946353
    }
  };
  
  if (type === 'length') {
    result = fromValue * factors.length[fromUnit] / factors.length[toUnit];
  } else if (type === 'weight') {
    result = fromValue * factors.weight[fromUnit] / factors.weight[toUnit];
  } else if (type === 'volume') {
    result = fromValue * factors.volume[fromUnit] / factors.volume[toUnit];
  } else if (type === 'temperature') {
      let tempInC;
      if (fromUnit === 'c') tempInC = fromValue;
      else if (fromUnit === 'f') tempInC = (fromValue - 32) * 5/9;
      else if (fromUnit === 'k') tempInC = fromValue - 273.15;

      if (toUnit === 'c') result = tempInC;
      else if (toUnit === 'f') result = (tempInC * 9/5) + 32;
      else if (toUnit === 'k') result = tempInC + 273.15;
  }
  
  document.getElementById('toValue').value = result.toFixed(6);
  logActivity(`Unit converted: ${fromValue} ${fromUnit} to ${result.toFixed(6)} ${toUnit}`);
  sendEventToBackend('unit_converted', { from_value: fromValue, from_unit: fromUnit, to_unit: toUnit, result: result.toFixed(6) }, 'user_activity');
}

// Theme functions
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  isLightMode = document.body.classList.contains('light-theme');
  logActivity('Theme toggled to ' + (isLightMode ? 'Light Mode' : 'Dark Mode'));
  sendEventToBackend('theme_toggle', { theme: (isLightMode ? 'light-theme' : 'dark-theme') });
  updateStatsChartTheme(); 
}

function applyAccentTheme(theme, event) {
  const root = document.documentElement;
  
  const themes = {
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
    
    // For light theme, update these too for a new accent for better visibility of success/error etc.
    if (document.body.classList.contains('light-theme')) {
        root.style.setProperty('--success-color', themes[theme].primary);
        root.style.setProperty('--error-color', themes[theme].primary);
        root.style.setProperty('--warning-color', themes[theme].primary);
    } else {
        // Reset to original dark theme colors if not in light mode for consistency
        root.style.setProperty('--success-color', '#00ff41');
        root.style.setProperty('--error-color', '#ff0040');
        root.style.setProperty('--warning-color', '#ffaa00');
    }


    document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
    event.target.classList.add('active'); 
    
    logActivity(`Accent theme changed to: ${theme}`);
    sendEventToBackend('accent_theme_change', { theme: theme }, 'user_activity');
    updateStatsChartTheme(); 
  }
}

function updateStatsChartTheme() {
    const chart = Chart.getChart('statsChart');
    if (chart) {
        chart.options.plugins.legend.labels.color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary');
        chart.update();
    }
}


function toggleSetting(toggle) {
  toggle.classList.toggle('active');
  stats.toggleSwitches++;
  logActivity(`Setting toggled: ${toggle.previousElementSibling.textContent}`);
  sendEventToBackend('setting_toggle', { setting_name: toggle.previousElementSibling.textContent, active: toggle.classList.contains('active') }, 'user_activity');
  updateStats();
}

// Refresh functions
function refreshFact() {
  const facts = [
    "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3000 years old and still perfectly edible.",
    "A group of flamingos is called a 'flamboyance'.",
    "Bananas are berries, but strawberries aren't.",
    "The shortest war in history lasted only 38-45 minutes.",
    "A single cloud can weigh more than a million pounds."
  ];
  
  document.getElementById('randomFact').textContent = facts[Math.floor(Math.random() * facts.length)];
  logActivity('Random fact refreshed');
  sendEventToBackend('random_fact_refresh', {}, 'user_activity');
}

function refreshQuote() {
  const quotes = [
    "\"The only way to do great work is to love what you do.\" - Steve Jobs",
    "\"Innovation distinguishes between a leader and a follower.\" - Steve Jobs",
    "\"Life is what happens to you while you're busy making other plans.\" - John Lennon",
    "\"The future belongs to those who believe in the beauty of their dreams.\" - Eleanor Roosevelt",
    "\"It is during our darkest moments that we must focus to see the light.\" - Aristotle"
  ];
  
  document.getElementById('dailyQuote').textContent = quotes[Math.floor(Math.random() * quotes.length)];
  logActivity('Daily quote refreshed');
  sendEventToBackend('daily_quote_refresh', {}, 'user_activity');
}

function clearNotifications() {
  document.getElementById('notificationsList').innerHTML = '';
  logActivity('Notifications cleared');
  sendEventToBackend('clear_notifications', {}, 'user_activity');
}

function clearActivityLogs() {
  if (confirm("Are you sure you want to clear all activity logs?")) {
    activityLogs = [];
    updateActivityLogDisplay();
    logActivity('Activity logs cleared');
    sendEventToBackend('clear_activity_logs', {}, 'user_activity');
  }
}

function saveTextNotes() {
  const notes = document.getElementById('textNotes').value;
  localStorage.setItem('textNotes', notes);
  showNotification('Notes saved successfully');
  logActivity('Text notes saved');
  sendEventToBackend('text_notes_save', { notes_length: notes.length }, 'user_activity');
}

function clearTextNotes() {
  if (confirm("Are you sure you want to clear your text notes?")) {
    document.getElementById('textNotes').value = '';
    logActivity('Text notes cleared');
    sendEventToBackend('text_notes_clear', {}, 'user_activity');
  }
}

function showNotification(message, isHighlight = false) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  if (isHighlight) notification.classList.add('highlight'); // Add highlight class for specific notifications
  notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    logActivity('System logged out');
    sendEventToBackend('system_logout', {}, 'user_activity');
    localStorage.clear(); // Clear all client-side data, including dashboardId
    location.reload();
  }
}

// New functions requested by user
function takeScreenshot() {
    html2canvas(document.body).then(function(canvas) {
        const link = document.createElement('a');
        link.download = `screenshot_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification('Screenshot saved!');
        logActivity('Screenshot taken');
        sendEventToBackend('screenshot_taken', {}, 'user_activity');
        stats.buttonPresses++;
        updateStats();
    });
}

function togglePanelsGridVisibility() {
    const panelsGrid = document.getElementById('panelsGrid');
    if (panelsGrid.style.display === 'none' || panelsGrid.style.opacity === '0') {
        panelsGrid.style.display = 'grid';
        panelsGrid.style.opacity = '1';
        showNotification('Sections are now visible.');
        logActivity('Sections toggled ON');
        sendEventToBackend('panels_grid_visibility_toggle', { visible: true }, 'user_activity');
    } else {
        panelsGrid.style.opacity = '0'; 
        setTimeout(() => {
            panelsGrid.style.display = 'none';
        }, 300);
        showNotification('Sections are now hidden.');
        logActivity('Sections toggled OFF');
        sendEventToBackend('panels_grid_visibility_toggle', { visible: false }, 'user_activity');
    }
    stats.buttonPresses++;
    updateStats();
}

async function restartSystem() {
    if (confirm('Are you sure you want to restart the system? You will be logged out and all unsaved data will be lost.')) {
        logActivity('System restarted');
        // Notify backend about restart
        await sendEventToBackend('system_restart_initiated', {}, 'system_event');
        localStorage.clear(); 
        location.reload(); 
    }
}

// Function for sub-panel toggles inside modals like iPad Restrictions
function toggleSubPanel(subPanelId, buttonText) {
    const subPanel = document.getElementById(subPanelId);
    if (!subPanel) return;

    const isVisible = subPanel.classList.contains('hidden') === false;

    // Hide all other sub-panels within the same parent modal
    const parentModalContent = subPanel.closest('.settings-content');
    if (parentModalContent) {
        parentModalContent.querySelectorAll('.text-popup-content').forEach(panel => {
            if (panel.id !== subPanelId && !panel.classList.contains('hidden')) {
                panel.classList.add('hidden');
                // Optional: Log closing of other sub-panels
                // sendEventToBackend('subpanel_closed_auto', { subpanel_id: panel.id }, 'user_activity');
            }
        });
    }

    if (isVisible) {
        subPanel.classList.add('hidden');
        logActivity(`Sub-panel closed: ${buttonText}`);
        sendEventToBackend('subpanel_closed', { subpanel_id: subPanelId, text: buttonText }, 'user_activity');
    } else {
        subPanel.classList.remove('hidden');
        logActivity(`Sub-panel opened: ${buttonText}`);
        sendEventToBackend('subpanel_opened', { subpanel_id: subPanelId, text: buttonText }, 'user_activity');

        if (subPanelId === 'wifiBypassText') {
            showNotification("Hint: See 'School Wifi Information' for details.", true);
        }
    }
    stats.buttonPresses++;
    updateStats();
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
        if (resetPopup.style.display === 'flex') {
            resetCounter();
        } else if (!document.getElementById('loginScreen').classList.contains('hidden')) {
            attemptLogin();
        }
    }
  });
  
  document.getElementById('penColor').addEventListener('change', (e) => {
    currentColor = e.target.value;
    sendEventToBackend('drawing_color_change', { color: currentColor }, 'user_activity');
  });
  
  document.getElementById('penThickness').addEventListener('input', (e) => {
    currentThickness = parseInt(e.target.value);
    sendEventToBackend('drawing_thickness_change', { thickness: currentThickness }, 'user_activity');
  });
  
  const savedNotes = localStorage.getItem('textNotes');
  if (savedNotes) {
    document.getElementById('textNotes').value = savedNotes;
  }
  
  document.addEventListener('click', (e) => {
    // Only count button presses that are direct clicks and not part of system internal controls like panel minimize/close
    const isQuickBtn = e.target.closest('.quick-btn');
    const isMainMenuBtn = e.target.closest('.main-menu-btn');
    const isLoginSubmitBtn = e.target.id === 'submitBtn';
    const isResetBtn = e.target.id === 'resetBtn';
    const isClickerBtn = e.target.classList.contains('click-button');
    const isCalcBtn = e.target.classList.contains('calc-btn');
    const isToolBtn = e.target.classList.contains('tool-btn');
    const isPanelBtn = e.target.closest('.panel-btn'); // Specifically exclude from general stats increment

    if ((isQuickBtn || isMainMenuBtn || isLoginSubmitBtn || isResetBtn || isClickerBtn || isCalcBtn || isToolBtn) && !isPanelBtn) {
        stats.buttonPresses++;
        updateStats();
        // Specific events for button presses are logged by their respective functions
    }
  });
  // Set default values for Important Dates inputs (current date and a default time)
  const today = new Date();
  document.getElementById('importantDateDay').value = today.toISOString().split('T')[0];
  document.getElementById('importantDateTime').value = "09:00"; // Default to 9 AM

});
