const fs = require('fs');

const content = fs.readFileSync('bus-seat-confirmation-crash.txt', 'utf16le');
const lines = content.split(/\r?\n/);

const crashIndex = lines.findIndex(l => l.includes('FATAL EXCEPTION'));
if (crashIndex !== -1) {
  console.log('--- FOUND FATAL EXCEPTION ---');
  console.log(lines.slice(Math.max(0, crashIndex - 10), crashIndex + 50).join('\n'));
} else {
  console.log('No FATAL EXCEPTION line found directly, searching E/AndroidRuntime:');
  const arLines = lines.filter(l => l.includes('AndroidRuntime'));
  console.log(arLines.slice(0, 50).join('\n'));
}
