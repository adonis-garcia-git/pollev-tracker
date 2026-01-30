#!/bin/bash

# PollEv Notifier v1.7 - Quick Test Launcher
# Opens all necessary tools for testing

echo "🚀 PollEv Notifier v1.7 - Test Launcher"
echo "======================================="
echo ""

# Check if extension files exist
if [ ! -f "manifest.json" ]; then
    echo "❌ Error: manifest.json not found"
    echo "Please run this script from the extension directory"
    exit 1
fi

echo "📋 Step 1: Running validation checks..."
echo "---------------------------------------"
if [ -f "validate-extension.sh" ]; then
    chmod +x validate-extension.sh
    ./validate-extension.sh
    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Validation failed. Please fix errors before testing."
        exit 1
    fi
else
    echo "⚠️  Warning: validate-extension.sh not found, skipping validation"
fi

echo ""
echo "📂 Step 2: Opening test suite..."
echo "--------------------------------"
if [ -f "test-extension.html" ]; then
    open test-extension.html
    echo "✓ Test suite opened in browser"
else
    echo "⚠️  Warning: test-extension.html not found"
fi

echo ""
echo "📖 Step 3: Opening testing guide..."
echo "-----------------------------------"
if [ -f "TESTING.md" ]; then
    if command -v code &> /dev/null; then
        code TESTING.md
        echo "✓ Testing guide opened in VS Code"
    else
        open TESTING.md
        echo "✓ Testing guide opened"
    fi
else
    echo "⚠️  Warning: TESTING.md not found"
fi

echo ""
echo "🌐 Step 4: Chrome extensions page..."
echo "------------------------------------"
echo "Opening chrome://extensions/ in 3 seconds..."
echo "(Enable Developer Mode and click 'Load unpacked')"
sleep 1
echo "3..."
sleep 1
echo "2..."
sleep 1
echo "1..."
open -a "Google Chrome" "chrome://extensions/"
echo "✓ Chrome extensions page opened"

echo ""
echo "✅ Test environment ready!"
echo "========================="
echo ""
echo "Next steps:"
echo "1. In Chrome extensions page:"
echo "   - Enable 'Developer mode' (top right)"
echo "   - Click 'Load unpacked'"
echo "   - Select this folder: $(pwd)"
echo ""
echo "2. Use the test suite (now open in browser) to:"
echo "   - Run through all 28 test cases"
echo "   - Track progress with checkboxes"
echo "   - Mark tests as pass/fail/skip"
echo ""
echo "3. Refer to TESTING.md for:"
echo "   - Debugging tips"
echo "   - Console commands"
echo "   - Common issues & solutions"
echo ""
echo "Happy testing! 🎉"
