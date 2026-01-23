// Popup script for managing extension settings

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', async () => {
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
});

// Save settings
document.getElementById('saveButton').addEventListener('click', async () => {
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
    showStatus('Please enter a PollEv username', 'error');
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
    showStatus('Invalid username. Enter only the username (e.g., gsandoval)', 'error');
    return;
  }
  
  // Validate time range if provided
  if (classStartTime && classEndTime) {
    if (classStartTime >= classEndTime) {
      showStatus('End time must be after start time', 'error');
      return;
    }
  }
  
  if (ntfyEnabled && !ntfyTopic) {
    showStatus('Please enter a topic name', 'error');
    return;
  }
  
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
  
  showStatus('Settings saved! Extension will auto-open tab at class start time.', 'success');
});

// Force check button - checks monitored URL and opens tab if needed
document.getElementById('forceCheckButton').addEventListener('click', async () => {
  const result = await chrome.storage.sync.get(['pollEvUsername']);
  
  if (!result.pollEvUsername) {
    showStatus('Please configure username first', 'error');
    return;
  }
  
  // Send message to background script to handle force check
  chrome.runtime.sendMessage({ 
    type: 'FORCE_CHECK_PAGE',
    username: result.pollEvUsername
  }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('Error: ' + chrome.runtime.lastError.message, 'error');
      return;
    }
    
    if (response.status === 'waiting') {
      showStatus('Page Status: Waiting screen (no poll active)', 'info');
    } else if (response.status === 'old_poll') {
      showStatus(`Page Status: Old poll - "${response.question}"`, 'info');
    } else if (response.status === 'active_poll') {
      showStatus(`Page Status: Active poll - "${response.question}"`, 'info');
    } else if (response.status === 'no_content') {
      showStatus('Page Status: No poll detected', 'info');
    } else if (response.status === 'opened_tab') {
      showStatus('Opened PollEv tab. Wait a moment and try again.', 'info');
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
        showStatus('Test notifications sent! Check your devices.', 'success');
      } else {
        showStatus('Desktop notification sent. Phone notification may have failed.', 'error');
      }
    } catch (error) {
      showStatus('Desktop notification sent. Phone notification failed: ' + error.message, 'error');
    }
  } else {
    showStatus('Desktop notification sent! (Phone notifications not configured)', 'success');
  }
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}
