# PollEv Notifier

Never miss attendance again.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)
![Version](https://img.shields.io/badge/version-1.3-green)

Monitors PollEv for new polls and notifies your laptop + phone instantly.

## Install

**Chrome Extension:**
1. Download the zip
2. Extract it somewhere permanent
3. Go to `chrome://extensions/`
4. Enable "Developer mode" (top-right)
5. Click "Load unpacked" → select the folder
6. Click the extension icon and configure your PollEv URL

## Two Notifications

**Desktop** - built-in, works immediately

**Phone** - uses [Ntfy](https://ntfy.sh) (free, no account)
```bash
# On your phone:
1. Install Ntfy app
2. Subscribe to a unique topic: pollev_yourname_123
3. In extension settings: enter same topic
```

## Configuration

Click the extension icon to set up:
- **PollEv Username** - just the username part (e.g., `gsandoval`)
- **Phone notifications** - enable/disable
- **Ntfy topic** - your unique notification channel

The extension automatically builds `https://pollev.com/[your-username]`

## How It Works

Detects NEW polls only:
- Tracks the poll question text
- Ignores old polls with "Response recorded"
- Checks for clickable buttons (not grayed out)
- Remembers across page refreshes

**Triggers notification when:**
- Question text changes
- Poll has active buttons
- Not a closed poll

**Ignores:**
- Old polls from yesterday
- Polls you already answered
- Waiting screen
- Page refreshes on same poll

## Usage

**Before class:**
```bash
1. Configure your PollEv username in settings (just the username!)
2. Open your PollEv page
3. Pin the tab (right-click → Pin tab)
4. Keep Chrome open
```

**During class:**
- Do whatever you want
- Notification appears when poll goes live
- Click notification to jump to poll

**What you need:**
- Chrome browser running (can be minimized)
- PollEv tab open (can be in background)

## Settings

Click the extension icon to configure:
- Set your PollEv username (just the username part)
- Enable/disable phone notifications
- Set your Ntfy topic
- Test notifications

## Requirements

- Chrome browser
- Ntfy app (optional, for phone notifications)

## Options

| Setting | What it does |
|---------|--------------|
| PollEv Username | Username from pollev.com/username |
| Enable phone notifications | Send push to phone via Ntfy |
| Ntfy topic | Your unique topic name |
| Test notification | Verify setup works |

## Changelog

### v1.3
- configurable username: works for any class
- simplified setup: just enter username, not full URL
- no default: must configure before use
- only monitors the page you configure

### v1.2
- persistent storage: remembers last poll across refreshes
- no false notifications on page reload

### v1.1
- fixed emoji encoding in phone notifications
- improved waiting screen detection

### v1.0
- initial release
- desktop + phone notifications
- smart poll detection

## License

MIT
