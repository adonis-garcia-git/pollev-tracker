# PollEv Notifier

Never miss attendance again.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)
![Version](https://img.shields.io/badge/version-1.5-green)

A modern Chrome extension that monitors PollEv for new polls and notifies your laptop + phone instantly. Features a clean, minimal UI with iOS-style toggles, pill-shaped day selectors, and toast notifications.

## Install

**Chrome Extension:**
1. Download the zip
2. Extract it somewhere permanent
3. Go to `chrome://extensions/`
4. Enable "Developer mode" (top-right)
5. Click "Load unpacked" → select the folder
6. Click the extension icon and configure settings

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

Click the extension icon to open the modern, card-based settings interface:

### UI Features
- **Clean Design** - Apple/Linear-inspired minimal interface
- **Day Selector Pills** - Single-letter circular buttons (M, T, W, T, F, S, S)
- **iOS Toggle Switch** - Smooth animated toggle for phone notifications
- **Toast Notifications** - Slide-in success/error messages
- **Loading States** - Visual feedback when saving settings
- **Collapsible Help** - "How it works" accordion to save space

### Settings
- **PollEv Username** - just the username part (e.g., `gsandoval`)
- **Class Days** - tap circular day pills to select
- **Class Time** - start and end time (e.g., 2:00 PM - 3:50 PM)
- **Class End Date** - when the semester ends (optional)
- **Phone notifications** - iOS-style toggle switch
- **Ntfy topic** - shown only when phone notifications enabled

The extension automatically builds `https://pollev.com/[your-username]`

## Features

### Auto-Open at Class Start
- Set your class time and days in settings
- Extension opens PollEv tab automatically at class start
- Only opens on the days you selected
- No need to remember to open it manually

### Time-Based Monitoring
- Only sends notifications during your class hours
- Ignores polls outside your scheduled time
- Respects class days (e.g., only Mon/Wed/Fri)
- Respects class end date

### Force Check
- Click "Force Check Current Page" button
- Opens PollEv tab if not already open
- Checks the monitored page and reports:
  - Waiting screen
  - Old poll (shows which one)
  - Active poll
- Works regardless of which tab you're currently on
- Useful for debugging

### Auto-Expire
- Set your class end date (e.g., end of semester)
- Extension stops working after that date
- No manual cleanup needed

## How It Works

Detects NEW polls only:
- Tracks the poll question text
- Ignores old polls with "Response recorded"
- Checks for clickable buttons (not grayed out)
- Remembers across page refreshes
- Only notifies during class hours

**Triggers notification when:**
- Question text changes
- Poll has active buttons
- Not a closed poll
- Within class time range

**Ignores:**
- Old polls from yesterday
- Polls you already answered
- Waiting screen
- Page refreshes on same poll
- Polls outside class hours

## Usage

**Initial setup:**
```bash
1. Configure username in settings
2. Select class days (e.g., Mon, Wed, Fri)
3. Set class time (e.g., 2:00 PM - 3:50 PM)
4. Set class end date (optional)
5. Enable phone notifications (optional)
```

**During semester:**
- Extension auto-opens tab at class start time on class days
- Keep Chrome running (can be minimized)
- Notification appears when poll goes live
- Click notification to jump to poll

**What you need:**
- Chrome browser running
- That's it! Tab opens automatically at class time

## Settings

Click the extension icon to configure:
- Set your PollEv username (just the username part)
- Select class days of the week
- Set class schedule (start/end time)
- Set class end date
- Enable/disable phone notifications
- Set your Ntfy topic
- Force check current page
- Test notifications

## Requirements

- Chrome browser
- Ntfy app (optional, for phone notifications)

## Options

| Setting | What it does |
|---------|--------------|
| PollEv Username | Username from pollev.com/username |
| Class Days | Days of week you have class (Mon-Sun) |
| Class Start Time | When class begins (e.g., 2:00 PM) |
| Class End Time | When class ends (e.g., 3:50 PM) |
| Class End Date | Last day of semester (optional) |
| Enable phone notifications | Send push to phone via Ntfy |
| Ntfy topic | Your unique topic name |
| Force Check | Check monitored page (opens if needed) |
| Test notification | Verify setup works |

## Changelog

### v1.5
- **UI overhaul**: complete redesign with modern, clean interface
- **new design**: Apple/Linear-inspired minimal aesthetic
- **day pills**: circular single-letter buttons (M, T, W, T, F, S, S) with selection animation
- **iOS toggle**: smooth animated switch for phone notifications
- **toast notifications**: slide-in messages with icons for success/error/info
- **card layout**: elevated section cards with subtle shadows
- **gradient buttons**: primary button with gradient, secondary with outline style
- **loading states**: spinner animation when saving settings
- **collapsible help**: accordion for "How it works" section
- **dynamic version**: version badge pulled from manifest
- **conditional fields**: ntfy topic field appears only when toggle is on
- **focus rings**: blue ring on focused inputs for accessibility
- **separated CSS**: extracted all styles to `popup.css`

### v1.4
- class schedule: set days of week + start/end time for notifications
- auto-open: opens PollEv tab at class start time on class days
- class end date: auto-expire after semester ends
- force check: opens tab if needed and checks monitored page
- time-based: only notifies during class hours on class days
- improved: force check works from any tab

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
