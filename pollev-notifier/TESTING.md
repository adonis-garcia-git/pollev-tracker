# 🧪 PollEv Notifier v1.7 - Testing Guide

## ✅ Validation Results

All automated checks passed! Extension is ready for manual testing.

- ✓ All required files present
- ✓ JavaScript syntax valid
- ✓ Version updated to 1.7
- ✓ All 4 features implemented
- ✓ Integration points verified

---

## 🚀 Quick Start

### 1. Load Extension in Chrome

```bash
1. Open Chrome browser
2. Navigate to: chrome://extensions/
3. Toggle "Developer mode" ON (top right)
4. Click "Load unpacked"
5. Select folder: /Users/mickeymouse/projects/pollev-tracker/pollev-notifier
6. Extension should load with v1.7
```

### 2. Open Interactive Test Suite

```bash
# Option A: From file system
open test-extension.html

# Option B: From browser
# Open in Chrome: file:///Users/mickeymouse/projects/pollev-tracker/pollev-notifier/test-extension.html
```

The test suite provides:
- ✅ 28 interactive test cases
- 📋 Step-by-step instructions for each test
- 📊 Real-time progress tracking
- 💾 Saves your test results (localStorage)

---

## 🎯 Feature Test Priority

### High Priority (Core Functionality)

**Must Test First:**

1. **Error Badge & Modal** (Feature #1)
   - Most visible new UI element
   - Tests error handling infrastructure
   - Quick to verify

2. **DND Mode** (Feature #4)
   - Critical blocking feature
   - Easy to test with 1-hour duration
   - Affects all notifications

3. **Quick Actions** (Feature #2)
   - Visible on every class card
   - Tests per-class notification toggle
   - User-facing convenience features

4. **Countdown Timer** (Feature #3)
   - Most complex feature
   - Requires time-based testing
   - Includes pre-class warnings

### Quick Smoke Test (5 minutes)

```
1. Load extension → Check version shows v1.7
2. Add a test class → Verify quick action buttons appear
3. Toggle DND on/off → Verify status indicator works
4. Click "Test Alert" → Verify delivery confirmation shows
5. Check for console errors → Should be none
```

---

## 🔍 Debugging Tools

### Chrome DevTools

**Popup Inspector:**
```
Right-click extension icon → "Inspect"
Opens DevTools for popup.html
```

**Background Service Worker:**
```
chrome://extensions/ → Click "service worker" link under extension
View background.js logs and errors
```

**Storage Inspector:**
```
In popup DevTools:
Application → Storage → Extension Storage
- chrome.storage.sync (classes, ntfyTopic, ntfyEnabled)
- chrome.storage.local (lastError, dndUntil)
```

### Console Log Filters

In DevTools Console, filter logs:

```javascript
// Show only DND-related logs
"DND"

// Show only error logs
"error" OR "Error"

// Show only countdown logs
"countdown" OR "Next class"

// Show only notification logs
"notification" OR "Notification"
```

### Manual Testing Commands

Run these in popup DevTools console:

```javascript
// Check current DND status
chrome.storage.local.get(['dndUntil'], (r) => console.log('DND until:', new Date(r.dndUntil)));

// Check last error
chrome.storage.local.get(['lastError'], (r) => console.log('Last error:', r.lastError));

// Check all classes
chrome.storage.sync.get(['classes'], (r) => console.log('Classes:', r.classes));

// Clear all storage (CAUTION!)
// chrome.storage.local.clear();
// chrome.storage.sync.clear();
```

---

## 📝 Test Scenarios

### Scenario 1: New User Setup

```
1. Install extension (fresh, no data)
2. Add first class
3. Configure phone notifications
4. Test all 4 features work from scratch
```

### Scenario 2: Feature Interaction

```
1. Enable DND for 1 hour
2. Add class with notifications OFF
3. Try force check
4. Verify double-blocking works (DND + class mute)
```

### Scenario 3: Time-Based Features

```
1. Add class starting in 2 hours
2. Verify countdown shows correct time
3. Wait 1 minute, verify countdown updates
4. Add class starting in 6 minutes
5. Wait for 5-minute pre-class warning
```

### Scenario 4: Error Handling

```
1. Configure invalid Ntfy topic
2. Click "Test Alert"
3. Verify error badge appears
4. Click badge, verify modal shows details
5. Clear error, verify badge disappears
```

### Scenario 5: All Features Together

```
1. Add 3 classes for today
2. Enable DND for 1 hour
3. Mute notifications for one class
4. View countdown banner (shows next class)
5. Click "View all today" (shows all 3)
6. Use quick actions (test, open, duplicate)
7. Trigger error, verify badge appears
8. Disable DND, verify status clears
```

---

## 🐛 Common Issues & Solutions

### Issue: Extension won't load

**Solution:**
```bash
# Check for syntax errors
cd /Users/mickeymouse/projects/pollev-tracker/pollev-notifier
./validate-extension.sh

# Reload extension
chrome://extensions/ → Click reload icon
```

### Issue: No countdown banner

**Causes:**
- No classes scheduled for today
- All classes have ended (check classEndDate)
- Class start time has passed

**Solution:**
```
Add a test class:
- Days: Select today
- Time: Current time + 1 hour
- Reload popup
```

### Issue: DND doesn't persist

**Check:**
```javascript
// In popup DevTools console
chrome.storage.local.get(['dndUntil'], console.log);
// Should show timestamp > Date.now()
```

### Issue: Quick actions not appearing

**Verify:**
```
1. Scroll down to class card
2. Check for 2x2 grid of buttons at bottom
3. If missing, check console for errors
4. Reload extension
```

### Issue: Error badge not showing

**Trigger an error:**
```
1. Enable phone notifications
2. Set Ntfy topic to "invalid_topic_test_xyz"
3. Click "Test Alert"
4. Badge should appear in Phone Alerts section
```

---

## 📊 Test Results Template

Copy this template to track your testing:

```
## Test Session: [Date]

### Environment
- Browser: Chrome [version]
- Extension: v1.7
- OS: macOS [version]

### Feature #1: Error Visibility
- [ ] Error badge appears ✓/✗
- [ ] Error modal shows details ✓/✗
- [ ] Clear error works ✓/✗
- [ ] Test notification delivery status ✓/✗

### Feature #4: DND Mode
- [ ] DND toggle appears ✓/✗
- [ ] Duration selector works ✓/✗
- [ ] Status indicator shows ✓/✗
- [ ] DND blocks notifications ✓/✗
- [ ] DND persists after reload ✓/✗

### Feature #2: Quick Actions
- [ ] Buttons appear on cards ✓/✗
- [ ] Test Now works ✓/✗
- [ ] Open Tab works ✓/✗
- [ ] Notify toggle works ✓/✗
- [ ] Duplicate works ✓/✗

### Feature #3: Countdown
- [ ] Banner appears ✓/✗
- [ ] Time updates every 60s ✓/✗
- [ ] View all today works ✓/✗
- [ ] Pre-class warning sends ✓/✗

### Integration
- [ ] DND blocks all sources ✓/✗
- [ ] Per-class mute works ✓/✗
- [ ] No console errors ✓/✗
- [ ] Version shows v1.7 ✓/✗

### Issues Found
1. [Issue description]
2. [Issue description]

### Notes
[Additional observations]
```

---

## 🎓 Testing Tips

1. **Keep DevTools Open:** Always have console open to catch errors
2. **Test Incrementally:** One feature at a time, then combinations
3. **Use Real Data:** Test with actual PollEv usernames when possible
4. **Time-Based Features:** Use classes 6 minutes away to test warnings quickly
5. **Clear Storage:** Between major tests, clear storage for fresh start
6. **Document Issues:** Note exact steps to reproduce any bugs

---

## ✅ Ready for Production Checklist

Before using in production:

- [ ] All 28 test cases pass
- [ ] No console errors during normal operation
- [ ] DND mode blocks notifications correctly
- [ ] Per-class notification toggle works
- [ ] Countdown updates in real-time
- [ ] Pre-class warnings send at right time
- [ ] Error badge appears when errors occur
- [ ] Version badge shows v1.7
- [ ] Extension loads without errors
- [ ] Backward compatible with v1.6 data

---

## 📞 Support

If you find bugs or need help:

1. Check `validate-extension.sh` output
2. Review Chrome DevTools console logs
3. Check the interactive test suite for specific test cases
4. Document reproduction steps for any issues

**Test Files:**
- `test-extension.html` - Interactive test suite (28 tests)
- `validate-extension.sh` - Automated validation script
- `TESTING.md` - This file

Happy Testing! 🚀
