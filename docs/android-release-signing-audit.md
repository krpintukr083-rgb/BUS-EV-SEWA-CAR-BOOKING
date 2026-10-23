# Android Release Signing Audit Report

## 1. Audit Overview
- **Date of Audit:** October 22, 2026
- **Application ID:** `com.travelease.driver`
- **Application Name:** YatraSewanp.com (Driver App)
- **Namespace:** `com.travelease.driver`
- **Audit Target:** Android Native Release Signing Key Preservation & Verification

---

## 2. Release Artifact Inspection
- **Release APK Path:** `driver-app/android/app/build/outputs/apk/release/app-release.apk`
- **File Size:** 79,076,963 bytes (~75.41 MB)
- **Signature Verification Result:**
  - `apksigner` status: **VERIFIES**
  - APK Signature Scheme v1: false
  - APK Signature Scheme v2: true
  - APK Signature Scheme v3: false
  - Number of signers: 1
- **Release AAB Path:** `driver-app/android/app/build/outputs/bundle/release/app-release.aab`
- **AAB Version:** `1.0.2` (versionCode `8`)
- **AAB File Size:** 55,396,165 bytes (~52.83 MB)
- **AAB Signature & Structural Verification:**
  - `bundletool validate`: **PASSED** (exit code 0, structural integrity valid)
  - `bundletool dump manifest`: **package=`com.travelease.driver`**, **versionCode=`8`**, **versionName=`1.0.2`**
  - `jarsigner -verify`: **jar verified**
  - Signer certificate SHA-256 digest: `00:20:7C:12:98:22:6F:83:1C:F5:1D:81:91:A1:81:46:25:D8:A8:F0:8C:97:ED:7D:22:F7:FF:88:E9:6C:96:B7`
- **Related Copied Artifacts:**
  - `release-apks/DriverApp-release.apk` (79,076,963 bytes, identical SHA-256 fingerprint)
  - `driver-release.apk` (79,076,963 bytes, identical SHA-256 fingerprint)

---

## 3. Signing Configuration Analysis
- **Build Configuration File:** `driver-app/android/app/build.gradle`
- **Signing Config in Build Types:**
  ```groovy
  buildTypes {
      debug {
          signingConfig signingConfigs.debug
      }
      release {
          signingConfig signingConfigs.release
          ...
      }
  }
  ```
- **Signing Configuration Definition:**
  ```groovy
  def keystorePropertiesFile = rootProject.file("keystore.properties")
  def keystoreProperties = new Properties()
  if (keystorePropertiesFile.exists()) {
      keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
  }
  ...
  signingConfigs {
      release {
          if (keystorePropertiesFile.exists()) {
              def storeFilePath = keystoreProperties['storeFile'] ?: 'upload.keystore'
              def keystoreFile = file(storeFilePath)
              if (!keystoreFile.exists()) {
                  keystoreFile = rootProject.file(storeFilePath)
              }
              storeFile keystoreFile
              storePassword keystoreProperties['storePassword']
              keyAlias keystoreProperties['keyAlias']
              keyPassword keystoreProperties['keyPassword']
          }
      }
  }
  ```
- **Properties Source:** `driver-app/android/keystore.properties` (externalized, not hardcoded into build scripts)
- **Keystore File Location:** `driver-app/android/app/upload.keystore`
- **Keystore Alias:** `upload`
- **Fallback Assessment:** No fallback to `debug` signing key occurs in release build type.

---

## 4. Keystore & Certificate Fingerprint Comparison

### Original Keystore (`driver-app/android/app/upload.keystore`)
- **Original Keystore Available:** Yes
- **Keystore Format:** JKS
- **Key Alias:** `upload`
- **Certificate Subject / Owner:** `CN=Travelease Driver, OU=Dev, O=Travelease, L=City, ST=State, C=US`
- **Certificate Issuer:** `CN=Travelease Driver, OU=Dev, O=Travelease, L=City, ST=State, C=US`
- **Validity:** Fri Oct 09 10:33:10 IST 2026 until Tue Feb 24 10:33:10 IST 2054
- **SHA-256 Fingerprint:** `00:20:7C:12:98:22:6F:83:1C:F5:1D:81:91:A1:81:46:25:D8:A8:F0:8C:97:ED:7D:22:F7:FF:88:E9:6C:96:B7`
- **SHA-1 Fingerprint:** `BB:68:23:2D:B7:D5:1E:05:EB:D4:1D:D0:07:CE:16:B7:E4:73:37:F9`
- **MD5 Fingerprint:** `44:EA:6C:F7:99:1E:97:22:3D:67:8F:DA:BA:97:C4:D0`

### Current Release APK (`driver-app/android/app/build/outputs/apk/release/app-release.apk`)
- **Signer #1 Certificate DN:** `CN=Travelease Driver, OU=Dev, O=Travelease, L=City, ST=State, C=US`
- **Signer #1 SHA-256 Digest:** `00207c1298226f831cf51d8191a1814625d8a8f08c97ed7d22f7ff88e96c96b7`
- **Signer #1 SHA-1 Digest:** `bb68232db7d51e05ebd41dd007ce16b7e47337f9`
- **Signer #1 MD5 Digest:** `44ea6cf7991e97223d678fdaba97c4d0`
- **Public Key Algorithm:** RSA (2048 bits)

---

## 5. Audit Results

| Verification Criterion | Expected | Actual | Status |
|---|---|---|---|
| Keystore Existence | Keystore file exists and is intact | `upload.keystore` present (2,728 bytes) | **PASS** |
| Certificate DN Match | `CN=Travelease Driver...` | `CN=Travelease Driver...` | **MATCH** |
| SHA-256 Fingerprint Match | `00207c1298226f831cf51d8191a1814625d8a8f08c97ed7d22f7ff88e96c96b7` | `00207c1298226f831cf51d8191a1814625d8a8f08c97ed7d22f7ff88e96c96b7` | **MATCH** |
| SHA-1 Fingerprint Match | `bb68232db7d51e05ebd41dd007ce16b7e47337f9` | `bb68232db7d51e05ebd41dd007ce16b7e47337f9` | **MATCH** |
| MD5 Fingerprint Match | `44ea6cf7991e97223d678fdaba97c4d0` | `44ea6cf7991e97223d678fdaba97c4d0` | **MATCH** |
| Signature Verification | Passes Android `apksigner` | `Verifies` (Scheme v2 = true) | **PASS** |
| Debug Key Fallback | No fallback to debug key | Release signer is production release key | **PASS** |
| Secret Separation | Credentials not committed in `build.gradle` | Loaded via `keystore.properties` | **PASS** |

- **Comparison Result:** **MATCH**
- **Corrective Action Required:** None. The original signing key and configuration are preserved intact and active.

---

## 6. Final Status
**`SIGNING_KEY_PRESERVED_AND_VERIFIED`**
