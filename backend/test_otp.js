const { vehicleMatchesBookingRoute } = require('./src/utils/notification');

function test(name, vehicle, booking, expected) {
  const result = vehicleMatchesBookingRoute(vehicle, booking, { requireRouteMatch: true });
  console.log(`[${result === expected ? 'PASS' : 'FAIL'}] ${name} (Expected: ${expected}, Got: ${result})`);
}

test('Delhi -> Jaipur booking + Delhi -> Jaipur vehicle',
  { route: { origin: 'Delhi', destination: 'Jaipur' } },
  { from: 'Delhi', to: 'Jaipur' },
  true
);

test('Delhi -> Jaipur booking + Jaipur -> Delhi vehicle',
  { route: { origin: 'Jaipur', destination: 'Delhi' } },
  { from: 'Delhi', to: 'Jaipur' },
  false
);

test('Delhi -> Jaipur + case/whitespace differences',
  { route: { from: '  delhi ', to: 'JAIPUR ' } },
  { origin: 'Delhi', destination: 'jaipur' },
  true
);
