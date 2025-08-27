// --- Configuration ---
// Replace with your Vercel backend API URL: https://your-project.vercel.app/api
const API_BASE_URL = 'http://localhost:3000/api'; 

// DOM Elements
const adminLoginScreen = document.getElementById('adminLoginScreen');
const adminDashboard = document.getElementById('adminDashboard');
const adminUsernameInput = document.getElementById('adminUsername');
const adminPasswordInput = document.getElementById('adminPassword');
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminErrorMsg = document.getElementById('adminErrorMsg');
const loggedInAdminSpan = document.getElementById('loggedInAdmin');
const mainContentTitle = document.getElementById('mainContentTitle');

// Sections
const usersSection = document.getElementById('usersSection');
const commandsSection = document.getElementById('commandsSection');
const announcementsSection = document.getElementById('announcementsSection');
const logsSection = document.getElementById('logsSection');
const userManagementSection = document.getElementById('user-managementSection'); // New

const onlineUsersList = document.getElementById('onlineUsersList');
const commandSelect = document.getElementById('commandSelect');
const commandPayload = document.getElementById('commandPayload');
const payloadHint = document.getElementById('payloadHint'); // For dynamic hint text
const announcementMessage = document.getElementById('announcementMessage');
const announcementActive = document.getElementById('announcementActive');
const setAnnouncementBtn = document.getElementById('setAnnouncementBtn');
const logDisplay = document.getElementById('logDisplay');

// User Management Elements
const newUserUsernameInput = document.getElementById('newUserUsername');
const newUserPasswordInput = document.getElementById('newUserPassword');
const newUserUserIDInput = document.getElementById('newUserUserID');
const newUserNameInput = document.getElementById('newUserName');
const registerUserBtn = document.getElementById('registerUserBtn');
const registerUserMsg = document.getElementById('registerUserMsg');


let adminAuthToken = null;
let currentAdminUsername = null;

// --- Helper Functions ---

async function sendToBackend(endpoint, method, data = null) {
    const headers = {
        'Content-Type': 'application/json',
    };
    if (adminAuthToken) {
        headers['Authorization'] = `Bearer ${adminAuthToken}`;
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: method,
            headers: headers,
            body: data ? JSON.stringify(data) : null,
        });

        if (response.status === 401 || response.status === 403) {
            showNotification('Session expired or unauthorized. Logging out.', 'error');
            adminLogout(); 
            throw new Error('Authentication failed. Please log in again.');
        }

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.msg || `Backend Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error sending to backend ${endpoint}:`, error);
        showAdminError(`Error: ${error.message}`);
        throw error;
    }
}

function showAdminError(message) {
    adminErrorMsg.textContent = message;
    setTimeout(() => {
        adminErrorMsg.textContent = '';
    }, 5000);
}

function showNotification(message, type = 'success') {
    const notificationContainer = document.createElement('div');
    notificationContainer.className = `fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white z-50 transition-all duration-300 transform translate-x-full`;

    let bgColor = 'bg-green-500';
    let icon = 'fas fa-check-circle';
    if (type === 'error') {
        bgColor = 'bg-red-500';
        icon = 'fas fa-times-circle';
    } else if (type === 'info') {
        bgColor = 'bg-blue-500';
        icon = 'fas fa-info-circle';
    }

    notificationContainer.classList.add(bgColor);
    notificationContainer.innerHTML = `<i class="${icon} mr-2"></i>${message}`;

    document.body.appendChild(notificationContainer);

    // Animate in
    setTimeout(() => {
        notificationContainer.classList.remove('translate-x-full');
    }, 100);

    // Animate out and remove
    setTimeout(() => {
        notificationContainer.classList.add('translate-x-full');
        notificationContainer.addEventListener('transitionend', () => notificationContainer.remove());
    }, 4000);
}


// --- Admin Login/Logout ---

async function adminLogin() {
    const username = adminUsernameInput.value;
    const password = adminPasswordInput.value;

    try {
        const data = await sendToBackend('/auth/admin-login', 'POST', { username, password });
        adminAuthToken = data.token;
        currentAdminUsername = data.username;
        localStorage.setItem('adminAuthToken', adminAuthToken);
        localStorage.setItem('currentAdminUsername', currentAdminUsername);

        adminLoginScreen.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        loggedInAdminSpan.textContent = currentAdminUsername;
        showSection('users'); // Default to users section
        showNotification(`Welcome, ${currentAdminUsername}!`);

    } catch (error) {
        showAdminError(error.message);
    }
}

function adminLogout() {
    adminAuthToken = null;
    currentAdminUsername = null;
    localStorage.removeItem('adminAuthToken');
    localStorage.removeItem('currentAdminUsername');
    adminDashboard.classList.add('hidden');
    adminLoginScreen.classList.remove('hidden');
    showNotification('Logged out successfully.', 'info');
}

// --- Dashboard Navigation ---

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(`${sectionId}Section`).classList.remove('hidden');
    mainContentTitle.textContent = sectionId.charAt(0).toUpperCase() + sectionId.slice(1).replace('-', ' ');

    // Load specific data for each section
    if (sectionId === 'users') {
        fetchOnlineUsers();
    } else if (sectionId === 'announcements') {
        fetchAnnouncement();
    } else if (sectionId === 'logs') {
        logDisplay.innerHTML = '<p class="text-gray-400">Select a log type to display.</p>'; // Clear logs on section change
    }
}

// --- Online Users Management ---

async function fetchOnlineUsers() {
    try {
        const users = await sendToBackend('/admin/online-users', 'GET'); // Fetch from Vercel API
        onlineUsersList.innerHTML = '';
        if (users.length === 0) {
            onlineUsersList.innerHTML = '<p class="text-gray-400 col-span-full">No users currently online (or last active over 60s ago).</p>';
            return;
        }

        users.forEach(onlineUser => {
            const lastActivity = new Date(onlineUser.lastActivity).toLocaleString();

            const userCard = document.createElement('div');
            userCard.className = 'bg-gray-700 p-4 rounded-lg shadow-md flex flex-col justify-between';
            userCard.innerHTML = `
                <div>
                    <h4 class="text-lg font-bold text-orange-400">${onlineUser.name} (<span class="text-gray-300">${onlineUser.username}</span>)</h4>
                    <p class="text-sm text-gray-400">ID: ${onlineUser.userId}</p>
                    <p class="text-xs text-gray-500">Last Activity: ${lastActivity}</p>
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                    <button class="bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded" onclick="showCommandMenu('${onlineUser.userId}')">
                        <i class="fas fa-terminal mr-1"></i> Execute
                    </button>
                </div>
            `;
            onlineUsersList.appendChild(userCard);
        });

    } catch (error) {
        showAdminError(`Failed to fetch online users: ${error.message}`);
    }
}

// Polling for online users every few seconds
setInterval(() => {
    if (adminAuthToken && !usersSection.classList.contains('hidden')) {
        fetchOnlineUsers();
    }
}, 5000);


// --- Command Sending ---

function showCommandMenu(userId) {
    showSection('commands');
    showNotification(`Ready to send command to ${userId}. Select command below.`, 'info');

    // Attach event listener for the specific user's command execution
    const executeBtn = document.createElement('button');
    executeBtn.id = 'executeTargetedCommandBtn';
    executeBtn.className = 'mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded w-full transition duration-300';
    executeBtn.innerHTML = `<i class="fas fa-paper-plane mr-2"></i> Send Command to User ${userId}`;
    
    // Remove any previous execute button
    const oldExecuteBtn = document.getElementById('executeTargetedCommandBtn');
    if (oldExecuteBtn) oldExecuteBtn.remove();
    
    // Append to the commands section (or a specific targeted command area)
    commandsSection.appendChild(executeBtn);

    executeBtn.onclick = () => sendTargetedCommand(userId);
}


async function sendTargetedCommand(userId) {
    const selectedOption = commandSelect.options[commandSelect.selectedIndex];
    const selectedCommand = selectedOption.value;
    const payloadText = commandPayload.value.trim();
    let payload = {};

    if (!selectedCommand) {
        showAdminError('Please select a command.');
        return;
    }

    try {
        if (payloadText) {
            payload = JSON.parse(payloadText);
        }
    } catch (e) {
        showAdminError('Invalid JSON payload.');
        return;
    }

    // Determine the actual command and payload based on the selected option
    let commandToDispatch = selectedCommand;
    // For commands needing dynamic payload based on option value, parse it
    if (commandToDispatch.includes(':')) {
        const parts = commandToDispatch.split(':');
        commandToDispatch = parts[0]; // e.g., 'togglePanel'
        const dynamicValue = parts[1]; // e.g., 'calendar'

        // Apply dynamic value to payload if not already present
        if (commandToDispatch.includes('Panel')) payload = { ...payload, panelId: dynamicValue };
        else if (commandToDispatch === 'setTheme') payload = { ...payload, theme: dynamicValue };
        else if (commandToDispatch === 'setAccentTheme') payload = { ...payload, color: dynamicValue };
        else if (commandToDispatch === 'downloadLogs') payload = { ...payload, logType: dynamicValue };
        else if (commandToDispatch === 'selectDrawingTool') payload = { ...payload, tool: dynamicValue };
        // Add more specific parsing for other commands as needed
    }

    try {
        // Send command via Vercel API, which then triggers Pusher
        const data = await sendToBackend('/admin/command-user', 'POST', { targetUserId: userId, command: commandToDispatch, payload });
        showNotification(data.msg);
        commandPayload.value = ''; // Clear payload after sending
    } catch (error) {
        showAdminError(`Failed to send command: ${error.message}`);
    }
}

// Update payload hint when command selection changes
commandSelect.addEventListener('change', () => {
    const selectedOption = commandSelect.options[commandSelect.selectedIndex];
    const hint = selectedOption.dataset.payloadPrompt || "Some commands require a JSON payload. Leave empty if not needed.";
    payloadHint.textContent = hint;

    // Pre-fill payload for simple string inputs if a prompt suggests it
    const commandValue = selectedOption.value;
    if (commandValue === 'setZoom' || commandValue === 'setBackgroundColor') {
        commandPayload.value = ''; // Clear for new input
    } else if (commandValue.includes('sendMessage')) {
        commandPayload.value = JSON.stringify({"message": ""});
    } else if (commandValue.includes('performSearch')) {
        commandPayload.value = JSON.stringify({"query": ""});
    } else if (commandValue.includes('downloadLogs')) {
        commandPayload.value = JSON.stringify({"logType": commandValue.split(':')[1]});
    } else if (commandValue.includes('setTheme')) {
        commandPayload.value = JSON.stringify({"theme": commandValue.split(':')[1]});
    } else if (commandValue.includes('setAccentTheme')) {
        commandPayload.value = JSON.stringify({"color": commandValue.split(':')[1]});
    } else if (commandValue.includes('selectDrawingTool')) {
        commandPayload.value = JSON.stringify({"tool": commandValue.split(':')[1]});
    } else if (commandValue.includes('setPenColor')) {
        commandPayload.value = JSON.stringify({"color": "#FF0000"});
    } else if (commandValue.includes('setPenThickness')) {
        commandPayload.value = JSON.stringify({"thickness": 5});
    }
    // Add more auto-fill logic here for other complex commands
});

async function sendBroadcastCommand(command, payload = {}) {
    if (command === 'sendMessage' && !payload.message) {
        const message = prompt('Enter message to broadcast:');
        if (message === null || message.trim() === '') {
            showAdminError('Message content is required for broadcast message.');
            return;
        }
        payload.message = message;
    }
    if (command === 'setZoom' && !payload.level) {
        const level = prompt('Enter zoom level (e.g., 1.0 for 100%):');
        if (level === null || isNaN(parseFloat(level))) {
            showAdminError('A valid zoom level is required.');
            return;
        }
        payload.level = parseFloat(level);
    }
    if (command === 'setBackgroundColor' && !payload.color) {
        const color = prompt('Enter background color (e.g., #0a0a0a or red):');
        if (color === null || color.trim() === '') {
            showAdminError('A background color is required.');
            return;
        }
        payload.color = color;
    }

    if (!confirm(`Are you sure you want to broadcast "${command}" to ALL online users?`)) {
        return;
    }

    try {
        // Send broadcast command via Vercel API, which then triggers Pusher
        const data = await sendToBackend('/admin/command-broadcast', 'POST', { command, payload });
        showNotification(data.msg);
    } catch (error) {
        showAdminError(`Failed to broadcast command: ${error.message}`);
    }
}

// --- Announcements Management ---

async function fetchAnnouncement() {
    try {
        const data = await sendToBackend('/admin/announcement', 'GET');
        announcementMessage.value = data.text || '';
        announcementActive.checked = data.isActive;
    } catch (error) {
        showAdminError(`Failed to fetch announcement: ${error.message}`);
    }
}

async function setAnnouncement() {
    const text = announcementMessage.value;
    const isActive = announcementActive.checked;

    try {
        const data = await sendToBackend('/admin/announcement', 'POST', { text, isActive });
        showNotification(data.msg);
    } catch (error) {
        showAdminError(`Failed to set announcement: ${error.message}`);
    }
}

// --- Logs Management ---

async function fetchLogs(logType) {
    try {
        // Log types are: 'activity', 'error', 'login-history'
        const logs = await sendToBackend(`/logs/get-${logType}`, 'GET'); 
        logDisplay.innerHTML = '';
        if (logs.length === 0) {
            logDisplay.innerHTML = `<p class="text-gray-400">No ${logType} logs found.</p>`;
            return;
        }

        logs.forEach(log => {
            const logItem = document.createElement('div');
            let logText = '';
            let logClass = '';
            const timestamp = new Date(log.timestamp).toLocaleString();

            switch (logType) {
                case 'activity':
                    logText = `[Activity] ${log.username} (ID:${log.userId}): ${log.activity}`;
                    logClass = '';
                    break;
                case 'error':
                    logText = `[ERROR] ${log.username} (ID:${log.userId}): ${log.message}`;
                    logClass = 'error';
                    break;
                case 'login-history':
                    logText = `[Login] User ${log.username} ${log.success ? 'succeeded' : 'failed'} login (IP: ${log.ipAddress || 'N/A'}).`;
                    logClass = log.success ? 'login-success' : 'login-failed';
                    break;
            }

            logItem.className = `log-entry-item ${logClass}`;
            logItem.innerHTML = `
                <span>${logText}</span>
                <span class="log-entry-timestamp">${timestamp}</span>
            `;
            logDisplay.appendChild(logItem);
        });
    } catch (error) {
        showAdminError(`Failed to fetch ${logType} logs: ${error.message}`);
    }
}

async function clearLogs(logType) {
    if (!confirm(`Are you sure you want to clear ALL ${logType} logs from the database? This cannot be undone.`)) {
        return;
    }
    try {
        // Send DELETE request to clear-logs endpoint with type as query parameter
        const data = await sendToBackend(`/logs/clear-logs?type=${logType}`, 'DELETE'); 
        showNotification(data.msg);
        logDisplay.innerHTML = `<p class="text-gray-400">${data.msg}</p>`; 
    } catch (error) {
        showAdminError(`Failed to clear ${logType} logs: ${error.message}`);
    }
}

// --- User Management (New) ---
async function registerNewUser() {
  const username = newUserUsernameInput.value.trim();
  const password = newUserPasswordInput.value.trim();
  const userID = newUserUserIDInput.value.trim();
  const name = newUserNameInput.value.trim();

  if (!username || !password || !userID) {
    registerUserMsg.textContent = "Username, Password, and User ID are required.";
    registerUserMsg.className = "text-red-500 text-xs italic mt-4";
    return;
  }

  try {
    const data = await sendToBackend('/auth/register-user', 'POST', { username, password, userID, name });
    registerUserMsg.textContent = data.msg;
    registerUserMsg.className = "text-green-500 text-xs italic mt-4";
    newUserUsernameInput.value = '';
    newUserPasswordInput.value = '';
    newUserUserIDInput.value = '';
    newUserNameInput.value = '';
    showNotification('New user registered successfully!');
  } catch (error) {
    registerUserMsg.textContent = error.message;
    registerUserMsg.className = "text-red-500 text-xs italic mt-4";
  }
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Check for existing token
    adminAuthToken = localStorage.getItem('adminAuthToken');
    currentAdminUsername = localStorage.getItem('currentAdminUsername');

    if (adminAuthToken && currentAdminUsername) {
        adminLoginScreen.classList.add('hidden');
        adminDashboard.classList.remove('hidden');
        loggedInAdminSpan.textContent = currentAdminUsername;
        showSection('users');
    }

    adminLoginBtn.addEventListener('click', adminLogin);
    adminPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') adminLogin();
    });

    setAnnouncementBtn.addEventListener('click', setAnnouncement);
    registerUserBtn.addEventListener('click', registerNewUser); // New event listener for user registration
});
