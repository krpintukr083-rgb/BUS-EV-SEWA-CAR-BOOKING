const { remote } = require('webdriverio');

async function runTest() {
    const customerCapabilities = {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:app': 'E:\\Bus-booking project\\BUS-EV-SEWA-CAR-BOOKING\\customer-release.apk',
        'appium:newCommandTimeout': 240,
    };

    let driver;
    try {
        driver = await remote({
            protocol: 'http', hostname: '127.0.0.1', port: 4723, path: '/', capabilities: customerCapabilities, logLevel: 'error'
        });

        await driver.pause(3000);
        
        // Find Email field
        const emailInput = await driver.$('//android.widget.EditText[@text="name@example.com"]');
        await emailInput.setValue('test_customer@example.com');

        // Find Password field
        const passInput = await driver.$('//android.widget.EditText[@text="Enter password"]');
        await passInput.setValue('password123');

        // Click Login
        const loginBtn = await driver.$('~Login');
        await loginBtn.click();
        
        console.log("Clicked login!");
        await driver.pause(4000);
        
        const nextScreen = await driver.getPageSource();
        console.log("Logged in, page source length:", nextScreen.length);
        
    } catch (e) {
        console.error("Test failed", e);
    } finally {
        if (driver) await driver.deleteSession();
    }
}
runTest();
