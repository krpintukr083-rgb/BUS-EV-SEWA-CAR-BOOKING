const fs = require('fs');
const content = fs.readFileSync('stop2_fares.xml', 'utf8');
const nodeRegex = /<node\s+([^>]+)>/g;
let match;
while ((match = nodeRegex.exec(content)) !== null) {
  const attrs = match[1];
  const textM = attrs.match(/text="([^"]*)"/);
  const hintM = attrs.match(/hint="([^"]*)"/);
  const text = textM ? textM[1] : '';
  const hint = hintM ? hintM[1] : '';
  if (text.includes('Fare') || text.includes('Stop') || text.includes('Destination') || hint.includes('Fare')) {
    console.log(`text: "${text}" | hint: "${hint}"`);
  }
}
