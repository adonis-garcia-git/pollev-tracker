// Popup script for managing extension settings

// Toast icon SVG paths
const TOAST_ICONS = {
  success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
};

// Toast timeout reference
let toastTimeout = null;

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  // Fetch and display version from manifest
  const manifest = chrome.runtime.getManifest();
  document.getElementById('versionBadge').textContent = `v${manifest.version}`;

  const result = await chrome.storage.sync.get([
    'ntfyTopic',
    'ntfyEnabled',
    'pollEvUsername',
    'classStartTime',
    'classEndTime',
    'classEndDate',
    'classDays'
  ]);

  document.getElementById('pollEvUsername').value = result.pollEvUsername || '';
  document.getElementById('classStartTime').value = result.classStartTime || '';
  document.getElementById('classEndTime').value = result.classEndTime || '';
  document.getElementById('classEndDate').value = result.classEndDate || '';
  document.getElementById('ntfyTopic').value = result.ntfyTopic || '';
  document.getElementById('ntfyEnabled').checked = result.ntfyEnabled || false;

  // Load class days
  const classDays = result.classDays || [];
  const dayIds = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  dayIds.forEach(day => {
    document.getElementById(`day${day}`).checked = classDays.includes(day);
  });

  // Initialize ntfy topic field visibility
  updateNtfyFieldVisibility(result.ntfyEnabled || false);
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

// Save settings
document.getElementById('saveButton').addEventListener('click', async () => {
  const saveButton = document.getElementById('saveButton');
  const pollEvUsername = document.getElementById('pollEvUsername').value.trim();
  const classStartTime = document.getElementById('classStartTime').value.trim();
  const classEndTime = document.getElementById('classEndTime').value.trim();
  const classEndDate = document.getElementById('classEndDate').value.trim();
  const ntfyTopic = document.getElementById('ntfyTopic').value.trim();
  const ntfyEnabled = document.getElementById('ntfyEnabled').checked;

  // Get selected days
  const dayIds = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const classDays = dayIds.filter(day => document.getElementById(`day${day}`).checked);

  // Validate PollEv username
  if (!pollEvUsername) {
    showToast('Please enter a PollEv username', 'error');
    return;
  }

  // Clean username - remove any url parts if user pasted full URL
  let cleanUsername = pollEvUsername
    .replace('https://', '')
    .replace('http://', '')
    .replace('pollev.com/', '')
    .replace(/\/$/, ''); // remove trailing slash

  // Validate cleaned username
  if (!cleanUsername || cleanUsername.includes('/') || cleanUsername.includes(' ')) {
    showToast('Invalid username. Enter only the username (e.g., gsandoval)', 'error');
    return;
  }

  // Validate time range if provided
  if (classStartTime && classEndTime) {
    if (classStartTime >= classEndTime) {
      showToast('End time must be after start time', 'error');
      return;
    }
  }

  if (ntfyEnabled && !ntfyTopic) {
    showToast('Please enter a topic name', 'error');
    return;
  }

  // Show loading state
  saveButton.classList.add('loading');

  await chrome.storage.sync.set({
    pollEvUsername: cleanUsername,
    classStartTime: classStartTime,
    classEndTime: classEndTime,
    classEndDate: classEndDate,
    classDays: classDays,
    ntfyTopic: ntfyTopic,
    ntfyEnabled: ntfyEnabled
  });

  // Send message to background script to setup class start alarm
  chrome.runtime.sendMessage({
    type: 'SETUP_CLASS_SCHEDULE',
    startTime: classStartTime,
    endTime: classEndTime,
    days: classDays
  });

  // Remove loading state
  saveButton.classList.remove('loading');

  showToast('Settings saved! Extension will auto-open tab at class start time.', 'success');
});

// Force check button - checks monitored URL and opens tab if needed
document.getElementById('forceCheckButton').addEventListener('click', async () => {
  const result = await chrome.storage.sync.get(['pollEvUsername']);

  if (!result.pollEvUsername) {
    showToast('Please configure username first', 'error');
    return;
  }

  // Send message to background script to handle force check
  chrome.runtime.sendMessage({
    type: 'FORCE_CHECK_PAGE',
    username: result.pollEvUsername
  }, (response) => {
    if (chrome.runtime.lastError) {
      showToast('Error: ' + chrome.runtime.lastError.message, 'error');
      return;
    }

    if (response.status === 'waiting') {
      showToast('Page Status: Waiting screen (no poll active)', 'info');
    } else if (response.status === 'old_poll') {
      showToast(`Page Status: Old poll - "${response.question}"`, 'info');
    } else if (response.status === 'active_poll') {
      showToast(`Page Status: Active poll - "${response.question}"`, 'info');
    } else if (response.status === 'no_content') {
      showToast('Page Status: No poll detected', 'info');
    } else if (response.status === 'opened_tab') {
      showToast('Opened PollEv tab. Wait a moment and try again.', 'info');
    }
  });
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
