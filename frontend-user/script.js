// --- Configuration ---
// Replace with your Vercel backend URL: https://your-project.vercel.app/api
const API_BASE_URL = 'http://localhost:3000/api'; 
// Replace with your Pusher App Key
const PUSHER_APP_KEY = 'YOUR_PUSHER_APP_KEY'; 
// Replace with your Pusher App Cluster (e.g., 'us2', 'eu')
const PUSHER_APP_CLUSTER = 'YOUR_PUSHER_APP_CLUSTER'; 

// Global variables
let currentUser = '';
let currentUserID = '';
let authToken = null; // Store JWT token

// Pusher instances
let pusherClient = null; 
let userChannel = null; 
let broadcastChannel = null; 

let attempts = 3; 
let is24HourFormat = false;
let currentZoom = 1;
let activityLogs = []; 
let loginHistory = []; 
let importantDates = []; 
let clickCount = 0; 
let errorLogs = []; 

const RESET_CODE_SECRET = 'Reset.2579';

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

// --- Helper Functions for Backend Communication ---

async function sendToBackend(endpoint, method, data = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: method,
            headers: headers,
            body: data ? JSON.stringify(data) : null,
        });

        if (response.status === 401 || response.status === 403) {
            console.warn(`Auth error for ${endpoint}. Logging out.`);
            logout(false); 
            throw new Error('Authentication failed. Please log in again.');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || `Backend Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error sending to backend ${endpoint}:`, error);
        logError(`Backend communication error to ${endpoint}: ${error.message}`);
        throw error; 
    }
}

async function logActivity(activity) {
    if (!authToken || !currentUserID) return; 
    try {
        await sendToBackend('/logs/activity', 'POST', { activity });
        const timestamp = new Date().toISOString();
        activityLogs.unshift({ timestamp, activity, id: Date.now(), username: currentUser, userId: currentUserID });
        if (activityLogs.length > 100) activityLogs = activityLogs.slice(0, 100);
        updateActivityLogDisplay();
    } catch (e) {
        console.error("Failed to send activity log to backend:", e);
    }
}

async function logError(message, stack = null) {
    if (!authToken || !currentUserID) return;
    try {
        await sendToBackend('/logs/error', 'POST', { message, stack });
        const timestamp = new Date().toISOString();
        errorLogs.unshift({ timestamp, message, stack, id: Date.now(), username: currentUser, userId: currentUserID });
        if (errorLogs.length > 100) errorLogs = errorLogs.slice(0, 100);
        updateErrorLogDisplay();
    } catch (e) {
        console.error("Failed to send error log to backend:", e);
    }
}

async function fetchAndDisplayAnnouncement() {
    try {
        const data = await sendToBackend('/admin/announcement', 'GET'); 
        const announcementBar = document.querySelector('.announcement-bar');
        const announcementTextElement = document.getElementById('announcementText');

        if (data.isActive && data.text) {
            announcementTextElement.textContent = data.text;
            announcementBar.style.display = 'block';
        } else {
            announcementBar.style.display = 'none';
        }
    } catch (error) {
        console.error("Failed to fetch announcement:", error);
        logError("Failed to fetch announcement: " + error.message);
    }
}


// --- Pusher WebSocket Handling ---

function connectPusher(userId) {
    if (pusherClient) {
        pusherClient.disconnect();
    }

    pusherClient = new Pusher(PUSHER_APP_KEY, {
        cluster: PUSHER_APP_CLUSTER,
        encrypted: true,
        // For production, use a private channel with an auth endpoint for security.
        // authEndpoint: `${API_BASE_URL}/pusher/auth`, 
        // auth: { headers: { Authorization: `Bearer ${authToken}` } }
    });

    pusherClient.connection.bind('connected', () => {
        console.log('Pusher connected.');
        logActivity('Pusher connected.');
        startHeartbeat();
    });

    pusherClient.connection.bind('disconnected', () => {
        console.log('Pusher disconnected.');
        logActivity('Pusher disconnected.');
    });

    pusherClient.connection.bind('error', (err) => {
        console.error('Pusher error:', err);
        logError('Pusher error: ' + JSON.stringify(err));
    });

    userChannel = pusherClient.subscribe(`public-user-${userId}`); // Using public for simplicity
    userChannel.bind('admin-command', (data) => {
        handleAdminCommand(data.command, data.payload);
    });

    broadcastChannel = pusherClient.subscribe('public-broadcast'); // Using public for simplicity
    broadcastChannel.bind('admin-command', (data) => {
        handleAdminCommand(data.command, data.payload);
    });
    broadcastChannel.bind('setAnnouncement', (data) => { // Direct listener for announcement updates
        handleAdminCommand('setAnnouncement', data); 
    });
}

function startHeartbeat() {
    // Send heartbeat immediately, then every 30 seconds
    const sendHeartbeatNow = async () => {
        if (authToken && currentUserID && pusherClient && pusherClient.connection.state === 'connected') {
            try {
                await sendToBackend('/user/heartbeat', 'POST', { userId: currentUserID });
            } catch (e) {
                console.warn("Failed to send heartbeat:", e);
                logError("Failed to send heartbeat: " + e.message);
            }
        }
    };

    sendHeartbeatNow(); // Initial heartbeat
    setInterval(sendHeartbeatNow, 30000); 
}


// --- Admin Command Handler ---
// This function will interpret commands sent from the backend via Pusher events
function handleAdminCommand(command, payload) {
    console.log(`Received command: ${command} with payload:`, payload);
    logActivity(`Admin command received: ${command}`);

    switch (command) {
        case 'logout':
            showNotification('Admin initiated logout.');
            logout(false); 
            break;
        case 'restart':
            showNotification('Admin initiated system restart.');
            restartSystem(false); 
            break;
        case 'shutdown':
            showNotification('Admin initiated system shutdown. Closing browser...');
            setTimeout(() => window.close(), 3000); // Close the tab/window
            break;
        case 'panic':
            showNotification('Admin initiated panic mode! Redirecting...');
            window.open('https://clever.com', '_blank');
            break;
        case 'setAnnouncement':
            const announcementBar = document.querySelector('.announcement-bar');
            const announcementTextElement = document.getElementById('announcementText');
            if (payload.isActive && payload.text) {
                announcementTextElement.textContent = payload.text;
                announcementBar.style.display = 'block';
            } else {
                announcementBar.style.display = 'none';
                announcementTextElement.textContent = '';
            }
            showNotification('Announcement updated by admin.');
            break;
        case 'lockScreen': 
            alert('Admin has locked your screen! Contact admin to unlock.');
            break;
        case 'sendMessage':
            showNotification(`Admin message: ${payload.message}`);
            alert(`Admin Message: ${payload.message}`);
            break;

        // --- Panel Control Commands ---
        case 'togglePanel': 
            if (payload && payload.panelId) {
                togglePanel(payload.panelId);
                showNotification(`Admin toggled panel: ${payload.panelId}`);
            }
            break;
        case 'hidePanel': 
            if (payload && payload.panelId) {
                const panel = document.getElementById(payload.panelId);
                if (panel) panel.style.display = 'none';
                showNotification(`Admin hid panel: ${payload.panelId}`);
            }
            break;
        case 'showPanel': 
            if (payload && payload.panelId) {
                const panel = document.getElementById(payload.panelId);
                if (panel) panel.style.display = panel.classList.contains('settings-modal') ? 'flex' : 'block';
                showNotification(`Admin showed panel: ${payload.panelId}`);
            }
            break;
        case 'minimizePanel': 
            if (payload && payload.panelId) {
                const panel = document.querySelector(`[data-panel="${payload.panelId}"]`);
                if (panel) {
                    const minimizeBtn = panel.querySelector('.panel-btn .fa-minus, .panel-btn .fa-plus');
                    if (minimizeBtn) minimizePanel(minimizeBtn.closest('button'));
                }
                showNotification(`Admin minimized panel: ${payload.panelId}`);
            }
            break;
        case 'maximizePanel': 
            if (payload && payload.panelId) {
                const panel = document.querySelector(`[data-panel="${payload.panelId}"]`);
                if (panel) {
                    const maximizeBtn = panel.querySelector('.panel-btn .fa-plus');
                    if (maximizeBtn) minimizePanel(maximizeBtn.closest('button')); 
                }
                showNotification(`Admin maximized panel: ${payload.panelId}`);
            }
            break;

        // --- Data Control Commands ---
        case 'clearActivityLogs':
            clearActivityLogs(false); 
            showNotification('Admin cleared activity logs.');
            break;
        case 'clearErrorLogs':
            clearErrorLogs(false); 
            showNotification('Admin cleared error logs.');
            break;
        case 'clearImportantDates':
            clearImportantDates(false); 
            showNotification('Admin cleared important dates.');
            break;
        case 'clearNotes':
            clearTextNotes(false); 
            showNotification('Admin cleared text notes.');
            break;
        case 'resetClickCounter':
            resetClickCounter(false); 
            showNotification('Admin reset click counter.');
            break;
        case 'downloadLogs': 
            if (payload && payload.logType) {
                switch (payload.logType) {
                    case 'activity': downloadActivityLogs(); break;
                    case 'error': downloadErrorLogs(); break;
                }
                showNotification(`Admin requested download of ${payload.logType} logs.`);
            }
            break;
        case 'performSearch': 
            if (payload && payload.query) {
                document.getElementById('searchBar').value = payload.query;
                performSearch();
                showNotification(`Admin initiated search for "${payload.query}".`);
            }
            break;

        // --- Settings / Theme Commands ---
        case 'toggleTheme':
            toggleTheme();
            showNotification('Admin toggled theme.');
            break;
        case 'setTheme': 
            if (payload && payload.theme) {
                if (payload.theme === 'light' && !document.body.classList.contains('light-theme')) toggleTheme();
                if (payload.theme === 'dark' && document.body.classList.contains('light-theme')) toggleTheme();
                showNotification(`Admin set theme to ${payload.theme}.`);
            }
            break;
        case 'setAccentTheme': 
            if (payload && payload.color) {
                const themeOption = document.querySelector(`.theme-option[onclick*="applyAccentTheme('${payload.color}')"]`);
                if (themeOption) applyAccentTheme(payload.color, { target: themeOption }); 
                else applyAccentTheme(payload.color, { target: document.querySelector('.theme-option.active') }); 
                showNotification(`Admin set accent theme to ${payload.color}.`);
            }
            break;
        case 'setZoom': 
            if (payload && typeof payload.level === 'number') {
                currentZoom = payload.level;
                document.body.style.zoom = currentZoom;
                showNotification(`Admin set zoom to ${Math.round(currentZoom * 100)}%.`);
            }
            break;
        case 'setBackgroundColor': // New example command
            if (payload && payload.color) {
                document.body.style.backgroundColor = payload.color;
                showNotification(`Admin set background color to ${payload.color}.`);
            }
            break;

        // --- Tool Commands ---
        case 'selectDrawingTool': 
            if (payload && payload.tool) {
                const toolBtn = document.querySelector(`.tool-btn[data-tool="${payload.tool}"]`);
                if (toolBtn) selectTool(toolBtn, payload.tool);
                showNotification(`Admin selected drawing tool: ${payload.tool}.`);
            }
            break;
        case 'setPenColor': 
            if (payload && payload.color) {
                const penColorInput = document.getElementById('penColor');
                if(penColorInput) penColorInput.value = payload.color;
                currentColor = payload.color;
                showNotification(`Admin set pen color.`);
            }
            break;
        case 'setPenThickness': 
            if (payload && typeof payload.thickness === 'number') {
                const penThicknessInput = document.getElementById('penThickness');
                if(penThicknessInput) penThicknessInput.value = payload.thickness;
                currentThickness = payload.thickness;
                showNotification(`Admin set pen thickness.`);
            }
            break;
        case 'clearDrawingCanvas':
            clearCanvas();
            showNotification('Admin cleared drawing canvas.');
            break;
        case 'startStopwatch': startStopwatch(); showNotification('Admin started stopwatch.'); break;
        case 'pauseStopwatch': pauseStopwatch(); showNotification('Admin paused stopwatch.'); break;
        case 'resetStopwatch': resetStopwatch(); showNotification('Admin reset stopwatch.'); break;
        case 'startTimer': 
            if (payload) {
                const timerHours = document.getElementById('timerHours');
                const timerMinutes = document.getElementById('timerMinutes');
                const timerSeconds = document.getElementById('timerSeconds');
                if (timerHours) timerHours.value = payload.hours || 0;
                if (timerMinutes) timerMinutes.value = payload.minutes || 0;
                if (timerSeconds) timerSeconds.value = payload.seconds || 0;
                startTimer();
                showNotification('Admin started countdown timer.');
            }
            break;
        case 'pauseTimer': pauseTimer(); showNotification('Admin paused countdown timer.'); break;
        case 'resetTimer': resetTimer(); showNotification('Admin reset countdown timer.'); break;
        case 'takeScreenshot':
            takeScreenshot();
            showNotification('Admin requested screenshot.');
            break;
        case 'refreshFact': refreshFact(); showNotification('Admin refreshed random fact.'); break;
        case 'refreshQuote': refreshQuote(); showNotification('Admin refreshed daily quote.'); break;
        case 'clearNotifications': clearNotifications(); showNotification('Admin cleared notifications.'); break;

        default:
            console.warn(`Unknown admin command received: ${command}`);
            logError(`Unknown admin command received: ${command}`);
            showNotification(`Unknown admin command: ${command}`);
    }
}


// --- Original Dashboard Functions (modified to use backend API or for internal logic) ---

function updateAttemptsText() {
    if (attemptsText) attemptsText.textContent = `Attempts Left: ${attempts}`;
}

function disableInputs() {
    if (usernameInput) usernameInput.disabled = true;
    if (passwordInput) passwordInput.disabled = true;
    if (userIDInput) userIDInput.disabled = true;
    if (submitBtn) submitBtn.disabled = true;
}

function enableInputs() {
    if (usernameInput) usernameInput.disabled = false;
    if (passwordInput) passwordInput.disabled = false;
    if (userIDInput) userIDInput.disabled = false;
    if (submitBtn) submitBtn.disabled = false;
}

function showResetPopup() {
    if (resetPopup) {
        resetPopup.style.display = 'flex';
        resetPopup.setAttribute('aria-hidden', 'false');
        if (resetField) resetField.focus();
    }
}

function hideResetPopup() {
    if (resetPopup) {
        resetPopup.style.display = 'none';
        resetPopup.setAttribute('aria-hidden', 'true');
        if (resetField) resetField.value = '';
    }
}

async function resetCounter() {
    const enteredCode = resetField.value.trim();
    const isCorrect = enteredCode === RESET_CODE_SECRET;

    if (isCorrect) {
        attempts = 3; 
        updateAttemptsText();
        enableInputs();
        hideResetPopup();
        if (errorMsg) errorMsg.textContent = '';
        showNotification("Login attempts reset successfully!");
        logActivity("Login attempts reset via local code.");
    } else {
        alert('Incorrect reset code. Try again.');
        logError("Incorrect reset code entered: " + enteredCode);
    }
}

window.addEventListener('load', () => {
  startInitialization();
  loadImportantDatesFromStorage();
  loadClickCountFromStorage();
  fetchAndDisplayAnnouncement();
});

function startInitialization() {
  generateCodeRain('codeRain');
  
  setTimeout(() => {
    const initText = document.getElementById('initText');
    if (initText) initText.textContent = 'Initializing Login Page...';
    setTimeout(() => {
      const initScreen = document.getElementById('initScreen');
      const loginScreen = document.getElementById('loginScreen');
      if (initScreen) initScreen.classList.add('hidden');
      if (loginScreen) loginScreen.classList.remove('hidden');
      startClock();
    }, 2000);
  }, 3000);
}

function generateCodeRain(containerId) {
  const container = document.getElementById(containerId);
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  if (!container) return; 

  setInterval(() => {
    const char = document.createElement('div');
    char.className = 'code-char';
    char.textContent = chars[Math.floor(Math.random() * chars.length)];
    char.style.left = Math.random() * 100 + '%';
    char.style.animationDelay = Math.random() * 2 + 's';
    if (container) container.appendChild(char); 
    
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
  
  const currentTimeDisplay = document.getElementById('currentTime');
  const currentDateDisplay = document.getElementById('currentDate');
  if (currentTimeDisplay) currentTimeDisplay.textContent = time;
  if (currentDateDisplay) currentDateDisplay.textContent = date;
  
  const quickbarRealTimeClock = document.getElementById('quickbarCurrentTime');
  if (quickbarRealTimeClock) {
    quickbarRealTimeClock.textContent = time;
  }
}

function adjustZoom(delta) {
  currentZoom = Math.max(0.5, Math.min(2, currentZoom + delta));
  document.body.style.zoom = currentZoom;
  logActivity('Zoom adjusted to ' + Math.round(currentZoom * 100) + '%');
}

function setupToggles() {
  const showPasswordToggle = document.getElementById('showPasswordToggle');
  if (showPasswordToggle) {
    showPasswordToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      const passwordField = document.getElementById('password');
      if (passwordField) passwordField.type = this.classList.contains('active') ? 'text' : 'password';
      stats.toggleSwitches++;
      logActivity('Password visibility toggled');
    });
  }

  const timeFormatToggle = document.getElementById('timeFormatToggle');
  if (timeFormatToggle) {
    timeFormatToggle.addEventListener('click', function() {
      this.classList.toggle('active');
      is24HourFormat = this.classList.contains('active');
      stats.toggleSwitches++;
      logActivity('Time format toggled to ' + (is24HourFormat ? '24-hour' : '12-hour'));
    });
  }
}

async function attemptLogin() {
  const username = usernameInput.value;
  const password = passwordInput.value;
  const userID = userIDInput.value;
  
  updateAttemptsText();

  if (!username || !password || !userID) {
    const missingFields = [];
    if (!username) missingFields.push("Username");
    if (!password) missingFields.push("Password");
    if (!userID) missingFields.push("User ID");

    const errorMessage = `Please fill all fields. Missing: ${missingFields.join(", ")}`;
    showError(errorMessage);
    failedLogin(username);
    return;
  }

  try {
      const data = await sendToBackend('/auth/login', 'POST', { username, password, userID });
      authToken = data.token;
      currentUser = data.username;
      currentUserID = data.userID; 
      localStorage.setItem('authToken', authToken); 
      localStorage.setItem('currentUser', currentUser);
      localStorage.setItem('currentUserID', currentUserID);
      
      logActivity(`User ${currentUser} logged in.`);
      await successfulLogin();
  } catch (error) {
      console.error("Login failed:", error.message);
      showError(error.message);
      failedLogin(username);
  }
}

async function successfulLogin() {
  const loginScreen = document.getElementById('loginScreen');
  const loadingScreen = document.getElementById('loadingScreen');
  const dashboard = document.getElementById('dashboard');

  if (loginScreen) loginScreen.classList.add('hidden');
  if (loadingScreen) loadingScreen.classList.remove('hidden');
  generateCodeRain('loadingCodeRain');
  
  setTimeout(() => {
    if (loadingScreen) loadingScreen.classList.add('hidden');
    if (dashboard) dashboard.classList.add('active');
    initializeDashboard();
    connectPusher(currentUserID); 
  }, 3000);
}

async function failedLogin(attemptedUsername) {
  attempts--;
  updateAttemptsText(); 
  
  const loginBox = document.getElementById('loginBox');
  if (loginBox) loginBox.classList.add('error-shake');
  
  setTimeout(() => {
    if (loginBox) loginBox.classList.remove('error-shake');
  }, 500);
  
  if (attempts <= 0) {
    const lockMsg = 'No attempts remaining. System locked.';
    if (errorMsg) errorMsg.textContent = lockMsg;
    disableInputs();
    showResetPopup();
  } else {
    if (errorMsg) errorMsg.textContent = `Invalid credentials. Attempts left: ${attempts}`;
  }
}

function showError(message) {
  if (errorMsg) errorMsg.textContent = message;
  logError(message);
  setTimeout(() => {
    if (errorMsg) errorMsg.textContent = '';
  }, 3000);
}

function initializeDashboard() {
  stats.sessionStartTime = Date.now();
  
  const loggedUser = document.getElementById('loggedUser');
  const currentUserElem = document.getElementById('currentUser');
  const currentUserIDElem = document.getElementById('currentUserID');
  const welcomeNotification = document.getElementById('welcomeNotification');

  if (loggedUser) loggedUser.textContent = currentUser;
  if (currentUserElem) currentUserElem.textContent = currentUser;
  if (currentUserIDElem) currentUserIDElem.textContent = currentUserID;
  
  if (welcomeNotification) {
      setTimeout(() => {
        welcomeNotification.style.display = 'none';
      }, 5000);
  }
  
  generateCalendar();
  initializeCanvas();
  startSessionTimer(); 
  updateClock(); 
  setInterval(updateClock, 1000); 
  updateStats();
  updateImportantDatesDisplay(); 
  updateClickCountDisplay(); 
  fetchAndDisplayAnnouncement(); 

  logActivity('Dashboard initialized');
}

function generateCalendar() {
  const calendar = document.getElementById('calendarGrid');
  if (!calendar) return; 
  calendar.innerHTML = '';
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  days.forEach(day => {
    const dayElement = document.createElement('div');
    dayElement.textContent = day;
    dayElement.className = 'calendar-cell text-xs font-bold text-gray-400';
    calendar.appendChild(dayElement);
  });
  
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-cell';
    calendar.appendChild(emptyCell);
  }
  
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
  if (!canvas) return; 
  ctx = canvas.getContext('2d');
  
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
  ctx.strokeStyle = currentTool === 'eraser' ? (document.body.classList.contains('light-theme') ? '#f0f0f0' : '#1a1a1a') : currentColor; 
  
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

function togglePanel(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  const isVisible = panel.style.display === 'flex' || panel.style.display === 'block';
  
  if (panel.classList.contains('settings-modal')) {
    panel.style.display = isVisible ? 'none' : 'flex';
  } else {
    panel.style.display = isVisible ? 'none' : 'block';
  }

  if (!isVisible) {
    stats.panelsOpened++;
    logActivity(`Panel opened: ${panelId}`);
  } else {
    stats.panelsClosed++;
    logActivity(`Panel closed: ${panelId}`);
  }
  
  updateStats();
}

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
    } else {
        subPanel.classList.remove('hidden');
        logActivity(`Sub-panel opened: ${buttonText}`);
        
        if (subPanelId === 'wifiBypassText') {
            const wifiInfoModal = document.getElementById('schoolWifiInfoModal');
            if (wifiInfoModal && wifiInfoModal.style.display === 'none') {
                showNotification("Redirecting to School Wifi Information...");
            }
        }
    }
    stats.buttonPresses++;
    updateStats();
}

function minimizePanel(button) {
  const panel = button.closest('.panel');
  if (!panel) return;
  const content = panel.querySelector('.panel-header')?.nextElementSibling;
  
  if (content) {
    if (content.style.display === 'none') {
      content.style.display = 'block';
      button.innerHTML = '<i class="fas fa-minus"></i>';
    } else {
      content.style.display = 'none';
      button.innerHTML = '<i class="fas fa-plus"></i>';
    }
  }
  stats.buttonPresses++;
  logActivity('Panel minimized/restored');
}

function closePanel(button) {
  const panel = button.closest('.panel');
  if (!panel) return;
  panel.style.display = 'none';
  stats.panelsClosed++;
  stats.buttonPresses++;
  logActivity(`Panel closed: ${panel.dataset.panel}`);
  updateStats();
}

function performSearch() {
  const searchBar = document.getElementById('searchBar');
  if (!searchBar) return;
  const query = searchBar.value.toLowerCase();
  if (!query) return;
  
  stats.searchQueries++;
  logActivity(`Searched for: ${query}`);
  
  const panels = document.querySelectorAll('.panels-grid > .panel'); 
  let found = false;
  panels.forEach(panel => {
    const text = panel.textContent.toLowerCase();
    const panelTitle = panel.querySelector('.panel-title')?.textContent.toLowerCase();
    
    if (text.includes(query) || (panelTitle && panelTitle.includes(query))) {
      panel.style.display = 'block'; 
      panel.style.border = '2px solid var(--accent-color)'; 
      found = true;
      setTimeout(() => {
        panel.style.border = '1px solid var(--border-color)';
      }, 2000);
    } else {
    }
  });

  if (!found) {
      showNotification("No matching panels found.");
      logError("Search failed: No matching panels found for query '" + query + "'.");
  }
  
  updateStats();
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

function clearErrorLogs(confirmFlag = true) {
    if (confirmFlag && !confirm("Are you sure you want to clear all error logs?")) {
        return;
    }
    errorLogs = [];
    updateErrorLogDisplay();
    showNotification("Error logs cleared.");
    logActivity("Error logs cleared.");
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
    stats.buttonPresses++;
    updateStats();
}

function loadLoginHistoryFromStorage() { 
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

function saveImportantDatesToStorage() {
    localStorage.setItem(`importantDates_${currentUserID}`, JSON.stringify(importantDates));
}

function loadImportantDatesFromStorage() {
    if (!currentUserID) return; 
    const storedDates = localStorage.getItem(`importantDates_${currentUserID}`);
    if (storedDates) {
        importantDates = JSON.parse(storedDates);
    }
    updateImportantDatesDisplay();
}

function addImportantDate() {
    const dateInput = document.getElementById('importantDateDay')?.value;
    const timeInput = document.getElementById('importantDateTime')?.value;
    const eventInput = document.getElementById('importantDateEvent')?.value;

    if (dateInput && timeInput && eventInput) {
        const fullDate = `${dateInput}T${timeInput}`; 
        const newDate = {
            id: Date.now(),
            datetime: new Date(fullDate).toISOString(),
            event: eventInput
        };
        importantDates.unshift(newDate); 
        importantDates.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)); 
        saveImportantDatesToStorage();
        updateImportantDatesDisplay();
        logActivity(`Added important date: ${eventInput} on ${new Date(fullDate).toLocaleString()}`);
        showNotification("Important date added!");

        const today = new Date();
        const importantDateDay = document.getElementById('importantDateDay');
        const importantDateTime = document.getElementById('importantDateTime');
        const importantDateEvent = document.getElementById('importantDateEvent');
        
        if (importantDateDay) importantDateDay.value = today.toISOString().split('T')[0];
        if (importantDateTime) importantDateTime.value = "09:00";
        if (importantDateEvent) importantDateEvent.value = '';
    } else {
        showError("Please fill in all important date fields.");
    }
}

function clearImportantDates(confirmFlag = true) {
    if (confirmFlag && !confirm("Are you sure you want to clear all important dates?")) {
        return;
    }
    importantDates = [];
    saveImportantDatesToStorage();
    updateImportantDatesDisplay();
    logActivity("All important dates cleared.");
    showNotification("All important dates cleared.");
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

function saveClickCountToStorage() {
    localStorage.setItem(`mouseClickCount_${currentUserID}`, clickCount);
}

function loadClickCountFromStorage() {
    if (!currentUserID) return;
    const storedClickCount = localStorage.getItem(`mouseClickCount_${currentUserID}`);
    if (storedClickCount !== null) {
        clickCount = parseInt(storedClickCount);
    }
    updateClickCountDisplay();
}

function incrementClickCounter() {
    clickCount++;
    updateClickCountDisplay();
    saveClickCountToStorage();
    logActivity('Mouse click incremented');
}

function resetClickCounter(confirmFlag = true) {
    if (confirmFlag && !confirm("Are you sure you want to reset the click counter?")) {
        return;
    }
    clickCount = 0;
    updateClickCountDisplay();
    saveClickCountToStorage();
    logActivity('Mouse clicker reset');
    showNotification("Click counter reset!");
}

function updateClickCountDisplay() {
    const display = document.getElementById('clickCountDisplay');
    if (display) {
        display.textContent = clickCount;
    }
}


function updateStats() {
  const buttonPressesElem = document.getElementById('buttonPresses');
  const toggleSwitchesElem = document.getElementById('toggleSwitches');
  const panelsOpenedElem = document.getElementById('panelsOpened');
  const panelsClosedElem = document.getElementById('panelsClosed');
  const searchQueriesElem = document.getElementById('searchQueries');

  if (buttonPressesElem) buttonPressesElem.textContent = stats.buttonPresses;
  if (toggleSwitchesElem) toggleSwitchesElem.textContent = stats.toggleSwitches;
  if (panelsOpenedElem) panelsOpenedElem.textContent = stats.panelsOpened;
  if (panelsClosedElem) panelsClosedElem.textContent = stats.panelsClosed;
  if (searchQueriesElem) searchQueriesElem.textContent = stats.searchQueries;
}

function downloadActivityLogs() {
    const data = {
        activityLogs: activityLogs,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `local_activity_logs_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    stats.buttonPresses++;
    logActivity('Local activity logs downloaded');
    showNotification('Local activity logs downloaded!');
    updateStats();
}

function showStats() {
  togglePanel('statsPanel');
  
  const ctx = document.getElementById('statsChart')?.getContext('2d');
  if (!ctx) return;

  if (Chart.getChart(ctx)) {
    Chart.getChart(ctx).destroy();
  }
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
            color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary')
          }
        }
      }
    }
  });
}

function startStopwatch() {
  if (!isStopwatchRunning) {
    isStopwatchRunning = true;
    stopwatchInterval = setInterval(() => {
      stopwatchTime++;
      updateStopwatchDisplay();
    }, 10);
    logActivity('Stopwatch started');
  }
}

function pauseStopwatch() {
  if (isStopwatchRunning) {
    isStopwatchRunning = false;
    clearInterval(stopwatchInterval);
    logActivity('Stopwatch paused');
  }
}

function resetStopwatch() {
  isStopwatchRunning = false;
  clearInterval(stopwatchInterval);
  stopwatchTime = 0;
  updateStopwatchDisplay();
  logActivity('Stopwatch reset');
}

function updateStopwatchDisplay() {
  const totalSeconds = Math.floor(stopwatchTime / 100);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = stopwatchTime % 100;
  
  const display = document.getElementById('stopwatchDisplay');
  if (display) {
    display.textContent = 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }
}

function startTimer() {
  const hours = parseInt(document.getElementById('timerHours')?.value) || 0;
  const minutes = parseInt(document.getElementById('timerMinutes')?.value) || 0;
  const seconds = parseInt(document.getElementById('timerSeconds')?.value) || 0;
  
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
      }
    }, 1000);
    logActivity('Timer started');
  }
}

function pauseTimer() {
  isTimerRunning = false;
  clearInterval(timerInterval);
  logActivity('Timer paused');
}

function resetTimer() {
  isTimerRunning = false;
  clearInterval(timerInterval);
  timerTime = 0;
  updateTimerDisplay();
  logActivity('Timer reset');
}

function updateTimerDisplay() {
  const display = document.getElementById('timerDisplay');
  if (display) {
    const hours = Math.floor(timerTime / 3600);
    const minutes = Math.floor((timerTime % 3600) / 60);
    const seconds = timerTime % 60;
    
    display.textContent = 
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

function addReminder() {
  const text = document.getElementById('reminderText')?.value;
  const time = document.getElementById('reminderTime')?.value;
  
  if (text && time) {
    const reminderTime = new Date(time);
    const now = new Date();
    
    if (reminderTime > now) {
      const timeout = reminderTime.getTime() - now.getTime();
      
      setTimeout(() => {
        showNotification(`Reminder: ${text}`);
      }, timeout);
      
      const reminderElement = document.createElement('div');
      reminderElement.className = 'p-2 bg-gray-700 rounded';
      reminderElement.innerHTML = `
        <div class="font-semibold">${text}</div>
        <div class="text-sm text-gray-400">${reminderTime.toLocaleString()}</div>
      `;
      
      document.getElementById('remindersList')?.appendChild(reminderElement);
      
      const reminderText = document.getElementById('reminderText');
      const reminderTimeInput = document.getElementById('reminderTime');

      if (reminderText) reminderText.value = '';
      if (reminderTimeInput) reminderTimeInput.value = '';
      
      logActivity(`Reminder set: ${text}`);
    }
  }
}

function selectTool(button, tool) {
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => btn.classList.remove('active'));
  button.classList.add('active');
  currentTool = tool;
  
  const canvas = document.getElementById('drawingCanvas');
  if (canvas) canvas.style.cursor = tool === 'eraser' ? 'crosshair' : 'crosshair';
  
  logActivity(`Drawing tool changed to: ${tool}`);
}

function clearCanvas() {
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    logActivity('Canvas cleared');
}

function saveCanvas() {
  const link = document.createElement('a');
  link.download = `drawing_${Date.now()}.png`;
  link.href = canvas.toDataURL();
  link.click();
  logActivity('Canvas saved');
}

function appendToCalc(value) {
  const display = document.getElementById('calcDisplay');
  if (!display) return;
  if (display.textContent === '0' && value !== '.') { 
    display.textContent = value;
  } else {
    display.textContent += value;
  }
}

function clearCalc() {
  const display = document.getElementById('calcDisplay');
  if (display) display.textContent = '0';
}

function deleteLast() {
  const display = document.getElementById('calcDisplay');
  if (!display) return;
  if (display.textContent.length > 1) {
    display.textContent = display.textContent.slice(0, -1);
  } else {
    display.textContent = '0';
  }
}

function calculateResult() {
  const display = document.getElementById('calcDisplay');
  if (!display) return;
  try {
    const result = eval(display.textContent.replace(/×/g, '*').replace(/÷/g, '/')); 
    display.textContent = result;
    logActivity(`Calculation performed: ${display.textContent} = ${result}`);
  } catch (error) {
    display.textContent = 'Error';
  }
}

function updateConversionUnits() {
  const type = document.getElementById('conversionType')?.value;
  const fromUnit = document.getElementById('fromUnit');
  const toUnit = document.getElementById('toUnit');
  if (!fromUnit || !toUnit || !type) return;
  
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
}

function convertUnits() {
  const fromValue = parseFloat(document.getElementById('fromValue')?.value);
  const fromUnit = document.getElementById('fromUnit')?.value;
  const toUnit = document.getElementById('toUnit')?.value;
  const type = document.getElementById('conversionType')?.value;
  if (isNaN(fromValue) || !fromUnit || !toUnit || !type) {
    const toValueInput = document.getElementById('toValue');
    if (toValueInput) toValueInput.value = '';
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
  
  const toValueInput = document.getElementById('toValue');
  if (toValueInput) toValueInput.value = result.toFixed(6);
  logActivity(`Unit converted: ${fromValue} ${fromUnit} to ${result.toFixed(6)} ${toUnit}`);
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  isLightMode = document.body.classList.contains('light-theme');
  logActivity('Theme toggled to ' + (isLightMode ? 'Light Mode' : 'Dark Mode'));
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
    
    if (document.body.classList.contains('light-theme')) {
        root.style.setProperty('--success-color', themes[theme].primary); 
        root.style.setProperty('--error-color', themes[theme].primary);   
        root.style.setProperty('--warning-color', themes[theme].primary); 
    } else {
        root.style.setProperty('--success-color', '#00ff41'); 
        root.style.setProperty('--error-color', '#ff0040');   
        root.style.setProperty('--warning-color', '#ffaa00');
    }

    document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active'); 
    } else {
        const matchingOption = document.querySelector(`.theme-option[onclick*="applyAccentTheme('${theme}')"]`);
        if (matchingOption) matchingOption.classList.add('active');
    }
    
    logActivity(`Accent theme changed to: ${theme}`);
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
  logActivity(`Setting toggled: ${toggle.previousElementSibling?.textContent}`);
  updateStats();
}

function refreshFact() {
  const facts = [
    "Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3000 years old and still perfectly edible.",
    "A group of flamingos is called a 'flamboyance'.",
    "Bananas are berries, but strawberries aren't.",
    "The shortest war in history lasted only 38-45 minutes.",
    "A single cloud can weigh more than a million pounds."
  ];
  
  const randomFactElem = document.getElementById('randomFact');
  if(randomFactElem) randomFactElem.textContent = facts[Math.floor(Math.random() * facts.length)];
  logActivity('Random fact refreshed');
}

function refreshQuote() {
  const quotes = [
    "\"The only way to do great work is to love what you do.\" - Steve Jobs",
    "\"Innovation distinguishes between a leader and a follower.\" - Steve Jobs",
    "\"Life is what happens to you while you're busy making other plans.\" - John Lennon",
    "\"The future belongs to those who believe in the beauty of their dreams.\" - Eleanor Roosevelt",
    "\"It is during our darkest moments that we must focus to see the light.\" - Aristotle"
  ];
  
  const dailyQuoteElem = document.getElementById('dailyQuote');
  if(dailyQuoteElem) dailyQuoteElem.textContent = quotes[Math.floor(Math.random() * quotes.length)];
  logActivity('Daily quote refreshed');
}

function clearNotifications() {
  const notificationsList = document.getElementById('notificationsList');
  if (notificationsList) notificationsList.innerHTML = '';
  logActivity('Notifications cleared');
}

function clearActivityLogs(confirmFlag = true) {
  if (confirmFlag && !confirm("Are you sure you want to clear all activity logs?")) {
    return;
  }
  activityLogs = [];
  updateActivityLogDisplay();
  logActivity('Activity logs cleared');
}

function saveTextNotes() {
  const notes = document.getElementById('textNotes')?.value;
  if (notes) {
      localStorage.setItem(`textNotes_${currentUserID}`, notes);
      showNotification('Notes saved successfully');
      logActivity('Text notes saved');
  }
}

function clearTextNotes(confirmFlag = true) {
  if (confirmFlag && !confirm("Are you sure you want to clear your text notes?")) {
    return;
  }
  const textNotesElem = document.getElementById('textNotes');
  if (textNotesElem) textNotesElem.value = '';
  logActivity('Text notes cleared');
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function logout(confirmFlag = true) {
  if (confirmFlag && !confirm('Are you sure you want to logout?')) {
    return;
  }
  logActivity('System logged out');
  if (pusherClient) pusherClient.disconnect(); 
  localStorage.removeItem('authToken'); 
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentUserID');
  localStorage.removeItem(`importantDates_${currentUserID}`);
  localStorage.removeItem(`mouseClickCount_${currentUserID}`);
  localStorage.removeItem(`textNotes_${currentUserID}`);

  location.reload(); 
}

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
        stats.buttonPresses++;
        updateStats();
    });
}

function togglePanelsGridVisibility() {
    const panelsGrid = document.getElementById('panelsGrid');
    if (!panelsGrid) return;
    if (panelsGrid.style.display === 'none' || panelsGrid.style.opacity === '0') {
        panelsGrid.style.display = 'grid';
        panelsGrid.style.opacity = '1';
        showNotification('Sections are now visible.');
        logActivity('Sections toggled ON');
    } else {
        panelsGrid.style.opacity = '0'; 
        setTimeout(() => {
            panelsGrid.style.display = 'none';
        }, 300);
        showNotification('Sections are now hidden.');
        logActivity('Sections toggled OFF');
    }
    stats.buttonPresses++;
    updateStats();
}

async function restartSystem(confirmFlag = true) {
    if (confirmFlag && !confirm('Are you sure you want to restart the system? You will be logged out and all unsaved data will be lost.')) {
        return;
    }
    logActivity('System restarted');
    
    if (pusherClient) pusherClient.disconnect();
    localStorage.clear(); 
    location.reload(); 
}


// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  setupToggles();
  
  submitBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    stats.buttonPresses++;
    attemptLogin();
  });

  resetBtn?.addEventListener('click', resetCounter);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (resetPopup?.style.display === 'flex') {
            resetCounter();
        } else if (!document.getElementById('loginScreen')?.classList.contains('hidden')) {
            attemptLogin();
        }
    }
  });
  
  document.getElementById('penColor')?.addEventListener('change', (e) => {
    currentColor = e.target.value;
  });
  
  document.getElementById('penThickness')?.addEventListener('input', (e) => {
    currentThickness = parseInt(e.target.value);
  });
  
  const savedNotes = localStorage.getItem(`textNotes_${currentUserID}`);
  if (savedNotes) { 
    const textNotesElem = document.getElementById('textNotes');
    if (textNotesElem) textNotesElem.value = savedNotes;
  }
  
  document.addEventListener('click', (e) => {
    const isButton = (e.target.tagName === 'BUTTON' && !e.target.closest('.panel-controls') && !e.target.classList.contains('submit-btn'));
    const isQuickBtn = e.target.closest('.quick-btn');
    const isMainMenuBtn = e.target.closest('.main-menu-btn');
    const isPanelBtn = e.target.closest('.panel-btn');
    const isToggleSwitch = e.target.closest('.toggle-switch');
    const isCalcBtn = e.target.closest('.calc-btn');

    if (isButton || isQuickBtn || isMainMenuBtn || isPanelBtn || isToggleSwitch || isCalcBtn) {
        stats.buttonPresses++;
        updateStats();
    }
  });
  const today = new Date();
  const importantDateDay = document.getElementById('importantDateDay');
  const importantDateTime = document.getElementById('importantDateTime');
  if (importantDateDay) importantDateDay.value = today.toISOString().split('T')[0];
  if (importantDateTime) importantDateTime.value = "09:00";
});

(async () => {
    const storedToken = localStorage.getItem('authToken');
    const storedUsername = localStorage.getItem('currentUser');
    const storedUserID = localStorage.getItem('currentUserID');

    if (storedToken && storedUsername && storedUserID) {
        authToken = storedToken;
        currentUser = storedUsername;
        currentUserID = storedUserID;

        document.getElementById('loginScreen')?.classList.add('hidden');
        document.getElementById('dashboard')?.classList.add('active');
        initializeDashboard();
        connectPusher(currentUserID); 
        showNotification(`Welcome back, ${currentUser}!`);
    }
})();
