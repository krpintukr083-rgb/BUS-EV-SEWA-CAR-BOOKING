const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const pickupDropScreenPath = path.resolve(__dirname, '../src/screens/booking/PickupDropScreen.jsx');
const content = fs.readFileSync(pickupDropScreenPath, 'utf8');

test('PickupDropScreen - uses keyboardShouldPersistTaps="handled" on ScrollView', () => {
  assert.ok(
    content.includes('keyboardShouldPersistTaps="handled"'),
    'ScrollView must have keyboardShouldPersistTaps="handled"'
  );
});

test('PickupDropScreen - uses dynamic bottom padding with minimum of at least 260px when keyboard is open', () => {
  assert.ok(
    /paddingBottom:\s*isKeyboardOpen\s*\?\s*Math\.max\(keyboardHeight,\s*260\)\s*:\s*24/.test(content),
    'ScrollView contentContainerStyle must dynamically expand paddingBottom to Math.max(keyboardHeight, 260)'
  );
});

test('PickupDropScreen - renders in-scroll Continue button when keyboard is open', () => {
  assert.ok(
    content.includes('{isKeyboardOpen && (') &&
    content.includes('styles.inScrollCta') &&
    content.includes('title="Continue"'),
    'An in-scroll Continue button must be rendered when isKeyboardOpen is true'
  );
});

test('PickupDropScreen - preserves pinned footer with safe-area spacing when keyboard is closed', () => {
  assert.ok(
    /paddingBottom:\s*isKeyboardOpen\s*\?\s*12\s*:\s*Math\.max\(insets\.bottom,\s*14\)/.test(content),
    'Pinned footer must use Math.max(insets.bottom, 14) when keyboard is closed'
  );
});

test('PickupDropScreen - avoids Android double-resizing on KeyboardAvoidingView', () => {
  assert.ok(
    /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/.test(content),
    'KeyboardAvoidingView behavior must be undefined on Android to respect resize mode'
  );
});

test('PickupDropScreen - provides handleSwapLocations to swap pickup and drop locations', () => {
  assert.ok(
    content.includes('const handleSwapLocations = () => {') &&
    content.includes('setPickup(drop)') &&
    content.includes('setDrop(pickup)'),
    'handleSwapLocations must swap pickup and drop state values'
  );
});

test('PickupDropScreen - wires onFocus scroll handlers for pickup and drop inputs', () => {
  assert.ok(
    content.includes("performScroll('pickup')"),
    'Pickup input must trigger performScroll on focus'
  );
  assert.ok(
    content.includes("performScroll('drop')"),
    'Drop input must trigger performScroll on focus'
  );
});

test('PickupDropScreen - re-scrolls focused input when keyboardDidShow fires', () => {
  assert.ok(
    content.includes('lastFocusedFieldRef.current') &&
    content.includes('performScroll(lastFocusedFieldRef.current)'),
    'Keyboard onShow listener must re-scroll the focused field into view after keyboard finishes animating'
  );
});
