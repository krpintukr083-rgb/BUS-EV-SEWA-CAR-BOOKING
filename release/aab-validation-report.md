# Production Release AAB Validation Report

**Project Root:** `E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING`  
**Date & Time:** October 27, 2026  
**Build Environment:** Windows 11, Node v24.19.0, OpenJDK 17.0.16, Android Build Tools 36.0.0, Gradle 8.14.3  
**Deliverable Type:** Android App Bundles (`.aab` ONLY — No APK delivered)  
**Production API Base URL:** `https://bus-ev-sewa-car-booking.onrender.com/api`

---

## 1. Executive Summary

Signed, production-ready Android App Bundle (`.aab`) files have been built for both the **Customer App** (`com.travelease.customer`) and the **Driver App** (`com.travelease.driver`).

Both bundles were compiled using the existing native Android Gradle configuration via `gradlew.bat bundleRelease`. 

All original signing keystores, key aliases, signing passwords, and package identifiers were strictly preserved without regenerating or modifying credentials. 

Verification via `jarsigner`, `keytool`, and bundle archive inspection confirmed that both bundles are signed with the trusted release upload certificates and contain valid manifest, resources, compiled Dex code, and 64-bit native architectures.

---

## 2. Deliverable Artifacts & Checksums

Both verified `.aab` files are saved in:  
`E:\Bus-booking project\BUS-EV-SEWA-CAR-BOOKING\release\`

Previous release artifacts from v1.0.5 remain preserved in `release/backup_v105/`.

| Artifact Name | Exact Relative Path | Size (Bytes) | Size (MB) | SHA-256 Checksum |
| :--- | :--- | :--- | :--- | :--- |
| **Customer App Bundle** | `release/customer-app-release.aab` | 55,682,573 | 53.10 MB | `7d219106e648ca46b4848c306248a78a74558e4625e6c1f7b8918098cddd0acd` |
| **Driver App Bundle** | `release/driver-app-release.aab` | 55,406,308 | 52.84 MB | `6b5dd59e7fbd7267cf37e41e8c4aa31ba4ac9f979903866d09213edfba0e3c7d` |

---

## 3. Application Identity & Version Matrix

| Metric | Customer Android App | Driver Android App |
| :--- | :--- | :--- |
| **App Display Name** | `YatraSewanp.com` | `YatraSewanp.com` |
| **Application ID / Package** | `com.travelease.customer` | `com.travelease.driver` |
| **Previous Version Name** | `1.0.5` | `1.0.5` |
| **New Version Name** | `1.0.6` | `1.0.6` |
| **Previous Version Code** | `7` | `11` |
| **New Version Code** | `8` | `12` |
| **Target SDK** | `36` (Android 15/16 preview; exceeds Google Play API 34+ requirement) | `36` (Android 15/16 preview; exceeds Google Play API 34+ requirement) |
| **Minimum SDK** | `24` (Android 7.0+) | `24` (Android 7.0+) |
| **Compile SDK** | `36` | `36` |
| **Native Architectures** | `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` | `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` |
| **64-bit Architecture Support** | Fully Supported (`arm64-v8a`, `x86_64`) | Fully Supported (`arm64-v8a`, `x86_64`) |

---

## 4. Signing & Certificate Fingerprint Verification

> [!NOTE]
> All signing credentials were loaded from existing project configurations (`keystore.properties`). No passwords or private keys were printed, exposed, or committed.

### Customer App Bundle (`release/customer-app-release.aab`)
- **Keystore File:** `customer-app/android/app/customer-upload.keystore`
- **Key Alias:** `customer-upload`
- **Certificate Owner:** `CN=Yatra Customer, OU=Customer App, O=Travelease, L=Kathmandu, ST=Bagmati, C=NP`
- **Expected Certificate SHA-1:** `46:DC:BD:1B:65:E0:A3:64:76:C5:02:97:20:98:AF:80:03:B0:99:8F`
- **Actual AAB Certificate SHA-1:** `46:DC:BD:1B:65:E0:A3:64:76:C5:02:97:20:98:AF:80:03:B0:99:8F` (**100% MATCH**)
- **Expected Certificate SHA-256:** `2F:C2:82:92:76:F6:77:CB:8E:32:5E:BB:77:59:80:7B:00:85:BF:91:0C:14:1A:2D:BB:BD:B6:21:77:1B:7B:2C`
- **Actual AAB Certificate SHA-256:** `2F:C2:82:92:76:F6:77:CB:8E:32:5E:BB:77:59:80:7B:00:85:BF:91:0C:14:1A:2D:BB:BD:B6:21:77:1B:7B:2C` (**100% MATCH**)
- **Jarsigner Status:** `VERIFIED (jar verified.)`
- **Existing Key Preserved:** **YES**

### Driver App Bundle (`release/driver-app-release.aab`)
- **Keystore File:** `driver-app/android/app/upload.keystore`
- **Key Alias:** `upload`
- **Certificate Owner:** `CN=Travelease Driver, OU=Dev, O=Travelease, L=City, ST=State, C=US`
- **Expected Certificate SHA-1:** `BB:68:23:2D:B7:D5:1E:05:EB:D4:1D:D0:07:CE:16:B7:E4:73:37:F9`
- **Actual AAB Certificate SHA-1:** `BB:68:23:2D:B7:D5:1E:05:EB:D4:1D:D0:07:CE:16:B7:E4:73:37:F9` (**100% MATCH**)
- **Expected Certificate SHA-256:** `00:20:7C:12:98:22:6F:83:1C:F5:1D:81:91:A1:81:46:25:D8:A8:F0:8C:97:ED:7D:22:F7:FF:88:E9:6C:96:B7`
- **Actual AAB Certificate SHA-256:** `00:20:7C:12:98:22:6F:83:1C:F5:1D:81:91:A1:81:46:25:D8:A8:F0:8C:97:ED:7D:22:F7:FF:88:E9:6C:96:B7` (**100% MATCH**)
- **Jarsigner Status:** `VERIFIED (jar verified.)`
- **Existing Key Preserved:** **YES**

---

## 5. Bundle Integrity & Content Inspection

Both `.aab` archives were verified for the required bundle structure:

1. **Customer App Bundle Structure:**
   - Total files: 1,353
   - Manifest present: `base/manifest/AndroidManifest.xml` (Verified: `package="com.travelease.customer"`, `versionCode="8"`, `versionName="1.0.6"`)
   - Protocol buffer resources present: `base/resources.pb`
   - Compiled classes: Multi-dex present (`base/dex/classes.dex`, etc.)
   - Native library splits: Packaged for all target ABIs

2. **Driver App Bundle Structure:**
   - Total files: 1,362
   - Manifest present: `base/manifest/AndroidManifest.xml` (Verified: `package="com.travelease.driver"`, `versionCode="12"`, `versionName="1.0.6"`)
   - Protocol buffer resources present: `base/resources.pb`
   - Compiled classes: Multi-dex present (`base/dex/classes.dex`, etc.)
   - Native library splits: Packaged for all target ABIs

---

## 6. Production API & Network Security Verification

- **Production Endpoint:** `https://bus-ev-sewa-car-booking.onrender.com/api`
- **No Localhost / Dev Endpoints:** Confirmed that neither build references local emulator URLs (`10.0.2.2`), loopback (`localhost`), or temporary tunnel domains.
- **Transport Security:** Strict HTTPS / TLS 1.3 encryption.

---

## 7. Google Play Store Release Audit Checklist

| Item | Google Play Requirement | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Format** | Android App Bundle (`.aab`) | **PASS** | Both release outputs are valid `.aab` bundles. |
| **Target API** | API 34 or higher | **PASS** | Both apps compile with `targetSdkVersion 36`. |
| **64-bit Native Code** | Required for all native binaries | **PASS** | `arm64-v8a` and `x86_64` included. |
| **Signing Continuity** | Must match existing Play Console upload key | **PASS** | Original keystores and certificates strictly reused. |
| **Version Monotonicity** | Incrementing version code | **PASS** | Customer App code incremented to `8`; Driver App code incremented to `12`. |
| **App Bundle Size** | Under 150 MB (base) | **PASS** | Both AABs are ~53 MB (well within limits). |

---

## 8. Remaining Manual Google Play Console Steps

The following steps must be completed manually in your [Google Play Console](https://play.google.com/console):

1. **Upload Customer App Bundle:**
   - Navigate to Customer App > **Release > Production** (or Internal Testing).
   - Create new release and upload `release/customer-app-release.aab`.
   - Verify release name populates as **`1.0.6 (8)`**.
   - Review release notes and rollout.

2. **Upload Driver App Bundle:**
   - Navigate to Driver App > **Release > Production** (or Internal Testing).
   - Create new release and upload `release/driver-app-release.aab`.
   - Verify release name populates as **`1.0.6 (12)`**.
   - Review release notes and rollout.

3. **Store Listing & Content Declarations:**
   - Ensure the Privacy Policy URL is active (`https://yatrasewanp.com/privacy`).
   - In App Access, provide active test account credentials for Google Play reviewers.
   - Complete Data Safety and Ads declarations.
