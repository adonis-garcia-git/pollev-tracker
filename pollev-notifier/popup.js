// Popup script for managing extension settings

// Load saved settings when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.storage.sync.get(['ntfyTopic', 'ntfyEnabled']);
  
  document.getElementById('ntfyTopic').value = result.ntfyTopic || '';
  document.getElementById('ntfyEnabled').checked = result.ntfyEnabled || false;
});

// Save settings
document.getElementById('saveButton').addEventListener('click', async () => {
  const ntfyTopic = document.getElementById('ntfyTopic').value.trim();
  const ntfyEnabled = document.getElementById('ntfyEnabled').checked;
  
  if (ntfyEnabled && !ntfyTopic) {
    showStatus('Please enter a topic name', 'error');
    return;
  }
  
  await chrome.storage.sync.set({
    ntfyTopic: ntfyTopic,
    ntfyEnabled: ntfyEnabled
  });
  
  showStatus('Settings saved successfully!', 'success');
});

// Test notification
document.getElementById('testButton').addEventListener('click', async () => {
  // Test desktop notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: "🚨 Test Notification",
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
          "Title": "🚨 Test Notification",
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
