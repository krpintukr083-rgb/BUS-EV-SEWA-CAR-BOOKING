const fs = require('fs');
const content = fs.readFileSync('origin_focused.xml', 'utf8');
const lines = content.split('><');
for (const line of lines) {
  if (line.includes('Submit for approval')) {
    console.log('TARGET:', line);
  }
}
