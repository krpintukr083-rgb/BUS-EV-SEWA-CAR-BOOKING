# Google Play Release Validation Report

**Project Root:** `E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING`  
**Date & Time:** October 25, 2026  
**Build Environment:** Windows 11, Node v24.19.0, OpenJDK 17.0.16, Android Build Tools 36.0.0, Gradle 8.14.3  
**Production API Base URL:** `https://bus-ev-sewa-car-booking.onrender.com/api`

---

## 1. Executive Summary

Both the **Customer Android App** (`com.travelease.customer`) and the **Driver Android App** (`com.travelease.driver`) have been completely audited, version-incremented, and built into signed release **Android App Bundles (`.aab`)** for Google Play Console submission, as well as signed release **APKs (`.apk`)** for direct device verification.

All existing signing keystores, key aliases, application identifiers, environment configurations, and production endpoints were strictly preserved without regenerating or modifying credentials.

Both release APKs were installed and tested on a connected Android emulator (`emulator-5554`), confirming crash-free launch, runtime permission handling, and active connectivity to the live production server.

---

## 2. Application Identity & Version Matrix

| Metric | Customer Android App | Driver Android App |
| :--- | :--- | :--- |
| **App Display Name** | `YatraSewanp.com` | `YatraSewanp.com` |
| **Application ID / Package** | `com.travelease.customer` | `com.travelease.driver` |
| **Previous Version Name** | `1.0.4` | `1.0.4` |
| **New Version Name** | `1.0.5` | `1.0.5` |
| **Previous Version Code** | `6` | `10` |
| **New Version Code** | `7` | `11` |
| **Expo SDK** | `54.0.37` | `54.0.37` |
| **React Native Version** | `0.81.5` | `0.81.5` |
| **Minimum SDK** | `24` (Android 7.0+) | `24` (Android 7.0+) |
| **Compile SDK** | `36` (Android 15/16 preview) | `36` (Android 15/16 preview) |
| **Target SDK** | `36` (Complies with Google Play API 34+ requirement) | `36` (Complies with Google Play API 34+ requirement) |
| **Native Architectures** | `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` | `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` |
| **64-bit Architecture Support** | Fully Supported (`arm64-v8a`, `x86_64`) | Fully Supported (`arm64-v8a`, `x86_64`) |

---

## 3. Generated Artifacts & Integrity Verification

All release artifacts are saved in:
`E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING\release\`

| Artifact Filename | Format | Size (Bytes) | Size (MB) | SHA-256 Hash |
| :--- | :--- | :--- | :--- | :--- |
| `customer-app-release.aab` | Android App Bundle | 55,679,849 | 53.10 MB | `3a2bbfb4837125ab59b68290c09e60bd3cd399fc29e462cb4c35160c6c5391af` |
| `customer-app-release.apk` | Signed Standalone APK | 79,534,589 | 75.85 MB | `699b25f8f47474d74dd40395d12fd03f9bd4a37a31cc1e92881337888179421b` |
| `driver-app-release.aab` | Android App Bundle | 55,404,157 | 52.84 MB | `692501a9e7588dd517d2315d9779b49a76032894c8233c49329dd61bb13ea394` |
| `driver-app-release.apk` | Signed Standalone APK | 79,090,915 | 75.43 MB | `3cb610b873d8712d2151c7bc06f6ed6101f9e246c7e1991c94f783da140a1f3e` |

---

## 4. Signing & Keystore Verification

> [!NOTE]
> All signing credentials were loaded strictly from pre-existing configuration. No passwords or private keys were printed, exposed, or committed.

### Customer App
- **Keystore File:** `customer-app/android/app/customer-upload.keystore`
- **Key Alias:** `customer-upload`
- **Certificate Validity:** Saturday, February 28, 2054
- **Certificate SHA-1:** `46:DC:BD:1B:65:E0:A3:64:76:C5:02:97:20:98:AF:80:03:B0:99:8F`
- **Certificate SHA-256:** `2F:C2:82:92:76:F6:77:CB:8E:32:5E:BB:77:59:80:7B:00:85:BF:91:0C:14:1A:2D:BB:BD:B6:21:77:1B:7B:2C`
- **AAB Signing Status:** Verified via `jarsigner` (`jar verified`)
- **APK Signing Status:** Verified via `apksigner` (APK Signature Scheme v2 = `true`, 1 signer)

### Driver App
- **Keystore File:** `driver-app/android/app/upload.keystore`
- **Key Alias:** `upload`
- **Certificate Validity:** Tuesday, February 24, 2054
- **Certificate SHA-1:** `BB:68:23:2D:B7:D5:1E:05:EB:D4:1D:D0:07:CE:16:B7:E4:73:37:F9`
- **Certificate SHA-256:** `00:20:7C:12:98:22:6F:83:1C:F5:1D:81:91:A1:81:46:25:D8:A8:F0:8C:97:ED:7D:22:F7:FF:88:E9:6C:96:B7`
- **AAB Signing Status:** Verified via `jarsigner` (`jar verified`)
- **APK Signing Status:** Verified via `apksigner` (APK Signature Scheme v2 = `true`, 1 signer)

---

## 5. Live Device / Emulator Verification

Testing was conducted on connected Android emulator `emulator-5554` (`sdk_gphone64_x86_64`, Android 14 API 34):

1. **Customer App (`customer-app-release.apk`):**
   - Installed via `adb install` -> `Success`
   - Launched intent `com.travelease.customer/.MainActivity` -> `Success`
   - Verified active window focus: `com.travelease.customer/com.travelease.customer.MainActivity`
   - Verified runtime permission request: Notification permission dialog triggered smoothly
   - Verified package properties: `versionCode=7`, `versionName=1.0.5`, `minSdk=24`, `targetSdk=36`
   - No crash or uncaught JavaScript exceptions.

2. **Driver App (`driver-app-release.apk`):**
   - Installed via `adb install` -> `Success`
   - Launched intent `com.travelease.driver/.MainActivity` -> `Success`
   - Verified active window focus: `com.travelease.driver/com.travelease.driver.MainActivity`
   - Verified runtime permission request: Notification permission dialog triggered smoothly
   - Verified package properties: `versionCode=11`, `versionName=1.0.5`, `minSdk=24`, `targetSdk=36`
   - No crash or uncaught JavaScript exceptions.

---

## 6. Production API & Network Security Audit

1. **Production Endpoint:** Both apps are configured with the single source of truth production endpoint:
   `https://bus-ev-sewa-car-booking.onrender.com/api`
2. **Backend Reachability:** Verified HTTP GET `https://bus-ev-sewa-car-booking.onrender.com/api/health` returned HTTP `200 OK` (`status: "online"`).
3. **No Development URLs:** Confirmed no hardcoded `localhost`, `10.0.2.2`, or temporary tunnel URLs are active in the release builds.
4. **Transport Security:** All communication with the live cloud backend uses TLS 1.3 / HTTPS.

---

## 7. Google Play Policy Readiness Checklist

### A. Target API Level
- **Google Play Requirement:** Target API 34 or higher for all new apps and updates.
- **Status:** **PASS**. Both apps target API 36 (`targetSdkVersion 36`).

### B. 64-Bit Native Code Support
- **Google Play Requirement:** Must contain 64-bit native libraries alongside 32-bit.
- **Status:** **PASS**. Both apps package `arm64-v8a` and `x86_64` alongside `armeabi-v7a` and `x86`.

### C. Permissions Least-Privilege Audit
- **Customer App Permissions:**
  - `INTERNET` (Standard network access)
  - `POST_NOTIFICATIONS` (Android 13+ runtime notification prompt)
  - `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (File/image picking)
  - `RECORD_AUDIO` (Expo module default)
  - `VIBRATE` (Notification feedback)
  - `SYSTEM_ALERT_WINDOW`
- **Driver App Permissions:**
  - `INTERNET` (Standard network access)
  - `POST_NOTIFICATIONS` (Android 13+ runtime notification prompt for new bookings)
  - `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` (License/vehicle document uploads)
  - `RECORD_AUDIO`
  - `VIBRATE` (Sound & vibration on new booking request alerts)
  - `SYSTEM_ALERT_WINDOW`
- **Recommendation:** No background location permissions (`ACCESS_BACKGROUND_LOCATION`) or foreground service location types were introduced, avoiding extensive Google Play sensitive permission declaration forms.

### D. Data Safety Declaration Guidance
During Google Play Console submission, complete the Data Safety questionnaire based on actual app behavior:
- **Location:** If location is used for pickup coordinates, declare coarse/fine location as "Collected for App Functionality" (not shared with third parties).
- **Personal Info:** Name, email, phone number (Account Management & Booking).
- **Financial Info:** Payment info (handled securely via payment gateway like Razorpay/eSewa/Khalti).
- **Device Identifiers:** Expo Push Token / FCM Registration Token (for push notifications).
- **Data Encryption in Transit:** YES (All traffic is encrypted over HTTPS).
- **Account Deletion:** YES (Required by Google Play). Provide in-app or URL-based deletion instructions.

---

## 8. Missing Information Required from Developer

The following information must be provided by the developer directly in Google Play Console (cannot be invented or hardcoded):

1. **Privacy Policy URL:**
   - A publicly accessible web URL disclosing privacy practices and data collection (e.g., `https://yatrasewanp.com/privacy` or hosted on the web portal).
2. **Account Deletion Web Page / Form:**
   - Google Play policy requires a public URL explaining how users can request permanent deletion of their account and data.
3. **Store Listing Assets:**
   - **App Icon:** 512 x 512 px PNG (up to 1 MB).
   - **Feature Graphic:** 1024 x 500 px PNG or JPEG (up to 15 MB).
   - **Screenshots:** At least 4 phone screenshots (minimum 320px, maximum 3840px, 16:9 or 9:16 aspect ratio) for Customer App and Driver App.
   - **Short Description:** Up to 80 characters.
   - **Full Description:** Up to 4,000 characters.
4. **App Review Test Credentials (App Access section):**
   - Provide test login credentials in the Play Console **App access** section so Google reviewers can test login-protected features:
     - Customer App Review Account: Active customer phone number / test credentials.
     - Driver App Review Account: Active approved driver phone number (e.g. `9800000001` or dedicated test driver account).
5. **Official Support / Contact Information:**
   - Contact Email: e.g. `support@yatrasewanp.com`
   - Official Phone / WhatsApp Number: `+977 970-9168447`
   - Official Website: e.g. `https://yatrasewanp.com`

---

## 9. Step-by-Step Manual Actions in Google Play Console

To publish both apps, follow these steps in your [Google Play Console](https://play.google.com/console):

### Step 1: Customer App Submission
1. Navigate to your **Customer App** in Play Console.
2. Go to **Release > Production** (or **Internal testing** first).
3. Click **Create new release**.
4. Drag and drop `E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING\release\customer-app-release.aab`.
5. Verify the release name automatically populates as **`1.0.5 (7)`**.
6. Enter release notes (e.g. "Performance improvements, updated contact support channels, enhanced booking flow").
7. In the left navigation, complete all required declarations under **Policy and programs > App content**:
   - Privacy Policy URL
   - App Access (Provide test credentials)
   - Ads declaration (Declare whether your app contains ads)
   - Content ratings (Complete questionnaire)
   - Target audience and content
   - Data safety questionnaire
   - Government apps / Financial features declarations
8. Complete **Store presence > Main store listing** (Title, Short/Full description, Icon, Feature graphic, Screenshots).
9. Click **Review release** and **Start rollout to Production**.

### Step 2: Driver App Submission
1. Navigate to your **Driver App** in Play Console.
2. Go to **Release > Production** (or **Internal testing** first).
3. Click **Create new release**.
4. Drag and drop `E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING\release\driver-app-release.aab`.
5. Verify the release name automatically populates as **`1.0.5 (11)`**.
6. Enter release notes (e.g. "Driver dispatch notification updates, official support number update, stability improvements").
7. Complete all required declarations under **Policy and programs > App content** (App access with active driver test account, Privacy Policy, Data Safety).
8. Complete **Store presence > Main store listing**.
9. Click **Review release** and **Start rollout to Production**.

---

*Report generated automatically by Antigravity IDE Release Preparation Engine.*
