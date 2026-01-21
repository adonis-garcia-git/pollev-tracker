// Background service worker for handling notifications

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "POLL_ACTIVE") {
    handlePollActive(message);
  }
});

async function handlePollActive(data) {
  console.log("Poll active notification received:", data);
  
  // Send desktop notification
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: "🚨 PollEv Active!",
    message: data.title,
    priority: 2,
    requireInteraction: true
  });
  
  // Play a sound (browser notification sound)
  // Note: Chrome will play default notification sound
  
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
        "Title": "🚨 PollEv Active!",
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

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // Open the PollEv tab or focus it if already open
  chrome.tabs.query({ url: "https://pollev.com/*" }, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: "https://pollev.com/gsandoval" });
    }
  });
});

console.log("PollEv Notifier background script loaded");
