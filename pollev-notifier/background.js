// Background service worker for handling notifications

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "POLL_ACTIVE") {
    handlePollActive(message);
  } else if (message.type === "SETUP_CLASS_SCHEDULE") {
    setupClassSchedule(message.classes);
  } else if (message.type === "FORCE_CHECK_PAGE") {
    handleForceCheck(message.username, message.classId, sendResponse);
    return true; // Keep channel open for async response
  } else if (message.type === "CHECK_TAB_STATUS") {
    checkTabStatus(message.classes, sendResponse);
    return true; // Keep channel open for async response
  }
});

// Check which class tabs are currently open
async function checkTabStatus(classes, sendResponse) {
  const tabStatus = {};

  // Check each class
  for (const cls of classes) {
    const pollEvUrl = `https://pollev.com/${cls.pollEvUsername}`;
    const tabs = await chrome.tabs.query({ url: pollEvUrl + "*" });
    tabStatus[cls.id] = tabs.length > 0;
  }

  sendResponse({ tabStatus });
}

// Handle force check - opens tab if needed, then checks status
async function handleForceCheck(username, classId, sendResponse) {
  const pollEvUrl = `https://pollev.com/${username}`;

  // Check if tab is already open
  chrome.tabs.query({ url: pollEvUrl + "*" }, async (tabs) => {
    if (tabs.length === 0) {
      // Tab doesn't exist, open it
      chrome.tabs.create({ url: pollEvUrl, active: false }, async (newTab) => {
        // Send response that tab was opened
        sendResponse({ status: 'opened_tab' });
      });
    } else {
      // Tab exists - check if content script is ready
      const tab = tabs[0];

      try {
        // First, verify content script is loaded by pinging it
        chrome.tabs.sendMessage(tab.id, { type: 'PING' }, (pingResponse) => {
          if (chrome.runtime.lastError || !pingResponse) {
            // Content script not ready
            sendResponse({
              status: 'error',
              message: 'Page is loading. Please try again in a moment.'
            });
            return;
          }

          // Content script ready, send force check
          chrome.tabs.sendMessage(tab.id, { type: 'FORCE_CHECK' }, (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                status: 'error',
                message: chrome.runtime.lastError.message
              });
            } else if (!response) {
              sendResponse({
                status: 'error',
                message: 'No response from page'
              });
            } else {
              sendResponse(response);
            }
          });
        });
      } catch (error) {
        sendResponse({ status: 'error', message: error.message });
      }
    }
  });
}

// Check if we're within class hours for ANY class
// Returns { withinHours: boolean, matchingClass: object|null }
async function isWithinClassHours() {
  const result = await chrome.storage.sync.get(['classes']);
  const classes = result.classes || [];

  // If no classes configured, don't allow
  if (classes.length === 0) {
    return { withinHours: false, matchingClass: null };
  }

  const now = new Date();

  // Check each class to see if we're currently in session
  for (const cls of classes) {
    // Skip if no schedule set for this class
    if (!cls.classStartTime || !cls.classEndTime) {
      continue;
    }

    // Check if class has ended
    if (cls.classEndDate) {
      const endDate = new Date(cls.classEndDate);
      endDate.setHours(23, 59, 59);
      if (now > endDate) {
        continue; // This class has ended, check next
      }
    }

    // Check day of week
    if (cls.classDays && cls.classDays.length > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = dayNames[now.getDay()];
      if (!cls.classDays.includes(currentDay)) {
        continue; // Not a class day for this class
      }
    }

    // Check time range
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startHour, startMin] = cls.classStartTime.split(':').map(Number);
    const [endHour, endMin] = cls.classEndTime.split(':').map(Number);
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (currentTime >= startTime && currentTime <= endTime) {
      // We're within this class's hours!
      console.log(`Within class hours for: ${cls.name || cls.pollEvUsername}`);
      return { withinHours: true, matchingClass: cls };
    }
  }

  // Not within any class hours
  console.log("Not within any class hours. Extension inactive.");
  return { withinHours: false, matchingClass: null };
}

async function handlePollActive(data) {
  // Check if within class hours
  const { withinHours, matchingClass } = await isWithinClassHours();
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

// Setup class schedule alarms for multiple classes
async function setupClassSchedule(classes) {
  if (!classes || classes.length === 0) {
    // Clear all alarms if no classes
    const allAlarms = await chrome.alarms.getAll();
    for (const alarm of allAlarms) {
      if (alarm.name.startsWith('classStart-')) {
        await chrome.alarms.clear(alarm.name);
      }
    }
    console.log("No classes configured, cleared all alarms");
    return;
  }

  // Clear all existing class alarms
  const allAlarms = await chrome.alarms.getAll();
  for (const alarm of allAlarms) {
    if (alarm.name.startsWith('classStart-')) {
      await chrome.alarms.clear(alarm.name);
    }
  }

  // Create alarm for each class
  for (const cls of classes) {
    if (!cls.classStartTime) continue;

    // Parse start time
    const [startHour, startMin] = cls.classStartTime.split(':').map(Number);

    // Calculate when to fire alarm (at class start time)
    const now = new Date();
    const alarmTime = new Date();
    alarmTime.setHours(startHour, startMin, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (alarmTime <= now) {
      alarmTime.setDate(alarmTime.getDate() + 1);
    }

    // Create daily repeating alarm with class ID
    const alarmName = `classStart-${cls.id}`;
    chrome.alarms.create(alarmName, {
      when: alarmTime.getTime(),
      periodInMinutes: 24 * 60 // Repeat daily
    });

    console.log(`Class start alarm set for ${cls.name || cls.pollEvUsername} at ${alarmTime.toLocaleString()}`);
  }
}

// Handle alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('classStart-')) {
    // Extract class ID from alarm name
    const classId = alarm.name.replace('classStart-', '');

    // Get the class info
    const result = await chrome.storage.sync.get(['classes']);
    const classes = result.classes || [];
    const cls = classes.find(c => c.id === classId);

    if (!cls) {
      console.log(`Class not found for alarm: ${classId}`);
      return;
    }

    // Check if today is a class day
    if (cls.classDays && cls.classDays.length > 0) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const today = dayNames[new Date().getDay()];
      if (!cls.classDays.includes(today)) {
        console.log(`Not a class day for ${cls.name || cls.pollEvUsername} (${today}). Skipping auto-open.`);
        return;
      }
    }

    // Check if class has ended
    if (cls.classEndDate) {
      const now = new Date();
      const endDate = new Date(cls.classEndDate);
      endDate.setHours(23, 59, 59);
      if (now > endDate) {
        console.log(`Class ${cls.name || cls.pollEvUsername} has ended. Skipping auto-open.`);
        return;
      }
    }

    await openPollEvTab(cls);
  }
});

// Open PollEv tab at class start
async function openPollEvTab(cls) {
  if (!cls || !cls.pollEvUsername) {
    console.log("No username configured for class");
    return;
  }

  const pollEvUrl = `https://pollev.com/${cls.pollEvUsername}`;

  // Check if tab already exists
  chrome.tabs.query({ url: pollEvUrl + "*" }, (tabs) => {
    if (tabs.length === 0) {
      // Tab doesn't exist, open it
      chrome.tabs.create({ url: pollEvUrl });
      console.log(`Opened PollEv tab for ${cls.name || cls.pollEvUsername}`);
    } else {
      // Tab exists, just focus it
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
      console.log(`Focused existing PollEv tab for ${cls.name || cls.pollEvUsername}`);
    }
  });
}

// Initialize schedule on extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.sync.get(['classes']);
  const classes = result.classes || [];
  if (classes.length > 0) {
    await setupClassSchedule(classes);
  }
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  // Get all configured classes
  const result = await chrome.storage.sync.get(['classes']);
  const classes = result.classes || [];

  if (classes.length === 0) {
    console.log("No classes configured");
    return;
  }

  // Check if this is a tab-closed notification
  if (notificationId.startsWith('tab-closed-')) {
    const classId = notificationId.replace('tab-closed-', '');
    const cls = classes.find(c => c.id === classId);

    if (cls) {
      const pollEvUrl = `https://pollev.com/${cls.pollEvUsername}`;
      chrome.tabs.query({ url: pollEvUrl + "*" }, (tabs) => {
        if (tabs.length > 0) {
          chrome.tabs.update(tabs[0].id, { active: true });
          chrome.windows.update(tabs[0].windowId, { focused: true });
        } else {
          chrome.tabs.create({ url: pollEvUrl });
        }
      });
      return;
    }
  }

  // For other notifications, check which class is currently active and open that one
  const { withinHours, matchingClass } = await isWithinClassHours();

  if (matchingClass) {
    // Open the matching class's PollEv page
    const pollEvUrl = `https://pollev.com/${matchingClass.pollEvUsername}`;
    chrome.tabs.query({ url: pollEvUrl + "*" }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: pollEvUrl });
      }
    });
  } else {
    // No active class, open the first class's page
    const pollEvUrl = `https://pollev.com/${classes[0].pollEvUsername}`;
    chrome.tabs.query({ url: pollEvUrl + "*" }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
        chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        chrome.tabs.create({ url: pollEvUrl });
      }
    });
  }
});

// Monitor tab closures to alert when class tab is closed during class time
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  // Get the tab info before it's fully removed
  const result = await chrome.storage.sync.get(['classes']);
  const classes = result.classes || [];

  if (classes.length === 0) return;

  // Check each class to see if we're in session and if this was their tab
  for (const cls of classes) {
    const pollEvUrl = `https://pollev.com/${cls.pollEvUsername}`;

    // Check if we're currently within this class's hours
    const { withinHours, matchingClass } = await isWithinClassHours();

    if (withinHours && matchingClass && matchingClass.id === cls.id) {
      // We're in class time! Check if any tabs are still open for this class
      chrome.tabs.query({ url: pollEvUrl + "*" }, async (tabs) => {
        if (tabs.length === 0) {
          // No tabs open for this class during class time - send alert!
          console.log(`PollEv tab closed during class time for: ${cls.name || cls.pollEvUsername}`);

          // Send desktop notification
          chrome.notifications.create(`tab-closed-${cls.id}`, {
            type: "basic",
            iconUrl: "icon128.png",
            title: "⚠️ PollEv Tab Closed",
            message: `Keep ${cls.name || cls.pollEvUsername} open during class! Click to reopen.`,
            priority: 2,
            requireInteraction: true
          });

          // Send phone notification
          await sendTabClosedPhoneNotification(cls);
        }
      });
    }
  }
});

// Send phone notification when tab is closed during class
async function sendTabClosedPhoneNotification(cls) {
  try {
    const result = await chrome.storage.sync.get(['ntfyTopic', 'ntfyEnabled']);

    if (!result.ntfyEnabled || !result.ntfyTopic) {
      console.log("Ntfy notifications not configured");
      return;
    }

    const topic = result.ntfyTopic;
    const url = `https://ntfy.sh/${topic}`;
    const pollEvUrl = `https://pollev.com/${cls.pollEvUsername}`;

    await fetch(url, {
      method: "POST",
      headers: {
        "Title": "PollEv Tab Closed",
        "Priority": "high",
        "Tags": "warning,x",
        "Actions": `view, Reopen Tab, ${pollEvUrl}`
      },
      body: `Keep ${cls.name || cls.pollEvUsername} open during class time!`
    });

    console.log("Tab closed phone notification sent via Ntfy");
  } catch (error) {
    console.error("Error sending tab closed Ntfy notification:", error);
  }
}

console.log("PollEv Notifier background script loaded");
