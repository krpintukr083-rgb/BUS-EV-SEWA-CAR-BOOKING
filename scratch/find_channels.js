const fs = require('fs');
const lines = fs.readFileSync('scratch/dumpsys.txt', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('com.travelease.driver') && lines[i].includes('Channel{')) {
    console.log(lines[i].trim());
  }
}
