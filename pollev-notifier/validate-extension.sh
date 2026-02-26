#!/bin/bash

# PollEv Notifier v1.8 - Extension Validation Script
# Checks file integrity, syntax, and requirements

echo "🔍 PollEv Notifier v1.8 - Validation Script"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        ((FAIL++))
        return 1
    fi
}

# Function to check file size
check_file_size() {
    local file=$1
    local min_size=$2
    local actual_size=$(wc -c < "$file" 2>/dev/null || echo 0)

    if [ "$actual_size" -ge "$min_size" ]; then
        echo -e "${GREEN}✓${NC} Size OK: $file (${actual_size} bytes)"
        ((PASS++))
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Size warning: $file (${actual_size} bytes, expected >$min_size)"
        ((WARN++))
        return 1
    fi
}

# Function to check syntax
check_syntax() {
    local file=$1
    if node -c "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Syntax OK: $file"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} Syntax error in: $file"
        ((FAIL++))
        return 1
    fi
}

# Function to check for specific string in file
check_string() {
    local file=$1
    local string=$2
    local description=$3

    if grep -q "$string" "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Found in $file: $description"
        ((PASS++))
        return 0
    else
        echo -e "${RED}✗${NC} Missing in $file: $description"
        ((FAIL++))
        return 1
    fi
}

echo "📁 Checking Required Files"
echo "-------------------------"
check_file "manifest.json"
check_file "background.js"
check_file "popup.js"
check_file "popup.html"
check_file "popup.css"
check_file "content.js"
check_file "icon16.png"
check_file "icon48.png"
check_file "icon128.png"
echo ""

echo "📏 Checking File Sizes"
echo "---------------------"
check_file_size "background.js" 15000
check_file_size "popup.js" 35000
check_file_size "popup.html" 10000
check_file_size "popup.css" 20000
echo ""

echo "🔧 Checking JavaScript Syntax"
echo "----------------------------"
check_syntax "background.js"
check_syntax "popup.js"
check_syntax "content.js"
echo ""

echo "🏷️  Checking Version Numbers"
echo "---------------------------"
check_string "manifest.json" '"version": "1.8"' "Version 1.8 in manifest"
check_string "popup.html" 'v1.8' "Version badge v1.8"
echo ""

echo "✨ Checking Feature #1 (Error Visibility)"
echo "----------------------------------------"
check_string "background.js" "async function logError" "Error logging function"
check_string "popup.html" 'id="errorBadge"' "Error badge element"
check_string "popup.html" 'id="errorModal"' "Error modal element"
check_string "popup.js" "function showErrorModal" "Error modal function"
check_string "popup.css" ".error-badge" "Error badge styling"
echo ""

echo "🌙 Checking Feature #4 (DND Mode)"
echo "--------------------------------"
check_string "popup.html" 'id="dndEnabled"' "DND toggle element"
check_string "popup.html" 'id="dndDuration"' "DND duration selector"
check_string "popup.js" "async function updateDndStatus" "DND status function"
check_string "background.js" "dndResult.dndUntil" "DND check in background"
check_string "popup.css" ".dnd-container" "DND styling"
echo ""

echo "⚡ Checking Feature #2 (Quick Actions)"
echo "------------------------------------"
check_string "popup.js" "class-card-quick-actions" "Quick actions container"
check_string "popup.js" "async function handleQuickTestNow" "Test Now handler"
check_string "popup.js" "async function handleNotificationToggle" "Notification toggle handler"
check_string "popup.js" "function duplicateClass" "Duplicate handler"
check_string "popup.css" ".quick-action-btn" "Quick action button styling"
echo ""

echo "⏱️  Checking Feature #3 (Countdown)"
echo "---------------------------------"
check_string "popup.html" 'id="countdownBanner"' "Countdown banner element"
check_string "popup.html" 'id="allClassesTodayModal"' "All classes modal"
check_string "popup.js" "function startCountdownTimer" "Countdown timer function"
check_string "popup.js" "function findNextClass" "Next class finder"
check_string "background.js" "classWarning-" "Pre-class warning alarm"
check_string "popup.css" ".countdown-banner" "Countdown banner styling"
echo ""

echo "🔗 Checking Integrations"
echo "-----------------------"
check_string "background.js" "notificationsEnabled" "Per-class notification check"
check_string "popup.js" "await checkForErrors" "Error check on load"
check_string "popup.js" "await updateDndStatus" "DND check on load"
check_string "popup.js" "startCountdownTimer" "Countdown start on load"
echo ""

echo "📊 Validation Summary"
echo "===================="
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC} $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ All critical checks passed!${NC}"
    echo "Extension is ready for testing."
    exit 0
else
    echo -e "${RED}❌ Some checks failed.${NC}"
    echo "Please fix the issues above before testing."
    exit 1
fi
