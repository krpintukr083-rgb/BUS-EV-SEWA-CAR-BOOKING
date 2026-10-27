const cp = require('child_process');
const fs = require('fs');
const path = require('path');

function verifyAab(name, relPath, expectedSha1, expectedSha256) {
  const filePath = path.resolve(relPath);
  console.log(`=== VERIFYING AAB: ${name} ===`);
  console.log(`Path: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error('ERROR: File does not exist!');
    return;
  }

  const stat = fs.statSync(filePath);
  console.log(`Size: ${stat.size} bytes (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);

  const hashRaw = cp.execSync(`certutil -hashfile "${filePath}" SHA256`).toString();
  const hash = hashRaw.split(/\r?\n/)[1].trim();
  console.log(`SHA-256 Checksum: ${hash}`);

  // jarsigner verify
  try {
    const jarOut = cp.execSync(`jarsigner -verify -verbose -certs "${filePath}"`, { encoding: 'utf8' });
    const isVerified = jarOut.includes('jar verified.');
    console.log(`Jarsigner Status: ${isVerified ? 'VERIFIED (jar verified.)' : 'NOT VERIFIED'}`);
  } catch (e) {
    console.log(`Jarsigner Error: ${e.message}`);
  }

  // keytool -printcert -jarfile
  try {
    const keytoolOut = cp.execSync(`keytool -printcert -jarfile "${filePath}"`, { encoding: 'utf8' });
    const sha1Match = keytoolOut.match(/SHA1:\s*([A-Fa-f0-9:]+)/);
    const sha256Match = keytoolOut.match(/SHA256:\s*([A-Fa-f0-9:]+)/);
    const ownerMatch = keytoolOut.match(/Owner:\s*([^\r\n]+)/);

    const actualSha1 = sha1Match ? sha1Match[1].toUpperCase() : 'N/A';
    const actualSha256 = sha256Match ? sha256Match[1].toUpperCase() : 'N/A';
    const owner = ownerMatch ? ownerMatch[1].trim() : 'N/A';

    console.log(`Certificate Owner: ${owner}`);
    console.log(`Certificate SHA-1:   ${actualSha1}`);
    console.log(`Expected SHA-1:      ${expectedSha1}`);
    console.log(`SHA-1 Match:         ${actualSha1 === expectedSha1.toUpperCase()}`);
    console.log(`Certificate SHA-256: ${actualSha256}`);
    console.log(`Expected SHA-256:    ${expectedSha256}`);
    console.log(`SHA-256 Match:       ${actualSha256 === expectedSha256.toUpperCase()}`);
  } catch (e) {
    console.log(`Keytool Error: ${e.message}`);
  }

  // Extract base/manifest/AndroidManifest.xml to check version and package
  try {
    const aaptDir = path.join(process.env.LOCALAPPDATA, 'Android', 'Sdk', 'build-tools');
    const versions = fs.readdirSync(aaptDir);
    const aapt = path.join(aaptDir, versions[versions.length - 1], 'aapt.exe');
    
    // aapt dump xmltree on aab is not direct, but we can inspect bundle entries via zip/tar
    const listing = cp.execSync(`tar -tf "${filePath}"`, { encoding: 'utf8' });
    const entries = listing.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    console.log(`Total bundle entries: ${entries.length}`);
    const hasManifest = entries.includes('base/manifest/AndroidManifest.xml');
    const hasResources = entries.includes('base/resources.pb');
    const hasDex = entries.some(e => e.includes('classes.dex'));
    console.log(`Contains AndroidManifest.xml: ${hasManifest}`);
    console.log(`Contains resources.pb:         ${hasResources}`);
    console.log(`Contains compiled dex:         ${hasDex}`);
  } catch (e) {
    console.log(`Bundle content check notice: ${e.message}`);
  }
}

verifyAab(
  'Customer App',
  'release/customer-app-release.aab',
  '46:DC:BD:1B:65:E0:A3:64:76:C5:02:97:20:98:AF:80:03:B0:99:8F',
  '2F:C2:82:92:76:F6:77:CB:8E:32:5E:BB:77:59:80:7B:00:85:BF:91:0C:14:1A:2D:BB:BD:B6:21:77:1B:7B:2C'
);

console.log('\n------------------------------------------------------------\n');

verifyAab(
  'Driver App',
  'release/driver-app-release.aab',
  'BB:68:23:2D:B7:D5:1E:05:EB:D4:1D:D0:07:CE:16:B7:E4:73:37:F9',
  '00:20:7C:12:98:22:6F:83:1C:F5:1D:81:91:A1:81:46:25:D8:A8:F0:8C:97:ED:7D:22:F7:FF:88:E9:6C:96:B7'
);
