const { execSync } = require('child_process');
const fs = require('fs');

const CUSTOMER_EMULATOR = 'emulator-5554';
// The prompt states to prefer 2 emulators, but I'll use 5554 for both if 5556 is missing
const DRIVER_EMULATOR = process.env.DRIVER_EMULATOR || 'emulator-5554'; 

function runAdb(device, cmd) {
    try {
        console.log(`[${device}] Running: adb -s ${device} ${cmd}`);
        return execSync(`adb -s ${device} ${cmd}`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (e) {
        console.error(`Error running adb cmd on ${device}:`, e.message);
        return null;
    }
}

function dumpUI(device) {
    runAdb(device, 'shell uiautomator dump /sdcard/window_dump.xml');
    runAdb(device, 'pull /sdcard/window_dump.xml ./window_dump.xml');
    try {
        return fs.readFileSync('./window_dump.xml', 'utf-8');
    } catch (e) {
        return '';
    }
}

function extractBounds(boundsStr) {
    // "[x1,y1][x2,y2]"
    const match = boundsStr.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (!match) return null;
    return {
        x1: parseInt(match[1]),
        y1: parseInt(match[2]),
        x2: parseInt(match[3]),
        y2: parseInt(match[4]),
        cx: parseInt(match[1]) + (parseInt(match[3]) - parseInt(match[1])) / 2,
        cy: parseInt(match[2]) + (parseInt(match[4]) - parseInt(match[2])) / 2
    };
}

function clickElementByText(device, text) {
    const xml = dumpUI(device);
    const regex = new RegExp(`text="([^"]*${text}[^"]*)"[^>]*bounds="(\\[\\d+,\\d+\\]\\[\\d+,\\d+\\])"`, 'i');
    const match = xml.match(regex);
    if (match) {
        const bounds = extractBounds(match[2]);
        if (bounds) {
            console.log(`[${device}] Clicking text "${match[1]}" at ${bounds.cx}, ${bounds.cy}`);
            runAdb(device, `shell input tap ${bounds.cx} ${bounds.cy}`);
            return true;
        }
    }
    
    // Also try checking content-desc
    const regexDesc = new RegExp(`content-desc="([^"]*${text}[^"]*)"[^>]*bounds="(\\[\\d+,\\d+\\]\\[\\d+,\\d+\\])"`, 'i');
    const matchDesc = xml.match(regexDesc);
    if (matchDesc) {
        const bounds = extractBounds(matchDesc[2]);
        if (bounds) {
            console.log(`[${device}] Clicking content-desc "${matchDesc[1]}" at ${bounds.cx}, ${bounds.cy}`);
            runAdb(device, `shell input tap ${bounds.cx} ${bounds.cy}`);
            return true;
        }
    }
    
    console.log(`[${device}] Could not find element with text/desc: ${text}`);
    return false;
}

function inputText(device, text) {
    console.log(`[${device}] Typing text: ${text}`);
    // Replace spaces with %s for adb shell input text
    const safeText = text.replace(/ /g, '%s');
    runAdb(device, `shell input text "${safeText}"`);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log("Waiting for builds to complete first...");
    // Just a placeholder script for now.
    console.log("End of script");
}

runTest();
