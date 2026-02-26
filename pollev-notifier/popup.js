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

  // Check tab status
  await checkTabStatus();

  // Check for errors
  await checkForErrors();

  // Update DND status
  await updateDndStatus();

  // Start countdown timer
  startCountdownTimer();
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
    'Saturday': 'Sa',
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

    // Check if notifications are enabled (default to true for backward compatibility)
    const notificationsEnabled = cls.notificationsEnabled !== undefined ? cls.notificationsEnabled : true;

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
        <div class="class-card-quick-actions">
          <button class="quick-action-btn test-now" data-class-id="${cls.id}" title="Test this class now">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span>Test Now</span>
          </button>
          <button class="quick-action-btn open-tab" data-username="${cls.pollEvUsername}" title="Open PollEv tab">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            <span>Open Tab</span>
          </button>
          <button class="quick-action-btn notify-toggle ${notificationsEnabled ? 'enabled' : 'disabled'}" data-class-id="${cls.id}" title="${notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              ${notificationsEnabled ? '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>' : '<path d="M6.873 17C5.275 17 4 15.745 4 14.17V8.83C4 7.256 5.274 6 6.873 6h2.254l2.11-3h4.526l2.11 3h2.254C21.726 6 23 7.255 23 8.83v5.34c0 1.574-1.274 2.83-2.873 2.83H6.873Z"/><line x1="2" y1="2" x2="22" y2="22"/>'}
            </svg>
            <span>${notificationsEnabled ? 'Notifications On' : 'Notifications Off'}</span>
          </button>
          <button class="quick-action-btn duplicate" data-class-id="${cls.id}" title="Duplicate this class">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            <span>Duplicate</span>
          </button>
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

  // Add event listeners for quick actions
  document.querySelectorAll('.quick-action-btn.test-now').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const classId = btn.dataset.classId;
      handleQuickTestNow(classId);
    });
  });

  document.querySelectorAll('.quick-action-btn.open-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const username = btn.dataset.username;
      openPollEvTab(username);
    });
  });

  document.querySelectorAll('.quick-action-btn.notify-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const classId = btn.dataset.classId;
      handleNotificationToggle(classId);
    });
  });

  document.querySelectorAll('.quick-action-btn.duplicate').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const classId = btn.dataset.classId;
      duplicateClass(classId);
    });
  });
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

  if (!cleanUsername || !/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    showToast('Invalid username. Use only letters, numbers, hyphens, and underscores', 'error');
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

  // Validate at least one day selected
  if (classDays.length === 0) {
    showToast('Please select at least one class day', 'error');
    return;
  }

  // Validate end date is not in the past
  if (classEndDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(classEndDate + 'T00:00:00');
    if (endDate < today) {
      showToast('End date cannot be in the past', 'error');
      return;
    }
  }

  // Preserve existing notificationsEnabled on edit, default to true for new classes
  const editingClass = currentEditingClassId ? classes.find(c => c.id === currentEditingClassId) : null;
  const notificationsEnabled = editingClass && editingClass.notificationsEnabled !== undefined
    ? editingClass.notificationsEnabled
    : true;

  const classData = {
    id: currentEditingClassId || generateUUID(),
    name: name || cleanUsername,
    pollEvUsername: cleanUsername,
    classStartTime,
    classEndTime,
    classEndDate,
    classDays,
    notificationsEnabled
  };

  const isEditing = !!currentEditingClassId;

  if (isEditing) {
    // Update existing class
    const index = classes.findIndex(c => c.id === currentEditingClassId);
    if (index !== -1) {
      classes[index] = classData;
    }
  } else {
    // Add new class
    classes.push(classData);
  }

  // Save to storage — only show success after confirmed
  try {
    await chrome.storage.sync.set({ classes });
    showToast(isEditing ? 'Class updated!' : 'Class added!', 'success');
  } catch (error) {
    // Revert in-memory change on failure
    if (isEditing) {
      // Reload from storage to revert
      const result = await chrome.storage.sync.get(['classes']);
      classes = result.classes || [];
    } else {
      classes.pop();
    }
    showToast('Failed to save: ' + error.message, 'error');
    return;
  }

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
    showToast(prefix + 'Tab opened. Use "Test Now" again after page loads.', 'info');
  } else if (response.status === 'checking') {
    showToast(prefix + 'Loading page, please wait...', 'info');
  } else if (response.status === 'error') {
    showToast(prefix + 'Error: ' + response.message, 'error');
  } else {
    showToast(prefix + 'Unknown response', 'error');
  }
}


// Escape key closes any open modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const modals = [
      { el: document.getElementById('classModal'), close: closeClassModal },
      { el: document.getElementById('errorModal'), close: closeErrorModal },
      { el: document.getElementById('allClassesTodayModal'), close: () => document.getElementById('allClassesTodayModal').classList.add('hidden') }
    ];
    for (const modal of modals) {
      if (!modal.el.classList.contains('hidden')) {
        modal.close();
        break;
      }
    }
  }
});

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

// Ntfy help toggle handler
document.getElementById('ntfyHelpToggle').addEventListener('click', () => {
  const ntfyHint = document.getElementById('ntfyHint');
  ntfyHint.classList.toggle('hidden');
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

  if (ntfyEnabled && !/^[a-zA-Z0-9_-]+$/.test(ntfyTopic)) {
    showToast('Topic name can only contain letters, numbers, hyphens, and underscores', 'error');
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

// Test notification
document.getElementById('testButton').addEventListener('click', async () => {
  let desktopSuccess = false;
  let phoneSuccess = false;
  let phoneConfigured = false;

  // Test desktop notification
  try {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon128.png",
      title: "Test Notification",
      message: "This is a test poll notification!",
      priority: 2
    });
    desktopSuccess = true;
  } catch (error) {
    console.error('Desktop notification failed:', error);
  }

  // Test phone notification if enabled
  const result = await chrome.storage.sync.get(['ntfyTopic', 'ntfyEnabled']);

  if (result.ntfyEnabled && result.ntfyTopic) {
    phoneConfigured = true;
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
        phoneSuccess = true;
      } else {
        throw new Error(`Ntfy returned status ${response.status}`);
      }
    } catch (error) {
      console.error('Phone notification failed:', error);
      await chrome.storage.local.set({
        lastError: {
          message: `Phone notification test failed: ${error.message}`,
          timestamp: Date.now(),
          context: 'ntfy_notification',
          classId: null
        }
      });
      await checkForErrors();
      showErrorModal(); // Auto-open modal
    }
  }

  // Show delivery confirmation
  if (desktopSuccess && phoneSuccess) {
    showToast('Desktop ✓, Phone ✓ - Test notifications sent!', 'success');
  } else if (desktopSuccess && phoneConfigured && !phoneSuccess) {
    showToast('Desktop ✓, Phone ✗ - Click the red badge next to "Phone Alerts" for details', 'error');
  } else if (desktopSuccess && !phoneConfigured) {
    showToast('Desktop ✓ - Phone notifications not configured', 'success');
  } else {
    showToast('Test failed. Check error details.', 'error');
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

// Check for errors from storage
async function checkForErrors() {
  const result = await chrome.storage.local.get(['lastError']);
  const errorBadge = document.getElementById('errorBadge');

  if (result.lastError) {
    const error = result.lastError;
    const now = Date.now();
    const errorAge = now - error.timestamp;

    // Clear errors older than 24 hours
    if (errorAge > 24 * 60 * 60 * 1000) {
      await chrome.storage.local.remove(['lastError']);
      errorBadge.classList.add('hidden');
    } else {
      // Show error badge
      errorBadge.classList.remove('hidden');
    }
  } else {
    errorBadge.classList.add('hidden');
  }
}

// Show error modal with details
async function showErrorModal() {
  const result = await chrome.storage.local.get(['lastError']);
  if (!result.lastError) {
    showToast('No errors to display', 'info');
    return;
  }

  const error = result.lastError;
  const modal = document.getElementById('errorModal');

  // Populate error details
  document.getElementById('errorMessage').textContent = error.message;
  document.getElementById('errorContext').textContent = formatErrorContext(error.context);
  document.getElementById('errorTime').textContent = new Date(error.timestamp).toLocaleString();
  document.getElementById('errorSuggestion').textContent = getSuggestionForError(error.context);

  // Show modal
  modal.classList.remove('hidden');
}

// Format error context for display
function formatErrorContext(context) {
  const contextMap = {
    'ntfy_notification': 'Phone Notification (Ntfy)',
    'force_check': 'Force Check Page',
    'tab_closed_notification': 'Tab Closed Alert',
    'alarm_trigger': 'Scheduled Alarm'
  };
  return contextMap[context] || context;
}

// Get troubleshooting suggestion for error
function getSuggestionForError(context) {
  const suggestions = {
    'ntfy_notification': 'Check your Ntfy topic name is correct and your device is connected to the internet.',
    'force_check': 'Make sure the PollEv page is fully loaded before forcing a check. Try refreshing the tab.',
    'tab_closed_notification': 'Check your Ntfy configuration in settings.',
    'alarm_trigger': 'Try removing and re-adding the class schedule.'
  };
  return suggestions[context] || 'Try restarting the extension or checking your internet connection.';
}

// Close error modal
function closeErrorModal() {
  document.getElementById('errorModal').classList.add('hidden');
}

// Clear error from storage
async function clearError() {
  await chrome.storage.local.remove(['lastError']);
  await checkForErrors();
  closeErrorModal();
  showToast('Error cleared', 'success');
}

// Error badge click - show error modal
document.getElementById('errorBadge').addEventListener('click', showErrorModal);

// Close error modal buttons
document.getElementById('closeErrorModalButton').addEventListener('click', closeErrorModal);
document.getElementById('closeErrorButton').addEventListener('click', closeErrorModal);

// Clear error button
document.getElementById('clearErrorButton').addEventListener('click', clearError);

// Close modal when clicking outside
document.getElementById('errorModal').addEventListener('click', (e) => {
  if (e.target.id === 'errorModal') {
    closeErrorModal();
  }
});

// Update DND status display
async function updateDndStatus() {
  const result = await chrome.storage.local.get(['dndUntil']);
  const dndEnabled = document.getElementById('dndEnabled');
  const dndDurationField = document.getElementById('dndDurationField');
  const dndStatus = document.getElementById('dndStatus');
  const dndStatusText = document.getElementById('dndStatusText');

  if (result.dndUntil && result.dndUntil > Date.now()) {
    // DND is active
    const expiryDate = new Date(result.dndUntil);
    const timeStr = expiryDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    dndEnabled.checked = true;
    dndDurationField.classList.add('hidden');
    dndStatus.classList.remove('hidden');
    dndStatusText.textContent = `Active until ${timeStr}`;
  } else {
    // DND is not active
    if (result.dndUntil) {
      // DND expired, clear it
      await chrome.storage.local.remove(['dndUntil']);
    }
    dndEnabled.checked = false;
    dndDurationField.classList.add('hidden');
    dndStatus.classList.add('hidden');
  }
}

// DND toggle change handler — show duration picker first, then activate on selection
document.getElementById('dndEnabled').addEventListener('change', async (e) => {
  const dndDurationField = document.getElementById('dndDurationField');
  const dndStatus = document.getElementById('dndStatus');

  if (e.target.checked) {
    // Show duration picker — don't activate yet
    dndDurationField.classList.remove('hidden');
    dndStatus.classList.add('hidden');
    showToast('Select a duration to activate Do Not Disturb', 'info');
  } else {
    // Disable DND
    await chrome.storage.local.remove(['dndUntil']);
    dndDurationField.classList.add('hidden');
    dndStatus.classList.add('hidden');
    showToast('Do Not Disturb disabled', 'info');
  }
});

// DND duration change handler — activates DND with selected duration
document.getElementById('dndDuration').addEventListener('change', async (e) => {
  const duration = parseInt(e.target.value);
  const dndUntil = Date.now() + duration;

  await chrome.storage.local.set({ dndUntil });
  await updateDndStatus();

  const hours = Math.floor(duration / 3600000);
  showToast(`Do Not Disturb enabled for ${hours} hour${hours > 1 ? 's' : ''}`, 'success');
});

// Quick action: Test Now
async function handleQuickTestNow(classId) {
  const cls = classes.find(c => c.id === classId);
  if (!cls) {
    showToast('Class not found', 'error');
    return;
  }

  // Show loading state
  const btn = document.querySelector(`.quick-action-btn.test-now[data-class-id="${classId}"]`);
  if (btn) {
    btn.classList.add('loading');
  }

  try {
    const response = await sendMessageWithTimeout({
      type: 'FORCE_CHECK_PAGE',
      username: cls.pollEvUsername,
      classId: cls.id,
      className: cls.name || cls.pollEvUsername
    }, 10000);

    handleForceCheckResponse(response, cls.name || cls.pollEvUsername);
  } catch (error) {
    showToast('Test failed: ' + error.message, 'error');
  } finally {
    if (btn) {
      btn.classList.remove('loading');
    }
  }
}

// Quick action: Toggle notifications
async function handleNotificationToggle(classId) {
  const cls = classes.find(c => c.id === classId);
  if (!cls) {
    showToast('Class not found', 'error');
    return;
  }

  // Toggle the notification state (default to true if not set)
  const currentState = cls.notificationsEnabled !== undefined ? cls.notificationsEnabled : true;
  const newState = !currentState;

  // Update the class object
  cls.notificationsEnabled = newState;

  // Save to storage
  await chrome.storage.sync.set({ classes });

  // Re-render to update UI
  renderClassList();

  showToast(
    newState ? `Notifications enabled for ${cls.name || cls.pollEvUsername}` : `Notifications muted for ${cls.name || cls.pollEvUsername}`,
    newState ? 'success' : 'info'
  );
}

// Quick action: Duplicate class
function duplicateClass(classId) {
  const cls = classes.find(c => c.id === classId);
  if (!cls) {
    showToast('Class not found', 'error');
    return;
  }

  // Open modal in "add" mode
  currentEditingClassId = null;
  const modal = document.getElementById('classModal');
  const modalTitle = document.getElementById('modalTitle');

  // Pre-fill form with existing data (except username, which must be unique)
  modalTitle.textContent = 'Duplicate Class';
  document.getElementById('modalClassName').value = `${cls.name || cls.pollEvUsername} (Copy)`;
  document.getElementById('modalPollEvUsername').value = '';
  document.getElementById('modalClassStartTime').value = cls.classStartTime || '';
  document.getElementById('modalClassEndTime').value = cls.classEndTime || '';
  document.getElementById('modalClassEndDate').value = cls.classEndDate || '';

  const dayIds = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const classDays = cls.classDays || [];
  dayIds.forEach(day => {
    document.getElementById(`modalDay${day}`).checked = classDays.includes(day);
  });

  modal.classList.remove('hidden');

  // Focus the username field since user must provide a new one
  setTimeout(() => document.getElementById('modalPollEvUsername').focus(), 100);
}

// Countdown timer
let countdownInterval = null;

function startCountdownTimer() {
  // Update immediately
  updateCountdown();

  // Update every 60 seconds
  countdownInterval = setInterval(updateCountdown, 60000);
}

function updateCountdown() {
  const nextClass = findNextClass();
  const banner = document.getElementById('countdownBanner');

  if (!nextClass) {
    banner.classList.add('hidden');
    return;
  }

  const { cls, minutesUntil } = nextClass;

  // If class has already started, hide the banner
  if (minutesUntil < 0) {
    banner.classList.remove('hidden');
    document.getElementById('countdownClass').textContent = cls.name || cls.pollEvUsername;
    document.getElementById('countdownTime').textContent = 'Now!';
    document.getElementById('countdownTime').style.background = 'var(--color-success)';
    return;
  }

  // Show banner
  banner.classList.remove('hidden');

  // Update text
  document.getElementById('countdownClass').textContent = cls.name || cls.pollEvUsername;

  // Format time
  const hours = Math.floor(minutesUntil / 60);
  const minutes = minutesUntil % 60;

  let timeStr = '';
  if (hours > 0) {
    timeStr = `in ${hours}h ${minutes}m`;
  } else {
    timeStr = `in ${minutes}m`;
  }

  document.getElementById('countdownTime').textContent = timeStr;
  document.getElementById('countdownTime').style.background = '';
}

function findNextClass() {
  if (classes.length === 0) return null;

  const now = new Date();
  const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();

  let closestClass = null;
  let closestMinutes = Infinity;

  for (const cls of classes) {
    // Skip if no schedule
    if (!cls.classStartTime || !cls.classEndTime) continue;

    // Skip if class has ended
    if (cls.classEndDate) {
      const endDate = new Date(cls.classEndDate);
      endDate.setHours(23, 59, 59);
      if (now > endDate) continue;
    }

    // Check if today is a class day
    if (cls.classDays && cls.classDays.length > 0) {
      if (!cls.classDays.includes(currentDay)) continue;
    }

    // Parse start time
    const [startHour, startMin] = cls.classStartTime.split(':').map(Number);
    const startTime = startHour * 60 + startMin;

    // Calculate minutes until class
    const minutesUntil = startTime - currentTime;

    // If class starts later today and is sooner than current closest
    if (minutesUntil >= -5 && minutesUntil < closestMinutes) {
      closestMinutes = minutesUntil;
      closestClass = cls;
    }
  }

  if (closestClass) {
    return { cls: closestClass, minutesUntil: closestMinutes };
  }

  return null;
}

function showTodayClasses() {
  const now = new Date();
  const currentDay = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];

  // Filter classes for today
  const todayClasses = classes.filter(cls => {
    // Skip if no schedule
    if (!cls.classStartTime || !cls.classEndTime) return false;

    // Skip if class has ended
    if (cls.classEndDate) {
      const endDate = new Date(cls.classEndDate);
      endDate.setHours(23, 59, 59);
      if (now > endDate) return false;
    }

    // Check if today is a class day
    if (cls.classDays && cls.classDays.length > 0) {
      return cls.classDays.includes(currentDay);
    }

    return false;
  });

  // Sort by start time
  todayClasses.sort((a, b) => {
    const [aHour, aMin] = a.classStartTime.split(':').map(Number);
    const [bHour, bMin] = b.classStartTime.split(':').map(Number);
    const aTime = aHour * 60 + aMin;
    const bTime = bHour * 60 + bMin;
    return aTime - bTime;
  });

  // Render list
  const listContainer = document.getElementById('todayClassesList');

  if (todayClasses.length === 0) {
    listContainer.innerHTML = '<p class="empty-state-text">No classes scheduled for today</p>';
  } else {
    listContainer.innerHTML = todayClasses.map(cls => {
      const timeStr = `${formatTime(cls.classStartTime)} - ${formatTime(cls.classEndTime)}`;
      return `
        <div class="today-class-item">
          <div class="today-class-info">
            <h4 class="today-class-name">${escapeHtml(cls.name || cls.pollEvUsername)}</h4>
            <p class="today-class-time">${timeStr}</p>
          </div>
        </div>
      `;
    }).join('');
  }

  // Show modal
  document.getElementById('allClassesTodayModal').classList.remove('hidden');
}

// Cleanup countdown on unload
window.addEventListener('beforeunload', () => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

// Countdown banner - view all classes button
document.getElementById('viewAllClassesBtn').addEventListener('click', showTodayClasses);

// Close all classes today modal
document.getElementById('closeAllClassesTodayButton').addEventListener('click', () => {
  document.getElementById('allClassesTodayModal').classList.add('hidden');
});

document.getElementById('closeTodayClassesButton').addEventListener('click', () => {
  document.getElementById('allClassesTodayModal').classList.add('hidden');
});

document.getElementById('allClassesTodayModal').addEventListener('click', (e) => {
  if (e.target.id === 'allClassesTodayModal') {
    document.getElementById('allClassesTodayModal').classList.add('hidden');
  }
});
