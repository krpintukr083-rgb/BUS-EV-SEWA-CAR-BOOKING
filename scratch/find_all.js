const fs = require('fs');
const lines = fs.readFileSync('scratch/dumpsys.txt', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('com.travelease.driver')) {
    console.log(`[L${i}] ${lines[i].trim()}`);
  }
}
