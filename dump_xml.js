const fs = require('fs');

const file = process.argv[2] || 'cust_bus_results.xml';
if (!fs.existsSync(file)) {
  console.log(`File not found: ${file}`);
  process.exit(1);
}

const xml = fs.readFileSync(file, 'utf8');
const regex = /<node\s+([^>]+)>/g;
let match;
while ((match = regex.exec(xml)) !== null) {
  const attrs = match[1];
  const textMatch = attrs.match(/text="([^"]*)"/);
  const descMatch = attrs.match(/content-desc="([^"]*)"/);
  const boundsMatch = attrs.match(/bounds="([^"]*)"/);
  
  const text = textMatch ? textMatch[1] : '';
  const desc = descMatch ? descMatch[1] : '';
  const bounds = boundsMatch ? boundsMatch[1] : '';
  
  if (text || desc) {
    console.log(`[text="${text}"] [desc="${desc}"] [bounds="${bounds}"]`);
  }
}
