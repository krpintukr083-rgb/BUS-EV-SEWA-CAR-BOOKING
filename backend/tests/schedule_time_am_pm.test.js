const { normalizeScheduleTime, validateScheduleTime } = require('../src/utils/timeFormat');

describe('Schedule Time AM/PM Regression Tests', () => {
  test('Test 1: 06:00 AM → 11:30 AM', () => {
    expect(validateScheduleTime('06:00 AM')).toBe(true);
    expect(validateScheduleTime('11:30 AM')).toBe(true);
    expect(normalizeScheduleTime('06:00 AM')).toBe('06:00 AM');
    expect(normalizeScheduleTime('11:30 AM')).toBe('11:30 AM');
  });

  test('Test 2: 06:00 PM → 11:00 PM (Must NEVER become 06:00 AM → 11:00 AM)', () => {
    expect(validateScheduleTime('06:00 PM')).toBe(true);
    expect(validateScheduleTime('11:00 PM')).toBe(true);
    expect(normalizeScheduleTime('06:00 PM')).toBe('06:00 PM');
    expect(normalizeScheduleTime('11:00 PM')).toBe('11:00 PM');
    expect(normalizeScheduleTime('06:00 PM')).not.toBe('06:00 AM');
    expect(normalizeScheduleTime('11:00 PM')).not.toBe('11:00 AM');
  });

  test('Test 3: 12:00 AM → 01:00 AM (Midnight handling)', () => {
    expect(validateScheduleTime('12:00 AM')).toBe(true);
    expect(validateScheduleTime('01:00 AM')).toBe(true);
    expect(normalizeScheduleTime('12:00 AM')).toBe('12:00 AM');
    expect(normalizeScheduleTime('01:00 AM')).toBe('01:00 AM');
  });

  test('Test 4: 12:00 PM → 01:00 PM (Noon handling)', () => {
    expect(validateScheduleTime('12:00 PM')).toBe(true);
    expect(validateScheduleTime('01:00 PM')).toBe(true);
    expect(normalizeScheduleTime('12:00 PM')).toBe('12:00 PM');
    expect(normalizeScheduleTime('01:00 PM')).toBe('01:00 PM');
  });

  test('Test 5: 05:30 PM → 10:45 PM', () => {
    expect(validateScheduleTime('05:30 PM')).toBe(true);
    expect(validateScheduleTime('10:45 PM')).toBe(true);
    expect(normalizeScheduleTime('05:30 PM')).toBe('05:30 PM');
    expect(normalizeScheduleTime('10:45 PM')).toBe('10:45 PM');
  });

  test('Edge Case: 24-hour inputs (18:00 -> 06:00 PM, 23:00 -> 11:00 PM)', () => {
    expect(normalizeScheduleTime('18:00')).toBe('06:00 PM');
    expect(normalizeScheduleTime('23:00')).toBe('11:00 PM');
    expect(normalizeScheduleTime('00:00')).toBe('12:00 AM');
    expect(normalizeScheduleTime('12:00')).toBe('12:00 PM');
  });

  test('Edge Case: Single-digit hour and case insensitivity', () => {
    expect(normalizeScheduleTime('6:00 pm')).toBe('06:00 PM');
    expect(normalizeScheduleTime('6:00 am')).toBe('06:00 AM');
    expect(normalizeScheduleTime('06:00pm')).toBe('06:00 PM');
    expect(normalizeScheduleTime('11:00pm')).toBe('11:00 PM');
  });
});
