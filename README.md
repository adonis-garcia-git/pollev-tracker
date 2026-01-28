# PollEv Notifier

Never miss attendance again.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue)
![Version](https://img.shields.io/badge/version-1.6-green)

A modern Chrome extension that monitors PollEv for new polls and notifies your laptop + phone instantly. Features a clean, minimal UI with iOS-style toggles, pill-shaped day selectors, toast notifications, and support for multiple classes.

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
- **Multi-Class Support** - Manage multiple classes in one extension
- **Class Cards** - Visual cards for each class with edit/delete buttons
- **Modal Dialog** - Add/edit classes in a focused modal interface
- **Day Selector Pills** - Single-letter circular buttons (M, T, W, T, F, S, S)
- **iOS Toggle Switch** - Smooth animated toggle for phone notifications
- **Toast Notifications** - Slide-in success/error messages
- **Loading States** - Visual feedback when saving settings
- **Empty State** - Helpful message when no classes configured

### Managing Classes
- Click **"Add New Class"** to configure a new class
- Each class card shows:
  - Class name (optional, defaults to username)
  - PollEv username (e.g., `pollev.com/profsmith`)
  - Schedule summary (days and time)
  - End date (if set)
- Click the **edit icon** to modify a class
- Click the **trash icon** to delete a class (with confirmation)

### Class Settings (in modal)
- **Class Name** - optional friendly name (e.g., "CS 101")
- **PollEv Username** - just the username part (e.g., `profsmith`)
- **Class Days** - tap circular day pills to select
- **Class Time** - start and end time (e.g., 2:00 PM - 3:50 PM)
- **Class End Date** - when the class ends (optional)

### Global Settings
- **Phone notifications** - iOS-style toggle switch (applies to all classes)
- **Ntfy topic** - shown only when phone notifications enabled

The extension automatically builds `https://pollev.com/[your-username]` for each class

## Features

### Multiple Class Support
- Manage multiple classes in one extension
- Each class has its own schedule and PollEv username
- Extension monitors all configured classes
- Automatic migration from single-class setup (v1.5 and earlier)

### Auto-Open at Class Start
- Set class time and days for each class
- Extension opens PollEv tabs automatically at their start times
- If multiple classes start at the same time, opens both tabs
- Only opens on the days you selected for each class
- No need to remember to open manually

### Time-Based Monitoring
- Sends notifications during ANY active class hours
- Ignores polls outside all scheduled times
- Respects class days for each class (e.g., CS 101 on Mon/Wed/Fri, Math on Tue/Thu)
- Respects individual class end dates

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
1. Click "Add New Class" button
2. Enter class name (optional, e.g., "CS 101")
3. Enter PollEv username (e.g., profsmith)
4. Select class days (e.g., Mon, Wed, Fri)
5. Set class time (e.g., 2:00 PM - 3:50 PM)
6. Set class end date (optional)
7. Click "Save Class"
8. Repeat for additional classes
9. Enable phone notifications (optional, applies to all classes)
```

**During semester:**
- Extension auto-opens tabs at each class's start time
- Keep Chrome running (can be minimized)
- Notification appears when poll goes live in ANY class
- Click notification to jump to poll
- Edit or delete classes anytime from the popup

**What you need:**
- Chrome browser running
- That's it! Tabs open automatically at each class time

## Settings

Click the extension icon to configure:
- Add/edit/delete classes with individual schedules
- Set PollEv username for each class
- Select class days of the week for each class
- Set class schedule (start/end time) for each class
- Set class end date for each class
- Enable/disable phone notifications (global)
- Set your Ntfy topic (global)
- Force check current page
- Test notifications

## Requirements

- Chrome browser
- Ntfy app (optional, for phone notifications)

## Options

| Setting | What it does |
|---------|--------------|
| Class Name | Optional friendly name for the class (e.g., "CS 101") |
| PollEv Username | Username from pollev.com/username (per class) |
| Class Days | Days of week you have class (Mon-Sun, per class) |
| Class Start Time | When class begins (e.g., 2:00 PM, per class) |
| Class End Time | When class ends (e.g., 3:50 PM, per class) |
| Class End Date | Last day of class (optional, per class) |
| Enable phone notifications | Send push to phone via Ntfy (global) |
| Ntfy topic | Your unique topic name (global) |
| Force Check | Check monitored page (opens if needed) |
| Test notification | Verify setup works |

## Changelog

### v1.6
- Multi-class support with cards, CRUD operations, and modal editing
- Smart per-class scheduling with alarms, days, times, and end dates
- Automatic migration from v1.5 single-class format
- Tab status monitoring with quick-open button for closed tabs

### v1.5
- Complete UI overhaul with Apple/Linear-inspired design
- Interactive day pills, iOS toggles, and toast notifications
- Card layout with gradient buttons and loading states
- Collapsible help section and separated CSS architecture

### v1.4
- Class scheduling with days, times, and auto-expire by end date
- Auto-open PollEv tabs at scheduled class start times
- Time-based monitoring during class hours only
- Force check accessible from any browser tab

### v1.3
- Configurable username works for any PollEv class
- Simplified setup using username only (no full URL needed)
- No default configuration required before first use

### v1.2
- Persistent storage across page refreshes
- No false notifications on page reload

### v1.1
- Fixed emoji encoding in phone notifications
- Improved waiting screen detection

### v1.0
- Initial release with desktop and phone notifications
- Smart poll detection for active polls only
- Click notification to open PollEv tab

## License

MIT
