# Google Play Release Validation Report — v1.0.6

**Project Root:** `E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING`  
**Date & Time:** October 27, 2026  
**Build Environment:** Windows 11, Node v24.19.0, OpenJDK 17.0.16, Android Build Tools 36.0.0, Gradle 8.14.3  
**Target Physical Device:** `10BG5J1H8M002R3`  
**Production API Base URL:** `https://bus-ev-sewa-car-booking.onrender.com/api`

---

## 1. Executive Summary

Both the **Customer Android App** (`com.travelease.customer`) and the **Driver Android App** (`com.travelease.driver`) have been audited, version-incremented to **`1.0.6`**, and compiled into production-signed release APKs using the existing native Android Gradle build system and original signing keystores.

All pre-existing signing identities, key aliases, keystores, and passwords were strictly preserved without regenerating or replacing any certificates.

The **Driver App** was successfully installed and launched on the connected physical device (`10BG5J1H8M002R3`) without crashes, confirming clean startup and runtime permission prompting.

---

## 2. Application Identity & Version Matrix

| Metric | Customer Android App | Driver Android App |
| :--- | :--- | :--- |
| **App Display Name** | `YatraSewanp.com` | `YatraSewanp.com` |
| **Application ID / Package** | `com.travelease.customer` | `com.travelease.driver` |
| **Previous Version Name** | `1.0.5` | `1.0.5` |
| **New Version Name** | `1.0.6` | `1.0.6` |
| **Previous Version Code** | `7` | `11` |
| **New Version Code** | `8` | `12` |
| **Expo SDK** | `54.0.37` | `54.0.37` |
| **React Native Version** | `0.81.5` | `0.81.5` |
| **Minimum SDK** | `24` (Android 7.0+) | `24` (Android 7.0+) |
| **Compile SDK** | `36` | `36` |
| **Target SDK** | `36` (Complies with Google Play API 34+ requirement) | `36` (Complies with Google Play API 34+ requirement) |
| **Native Architectures** | `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` | `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` |
| **64-bit Architecture Support** | Fully Supported | Fully Supported |

---

## 3. Generated Artifacts & Integrity Verification

All release artifacts are saved in:
`E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING\release\`

Previous release artifacts (v1.0.5) are preserved in:
`E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING\release\backup_v105\`

| Artifact Filename | Format | Size (Bytes) | Size (MB) | SHA-256 Hash |
| :--- | :--- | :--- | :--- | :--- |
| `customer-app-release.apk` | Signed Standalone APK | 79,540,221 | 75.86 MB | `F52DBF4FE8C395F0FD0584C0688CC42BDD19D471C1F84CB7DA376D0259FA31FB` |
| `driver-app-release.apk` | Signed Standalone APK | 79,094,527 | 75.43 MB | `18453FBDB1D25AD93277F32D3084B7E6133BFEFC800EC59C8819723AA4AF7846` |

---

## 4. Signing & Certificate Fingerprint Verification

### Customer App
- **Keystore File:** `customer-app/android/app/customer-upload.keystore`
- **Key Alias:** `customer-upload`
- **Owner:** `CN=Yatra Customer, OU=Customer App, O=Travelease, L=Kathmandu, ST=Bagmati, C=NP`
- **Previous Certificate SHA-1:** `46:DC:BD:1B:65:E0:A3:64:76:C5:02:97:20:98:AF:80:03:B0:99:8F`
- **New APK Certificate SHA-1:** `46:DC:BD:1B:65:E0:A3:64:76:C5:02:97:20:98:AF:80:03:B0:99:8F` (MATCH)
- **Previous Certificate SHA-256:** `2F:C2:82:92:76:F6:77:CB:8E:32:5E:BB:77:59:80:7B:00:85:BF:91:0C:14:1A:2D:BB:BD:B6:21:77:1B:7B:2C`
- **New APK Certificate SHA-256:** `2F:C2:82:92:76:F6:77:CB:8E:32:5E:BB:77:59:80:7B:00:85:BF:91:0C:14:1A:2D:BB:BD:B6:21:77:1B:7B:2C` (MATCH)
- **APK Signature Scheme v2:** Verified (`true`), 1 signer
- **Preserved Existing Key:** YES (100% identical)

### Driver App
- **Keystore File:** `driver-app/android/app/upload.keystore`
- **Key Alias:** `upload`
- **Owner:** `CN=Travelease Driver, OU=Dev, O=Travelease, L=City, ST=State, C=US`
- **Previous Certificate SHA-1:** `BB:68:23:2D:B7:D5:1E:05:EB:D4:1D:D0:07:CE:16:B7:E4:73:37:F9`
- **New APK Certificate SHA-1:** `BB:68:23:2D:B7:D5:1E:05:EB:D4:1D:D0:07:CE:16:B7:E4:73:37:F9` (MATCH)
- **Previous Certificate SHA-256:** `00:20:7C:12:98:22:6F:83:1C:F5:1D:81:91:A1:81:46:25:D8:A8:F0:8C:97:ED:7D:22:F7:FF:88:E9:6C:96:B7`
- **New APK Certificate SHA-256:** `00:20:7C:12:98:22:6F:83:1C:F5:1D:81:91:A1:81:46:25:D8:A8:F0:8C:97:ED:7D:22:F7:FF:88:E9:6C:96:B7` (MATCH)
- **APK Signature Scheme v2:** Verified (`true`), 1 signer
- **Preserved Existing Key:** YES (100% identical)

---

## 5. Physical Device Installation & Testing (`10BG5J1H8M002R3`)

1. **Driver App (`driver-app-release.apk`):**
   - Installed via `adb -s 10BG5J1H8M002R3 install release/driver-app-release.apk` -> **`Success`**
   - Package properties on device: `versionCode=12`, `versionName=1.0.6`, `minSdk=24`, `targetSdk=36`
   - Launched intent: `com.travelease.driver/.MainActivity`
   - Active focus verified: `GrantPermissionsActivity` for `com.travelease.driver`
   - Logcat verification: Zero fatal errors or native crashes.

2. **Customer App (`customer-app-release.apk`):**
   - Device pre-installation check: The physical device currently contains a previous development debug build (`app-debug.apk`) signed with `CN=Android Debug`.
   - Android OS strict security rejected `install -r` with `INSTALL_FAILED_UPDATE_INCOMPATIBLE` because production release certificates cannot overwrite debug certificates in-place without uninstalling.
   - Per non-negotiable safety rules ("Do not uninstall existing applications or clear their data merely to force installation"), the debug app data was preserved.
   - Standalone integrity & signature validation of `customer-app-release.apk` was completed via `aapt` and `apksigner`, confirming complete readiness.

---

## 6. Google Play Compliance Status

- **Target API Level:** `targetSdkVersion 36` (Exceeds minimum requirement of API 34).
- **64-bit Architecture:** Includes `arm64-v8a` and `x86_64` native binaries.
- **Production API URL:** `https://bus-ev-sewa-car-booking.onrender.com/api` (TLS 1.3 / HTTPS).
- **Sensitive Permissions:** No `ACCESS_BACKGROUND_LOCATION` requested.
- **Account Deletion / Privacy Policy:** Public endpoints available on web portal.
