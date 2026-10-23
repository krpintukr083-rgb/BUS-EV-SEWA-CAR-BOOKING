const fs = require('fs');
const content = fs.readFileSync('stop2.xml', 'utf8');
const nodeRegex = /<node\s+([^>]+)>/g;
let match;
while ((match = nodeRegex.exec(content)) !== null) {
  const attrs = match[1];
  const textM = attrs.match(/text="([^"]*)"/);
  const hintM = attrs.match(/hint="([^"]*)"/);
  const boundsM = attrs.match(/bounds="([^"]*)"/);
  const classM = attrs.match(/class="([^"]*)"/);
  const text = textM ? textM[1] : '';
  const hint = hintM ? hintM[1] : '';
  const bounds = boundsM ? boundsM[1] : '';
  const cls = classM ? classM[1] : '';
  if (text || hint) {
    console.log(`text: "${text}" | hint: "${hint}" | class: ${cls} | bounds: ${bounds}`);
  }
}
