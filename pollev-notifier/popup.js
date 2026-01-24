// Popup script for managing extension settings

// Toast icon SVG paths
const TOAST_ICONS = {
  success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
};

// Toast timeout reference
let toastTimeout = null;

// Current editing class ID (null for new class)
let currentEditingClassId = null;

// Classes array
let classes = [];

// Tab status for each class
let tabStatus = {};

// Generate UUID for class IDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Migration logic: convert old single-class format to new multi-class format
async function migrateToMultiClass() {
  const data = await chrome.storage.sync.get(null);

  // Check if already migrated
  if (data.classes) {
    return data.classes;
  }

  // Check if old format exists
  if (data.pollEvUsername) {
    const migratedClass = {
      id: generateUUID(),
      name: data.pollEvUsername, // Use username as default name
      pollEvUsername: data.pollEvUsername,
      classStartTime: data.classStartTime || '',
      classEndTime: data.classEndTime || '',
      classEndDate: data.classEndDate || '',
      classDays: data.classDays || []
    };

    // Save new format
    await chrome.storage.sync.set({ classes: [migratedClass] });

    // Remove old keys
    await chrome.storage.sync.remove([
      'pollEvUsername', 'classStartTime', 'classEndTime',
      'classEndDate', 'classDays'
    ]);

    showToast('Updated to support multiple classes!', 'success');
    return [migratedClass];
  }

  // No existing data, return empty array
  return [];
}

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  // Fetch and display version from manifest
  const manifest = chrome.runtime.getManifest();
  document.getElementById('versionBadge').textContent = `v${manifest.version}`;

  // Migrate to multi-class format if needed
  classes = await migrateToMultiClass();

  // Load global settings
  const result = await chrome.storage.sync.get(['ntfyTopic', 'ntfyEnabled']);
  document.getElementById('ntfyTopic').value = result.ntfyTopic || '';
  document.getElementById('ntfyEnabled').checked = result.ntfyEnabled || false;

  // Initialize ntfy topic field visibility
  updateNtfyFieldVisibility(result.ntfyEnabled || false);

  // Render class list
  renderClassList();

  // Update force check dropdown
  updateForceCheckDropdown();

  // Check tab status
  await checkTabStatus();
});

// Render the list of classes
function renderClassList() {
  const classList = document.getElementById('classList');
  const emptyState = document.getElementById('emptyState');

  if (classes.length === 0) {
    classList.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  const dayAbbrev = {
    'Monday': 'M',
    'Tuesday': 'T',
    'Wednesday': 'W',
    'Thursday': 'Th',
    'Friday': 'F',
    'Saturday': 'S',
    'Sunday': 'Su'
  };

  classList.innerHTML = classes.map(cls => {
    const daysStr = cls.classDays && cls.classDays.length > 0
      ? cls.classDays.map(d => dayAbbrev[d] || d).join('')
      : 'No days set';

    const timeStr = cls.classStartTime && cls.classEndTime
      ? `${formatTime(cls.classStartTime)} - ${formatTime(cls.classEndTime)}`
      : 'No time set';

    const endDateStr = cls.classEndDate
      ? `Ends: ${formatDate(cls.classEndDate)}`
      : '';

    // Get tab status
    const isTabOpen = tabStatus[cls.id] || false;
    const isInClassTime = isCurrentlyInClassTime(cls);

    // Determine status indicator
    let statusIndicator = '';
    if (isInClassTime) {
      if (isTabOpen) {
        statusIndicator = `
          <div class="tab-status-indicator open" title="Tab is open">
            <div class="tab-status-content">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Tab Open</span>
            </div>
          </div>
        `;
      } else {
        statusIndicator = `
          <div class="tab-status-indicator closed" title="Tab should be open during class!">
            <div class="tab-status-content">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              <span>Tab Closed!</span>
            </div>
            <button class="tab-status-btn" data-username="${cls.pollEvUsername}" title="Open PollEv tab">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Open Tab
            </button>
          </div>
        `;
      }
    }

    return `
      <div class="class-card ${isInClassTime && !isTabOpen ? 'warning' : ''}" data-class-id="${cls.id}">
        <div class="class-card-header">
          <div class="class-card-info">
            <h3 class="class-card-name">${escapeHtml(cls.name || cls.pollEvUsername)}</h3>
            <div class="class-card-username">pollev.com/${escapeHtml(cls.pollEvUsername)}</div>
          </div>
          <div class="class-card-actions">
            <button class="class-card-btn edit" data-class-id="${cls.id}" title="Edit class">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="class-card-btn delete" data-class-id="${cls.id}" title="Delete class">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        ${statusIndicator}
        <div class="class-card-details">
          <div class="class-card-detail">
            <svg class="class-card-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>${daysStr} • ${timeStr}</span>
          </div>
          ${endDateStr ? `
          <div class="class-card-detail">
            <svg class="class-card-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>${endDateStr}</span>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners to edit and delete buttons
  document.querySelectorAll('.class-card-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const classId = btn.dataset.classId;
      openClassModal(classId);
    });
  });

  document.querySelectorAll('.class-card-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const classId = btn.dataset.classId;
      deleteClass(classId);
    });
  });

  // Add event listeners to open tab buttons
  document.querySelectorAll('.tab-status-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const username = btn.dataset.username;
      openPollEvTab(username);
    });
  });

  // Update force check dropdown
  updateForceCheckDropdown();
}

// Format time from 24h to 12h format
function formatTime(time) {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

// Format date to readable format
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Open class modal for add or edit
function openClassModal(classId = null) {
  currentEditingClassId = classId;
  const modal = document.getElementById('classModal');
  const modalTitle = document.getElementById('modalTitle');

  // Clear form
  document.getElementById('modalClassName').value = '';
  document.getElementById('modalPollEvUsername').value = '';
  document.getElementById('modalClassStartTime').value = '';
  document.getElementById('modalClassEndTime').value = '';
  document.getElementById('modalClassEndDate').value = '';

  const dayIds = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  dayIds.forEach(day => {
    document.getElementById(`modalDay${day}`).checked = false;
  });

  if (classId) {
    // Editing existing class
    modalTitle.textContent = 'Edit Class';
    const cls = classes.find(c => c.id === classId);
    if (cls) {
      document.getElementById('modalClassName').value = cls.name || '';
      document.getElementById('modalPollEvUsername').value = cls.pollEvUsername || '';
      document.getElementById('modalClassStartTime').value = cls.classStartTime || '';
      document.getElementById('modalClassEndTime').value = cls.classEndTime || '';
      document.getElementById('modalClassEndDate').value = cls.classEndDate || '';

      const classDays = cls.classDays || [];
      dayIds.forEach(day => {
        document.getElementById(`modalDay${day}`).checked = classDays.includes(day);
      });
    }
  } else {
    // Adding new class
    modalTitle.textContent = 'Add New Class';
  }

  modal.classList.remove('hidden');
}

// Close class modal
function closeClassModal() {
  document.getElementById('classModal').classList.add('hidden');
  currentEditingClassId = null;
}

// Save class (create or update)
async function saveClass() {
  const name = document.getElementById('modalClassName').value.trim();
  const pollEvUsername = document.getElementById('modalPollEvUsername').value.trim();
  const classStartTime = document.getElementById('modalClassStartTime').value.trim();
  const classEndTime = document.getElementById('modalClassEndTime').value.trim();
  const classEndDate = document.getElementById('modalClassEndDate').value.trim();

  // Get selected days
  const dayIds = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const classDays = dayIds.filter(day => document.getElementById(`modalDay${day}`).checked);

  // Validate username
  if (!pollEvUsername) {
    showToast('Please enter a PollEv username', 'error');
    return;
  }

  // Clean username
  let cleanUsername = pollEvUsername
    .replace('https://', '')
    .replace('http://', '')
    .replace('pollev.com/', '')
    .replace(/\/$/, '');

  if (!cleanUsername || cleanUsername.includes('/') || cleanUsername.includes(' ')) {
    showToast('Invalid username. Enter only the username (e.g., profsmith)', 'error');
    return;
  }

  // Check for duplicate username (only if adding new or changing username)
  const existingClass = classes.find(c => c.pollEvUsername === cleanUsername && c.id !== currentEditingClassId);
  if (existingClass) {
    showToast('A class with this username already exists', 'error');
    return;
  }

  // Validate time range
  if (classStartTime && classEndTime && classStartTime >= classEndTime) {
    showToast('End time must be after start time', 'error');
    return;
  }

  const classData = {
    id: currentEditingClassId || generateUUID(),
    name: name || cleanUsername,
    pollEvUsername: cleanUsername,
    classStartTime,
    classEndTime,
    classEndDate,
    classDays
  };

  if (currentEditingClassId) {
    // Update existing class
    const index = classes.findIndex(c => c.id === currentEditingClassId);
    if (index !== -1) {
      classes[index] = classData;
      showToast('Class updated!', 'success');
    }
  } else {
    // Add new class
    classes.push(classData);
    showToast('Class added!', 'success');
  }

  // Save to storage
  await chrome.storage.sync.set({ classes });

  // Send message to background script to setup alarms
  chrome.runtime.sendMessage({
    type: 'SETUP_CLASS_SCHEDULE',
    classes: classes
  });

  // Re-render class list
  renderClassList();

  // Check tab status
  await checkTabStatus();

  // Close modal
  closeClassModal();
}

// Delete class
async function deleteClass(classId) {
  const cls = classes.find(c => c.id === classId);
  if (!cls) return;

  const confirmed = confirm(`Delete "${cls.name || cls.pollEvUsername}"?`);
  if (!confirmed) return;

  classes = classes.filter(c => c.id !== classId);
  await chrome.storage.sync.set({ classes });

  // Send message to background script to update alarms
  chrome.runtime.sendMessage({
    type: 'SETUP_CLASS_SCHEDULE',
    classes: classes
  });

  renderClassList();
  await checkTabStatus();
  showToast('Class deleted', 'info');
}

// Check if currently in class time for a given class
function isCurrentlyInClassTime(cls) {
  if (!cls.classStartTime || !cls.classEndTime) {
    return false;
  }

  const now = new Date();

  // Check if class has ended
  if (cls.classEndDate) {
    const endDate = new Date(cls.classEndDate);
    endDate.setHours(23, 59, 59);
    if (now > endDate) {
      return false;
    }
  }

  // Check day of week
  if (cls.classDays && cls.classDays.length > 0) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    if (!cls.classDays.includes(currentDay)) {
      return false;
    }
  }

  // Check time range
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMin] = cls.classStartTime.split(':').map(Number);
  const [endHour, endMin] = cls.classEndTime.split(':').map(Number);
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  return currentTime >= startTime && currentTime <= endTime;
}

// Check tab status for all classes
async function checkTabStatus() {
  if (classes.length === 0) {
    return;
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'CHECK_TAB_STATUS',
      classes: classes
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error checking tab status:', chrome.runtime.lastError);
        resolve();
        return;
      }

      if (response && response.tabStatus) {
        tabStatus = response.tabStatus;
        renderClassList();
      }
      resolve();
    });
  });
}

// Open or focus PollEv tab
async function openPollEvTab(username) {
  const pollEvUrl = `https://pollev.com/${username}`;

  // Check if tab already exists
  chrome.tabs.query({ url: pollEvUrl + "*" }, async (tabs) => {
    if (tabs.length > 0) {
      // Tab exists, focus it
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
      showToast('Tab focused', 'success');
    } else {
      // Tab doesn't exist, create it
      chrome.tabs.create({ url: pollEvUrl });
      showToast('Tab opened', 'success');
    }

    // Refresh status after a moment
    setTimeout(async () => {
      await checkTabStatus();
    }, 500);
  });
}

// Update Force Check dropdown with current classes
function updateForceCheckDropdown() {
  const select = document.getElementById('forceCheckClassSelect');

  if (classes.length === 0) {
    select.innerHTML = '<option value="">No classes configured</option>';
    select.disabled = true;
    return;
  }

  select.disabled = false;
  select.innerHTML = '<option value="">Select a class...</option>' +
    classes.map(cls =>
      `<option value="${cls.id}">${escapeHtml(cls.name || cls.pollEvUsername)}</option>`
    ).join('');

  // Auto-select first class if only one class
  if (classes.length === 1) {
    select.value = classes[0].id;
  }
}

// Send message with timeout protection
function sendMessageWithTimeout(message, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timed out'));
    }, timeoutMs);

    chrome.runtime.sendMessage(message, (response) => {
      clearTimeout(timeout);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Handle force check response
function handleForceCheckResponse(response, className) {
  const prefix = `[${className}] `;

  if (response.status === 'waiting') {
    showToast(prefix + 'Waiting screen (no poll active)', 'info');
  } else if (response.status === 'old_poll') {
    showToast(prefix + `Old poll - "${response.question}"`, 'info');
  } else if (response.status === 'active_poll') {
    showToast(prefix + `Active poll - "${response.question}"`, 'success');
  } else if (response.status === 'no_content') {
    showToast(prefix + 'No poll detected', 'info');
  } else if (response.status === 'opened_tab') {
    showToast(prefix + 'Tab opened. Checking in 3 seconds...', 'info');
    // AUTO-RETRY after tab loads
    setTimeout(() => retryForceCheck(className), 3000);
  } else if (response.status === 'checking') {
    showToast(prefix + 'Loading page, please wait...', 'info');
  } else if (response.status === 'error') {
    showToast(prefix + 'Error: ' + response.message, 'error');
  } else {
    showToast(prefix + 'Unknown response', 'error');
  }
}

// Auto-retry force check after tab opens
async function retryForceCheck(className) {
  const select = document.getElementById('forceCheckClassSelect');
  const selectedClassId = select.value;
  const cls = classes.find(c => c.id === selectedClassId);

  if (!cls) return;

  try {
    const response = await sendMessageWithTimeout({
      type: 'FORCE_CHECK_PAGE',
      username: cls.pollEvUsername,
      classId: cls.id,
      className: cls.name || cls.pollEvUsername
    }, 10000);

    handleForceCheckResponse(response, cls.name || cls.pollEvUsername);
  } catch (error) {
    showToast('Auto-retry failed: ' + error.message, 'error');
  }
}

// Add class button
document.getElementById('addClassButton').addEventListener('click', () => {
  openClassModal();
});

// Tab status refresh button
document.getElementById('tabStatusRefresh').addEventListener('click', async () => {
  await checkTabStatus();
  showToast('Tab status refreshed', 'info');
});

// Close modal button
document.getElementById('closeModalButton').addEventListener('click', closeClassModal);
document.getElementById('cancelClassButton').addEventListener('click', closeClassModal);

// Save class button
document.getElementById('saveClassButton').addEventListener('click', saveClass);

// Close modal when clicking outside
document.getElementById('classModal').addEventListener('click', (e) => {
  if (e.target.id === 'classModal') {
    closeClassModal();
  }
});

// Ntfy toggle change handler
document.getElementById('ntfyEnabled').addEventListener('change', (e) => {
  updateNtfyFieldVisibility(e.target.checked);
});

// Update ntfy topic field visibility
function updateNtfyFieldVisibility(isEnabled) {
  const ntfyTopicField = document.getElementById('ntfyTopicField');
  if (isEnabled) {
    ntfyTopicField.classList.remove('hidden');
  } else {
    ntfyTopicField.classList.add('hidden');
  }
}

// Save global settings (ntfy only)
document.getElementById('saveButton').addEventListener('click', async () => {
  const saveButton = document.getElementById('saveButton');
  const ntfyTopic = document.getElementById('ntfyTopic').value.trim();
  const ntfyEnabled = document.getElementById('ntfyEnabled').checked;

  if (ntfyEnabled && !ntfyTopic) {
    showToast('Please enter a topic name', 'error');
    return;
  }

  // Show loading state
  saveButton.classList.add('loading');

  await chrome.storage.sync.set({
    ntfyTopic: ntfyTopic,
    ntfyEnabled: ntfyEnabled
  });

  // Remove loading state
  saveButton.classList.remove('loading');

  showToast('Settings saved!', 'success');
});

// Force check button - checks selected class
document.getElementById('forceCheckButton').addEventListener('click', async () => {
  if (classes.length === 0) {
    showToast('Please add a class first', 'error');
    return;
  }

  const select = document.getElementById('forceCheckClassSelect');
  const selectedClassId = select.value;

  if (!selectedClassId) {
    showToast('Please select a class to check', 'error');
    return;
  }

  const cls = classes.find(c => c.id === selectedClassId);
  if (!cls) {
    showToast('Selected class not found', 'error');
    return;
  }

  // Show loading state
  const btn = document.getElementById('forceCheckButton');
  btn.classList.add('loading');

  // Send message with 10 second timeout
  try {
    const response = await sendMessageWithTimeout({
      type: 'FORCE_CHECK_PAGE',
      username: cls.pollEvUsername,
      classId: cls.id,
      className: cls.name || cls.pollEvUsername
    }, 10000);

    handleForceCheckResponse(response, cls.name || cls.pollEvUsername);
  } catch (error) {
    showToast('Force check timed out or failed: ' + error.message, 'error');
  } finally {
    btn.classList.remove('loading');
  }
});

// Test notification
document.getElementById('testButton').addEventListener('click', async () => {
  // Test desktop notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: "Test Notification",
    message: "This is a test poll notification!",
    priority: 2
  });

  // Test phone notification if enabled
  const result = await chrome.storage.sync.get(['ntfyTopic', 'ntfyEnabled']);

  if (result.ntfyEnabled && result.ntfyTopic) {
    try {
      const topic = result.ntfyTopic;
      const url = `https://ntfy.sh/${topic}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Title": "Test Notification",
          "Priority": "high",
          "Tags": "white_check_mark"
        },
        body: "This is a test from PollEv Notifier!"
      });

      if (response.ok) {
        showToast('Test notifications sent! Check your devices.', 'success');
      } else {
        showToast('Desktop notification sent. Phone notification may have failed.', 'error');
      }
    } catch (error) {
      showToast('Desktop notification sent. Phone notification failed: ' + error.message, 'error');
    }
  } else {
    showToast('Desktop notification sent! (Phone notifications not configured)', 'success');
  }
});

// Show toast notification
function showToast(message, type) {
  const toast = document.getElementById('toast');
  const toastIcon = document.getElementById('toastIcon');
  const toastMessage = document.getElementById('toastMessage');

  // Clear any existing timeout
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toast.classList.remove('visible', 'hiding');
  }

  // Set content
  toastIcon.innerHTML = TOAST_ICONS[type] || TOAST_ICONS.info;
  toastMessage.textContent = message;

  // Set type class
  toast.className = `toast ${type}`;

  // Trigger reflow for animation
  void toast.offsetWidth;

  // Show toast
  toast.classList.add('visible');

  // Hide after delay
  toastTimeout = setTimeout(() => {
    toast.classList.add('hiding');
    toast.classList.remove('visible');

    // Clean up after animation
    setTimeout(() => {
      toast.classList.remove('hiding');
    }, 300);
  }, 5000);
}
