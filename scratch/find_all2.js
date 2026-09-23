const fs = require('fs');
const text = fs.readFileSync('scratch/dumpsys2.txt', 'utf16le');
const lines = text.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('com.travelease.driver')) {
    console.log(lines[i].trim());
  }
}
