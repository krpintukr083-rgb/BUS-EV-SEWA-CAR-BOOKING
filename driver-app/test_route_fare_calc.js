// Test route calculation logic in isolation matching VehicleSubmissionScreen.js
function testRouteCalculation(routeStops, destinationFareFromOrigin, formFareRate) {
  const fullRouteFare = routeStops.length > 0
    ? Number(destinationFareFromOrigin) || 0
    : Number(formFareRate) || 0;

  const lastStopFare = routeStops.length > 0
    ? Number(routeStops[routeStops.length - 1]?.fareFromOrigin) || 0
    : 0;

  const hasRouteFareDecreaseError = routeStops.length > 0 &&
    destinationFareFromOrigin !== '' &&
    Number(destinationFareFromOrigin) > 0 &&
    lastStopFare > 0 &&
    Number(destinationFareFromOrigin) < lastStopFare;

  const cumulativeFares = [
    ...routeStops.map(stop => Number(stop.fareFromOrigin)),
    ...(routeStops.length ? [Number(destinationFareFromOrigin)] : [])
  ];

  let validationError = null;
  if (routeStops.length && cumulativeFares.some(value => !Number.isFinite(value) || value <= 0)) {
    validationError = 'Enter a positive customer fare from the origin for every stop and the destination.';
  } else {
    const invalidDecreasingIndex = cumulativeFares.findIndex((value, index) => index > 0 && value < cumulativeFares[index - 1]);
    if (invalidDecreasingIndex !== -1) {
      const prevFare = cumulativeFares[invalidDecreasingIndex - 1];
      const currentFare = cumulativeFares[invalidDecreasingIndex];
      validationError = `Fare (₹${currentFare}) cannot be less than the previous stop fare (₹${prevFare}). Customer fare from origin must not decrease along the route.`;
    }
  }

  // Payload computation matching submit()
  let fareRatePayload;
  let destinationFarePayload;
  if (routeStops.length > 0) {
    fareRatePayload = Number(destinationFareFromOrigin);
    destinationFarePayload = Number(destinationFareFromOrigin);
  } else {
    fareRatePayload = Number(formFareRate);
    destinationFarePayload = undefined;
  }

  return {
    fullRouteFare,
    hasRouteFareDecreaseError,
    validationError,
    fareRatePayload,
    destinationFarePayload
  };
}

// Case 1: Stop 1 ₹300, Stop 2 ₹600, Destination ₹900
const validCase = testRouteCalculation(
  [{ name: 'Stop 1', fareFromOrigin: '300' }, { name: 'Stop 2', fareFromOrigin: '600' }],
  '900',
  ''
);
console.log('Case 1 (Valid: 300, 600, 900):', validCase);
if (validCase.fullRouteFare !== 900) throw new Error('Case 1 fullRouteFare should be 900');
if (validCase.hasRouteFareDecreaseError !== false) throw new Error('Case 1 should not have error');
if (validCase.validationError !== null) throw new Error('Case 1 should not have validation error');
if (validCase.fareRatePayload !== 900) throw new Error('Case 1 fareRatePayload should be 900');

// Case 2: Stop 1 ₹300, Stop 2 ₹600, Destination ₹500 (Invalid decreasing fare)
const invalidCase = testRouteCalculation(
  [{ name: 'Stop 1', fareFromOrigin: '300' }, { name: 'Stop 2', fareFromOrigin: '600' }],
  '500',
  ''
);
console.log('Case 2 (Invalid: 300, 600, 500):', invalidCase);
if (invalidCase.hasRouteFareDecreaseError !== true) throw new Error('Case 2 should trigger hasRouteFareDecreaseError');
if (!invalidCase.validationError) throw new Error('Case 2 should trigger validationError');

// Case 3: No route stops, flat fare ₹450
const flatCase = testRouteCalculation(
  [],
  '',
  '450'
);
console.log('Case 3 (Flat fare no stops: 450):', flatCase);
if (flatCase.fullRouteFare !== 450) throw new Error('Case 3 fullRouteFare should be 450');
if (flatCase.fareRatePayload !== 450) throw new Error('Case 3 fareRatePayload should be 450');
if (flatCase.validationError !== null) throw new Error('Case 3 should not have validation error');

console.log('ALL UNIT TEST CASES PASSED!');
