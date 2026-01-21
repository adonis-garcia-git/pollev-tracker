# PollEv Attendance Notifier

A Chrome extension that monitors PollEv and sends notifications to your laptop and phone when polls become active.

## Features

- 🔔 Desktop notifications when polls go live
- 📱 Phone notifications via Ntfy (free, open-source)
- 🎯 Monitors https://pollev.com/gsandoval specifically
- ⚡ Checks every 5 seconds + real-time DOM monitoring
- 🔊 Browser notification sound
- 👆 Click notification to jump to PollEv tab

## Installation

### 1. Install the Chrome Extension

1. Download/extract this folder to your computer
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right corner)
4. Click "Load unpacked"
5. Select the `pollev-notifier` folder
6. The extension icon should appear in your toolbar

### 2. Set Up Phone Notifications (Optional but Recommended)

1. **Install Ntfy on your phone:**
   - iOS: Search "Ntfy" in App Store
   - Android: Search "ntfy" in Play Store
   - Or visit: https://ntfy.sh

2. **Create a unique topic name:**
   - Open the Ntfy app
   - Tap "Subscribe to topic"
   - Enter a unique name like: `pollev_alerts_yourname123`
   - Make it unique so others can't subscribe to it
   - Tap subscribe

3. **Configure the extension:**
   - Click the extension icon in Chrome toolbar
   - Check "Enable phone notifications"
   - Enter your topic name (same as step 2)
   - Click "Save Settings"
   - Click "Send Test Notification" to verify it works

## Usage

1. **Before class:**
   - Open https://pollev.com/gsandoval in Chrome
   - Make sure the extension is enabled (check toolbar)
   - The page will show "Waiting for app's presentation to begin..."

2. **During class:**
   - Keep the tab open (can be in background)
   - Do whatever else you need to do
   - When a poll goes live, you'll get:
     - Desktop notification with sound
     - Phone notification (if configured)
     - Click either notification to jump to the poll

3. **Tips:**
   - Pin the PollEv tab so you don't accidentally close it
   - Keep your laptop unlocked (notifications won't show on lock screen)
   - Make sure Chrome notifications are enabled in system settings
   - Test before your first class with the "Send Test Notification" button

## How It Works

The extension uses smart detection to identify NEWLY active polls:

1. **Tracks the poll question** - Remembers what poll question is currently displayed
2. **Detects question changes** - When the question text changes, that's a new poll
3. **Ignores closed polls** - If it sees "Response recorded", it knows the poll is old/closed
4. **Checks for clickable buttons** - Verifies response options are actually enabled
5. **Monitors every 3 seconds** - Plus real-time DOM change detection for instant alerts

**What triggers a notification:**
- A NEW poll appears (different question than before)
- Response options are clickable (not grayed out)
- It's NOT a closed poll you already answered

**What does NOT trigger a notification:**
- Opening the page with an old poll from yesterday
- Polls showing "Response recorded" (you already answered)
- The waiting screen
- The same poll that was already there

This ensures you get notified exactly once per new poll, with zero false alarms.

## Troubleshooting

**Desktop notifications not working?**
- Check Chrome notifications are enabled: chrome://settings/content/notifications
- Check system notification permissions for Chrome
- Try the "Send Test Notification" button

**Phone notifications not working?**
- Verify you subscribed to the exact same topic name in Ntfy app
- Check the topic name for typos
- Make sure "Enable phone notifications" is checked
- Test with the "Send Test Notification" button
- Check your phone's notification settings for Ntfy app

**Extension not detecting polls?**
- Make sure you're on https://pollev.com/gsandoval
- Refresh the page and wait a few seconds
- Check the browser console (F12) for any error messages

## Privacy & Security

- This extension only runs on pollev.com pages
- No data is collected or stored except your Ntfy topic name (stored locally)
- Ntfy is open-source and doesn't require an account
- Your topic name should be unique to prevent others from seeing your notifications

## Files

- `manifest.json` - Extension configuration
- `content.js` - Monitors the PollEv page
- `background.js` - Handles notifications
- `popup.html` - Settings interface
- `popup.js` - Settings logic
- `icon*.png` - Extension icons

## Need Help?

If you run into issues:
1. Try the test notification button first
2. Check the browser console (F12) for errors
3. Make sure you're on the correct PollEv URL
4. Verify Chrome and system notification permissions
