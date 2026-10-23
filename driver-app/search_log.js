const fs = require('fs');
const readline = require('readline');

async function searchLog() {
  const fileStream = fs.createReadStream('bus-seat-confirmation-crash.txt');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const matches = [];
  for await (const line of rl) {
    if (
      line.includes('FATAL') ||
      line.includes('AndroidRuntime') ||
      line.includes('ReactNativeJS') ||
      line.includes('Exception') ||
      line.includes('travelease') ||
      line.includes('ActivityTaskManager') ||
      line.includes('WindowManager')
    ) {
      matches.push(line);
      if (matches.length > 50) matches.shift();
    }
  }
  console.log(matches.join('\n'));
}

searchLog();
