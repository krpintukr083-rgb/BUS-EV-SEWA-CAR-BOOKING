// Unit test verifying automatic full route fare calculation
function calculateRouteFares(routeStops, destinationFareFromOrigin, formFareRate) {
  const lastStopFare = routeStops.length > 0
    ? Number(routeStops[routeStops.length - 1]?.fareFromOrigin) || 0
    : 0;

  const effectiveDestinationFare = destinationFareFromOrigin !== '' && !isNaN(Number(destinationFareFromOrigin))
    ? Number(destinationFareFromOrigin)
    : (routeStops.length > 0
      ? (routeStops.length === 1
        ? Number(routeStops[0]?.fareFromOrigin) || 0
        : routeStops.reduce((sum, s) => sum + (Number(s?.fareFromOrigin) || 0), 0))
      : 0);

  const fullRouteFare = routeStops.length > 0
    ? effectiveDestinationFare
    : (Number(formFareRate) || 0);

  const hasRouteFareDecreaseError = routeStops.length > 0 &&
    destinationFareFromOrigin !== '' &&
    Number(destinationFareFromOrigin) > 0 &&
    lastStopFare > 0 &&
    Number(destinationFareFromOrigin) < lastStopFare;

  // Payload computation
  let fareRatePayload;
  let destinationFarePayload;
  if (routeStops.length > 0) {
    fareRatePayload = effectiveDestinationFare;
    destinationFarePayload = effectiveDestinationFare;
  } else {
    fareRatePayload = Number(formFareRate);
    destinationFarePayload = undefined;
  }

  return {
    effectiveDestinationFare,
    fullRouteFare,
    hasRouteFareDecreaseError,
    fareRatePayload,
    destinationFarePayload
  };
}

console.log('--- TEST 1: Auto-calculated full route fare (Stop 1: 300, Stop 2: 600) ---');
const test1 = calculateRouteFares(
  [{ name: 'Stop 1', fareFromOrigin: '300' }, { name: 'Stop 2', fareFromOrigin: '600' }],
  '', // No manual destination fare entered
  ''
);
console.log('Result:', test1);
if (test1.effectiveDestinationFare !== 900) throw new Error('Test 1 failed: expected 900');
if (test1.fullRouteFare !== 900) throw new Error('Test 1 failed: expected fullRouteFare 900');
if (test1.fareRatePayload !== 900) throw new Error('Test 1 failed: expected payload 900');

console.log('--- TEST 2: Add a stop (Stop 1: 300, Stop 2: 600, Stop 3: 250) ---');
const test2 = calculateRouteFares(
  [{ name: 'Stop 1', fareFromOrigin: '300' }, { name: 'Stop 2', fareFromOrigin: '600' }, { name: 'Stop 3', fareFromOrigin: '250' }],
  '',
  ''
);
console.log('Result:', test2);
if (test2.fullRouteFare !== 1150) throw new Error('Test 2 failed: expected 1150');

console.log('--- TEST 3: Remove a stop (Stop 1: 300 only) ---');
const test3 = calculateRouteFares(
  [{ name: 'Stop 1', fareFromOrigin: '300' }],
  '',
  ''
);
console.log('Result:', test3);
if (test3.fullRouteFare !== 300) throw new Error('Test 3 failed: expected 300');

console.log('--- TEST 4: Edit fare immediately updates total ---');
const test4 = calculateRouteFares(
  [{ name: 'Stop 1', fareFromOrigin: '400' }, { name: 'Stop 2', fareFromOrigin: '500' }],
  '',
  ''
);
console.log('Result:', test4);
if (test4.fullRouteFare !== 900) throw new Error('Test 4 failed: expected 900');

console.log('--- TEST 5: Manual override destination fare (Destination: 1000) ---');
const test5 = calculateRouteFares(
  [{ name: 'Stop 1', fareFromOrigin: '300' }, { name: 'Stop 2', fareFromOrigin: '600' }],
  '1000',
  ''
);
console.log('Result:', test5);
if (test5.fullRouteFare !== 1000) throw new Error('Test 5 failed: expected 1000');
if (test5.hasRouteFareDecreaseError !== false) throw new Error('Test 5 failed: no error expected');

console.log('--- TEST 6: Invalid decreasing manual destination fare (Destination: 500 < 600) ---');
const test6 = calculateRouteFares(
  [{ name: 'Stop 1', fareFromOrigin: '300' }, { name: 'Stop 2', fareFromOrigin: '600' }],
  '500',
  ''
);
console.log('Result:', test6);
if (test6.hasRouteFareDecreaseError !== true) throw new Error('Test 6 failed: error expected');

console.log('--- TEST 7: Single full-route fare without stops ---');
const test7 = calculateRouteFares(
  [],
  '',
  '450'
);
console.log('Result:', test7);
if (test7.fullRouteFare !== 450) throw new Error('Test 7 failed: expected 450');
if (test7.fareRatePayload !== 450) throw new Error('Test 7 failed: expected payload 450');

console.log('ALL AUTO-CALCULATION TESTS PASSED SUCCESSFULLY!');
