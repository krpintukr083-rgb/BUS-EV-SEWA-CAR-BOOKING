const cp = require('child_process');
const fs = require('fs');
const path = require('path');

const sdkDir = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'build-tools');
const versions = fs.readdirSync(sdkDir);
const latestVersion = versions[versions.length - 1];
const aapt = path.join(sdkDir, latestVersion, 'aapt.exe');
const apksigner = path.join(sdkDir, latestVersion, 'apksigner.bat');

console.log('Build Tools:', latestVersion);

function checkApk(apkPath) {
  console.log('\n--- Checking:', apkPath, '---');
  const badging = cp.execSync(`"${aapt}" dump badging "${apkPath}"`).toString();
  const pkgLine = badging.split('\n').find(l => l.startsWith('package:'));
  console.log(pkgLine);
  const targetSdk = badging.split('\n').find(l => l.startsWith('targetSdkVersion:'));
  console.log(targetSdk);

  try {
    const signOut = cp.execSync(`"${apksigner}" verify --verbose "${apkPath}"`).toString();
    const verified = signOut.split('\n').filter(l => l.includes('Verified using') || l.includes('Number of signers'));
    console.log('Signing status:\n' + verified.join('\n'));
  } catch (e) {
    console.log('Sign verify error:', e.message);
  }
}

checkApk(path.resolve('release/customer-app-release.apk'));
checkApk(path.resolve('release/driver-app-release.apk'));

function checkAab(aabPath) {
  console.log('\n--- Checking AAB:', aabPath, '---');
  const out = cp.execSync(`tar -tf "${aabPath}"`).toString();
  const lines = out.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  console.log('Total files in bundle:', lines.length);
  const keyFiles = lines.filter(l => l.includes('AndroidManifest.xml') || l.includes('META-INF') || l.includes('resources.pb'));
  console.log('Key files:', keyFiles.slice(0, 10));
}

checkAab(path.resolve('release/customer-app-release.aab'));
checkAab(path.resolve('release/driver-app-release.aab'));
