const fs = require('fs');
const file = process.argv[2] || 'otp_screen.xml';
if (!fs.existsSync(file)) {
  console.log('File not found:', file);
  process.exit(1);
}
const s = fs.readFileSync(file, 'utf8');
const parts = s.split('<node ');
for (const p of parts) {
  const tm = p.match(/text="([^"]*)"/);
  const bm = p.match(/bounds="([^"]*)"/);
  const cm = p.match(/class="([^"]*)"/);
  if (tm && tm[1]) {
    console.log(`${tm[1]} [${cm ? cm[1] : ''}] : ${bm ? bm[1] : ''}`);
  } else if (p.includes('class="android.widget.EditText"')) {
    console.log(`[EDITTEXT] : ${bm ? bm[1] : ''}`);
  }
}
