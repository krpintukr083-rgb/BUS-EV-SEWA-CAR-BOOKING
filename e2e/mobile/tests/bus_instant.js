const { remote } = require('webdriverio');
const fs = require('fs');

async function run() {
    const custCaps = {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:udid': 'emulator-5554',
        'appium:app': 'E:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\customer-release.apk',
    };
    
    const drivCaps = {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:udid': 'emulator-5556',
        'appium:app': 'E:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\driver-release.apk',
    };

    let cust, driv;
    try {
        console.log("Connecting to Customer...");
        cust = await remote({ protocol: 'http', hostname: '127.0.0.1', port: 4723, path: '/', capabilities: custCaps, logLevel: 'error' });
        
        console.log("Connecting to Driver...");
        driv = await remote({ protocol: 'http', hostname: '127.0.0.1', port: 4723, path: '/', capabilities: drivCaps, logLevel: 'error' });
        
        await cust.pause(5000);
        await driv.pause(5000);
        
        console.log("Performing Customer Login...");
        const emailInput = await cust.$('//android.widget.EditText[@text="name@example.com"]');
        await emailInput.setValue('test_customer@example.com');
        const passInput = await cust.$('//android.widget.EditText[@text="Enter password"]');
        await passInput.setValue('password123');
        const loginBtn = await cust.$('~Login');
        await loginBtn.click();
        
        await cust.pause(5000);
        
        console.log("Looking for Bus booking icon...");
        // This will likely fail because we don't know the exact element selector
        const busBtn = await cust.$('//android.widget.TextView[@text="Bus"]');
        await busBtn.click();

    } catch (e) {
        console.error("TEST FAILED:", e.message);
        if (cust) {
            fs.writeFileSync('e2e/mobile/reports/cust_fail.xml', await cust.getPageSource());
        }
    } finally {
        if (cust) await cust.deleteSession();
        if (driv) await driv.deleteSession();
    }
}
run();
