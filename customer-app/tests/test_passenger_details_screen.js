const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('PassengerDetailsScreen.jsx imports required keyboard and layout components', () => {
  const filePath = path.join(__dirname, '../src/screens/booking/PassengerDetailsScreen.jsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.match(content, /import\s+{[^}]*KeyboardAvoidingView[^}]*}\s+from\s+['"]react-native['"]/);
  assert.match(content, /import\s+{[^}]*ScrollView[^}]*}\s+from\s+['"]react-native['"]/);
  assert.match(content, /import\s+{[^}]*Keyboard[^}]*}\s+from\s+['"]react-native['"]/);
  assert.match(content, /import\s+{[^}]*useSafeAreaInsets[^}]*}\s+from\s+['"]react-native-safe-area-context['"]/);
});

test('Footer is in-flow flex layout (NOT absolute) and docked above keyboard & navigation bar', () => {
  const filePath = path.join(__dirname, '../src/screens/booking/PassengerDetailsScreen.jsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Must not have position: 'absolute' in footer styles
  assert.ok(!content.includes("position: 'absolute'"), 'Footer must not use position: absolute');

  // Footer must respect safe area when keyboard is closed and shrink when open
  assert.match(content, /paddingBottom:\s*isKeyboardOpen\s*\?\s*12\s*:\s*Math\.max\(bottomInset,\s*14\)/);

  // ScrollView has flex: 1 and clean paddingBottom
  assert.match(content, /scrollView:\s*{\s*flex:\s*1\s*}/);
  assert.match(content, /scrollContent:\s*{\s*padding:\s*16,\s*paddingBottom:\s*24\s*}/);
});

test('Input fields auto-scroll into view on focus', () => {
  const filePath = path.join(__dirname, '../src/screens/booking/PassengerDetailsScreen.jsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // onLayout on passenger card
  assert.match(content, /onLayout=\{\(e\)\s*=>\s*handleCardLayout\(index,\s*e\)\}/);

  // onFocus scrollToInput for Name, Mobile Number, Age
  assert.match(content, /onFocus=\{\(\)\s*=>\s*scrollToInput\(index,\s*0\)\}/);
  assert.match(content, /onFocus=\{\(\)\s*=>\s*scrollToInput\(index,\s*72\)\}/);
  assert.match(content, /onFocus=\{\(\)\s*=>\s*scrollToInput\(index,\s*144\)\}/);
});

test('Input.jsx forwards onFocus, onBlur, error, and rest props to TextInput', () => {
  const filePath = path.join(__dirname, '../src/components/Input.jsx');
  const content = fs.readFileSync(filePath, 'utf8');

  assert.match(content, /onFocus={onFocus}/);
  assert.match(content, /onBlur={onBlur}/);
  assert.match(content, /error\s*\?\s*styles\.inputError/);
  assert.match(content, /{error\s*\?\s*<Text style={styles\.errorText}>{error}<\/Text>\s*:\s*null}/);
});

test('Android soft keyboard resize mode is configured in app.json and AndroidManifest.xml', () => {
  const appJsonPath = path.join(__dirname, '../app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  assert.equal(appJson.expo.android.softwareKeyboardLayoutMode, 'resize');

  const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');
  const manifest = fs.readFileSync(manifestPath, 'utf8');
  assert.match(manifest, /android:windowSoftInputMode="adjustResize"/);
});

test('Passenger state update handler is immutable and prevents cross-field concatenation', () => {
  const filePath = path.join(__dirname, '../src/screens/booking/PassengerDetailsScreen.jsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // Must use functional update on setPassengers with deep copy per item
  assert.match(content, /setPassengers\(\s*prev\s*=>\s*prev\.map\(/);
  assert.match(content, /idx\s*===\s*index\s*\?\s*{\s*\.\.\.p,\s*\[field\]:\s*value\s*}\s*:\s*p/);

  // buildPassengers must deep-copy items
  assert.match(content, /existing\.map\(\s*\(p,\s*idx\)\s*=>\s*\(\{/);

  // Each Input has its own isolated value prop
  assert.match(content, /value={p\.name}/);
  assert.match(content, /value={p\.phone}/);
  assert.match(content, /value={p\.age\s*\?\s*String\(p\.age\)\s*:\s*''}/);
});

test('In-scroll Continue button is present when keyboard is open and footer restores when closed', () => {
  const filePath = path.join(__dirname, '../src/screens/booking/PassengerDetailsScreen.jsx');
  const content = fs.readFileSync(filePath, 'utf8');

  // In-scroll CTA rendered conditionally when keyboard is open
  assert.match(content, /{isKeyboardOpen\s*&&\s*\(\s*<View style={styles\.inScrollCta}>/);

  // Dynamic bottom padding on ScrollView
  assert.match(content, /paddingBottom:\s*isKeyboardOpen\s*\?\s*Math\.max\(keyboardHeight,\s*260\)\s*:\s*24/);
});

test('Customer app compiles successfully on localhost:8081 via Metro', async () => {
  const res = await fetch('http://localhost:8081');
  assert.equal(res.status, 200);

  const bundleRes = await fetch('http://localhost:8081/index.bundle?platform=web&dev=true&hot=false');
  assert.equal(bundleRes.status, 200);
  const code = await bundleRes.text();
  assert.ok(code.length > 50000, 'Bundle should be complete JS code');
  assert.ok(!code.startsWith('{"type":"TransformError"'), 'Bundle must not have transform errors');
});

