// Content script that runs on pollev.com pages
// Monitors for poll activation and notifies the background script

let lastPollQuestion = null;
let checkInterval = null;
let isInitialized = false;
let matchedClass = null;

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    // Respond with initialization status
    sendResponse({ ready: isInitialized });
    return true;
  }

  if (message.type === 'FORCE_CHECK') {
    // GUARD: Check if initialized before responding
    if (!isInitialized) {
      sendResponse({
        status: 'error',
        message: 'Content script not initialized. Page may still be loading.'
      });
      return true;
    }

    const status = forceCheckPage();
    sendResponse(status);
    return true;
  }

  return true; // Keep message channel open for async response
});

// Force check current page status
function forceCheckPage() {
  console.log('[Force Check] Checking page status...');

  const waiting = isWaitingScreen();
  const question = getPollQuestion();
  const closed = isPollClosed();

  console.log('[Force Check] Results:', { waiting, question, closed });

  if (waiting) {
    return { status: 'waiting' };
  }

  if (!question) {
    return { status: 'no_content' };
  }

  if (closed) {
    return { status: 'old_poll', question: question };
  }

  return { status: 'active_poll', question: question };
}

// Load the last seen poll and check if we should monitor this page
async function initialize() {
  const result = await chrome.storage.sync.get(['classes']);
  const localResult = await chrome.storage.local.get(['lastSeenPoll']);

  const classes = result.classes || [];
  lastPollQuestion = localResult.lastSeenPoll || null;

  // Check if any classes are configured
  if (classes.length === 0) {
    console.log("PollEv Notifier: No classes configured. Please add a class in extension settings.");
    isInitialized = false;
    return false;
  }

  // Check if we're on a page matching any configured class
  const currentUrl = window.location.href;

  for (const cls of classes) {
    const configuredUrl = `https://pollev.com/${cls.pollEvUsername}`;
    const isMatch = currentUrl.startsWith(configuredUrl) ||
                    currentUrl.includes(`pollev.com/${cls.pollEvUsername}`);

    if (isMatch) {
      matchedClass = cls;
      isInitialized = true;
      console.log("Initialized. Last seen poll:", lastPollQuestion);
      console.log(`Monitoring page for class: ${cls.name || cls.pollEvUsername} (${configuredUrl})`);
      return true;
    }
  }

  // No match found
  console.log("PollEv Notifier: Not monitoring this page. No matching class configured.");
  return false;
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
  // Check for the waiting screen message - works for any pollev.com/username
  return document.body.innerText.includes("Waiting for") &&
         document.body.innerText.includes("presentation to begin");
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
  if (!isInitialized || !matchedClass) {
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

    // Send notification with class info
    chrome.runtime.sendMessage({
      type: "POLL_ACTIVE",
      title: currentQuestion,
      url: window.location.href,
      classId: matchedClass.id,
      className: matchedClass.name || matchedClass.pollEvUsername
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
initialize().then((shouldMonitor) => {
  if (shouldMonitor === false) {
    console.log("PollEv Notifier: Skipping this page");
    return;
  }

  // Initial check after page loads and initialization completes
  setTimeout(checkPollStatus, 2000);

  // Set up periodic checking every 3 seconds (more frequent for reliability)
  checkInterval = setInterval(checkPollStatus, 3000);

  // Also monitor DOM changes for faster detection (debounced)
  let mutationTimeout = null;
  const observer = new MutationObserver(() => {
    if (mutationTimeout) return;
    mutationTimeout = setTimeout(() => {
      mutationTimeout = null;
      checkPollStatus();
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log("PollEv Notifier: Monitoring for NEW active polls...");
});
