// Content script that runs on pollev.com pages
// Monitors for poll activation and notifies the background script

let lastPollQuestion = null;
let checkInterval = null;
let isInitialized = false;

// Load the last seen poll from storage when script starts
async function initialize() {
  const result = await chrome.storage.local.get(['lastSeenPoll']);
  lastPollQuestion = result.lastSeenPoll || null;
  isInitialized = true;
  console.log("Initialized. Last seen poll:", lastPollQuestion);
}

function getPollQuestion() {
  // Try to extract the poll question/title
  const headers = document.querySelectorAll('h1, h2, h3');
  for (let header of headers) {
    const text = header.innerText.trim();
    // Exclude waiting messages and very long text
    if (text && 
        !text.includes("Waiting for") && 
        !text.includes("presentation to begin") &&
        text.length < 200 && 
        text.length > 0) {
      return text;
    }
  }
  return null;
}

function isWaitingScreen() {
  // Check for the waiting screen message
  return document.body.innerText.includes("Waiting for gsandoval's presentation to begin") ||
         document.body.innerText.includes("Waiting for") && document.body.innerText.includes("presentation to begin");
}

function isPollClosed() {
  // Check if this is an old poll we already answered
  return document.body.innerText.includes("Response recorded");
}

function hasClickableOptions() {
  // Check if there are response options that aren't disabled
  const buttons = document.querySelectorAll('button, [role="button"], input[type="radio"], input[type="checkbox"]');
  
  for (let button of buttons) {
    // Check if button is not disabled and is visible
    if (!button.disabled && button.offsetParent !== null) {
      return true;
    }
  }
  
  return false;
}

async function updateLastSeenPoll(question) {
  lastPollQuestion = question;
  await chrome.storage.local.set({ lastSeenPoll: question });
}

async function checkPollStatus() {
  // Wait for initialization to complete
  if (!isInitialized) {
    return;
  }
  
  const currentQuestion = getPollQuestion();
  const waiting = isWaitingScreen();
  const closed = isPollClosed();
  
  // If we're on the waiting screen, clear our stored question
  if (waiting) {
    await updateLastSeenPoll(null);
    console.log("Waiting screen detected");
    return;
  }
  
  // If there's no question visible, nothing to do
  if (!currentQuestion) {
    return;
  }
  
  // If this is a closed poll (already answered), update our memory but don't notify
  if (closed) {
    await updateLastSeenPoll(currentQuestion);
    console.log("Closed poll detected:", currentQuestion);
    return;
  }
  
  // Check if this is a NEW poll (question changed AND poll has clickable options)
  const hasClickable = hasClickableOptions();
  const isNewPoll = currentQuestion !== lastPollQuestion && hasClickable;
  
  if (isNewPoll) {
    console.log("NEW ACTIVE POLL DETECTED:", currentQuestion);
    
    // Send notification
    chrome.runtime.sendMessage({
      type: "POLL_ACTIVE",
      title: currentQuestion,
      url: window.location.href
    });
    
    // Update our memory
    await updateLastSeenPoll(currentQuestion);
  } else if (currentQuestion === lastPollQuestion) {
    // Same poll as before, no action needed
  } else if (!hasClickable) {
    // New question but no clickable options yet - might be loading
    console.log("Poll detected but no clickable options yet");
  }
}

// Initialize by loading last seen poll from storage
initialize().then(() => {
  // Initial check after page loads and initialization completes
  setTimeout(checkPollStatus, 2000);
  
  // Set up periodic checking every 3 seconds (more frequent for reliability)
  checkInterval = setInterval(checkPollStatus, 3000);
  
  // Also monitor DOM changes for faster detection
  const observer = new MutationObserver(() => {
    checkPollStatus();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log("PollEv Notifier: Monitoring for NEW active polls...");
});
