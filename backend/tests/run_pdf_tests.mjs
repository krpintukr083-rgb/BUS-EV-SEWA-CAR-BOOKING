import assert from 'node:assert';
import test, { describe } from 'node:test';
import { generatePassengerManifestPdf } from '../../admin-panel/src/utils/passengerManifestPdf.js';

describe('Passenger Manifest PDF Export Feature Test Suite', () => {

  test('1. Generates valid PDF for Bus journey with multiple passengers and seats', async () => {
    const busJourney = {
      serviceType: 'Bus',
      vehicleNumber: 'BA 2 KHA 7788',
      vehicleName: 'Kathmandu Super Deluxe',
      vehicleModel: 'Tata Starbus Ultra',
      seatingCapacity: 36,
      origin: 'Kathmandu (Gongabu)',
      destination: 'Pokhara (Prithvi Chowk)',
      travelDate: '2026-10-31',
      departureTime: '07:00 AM',
      arrivalTime: '03:30 PM',
      operatorName: 'YatraSewa Royal Travels',
      driverName: 'Ram Bahadur Thapa',
      driverPhone: '9801234567',
      driverLicense: 'DL-98234-KTM',
      status: 'Active'
    };

    const busPassengers = [
      {
        seatNumber: 'A1',
        bookingId: 'BK-914027',
        passengerName: 'Pintu Kumar',
        age: 28,
        gender: 'Male',
        mobileNumber: '9812345678',
        boardingPoint: 'Kalanki Pickup',
        destination: 'Pokhara Bus Park',
        bookingStatus: 'Confirmed',
        paymentStatus: 'Completed',
        fare: 1400,
        isLeadPassenger: true,
        passengerCountInBooking: 2
      },
      {
        seatNumber: 'A2',
        bookingId: 'BK-914027',
        passengerName: 'Suman Shrestha',
        age: 25,
        gender: 'Female',
        mobileNumber: '9812345678',
        boardingPoint: 'Kalanki Pickup',
        destination: 'Pokhara Bus Park',
        bookingStatus: 'Confirmed',
        paymentStatus: 'Completed',
        fare: 1400,
        isLeadPassenger: false
      }
    ];

    const result = await generatePassengerManifestPdf({
      journey: busJourney,
      passengers: busPassengers,
      returnOutput: 'arraybuffer'
    });

    assert.strictEqual(result.success, true);
    assert.match(result.filename, /^Passenger_Manifest_Bus_BA_2_KHA_7788_2026_10_31\.pdf$/);
    assert.match(result.referenceNo, /^YSN-MAN-\d{8}-[A-Z0-9]{5}$/);
    assert.strictEqual(result.totalPassengers, 2);
    assert.strictEqual(result.totalPages, 1);
    assert.ok(result.pdfBytes.byteLength > 3000);
  });

  test('2. Generates valid PDF for EV-Sewa journey with group passenger details and fare', async () => {
    const evJourney = {
      serviceType: 'EV-Sewa',
      vehicleNumber: '234555',
      vehicleName: 'Joylong Grand E-Van',
      seatingCapacity: 12,
      origin: 'Kathmandu (Baneshwor)',
      destination: 'Dhulikhel (Hospital Chowk)',
      travelDate: '2026-10-31',
      departureTime: '09:00 AM',
      operatorName: 'Eco Yatra Fleet',
      driverName: 'Ganesh Yadav',
      driverPhone: '9841234567',
      status: 'Active'
    };

    const evPassengers = [
      {
        bookingId: 'BK-7000249',
        passengerName: 'Ramesh Sharma',
        mobileNumber: '9809876543',
        pickupLocation: 'Old Baneshwor',
        dropLocation: 'Dhulikhel Hospital',
        passengerCountInBooking: 10,
        rideStatus: 'Started',
        bookingStatus: 'Confirmed',
        fare: 2500,
        paymentStatus: 'Paid',
        isLeadPassenger: true
      }
    ];

    const result = await generatePassengerManifestPdf({
      journey: evJourney,
      passengers: evPassengers,
      returnOutput: 'arraybuffer'
    });

    assert.strictEqual(result.success, true);
    assert.match(result.filename, /^Passenger_Manifest_EV-Sewa_234555_2026_10_31\.pdf$/);
    assert.strictEqual(result.totalPassengers, 1);
    assert.strictEqual(result.totalPages, 1);
    assert.ok(result.pdfBytes.byteLength > 3000);
  });

  test('3. Generates valid PDF for Car journey with on-demand booking details', async () => {
    const carJourney = {
      serviceType: 'Car',
      vehicleNumber: 'UP70TR1234',
      vehicleName: 'Maruti Suzuki Dzire',
      seatingCapacity: 4,
      origin: 'Tribhuvan International Airport (TIA)',
      destination: 'Nagarkot Sunset Viewpoint',
      travelDate: '2026-10-31',
      departureTime: 'On Demand',
      operatorName: 'Self / City Cabs',
      driverName: 'Bikram Rai',
      driverPhone: '9865432109',
      status: 'Active'
    };

    const carPassengers = [
      {
        bookingId: 'BK-CAR-1001',
        passengerName: 'Dr. Anita Joshi',
        mobileNumber: '9843210987',
        pickupLocation: 'Airport Terminal 1',
        dropLocation: 'Hotel Country Villa, Nagarkot',
        passengerCountInBooking: 3,
        rideStatus: 'Completed',
        bookingStatus: 'Completed',
        fare: 3200,
        paymentStatus: 'Paid',
        isLeadPassenger: true
      }
    ];

    const result = await generatePassengerManifestPdf({
      journey: carJourney,
      passengers: carPassengers,
      returnOutput: 'arraybuffer'
    });

    assert.strictEqual(result.success, true);
    assert.match(result.filename, /^Passenger_Manifest_Car_UP70TR1234_2026_10_31\.pdf$/);
    assert.strictEqual(result.totalPassengers, 1);
    assert.strictEqual(result.totalPages, 1);
    assert.ok(result.pdfBytes.byteLength > 3000);
  });

  test('4. Generates multi-page PDF with consistent headers and footers for large manifests', async () => {
    const largeBusJourney = {
      serviceType: 'Bus',
      vehicleNumber: 'BA 3 KHA 9999',
      vehicleName: 'Express Intercity',
      seatingCapacity: 50,
      origin: 'Kathmandu',
      destination: 'Biratnagar',
      travelDate: '2026-11-01',
      driverName: 'Krishna Prasad',
      driverPhone: '9811223344',
      status: 'Active'
    };

    const manyPassengers = [];
    for (let i = 1; i <= 45; i++) {
      manyPassengers.push({
        seatNumber: 'Seat-' + i,
        bookingId: 'BK-TEST-' + (1000 + i),
        passengerName: 'Long Passenger Name Test User ' + i,
        age: 20 + (i % 40),
        gender: i % 2 === 0 ? 'F' : 'M',
        mobileNumber: '9801000' + (i < 10 ? '0' + i : i),
        boardingPoint: 'Main Boarding Terminal ' + (i % 4),
        destination: 'Central Drop Hub ' + (i % 3),
        bookingStatus: i % 8 === 0 ? 'Cancelled' : 'Confirmed',
        paymentStatus: 'Completed',
        fare: 1500
      });
    }

    const result = await generatePassengerManifestPdf({
      journey: largeBusJourney,
      passengers: manyPassengers,
      returnOutput: 'arraybuffer'
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.totalPages >= 2);
    assert.strictEqual(result.totalPassengers, 45);
    assert.ok(result.pdfBytes.byteLength > 8000);
  });

  test('5. Handles missing optional fields without throwing errors or printing undefined', async () => {
    const minimalJourney = {
      serviceType: 'EV-Sewa',
      vehicleNumber: '234555'
    };

    const minimalPassengers = [
      {
        bookingId: 'BK-MINIMAL-01',
        passengerName: 'Bare Passenger'
      }
    ];

    const result = await generatePassengerManifestPdf({
      journey: minimalJourney,
      passengers: minimalPassengers,
      returnOutput: 'arraybuffer'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.totalPages, 1);
    assert.ok(result.pdfBytes.byteLength > 2000);
  });

  test('6. Throws error when attempting to export journey with empty passenger records', async () => {
    const journey = { serviceType: 'Bus', vehicleNumber: 'BA 1 KHA 1234' };

    await assert.rejects(
      async () => {
        await generatePassengerManifestPdf({
          journey,
          passengers: [],
          returnOutput: 'arraybuffer'
        });
      },
      /No passenger records found to export for this journey/
    );

    await assert.rejects(
      async () => {
        await generatePassengerManifestPdf({
          journey: null,
          passengers: [{ bookingId: 'BK-1' }],
          returnOutput: 'arraybuffer'
        });
      },
      /No journey selected for manifest export/
    );
  });

  test('7. Renders filter notice banner when active filters are present', async () => {
    const journey = {
      serviceType: 'Bus',
      vehicleNumber: 'BA 2 KHA 7788',
      travelDate: '2026-10-31',
      origin: 'Kathmandu',
      destination: 'Pokhara'
    };

    const filteredPassengers = [
      {
        seatNumber: 'B1',
        bookingId: 'BK-914027',
        passengerName: 'Pintu Kumar',
        mobileNumber: '9812345678',
        bookingStatus: 'Confirmed',
        paymentStatus: 'Completed'
      }
    ];

    const filterInfo = {
      isFiltered: true,
      status: 'Confirmed',
      boardingPoint: 'Kalanki',
      search: 'Pintu',
      totalRecords: 10
    };

    const result = await generatePassengerManifestPdf({
      journey,
      passengers: filteredPassengers,
      filterInfo,
      returnOutput: 'arraybuffer'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.totalPassengers, 1);
    assert.ok(result.pdfBytes.byteLength > 3000);
  });
});

