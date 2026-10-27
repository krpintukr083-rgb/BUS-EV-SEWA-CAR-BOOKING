const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('BookingRequestsScreen has KeyboardAvoidingView and safe area imports', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../src/screens/booking/BookingRequestsScreen.js'), 'utf8');

  // Verify necessary imports
  assert.match(fileContent, /import\s+{[^}]*KeyboardAvoidingView[^}]*}\s+from\s+['"]react-native['"]/);
  assert.match(fileContent, /import\s+{[^}]*ScrollView[^}]*}\s+from\s+['"]react-native['"]/);
  assert.match(fileContent, /import\s+{[^}]*useSafeAreaInsets[^}]*}\s+from\s+['"]react-native-safe-area-context['"]/);
  assert.match(fileContent, /import\s+{[^}]*useWindowDimensions[^}]*}\s+from\s+['"]react-native['"]/);
});

test('Rejection reasons list and default state are preserved', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../src/screens/booking/BookingRequestsScreen.js'), 'utf8');

  // Verify REJECTION_REASONS contains all 5 items
  const expectedReasons = [
    'Customer did not arrive',
    'Wrong pickup location / route',
    'Vehicle mechanical problem',
    'Emergency / Breakdown',
    'Other personal reason'
  ];

  for (const reason of expectedReasons) {
    assert.ok(fileContent.includes(reason), `Missing reason: ${reason}`);
  }

  // Verify default reason is first item
  assert.match(fileContent, /setSelectedReason\(REJECTION_REASONS\[0\]\)/);
});

test('Modal structure includes KeyboardAvoidingView, ScrollView and pinned footer', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../src/screens/booking/BookingRequestsScreen.js'), 'utf8');

  // Modal has statusBarTranslucent
  assert.match(fileContent, /<Modal[^>]*statusBarTranslucent/);

  // KeyboardAvoidingView wraps the overlay
  assert.match(fileContent, /<KeyboardAvoidingView[^>]*behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);

  // Backdrop dismissal touchable
  assert.match(fileContent, /<TouchableWithoutFeedback[^>]*onPress=\{closeRejectModal\}/);

  // ScrollView wraps reasons
  assert.match(fileContent, /<ScrollView[^>]*ref=\{scrollRef\}[^>]*style=\{styles\.modalScrollBody\}/);

  // Confirm Rejection button is in modalFooter outside ScrollView
  assert.match(fileContent, /<View[^>]*style=\{[^}]*styles\.modalFooter/);
  assert.match(fileContent, /<Text style=\{styles\.confirmRejectText\}>Confirm Rejection<\/Text>/);
});

test('Safe area insets and maxHeight are dynamically applied to avoid cutoffs', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../src/screens/booking/BookingRequestsScreen.js'), 'utf8');

  // Safe area padding adapts for bottom navigation bar and active keyboard
  assert.match(fileContent, /paddingBottom:\s*isWeb\s*\?\s*SPACING\.md\s*:\s*keyboardVisible\s*\?\s*SPACING\.md\s*:\s*Math\.max\(insets\.bottom,\s*SPACING\.md\)/);

  // Responsive maxHeight calculation respecting top safe areas and active keyboard
  assert.match(fileContent, /maxHeight:\s*isWeb/);
  assert.match(fileContent, /Math\.max\(260,\s*windowHeight\s*-\s*\(keyboardVisible\s*&&\s*keyboardHeight/);
});

test('Keyboard is dismissed when selecting standard reasons without text inputs', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../src/screens/booking/BookingRequestsScreen.js'), 'utf8');

  // Prompt reject dismisses keyboard
  assert.match(fileContent, /promptReject\s*=\s*\([^)]*\)\s*=>\s*{\s*Keyboard\.dismiss\(\)/);

  // Standard reason tap dismisses keyboard
  assert.match(fileContent, /if\s*\(reason\s*!==\s*'Other personal reason'\)\s*{\s*Keyboard\.dismiss\(\);/);
});

test('Styles support responsive web dialog (centered, max-width) and mobile bottom sheet', () => {
  const fileContent = fs.readFileSync(path.join(__dirname, '../src/screens/booking/BookingRequestsScreen.js'), 'utf8');

  // Overlay centered on web, flex-end on mobile
  assert.match(fileContent, /justifyContent:\s*Platform\.OS === 'web' \? 'center' : 'flex-end'/);

  // Card maxWidth and border radius for web vs mobile
  assert.match(fileContent, /maxWidth:\s*480/);
  assert.match(fileContent, /borderBottomLeftRadius:\s*Platform\.OS === 'web' \? 24 : 0/);
  assert.match(fileContent, /borderBottomRightRadius:\s*Platform\.OS === 'web' \? 24 : 0/);
});

test('Metro Web Bundler compiles successfully on localhost:8082', async () => {
  const res = await fetch('http://localhost:8082');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.ok(html.length > 100, 'HTML returned should not be empty');

  // Verify the bundled JavaScript compiles without error
  const bundleRes = await fetch('http://localhost:8082/index.bundle?platform=web&dev=true&hot=false');
  assert.equal(bundleRes.status, 200);
  const bundleCode = await bundleRes.text();
  assert.ok(bundleCode.length > 1000, 'Bundle should have code');
  assert.ok(!bundleCode.includes('Unable to resolve module'), 'No module resolution errors');
});
