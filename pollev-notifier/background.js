// Background service worker for handling notifications

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "POLL_ACTIVE") {
    handlePollActive(message);
  } else if (message.type === "SETUP_CLASS_SCHEDULE") {
    setupClassSchedule(message.startTime, message.endTime, message.days);
  } else if (message.type === "FORCE_CHECK_PAGE") {
    handleForceCheck(message.username, sendResponse);
    return true; // Keep channel open for async response
  }
});

// Handle force check - opens tab if needed, then checks status
async function handleForceCheck(username, sendResponse) {
  const pollEvUrl = `https://pollev.com/${username}`;
  
  // Check if tab is already open
  chrome.tabs.query({ url: pollEvUrl + "*" }, async (tabs) => {
    if (tabs.length === 0) {
      // Tab doesn't exist, open it
      chrome.tabs.create({ url: pollEvUrl, active: false }, (newTab) => {
        // Wait a moment for page to load, then tell user to try again
        sendResponse({ status: 'opened_tab' });
      });
    } else {
      // Tab exists, send message to content script
      try {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'FORCE_CHECK' }, (response) => {
          if (chrome.runtime.lastError) {
            sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
          } else {
            sendResponse(response);
          }
        });
      } catch (error) {
        sendResponse({ status: 'error', message: error.message });
      }
    }
  });
}

// Check if we're within class hours
async function isWithinClassHours() {
  const result = await chrome.storage.sync.get(['classStartTime', 'classEndTime', 'classEndDate', 'classDays']);
  
  // If no schedule set, always allow
  if (!result.classStartTime || !result.classEndTime) {
    return true;
  }
  
  const now = new Date();
  
  // Check if class has ended
  if (result.classEndDate) {
    const endDate = new Date(result.classEndDate);
    endDate.setHours(23, 59, 59); // End of day
    if (now > endDate) {
      console.log("Class has ended. Extension inactive.");
      return false;
    }
  }
  
  // Check day of week
  if (result.classDays && result.classDays.length > 0) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = dayNames[now.getDay()];
    if (!result.classDays.includes(currentDay)) {
      console.log(`Not a class day (${currentDay}). Extension inactive.`);
      return false;
    }
  }
  
  // Check time range
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [startHour, startMin] = result.classStartTime.split(':').map(Number);
  const [endHour, endMin] = result.classEndTime.split(':').map(Number);
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  return currentTime >= startTime && currentTime <= endTime;
}

async function handlePollActive(data) {
  // Check if within class hours
  const withinHours = await isWithinClassHours();
  if (!withinHours) {
    console.log("Poll detected but outside class hours. Not notifying.");
    return;
  }
  
  console.log("Poll active notification received:", data);
  
  // Send desktop notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: "PollEv Active!",
    message: data.title,
    priority: 2,
    requireInteraction: true
  });
  
  // Send push notification to phone via Ntfy
  await sendPhoneNotification(data);
}

async function sendPhoneNotification(data) {
  try {
    // Get the Ntfy topic from storage
    const result = await chrome.storage.sync.get(['ntfyTopic', 'ntfyEnabled']);
    
    if (!result.ntfyEnabled || !result.ntfyTopic) {
      console.log("Ntfy notifications not configured");
      return;
    }
    
    const topic = result.ntfyTopic;
    const url = `https://ntfy.sh/${topic}`;
    
    await fetch(url, {
      method: "POST",
      headers: {
        "Title": "PollEv Active!",
        "Priority": "high",
        "Tags": "warning,ballot_box",
        "Actions": `view, Open Poll, ${data.url}`
      },
      body: data.title
    });
    
    console.log("Phone notification sent via Ntfy");
  } catch (error) {
    console.error("Error sending Ntfy notification:", error);
  }
}

// Setup class schedule alarms
async function setupClassSchedule(startTime, endTime, days) {
  if (!startTime) return;
  
  // Clear existing alarms
  await chrome.alarms.clear('classStart');
  
  // Parse start time
  const [startHour, startMin] = startTime.split(':').map(Number);
  
  // Calculate when to fire alarm (at class start time)
  const now = new Date();
  const alarmTime = new Date();
  alarmTime.setHours(startHour, startMin, 0, 0);
  
  // If time has passed today, schedule for tomorrow
  if (alarmTime <= now) {
    alarmTime.setDate(alarmTime.getDate() + 1);
  }
  
  // Create daily repeating alarm (will check day-of-week in handler)
  chrome.alarms.create('classStart', {
    when: alarmTime.getTime(),
    periodInMinutes: 24 * 60 // Repeat daily
  });
  
  console.log(`Class start alarm set for ${alarmTime.toLocaleString()}`);
}

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'classStart') {
    // Check if today is a class day before opening
    const result = await chrome.storage.sync.get(['classDays']);
    if (result.classDays && result.classDays.length > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = dayNames[new Date().getDay()];
      if (!result.classDays.includes(today)) {
        console.log(`Not a class day (${today}). Skipping auto-open.`);
        return;
      }
    }
    await openPollEvTab();
  }
});

// Open PollEv tab at class start
async function openPollEvTab() {
  const result = await chrome.storage.sync.get(['pollEvUsername', 'classEndDate']);
  
  if (!result.pollEvUsername) {
    console.log("No username configured");
    return;
  }
  
  // Check if class has ended
  if (result.classEndDate) {
    const now = new Date();
    const endDate = new Date(result.classEndDate);
    endDate.setHours(23, 59, 59);
    if (now > endDate) {
      console.log("Class has ended. Not opening tab.");
      return;
    }
  }
  
  const pollEvUrl = `https://pollev.com/${result.pollEvUsername}`;
  
  // Check if tab already exists
  chrome.tabs.query({ url: pollEvUrl + "*" }, (tabs) => {
    if (tabs.length === 0) {
      // Tab doesn't exist, open it
      chrome.tabs.create({ url: pollEvUrl });
      console.log("Opened PollEv tab for class start");
    } else {
      // Tab exists, just focus it
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
      console.log("Focused existing PollEv tab");
    }
  });
}

// Initialize schedule on extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.sync.get(['classStartTime', 'classEndTime', 'classDays']);
  if (result.classStartTime) {
    await setupClassSchedule(result.classStartTime, result.classEndTime, result.classDays);
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  // Get the configured username
  const result = await chrome.storage.sync.get(['pollEvUsername']);
  const username = result.pollEvUsername;
  
  if (!username) {
    console.log("No username configured");
    return;
  }
  
  const pollEvUrl = `https://pollev.com/${username}`;
  
  // Open the PollEv tab or focus it if already open
  chrome.tabs.query({ url: pollEvUrl + "*" }, (tabs) => {
    if (tabs.length > 0) {
      // Tab exists, focus it
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Tab doesn't exist, open it
      chrome.tabs.create({ url: pollEvUrl });
    }
  });
});

console.log("PollEv Notifier background script loaded");
