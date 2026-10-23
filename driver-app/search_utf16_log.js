const fs = require('fs');

const content = fs.readFileSync('bus-seat-confirmation-crash.txt', 'utf16le');
const lines = content.split(/\r?\n/);
console.log('Total lines in log:', lines.length);

const matched = lines.filter(l =>
  l.includes('FATAL') ||
  l.includes('AndroidRuntime') ||
  l.includes('ReactNativeJS') ||
  l.includes('Exception') ||
  l.includes('travelease') ||
  l.includes('ActivityTaskManager') ||
  l.includes('WindowManager') ||
  l.includes('START u0') ||
  l.includes('ActivityRecord')
);

console.log('Matched lines:', matched.length);
console.log(matched.slice(-40).join('\n'));
