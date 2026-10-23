const fs = require('fs');
const content = fs.readFileSync('driver_window_dump.xml', 'utf8');
const nodeRegex = /<node\s+([^>]+)>/g;
let match;
while ((match = nodeRegex.exec(content)) !== null) {
  const attrs = match[1];
  const textM = attrs.match(/text="([^"]+)"/);
  const descM = attrs.match(/content-desc="([^"]+)"/);
  const boundsM = attrs.match(/bounds="([^"]+)"/);
  const text = textM ? textM[1] : (descM ? descM[1] : '');
  if (text) {
    console.log(`${text} => ${boundsM ? boundsM[1] : ''}`);
  }
}
