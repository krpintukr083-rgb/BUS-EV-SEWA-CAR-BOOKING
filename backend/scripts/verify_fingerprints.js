const fs = require('fs');
const cp = require('child_process');
const path = require('path');

// Helper to get properties safely
function getProp(filePath, key) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith(key + '=')) {
      return trimmed.substring(key.length + 1).trim();
    }
  }
  return null;
}

const sdkDir = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'build-tools');
const versions = fs.readdirSync(sdkDir);
const latestVersion = versions[versions.length - 1];
const apksigner = path.join(sdkDir, latestVersion, 'apksigner.bat');

function getKeystoreFingerprints(keystorePath, storePass, alias) {
  try {
    const out = cp.execFileSync('keytool', [
      '-list', '-v',
      '-keystore', keystorePath,
      '-storepass', storePass,
      '-alias', alias
    ], { encoding: 'utf8' });

    const sha1Match = out.match(/SHA1:\s*([A-Fa-f0-9:]+)/);
    const sha256Match = out.match(/SHA256:\s*([A-Fa-f0-9:]+)/);
    const ownerMatch = out.match(/Owner:\s*([^\r\n]+)/);
    const validMatch = out.match(/Valid from:\s*([^\r\n]+)/);

    return {
      owner: ownerMatch ? ownerMatch[1] : null,
      valid: validMatch ? validMatch[1] : null,
      sha1: sha1Match ? sha1Match[1].toUpperCase() : null,
      sha256: sha256Match ? sha256Match[1].toUpperCase() : null
    };
  } catch (err) {
    return { error: err.message };
  }
}

function getApkCertFingerprints(apkPath) {
  if (!fs.existsSync(apkPath)) return { error: 'File not found' };
  try {
    const out = cp.execSync(`"${apksigner}" verify --print-certs "${apkPath}"`, { encoding: 'utf8' });
    const sha1Match = out.match(/Signer #1 certificate SHA-1 digest:\s*([a-f0-9]+)/i);
    const sha256Match = out.match(/Signer #1 certificate SHA-256 digest:\s*([a-f0-9]+)/i);

    // Format like XX:XX:XX...
    const formatHex = (str) => {
      if (!str) return null;
      return str.toUpperCase().match(/.{1,2}/g).join(':');
    };

    return {
      sha1Raw: sha1Match ? sha1Match[1].toLowerCase() : null,
      sha1: sha1Match ? formatHex(sha1Match[1]) : null,
      sha256Raw: sha256Match ? sha256Match[1].toLowerCase() : null,
      sha256: sha256Match ? formatHex(sha256Match[1]) : null
    };
  } catch (err) {
    return { error: err.message };
  }
}

console.log('=== 1. CURRENT KEYSTORE FINGERPRINTS VIA KEYTOOL ===');
const custKeystore = 'customer-app/android/app/customer-upload.keystore';
const custPass = getProp('customer-app/android/keystore.properties', 'storePassword');
const custAlias = getProp('customer-app/android/keystore.properties', 'keyAlias');
const custCurrent = getKeystoreFingerprints(custKeystore, custPass, custAlias);
console.log('Customer App Keystore:');
console.log('  Alias:  ', custAlias);
console.log('  Owner:  ', custCurrent.owner);
console.log('  SHA-1:  ', custCurrent.sha1);
console.log('  SHA-256:', custCurrent.sha256);

const drivKeystore = 'driver-app/android/app/upload.keystore';
const drivPass = getProp('driver-app/android/keystore.properties', 'storePassword');
const drivAlias = getProp('driver-app/android/keystore.properties', 'keyAlias');
const drivCurrent = getKeystoreFingerprints(drivKeystore, drivPass, drivAlias);
console.log('\nDriver App Keystore:');
console.log('  Alias:  ', drivAlias);
console.log('  Owner:  ', drivCurrent.owner);
console.log('  SHA-1:  ', drivCurrent.sha1);
console.log('  SHA-256:', drivCurrent.sha256);

console.log('\n=== 2. CERTIFICATES EXTRACTED FROM PREVIOUS RELEASE BUILDS (BACKUP) ===');
const prevCustApk = 'release/backup_v104/customer-app-release.apk';
const prevCustCert = getApkCertFingerprints(prevCustApk);
console.log('Previous Customer APK (' + prevCustApk + '):');
console.log('  SHA-1:  ', prevCustCert.sha1);
console.log('  SHA-256:', prevCustCert.sha256);

const prevDrivApk = 'release/backup_v104/driver-app-release.apk';
const prevDrivCert = getApkCertFingerprints(prevDrivApk);
console.log('\nPrevious Driver APK (' + prevDrivApk + '):');
console.log('  SHA-1:  ', prevDrivCert.sha1);
console.log('  SHA-256:', prevDrivCert.sha256);

console.log('\n=== 3. CERTIFICATES EXTRACTED FROM CURRENT NEW RELEASE BUILDS ===');
const currCustApk = 'release/customer-app-release.apk';
const currCustCert = getApkCertFingerprints(currCustApk);
console.log('Current Customer APK (' + currCustApk + '):');
console.log('  SHA-1:  ', currCustCert.sha1);
console.log('  SHA-256:', currCustCert.sha256);

const currDrivApk = 'release/driver-app-release.apk';
const currDrivCert = getApkCertFingerprints(currDrivApk);
console.log('\nCurrent Driver APK (' + currDrivApk + '):');
console.log('  SHA-1:  ', currDrivCert.sha1);
console.log('  SHA-256:', currDrivCert.sha256);

console.log('\n=== 4. CERTIFICATES FROM PRIOR BACKUP (release/android/backup_prior_build) ===');
const olderDrivApk = 'release/android/backup_prior_build/driver-app-release.apk';
const olderDrivCert = getApkCertFingerprints(olderDrivApk);
console.log('Older Driver APK (' + olderDrivApk + '):');
console.log('  SHA-1:  ', olderDrivCert.sha1);
console.log('  SHA-256:', olderDrivCert.sha256);

