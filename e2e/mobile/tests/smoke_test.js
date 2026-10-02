const { remote } = require('webdriverio');
const fs = require('fs');
const path = require('path');

const CUSTOMER_APK = 'E:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\customer-release.apk';
const DRIVER_APK = 'E:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\driver-release.apk';

async function runSmokeTest() {
    console.log("Starting Appium Smoke Test...");

    const customerCapabilities = {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:app': CUSTOMER_APK,
        'appium:newCommandTimeout': 240,
    };

    const driverCapabilities = {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:app': DRIVER_APK,
        'appium:newCommandTimeout': 240,
    };

    let customerDriver;
    let driverAppDriver;

    try {
        console.log("Launching Customer App...");
        customerDriver = await remote({
            protocol: 'http',
            hostname: '127.0.0.1',
            port: 4723,
            path: '/',
            capabilities: customerCapabilities,
            logLevel: 'error'
        });

        console.log("Customer App Launched!");
        
        // Wait a bit for the first screen to load
        await customerDriver.pause(5000);
        
        const customerSource = await customerDriver.getPageSource();
        fs.writeFileSync(path.join(__dirname, '../reports/customer_hierarchy.xml'), customerSource);
        console.log("Saved Customer UI hierarchy to customer_hierarchy.xml");
        
        await customerDriver.saveScreenshot(path.join(__dirname, '../reports/customer_smoke.png'));
        console.log("Saved Customer Screenshot!");
        
    } catch (e) {
        console.error("Failed to run Customer App test:", e);
    } finally {
        if (customerDriver) {
            await customerDriver.deleteSession();
            console.log("Customer session closed.");
        }
    }

    try {
        console.log("Launching Driver App...");
        driverAppDriver = await remote({
            protocol: 'http',
            hostname: '127.0.0.1',
            port: 4723,
            path: '/',
            capabilities: driverCapabilities,
            logLevel: 'error'
        });

        console.log("Driver App Launched!");
        
        await driverAppDriver.pause(5000);
        
        const driverSource = await driverAppDriver.getPageSource();
        fs.writeFileSync(path.join(__dirname, '../reports/driver_hierarchy.xml'), driverSource);
        console.log("Saved Driver UI hierarchy to driver_hierarchy.xml");

        await driverAppDriver.saveScreenshot(path.join(__dirname, '../reports/driver_smoke.png'));
        console.log("Saved Driver Screenshot!");
        
    } catch (e) {
        console.error("Failed to run Driver App test:", e);
    } finally {
        if (driverAppDriver) {
            await driverAppDriver.deleteSession();
            console.log("Driver session closed.");
        }
    }
}

// Make sure reports dir exists
const reportsDir = path.join(__dirname, '../reports');
if (!fs.existsSync(reportsDir)){
    fs.mkdirSync(reportsDir, { recursive: true });
}

runSmokeTest().then(() => {
    console.log("Smoke test finished.");
}).catch(console.error);
