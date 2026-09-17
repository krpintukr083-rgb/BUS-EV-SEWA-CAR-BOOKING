require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const Cancellation = require('../models/Cancellation');
const Compensation = require('../models/Compensation');
const Insurance = require('../models/Insurance');
const Notification = require('../models/Notification');
const Support = require('../models/Support');
const Policy = require('../models/Policy');
const ServiceControl = require('../models/ServiceControl');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/transport_booking_db';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected for seeding...');

    // Clear existing collections
    await User.deleteMany();
    await Driver.deleteMany();
    await Vehicle.deleteMany();
    await Booking.deleteMany();
    await Payment.deleteMany();
    await Cancellation.deleteMany();
    await Compensation.deleteMany();
    await Insurance.deleteMany();
    await Notification.deleteMany();
    await Support.deleteMany();
    await Policy.deleteMany();
    await ServiceControl.deleteMany();

    console.log('Cleared existing collections.');

    // 1. Create Super Admin User
    const adminUser = await User.create({
      name: 'Super Admin Official',
      email: 'admin@platform.com',
      phone: '+919999900001',
      password: 'admin123',
      role: 'admin',
      status: 'Active'
    });

    // 2. Create Driver Users
    const driverUser1 = await User.create({
      name: 'Rajesh Sharma',
      email: 'driver@platform.com',
      phone: '+919876543210',
      password: 'driver123',
      role: 'driver',
      status: 'Active',
      profilePhoto: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80'
    });

    const driverUser2 = await User.create({
      name: 'Suresh Verma',
      email: 'suresh.driver@platform.com',
      phone: '+919811223344',
      password: 'driver123',
      role: 'driver',
      status: 'Active',
      profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80'
    });

    const driverUser3 = await User.create({
      name: 'Manoj Kumar',
      email: 'manoj.driver@platform.com',
      phone: '+919822334455',
      password: 'driver123',
      role: 'driver',
      status: 'Inactive',
      profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80'
    });

    const driverUser4 = await User.create({
      name: 'Amit Yadav',
      email: 'amit.driver@platform.com',
      phone: '+919833445566',
      password: 'driver123',
      role: 'driver',
      status: 'Blocked',
      profilePhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80'
    });

    // 3. Create Customers
    const testCustomer = await User.create({
      name: 'Test Customer',
      email: 'customer@test.com',
      phone: '+919800000001',
      password: 'password123',
      role: 'customer',
      status: 'Active'
    });

    const customer1 = await User.create({
      name: 'Priya Nair',
      email: 'priya.nair@example.com',
      phone: '+919844556677',
      password: 'user123',
      role: 'customer',
      status: 'Active'
    });

    const customer2 = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul.s@example.com',
      phone: '+919855667788',
      password: 'user123',
      role: 'customer',
      status: 'Active'
    });

    const customer3 = await User.create({
      name: 'Vikram Malhotra',
      email: 'vikram.m@example.com',
      phone: '+919866778899',
      password: 'user123',
      role: 'customer',
      status: 'Active'
    });

    const customer4 = await User.create({
      name: 'Ananya Desai',
      email: 'ananya.d@example.com',
      phone: '+919877889900',
      password: 'user123',
      role: 'customer',
      status: 'Active'
    });

    // 4. Create Driver Profiles
    const driver1 = await Driver.create({
      user: driverUser1._id,
      name: 'Rajesh Sharma',
      mobileNumber: '+919876543210',
      profilePhoto: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?auto=format&fit=crop&w=300&q=80',
      driverStatus: 'Active',
      drivingLicenceNumber: 'DL-0420180059124',
      drivingLicenceDoc: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
      drivingLicenceStatus: 'Approved',
      rcNumber: 'DL 01 AB 4321',
      rcDetails: 'Commercial Stage Carriage Bus Permit',
      rcDoc: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      rcStatus: 'Approved',
      insurancePolicyNumber: 'NIC-FLEET-2024-88910',
      vehicleInsurance: 'Comprehensive Fleet Cover with Passenger Liability',
      insuranceDoc: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: '2026-12-31',
      insuranceStatus: 'Approved',
      fitnessDetails: 'RTO Certified Stage Fitness Valid',
      fitnessDoc: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      fitnessStatus: 'Approved',
      requiredDocumentsStatus: 'Approved'
    });

    const driver2 = await Driver.create({
      user: driverUser2._id,
      name: 'Suresh Verma',
      mobileNumber: '+919811223344',
      profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
      driverStatus: 'Active',
      drivingLicenceNumber: 'DL-1320190088219',
      drivingLicenceDoc: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
      drivingLicenceStatus: 'Approved',
      rcNumber: 'DL 04 EV 9820',
      rcDetails: 'Commercial Electric Passenger Vehicle Permit',
      rcDoc: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      rcStatus: 'Approved',
      insurancePolicyNumber: 'HDFC-EV-2024-55410',
      vehicleInsurance: 'Zero Depreciation Electric Cab Insurance',
      insuranceDoc: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: '2026-11-20',
      insuranceStatus: 'Approved',
      fitnessDetails: 'Green Mobility Inspection Passed',
      fitnessDoc: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      fitnessStatus: 'Approved',
      requiredDocumentsStatus: 'Approved'
    });

    const driver3 = await Driver.create({
      user: driverUser3._id,
      name: 'Manoj Kumar',
      mobileNumber: '+919822334455',
      profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
      driverStatus: 'Inactive',
      drivingLicenceNumber: 'HR-2620210091823',
      drivingLicenceDoc: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
      drivingLicenceStatus: 'Pending',
      rcNumber: 'DL 07 CR 5541',
      rcDetails: 'Commercial All India Tourist Permit',
      rcDoc: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      rcStatus: 'Pending',
      insurancePolicyNumber: 'ICICI-LOMB-2025-11002',
      vehicleInsurance: 'Commercial Taxi Insurance Policy',
      insuranceDoc: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: '2026-08-15',
      insuranceStatus: 'Approved',
      fitnessDetails: 'Annual Fitness Audit Completed',
      fitnessDoc: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      fitnessStatus: 'Approved',
      requiredDocumentsStatus: 'Pending'
    });

    const driver4 = await Driver.create({
      user: driverUser4._id,
      name: 'Amit Yadav',
      mobileNumber: '+919833445566',
      profilePhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&q=80',
      driverStatus: 'Blocked',
      drivingLicenceNumber: 'UP-1620170044129',
      drivingLicenceDoc: 'https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?auto=format&fit=crop&w=600&q=80',
      drivingLicenceStatus: 'Rejected',
      rcNumber: 'UP 16 EV 3344',
      rcDetails: 'State Transport Expired Permit',
      rcDoc: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      rcStatus: 'Rejected',
      insurancePolicyNumber: 'BAJAJ-ALLI-2023-99182',
      vehicleInsurance: 'Expired Policy',
      insuranceDoc: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: '2024-01-01',
      insuranceStatus: 'Rejected',
      fitnessDetails: 'Failed Emission & Braking Check',
      fitnessDoc: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      fitnessStatus: 'Rejected',
      requiredDocumentsStatus: 'Rejected',
      rejectionReason: 'Invalid licence renewal and expired vehicle insurance copy.'
    });

    // 5. Create Vehicles (Bus, EV-Sewa, Car)
    const vehicle1 = await Vehicle.create({
      vehicleNumber: 'DL 01 AB 4321',
      vehicleType: 'Bus',
      vehicleCategory: 'AC Sleeper 2+1 (Multi-Axle)',
      vehicleModel: 'Volvo 9600 Multi-Axle Premium',
      vehicleName: 'Royal Intercity Deluxe Express',
      seatingCapacity: 36,
      ownerName: 'Metro Transport Fleet Ltd',
      ownerMobileNumber: '+919811122334',
      assignedDriver: driver1._id,
      vehicleImages: [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
      ],
      vehicleStatus: 'Active',
      rcNumber: 'DL-01-2023-9876543',
      rcDocument: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      insurancePolicyNumber: 'NIC-BUS-2024-88910',
      insuranceDocument: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: '2026-12-31',
      fitnessDetails: 'Valid State RTO Fitness Certificate',
      fitnessDocument: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      fareRate: 850,
      route: {
        origin: 'Delhi (Kashmere Gate ISBT)',
        destination: 'Jaipur (Sindhi Camp)',
        departureTime: '06:00 AM',
        arrivalTime: '11:30 AM',
        duration: '5h 30m',
        boardingPoints: ['Kashmere Gate ISBT (22:00)', 'Dhaula Kuan (22:45)', 'IFFCO Chowk Gurugram (23:15)'],
        droppingPoints: ['Kotputli Bypass (02:30)', 'Amer Road (04:00)', 'Sindhi Camp Jaipur (04:30)']
      },
      pickupDropDetails: {
        pickupLocation: 'Delhi ISBT Kashmere Gate',
        dropLocation: 'Jaipur Sindhi Camp'
      },
      busDetails: {
        busType: 'AC Sleeper 2+1',
        seatLayout: 'Upper & Lower Luxury Sleeper Berths',
        availableSeats: 32
      }
    });

    const bus2 = await Vehicle.create({
      vehicleNumber: 'DL 02 CD 5678',
      vehicleType: 'Bus',
      vehicleCategory: 'Volvo AC Sleeper',
      vehicleModel: 'Volvo B11R Luxury Sleeper',
      vehicleName: 'Shivam Travels Premium',
      seatingCapacity: 36,
      ownerName: 'Shivam Transport Fleet Ltd',
      ownerMobileNumber: '+919811122335',
      assignedDriver: driver1._id,
      vehicleImages: [
        'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80'
      ],
      vehicleStatus: 'Active',
      rcNumber: 'DL-02-2023-8877665',
      rcDocument: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      insurancePolicyNumber: 'NIC-BUS-2024-99120',
      insuranceDocument: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: '2026-12-31',
      fitnessDetails: 'Valid State RTO Fitness Certificate',
      fitnessDocument: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      fareRate: 950,
      route: {
        origin: 'Delhi (Kashmere Gate ISBT)',
        destination: 'Jaipur (Sindhi Camp)',
        departureTime: '08:30 AM',
        arrivalTime: '02:00 PM',
        duration: '5h 30m',
        boardingPoints: ['Kashmere Gate ISBT (08:30)', 'Dhaula Kuan (09:15)', 'IFFCO Chowk Gurugram (09:45)'],
        droppingPoints: ['Kotputli Bypass (12:00)', 'Amer Road (01:30)', 'Sindhi Camp Jaipur (02:00)']
      },
      pickupDropDetails: {
        pickupLocation: 'Delhi ISBT Kashmere Gate',
        dropLocation: 'Jaipur Sindhi Camp'
      },
      busDetails: {
        busType: 'Volvo AC Sleeper',
        seatLayout: 'Upper & Lower Luxury Sleeper Berths',
        availableSeats: 28
      }
    });

    const bus3 = await Vehicle.create({
      vehicleNumber: 'DL 03 EF 9012',
      vehicleType: 'Bus',
      vehicleCategory: 'AC Seater/Sleeper',
      vehicleModel: 'Scania Metrolink HD',
      vehicleName: 'Rajputana Express',
      seatingCapacity: 40,
      ownerName: 'Rajputana Royal Lines Ltd',
      ownerMobileNumber: '+919811122336',
      assignedDriver: driver1._id,
      vehicleImages: [
        'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
      ],
      vehicleStatus: 'Active',
      rcNumber: 'DL-03-2023-7766554',
      rcDocument: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      insurancePolicyNumber: 'NIC-BUS-2024-77210',
      insuranceDocument: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: '2026-12-31',
      fitnessDetails: 'Valid State RTO Fitness Certificate',
      fitnessDocument: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      fareRate: 780,
      route: {
        origin: 'Delhi (Kashmere Gate ISBT)',
        destination: 'Jaipur (Sindhi Camp)',
        departureTime: '10:00 PM',
        arrivalTime: '03:30 AM',
        duration: '5h 30m',
        boardingPoints: ['Kashmere Gate ISBT (22:00)', 'Dhaula Kuan (22:45)', 'IFFCO Chowk Gurugram (23:15)'],
        droppingPoints: ['Kotputli Bypass (01:30)', 'Amer Road (03:00)', 'Sindhi Camp Jaipur (03:30)']
      },
      pickupDropDetails: {
        pickupLocation: 'Delhi ISBT Kashmere Gate',
        dropLocation: 'Jaipur Sindhi Camp'
      },
      busDetails: {
        busType: 'AC Seater/Sleeper',
        seatLayout: '2+2 Pushback Seats & Sleeper',
        availableSeats: 30
      }
    });

    const vehicle2 = await Vehicle.create({
      vehicleNumber: 'DL 04 EV 9820',
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Electric Shuttle 12-Seater',
      vehicleModel: 'Joylong E6 Electric Passenger Van',
      vehicleName: 'Joylong E6 EcoRide Rapid Express',
      seatingCapacity: 12,
      ownerName: 'Green Mobility Solutions India',
      ownerMobileNumber: '+919822233445',
      assignedDriver: driver2._id,
      vehicleImages: [
        'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80'
      ],
      vehicleStatus: 'Active',
      rcNumber: 'DL-04-EV-2024-11293',
      rcDocument: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      insurancePolicyNumber: 'HDFC-EV-2024-55410',
      insuranceDocument: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: '2026-11-20',
      fitnessDetails: 'Zero Emission Safety Standard Certified',
      fitnessDocument: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      fareRate: 320,
      route: {
        origin: 'Connaught Place, New Delhi',
        destination: 'Sector 62 Electronic City, Noida',
        boardingPoints: ['Connaught Place Outer Circle', 'Akshardham Metro Station'],
        droppingPoints: ['Sector 18 Atta Market', 'Sector 62 IT Park']
      },
      pickupDropDetails: {
        pickupLocation: 'Connaught Place Outer Circle, New Delhi',
        dropLocation: 'Sector 62 Electronic City, Noida'
      },
      evDetails: {
        batteryCapacity: '72 kWh Lithium-Ion',
        rangeKm: 280
      }
    });

    const vehicle3 = await Vehicle.create({
      vehicleNumber: 'DL 07 CR 5541',
      vehicleType: 'Car',
      vehicleCategory: 'Executive Electric SUV',
      vehicleModel: 'Mahindra XUV700 EV Prime',
      vehicleName: 'Urban Air-Lounge EV Car',
      seatingCapacity: 6,
      ownerName: 'Prime City Chauffeur Fleet',
      ownerMobileNumber: '+919833344556',
      assignedDriver: driver3._id,
      vehicleImages: [
        'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
      ],
      vehicleStatus: 'Active',
      rcNumber: 'DL-07-CR-2023-77621',
      rcDocument: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      insurancePolicyNumber: 'ICICI-LOMB-2025-11002',
      insuranceDocument: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: '2026-08-15',
      fitnessDetails: 'Prime Comfort Safety Certified',
      fitnessDocument: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      fareRate: 950,
      route: {
        origin: 'IGI Airport Terminal 3',
        destination: 'Cyber Hub DLF Phase 2, Gurugram',
        boardingPoints: ['Terminal 3 Airport Arrival Gate 5'],
        droppingPoints: ['Cyber Hub Gurugram Building 10']
      },
      pickupDropDetails: {
        pickupLocation: 'IGI Airport Terminal 3',
        dropLocation: 'Cyber Hub DLF Phase 2, Gurugram'
      },
      carDetails: {
        ac: true,
        fuelType: 'Electric'
      }
    });

    const vehicle4 = await Vehicle.create({
      vehicleNumber: 'UP 16 EV 3344',
      vehicleType: 'EV-Sewa',
      vehicleCategory: 'Electric Feeder Van',
      vehicleModel: 'Mahindra e-Supro Cargo/Pax',
      vehicleName: 'Metro Green Feeder Shuttle',
      seatingCapacity: 8,
      ownerName: 'National EV Transit Co.',
      ownerMobileNumber: '+919844455667',
      assignedDriver: driver4._id,
      vehicleImages: [
        'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&w=800&q=80'
      ],
      vehicleStatus: 'Blocked',
      rcNumber: 'UP-16-EV-2022-33441',
      rcDocument: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80',
      insurancePolicyNumber: 'BAJAJ-ALLI-2023-99182',
      insuranceDocument: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80',
      insuranceExpiryDetails: '2024-01-01',
      fitnessDetails: 'Inspection Lapsed',
      fitnessDocument: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80',
      fareRate: 250,
      pickupDropDetails: {
        pickupLocation: 'Botanical Garden Metro Station',
        dropLocation: 'Pari Chowk, Greater Noida'
      },
      evDetails: {
        batteryCapacity: '48 kWh',
        rangeKm: 180
      }
    });

    // Update driver assignedVehicle links
    driver1.assignedVehicle = vehicle1._id;
    await driver1.save();
    driver2.assignedVehicle = vehicle2._id;
    await driver2.save();
    driver3.assignedVehicle = vehicle3._id;
    await driver3.save();
    driver4.assignedVehicle = vehicle4._id;
    await driver4.save();

    // 6. Create Bookings
    const booking1 = await Booking.create({
      bookingId: 'BK-2026-9001',
      customer: {
        name: customer1.name,
        phone: customer1.phone,
        email: customer1.email
      },
      driver: driver1._id,
      vehicle: vehicle1._id,
      serviceType: 'Bus',
      pickupLocation: 'Kashmere Gate ISBT, New Delhi',
      dropLocation: 'Sindhi Camp, Jaipur',
      passengerDetails: [
        { name: 'Priya Nair', age: 29, gender: 'Female', seatNumber: 'SL-04' },
        { name: 'Ramesh Nair', age: 34, gender: 'Male', seatNumber: 'SL-05' }
      ],
      fare: 1700,
      driverPaymentAmount: 1360,
      paymentStatus: 'Successful',
      bookingStatus: 'Confirmed',
      travelDate: new Date('2026-09-14T22:00:00Z'),
      busSeatNumbers: ['SL-04', 'SL-05']
    });

    const booking2 = await Booking.create({
      bookingId: 'BK-2026-9002',
      customer: {
        name: customer2.name,
        phone: customer2.phone,
        email: customer2.email
      },
      driver: driver1._id,
      vehicle: vehicle1._id,
      serviceType: 'Bus',
      pickupLocation: 'Dhaula Kuan, Delhi',
      dropLocation: 'Amer Road, Jaipur',
      passengerDetails: [
        { name: 'Rahul Sharma', age: 26, gender: 'Male', seatNumber: 'SL-12' }
      ],
      fare: 850,
      driverPaymentAmount: 680,
      paymentStatus: 'Pending',
      bookingStatus: 'Pending',
      travelDate: new Date('2026-09-15T22:45:00Z'),
      busSeatNumbers: ['SL-12']
    });

    const booking3 = await Booking.create({
      bookingId: 'BK-2026-9003',
      customer: {
        name: customer3.name,
        phone: customer3.phone,
        email: customer3.email
      },
      driver: driver2._id,
      vehicle: vehicle2._id,
      serviceType: 'EV-Sewa',
      pickupLocation: 'Connaught Place Outer Circle, Delhi',
      dropLocation: 'Sector 62 IT Park, Noida',
      passengerDetails: [
        { name: 'Vikram Malhotra', age: 42, gender: 'Male', seatNumber: 'EV-03' }
      ],
      fare: 320,
      driverPaymentAmount: 260,
      paymentStatus: 'Successful',
      bookingStatus: 'Completed',
      travelDate: new Date('2026-09-11T09:00:00Z')
    });

    const booking4 = await Booking.create({
      bookingId: 'BK-2026-9004',
      customer: {
        name: customer4.name,
        phone: customer4.phone,
        email: customer4.email
      },
      driver: driver1._id,
      vehicle: vehicle1._id,
      serviceType: 'Bus',
      pickupLocation: 'IFFCO Chowk Gurugram',
      dropLocation: 'Sindhi Camp Jaipur',
      passengerDetails: [
        { name: 'Ananya Desai', age: 31, gender: 'Female', seatNumber: 'SL-08' }
      ],
      fare: 850,
      driverPaymentAmount: 680,
      paymentStatus: 'Successful',
      bookingStatus: 'Completed',
      travelDate: new Date('2026-09-08T23:15:00Z'),
      busSeatNumbers: ['SL-08']
    });

    const booking5 = await Booking.create({
      bookingId: 'BK-2026-9005',
      customer: {
        name: customer2.name,
        phone: customer2.phone,
        email: customer2.email
      },
      driver: driver3._id,
      vehicle: vehicle3._id,
      serviceType: 'Car',
      pickupLocation: 'IGI Airport Terminal 3',
      dropLocation: 'Cyber Hub Gurugram',
      passengerDetails: [
        { name: 'Rahul Sharma', age: 26, gender: 'Male', seatNumber: 'Car Seat 1' }
      ],
      fare: 950,
      driverPaymentAmount: 760,
      paymentStatus: 'Refunded',
      bookingStatus: 'Cancelled',
      cancellationStatus: 'Refunded',
      cancellationReason: 'Flight rescheduled by airline',
      travelDate: new Date('2026-09-09T14:30:00Z')
    });

    // 7. Create Payments
    await Payment.create({
      booking: booking1._id,
      bookingId: booking1.bookingId,
      customer: { name: booking1.customer.name, phone: booking1.customer.phone },
      driver: driver1._id,
      bookingAmount: 1700,
      driverPayment: 1360,
      paymentStatus: 'Successful',
      transactionReference: 'TXN-IND-2026-883921'
    });

    await Payment.create({
      booking: booking3._id,
      bookingId: booking3.bookingId,
      customer: { name: booking3.customer.name, phone: booking3.customer.phone },
      driver: driver2._id,
      bookingAmount: 320,
      driverPayment: 260,
      paymentStatus: 'Successful',
      transactionReference: 'TXN-IND-2026-883922'
    });

    await Payment.create({
      booking: booking4._id,
      bookingId: booking4.bookingId,
      customer: { name: booking4.customer.name, phone: booking4.customer.phone },
      driver: driver1._id,
      bookingAmount: 850,
      driverPayment: 680,
      paymentStatus: 'Successful',
      transactionReference: 'TXN-IND-2026-883923'
    });

    await Payment.create({
      booking: booking5._id,
      bookingId: booking5.bookingId,
      customer: { name: booking5.customer.name, phone: booking5.customer.phone },
      driver: driver3._id,
      bookingAmount: 950,
      driverPayment: 0,
      paymentStatus: 'Refunded',
      transactionReference: 'TXN-IND-2026-883924',
      refundAmount: 950,
      refundStatus: 'Processed',
      refundDate: new Date('2026-09-09T16:00:00Z'),
      refundReason: 'Customer cancellation processed per policy'
    });

    // 8. Create Cancellations
    await Cancellation.create({
      booking: booking5._id,
      bookingId: booking5.bookingId,
      customer: { name: customer2.name, phone: customer2.phone },
      bookingAmount: 950,
      cancellationStatus: 'Completed',
      cancellationReason: 'Flight rescheduled by airline (Customer requested cancellation >4 hours before departure)',
      refundStatus: 'Processed',
      refundAmount: 950,
      cancellationDate: new Date('2026-09-09T15:10:00Z')
    });

    // 9. Create 3% Customer Service Compensation Records (Platform Technical Glitch)
    await Compensation.create({
      booking: booking1._id,
      bookingId: booking1.bookingId,
      customer: { name: customer1.name, phone: customer1.phone, email: customer1.email },
      bookingAmount: 1000,
      issueReason: 'Platform seat auto-allocation server synchronization timeout during peak booking window',
      compensationPercentage: 3,
      compensationAmount: 30, // 3% of ₹1000
      approvalStatus: 'Approved',
      refundStatus: 'Processed',
      paymentReference: 'CMP-3PCT-2026-0041'
    });

    await Compensation.create({
      booking: booking3._id,
      bookingId: booking3.bookingId,
      customer: { name: customer3.name, phone: customer3.phone, email: customer3.email },
      bookingAmount: 1500,
      issueReason: 'Verified EV battery telematics dispatch delay on system gateway',
      compensationPercentage: 3,
      compensationAmount: 45, // 3% of ₹1500
      approvalStatus: 'Pending',
      refundStatus: 'Pending',
      paymentReference: 'CMP-3PCT-2026-0042'
    });

    // 10. Create Accident Insurance Records
    await Insurance.create({
      customerName: customer1.name,
      customerPhone: customer1.phone,
      booking: booking1._id,
      bookingId: booking1.bookingId,
      policyNumber: 'INS-TRANS-2026-778901',
      insuranceProvider: 'National Transport General Insurance Co.',
      insuranceStatus: 'Active',
      maxCoverageLimit: 500000,
      activeStatus: 'Active',
      claimStatus: 'None',
      disclaimer: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.'
    });

    await Insurance.create({
      customerName: customer4.name,
      customerPhone: customer4.phone,
      booking: booking4._id,
      bookingId: booking4.bookingId,
      policyNumber: 'INS-TRANS-2026-778902',
      insuranceProvider: 'National Transport General Insurance Co.',
      insuranceStatus: 'Expired',
      maxCoverageLimit: 500000,
      activeStatus: 'Inactive',
      claimStatus: 'None',
      disclaimer: 'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval.'
    });

    // 11. Create Notifications
    await Notification.create({
      title: 'Monsoon Route Safety Advisory',
      message: 'All drivers operating intercity bus and EV corridors are advised to maintain safe following distances on NH-48.',
      recipient: 'All Drivers',
      recipientRole: 'driver',
      status: 'Unread'
    });

    await Notification.create({
      title: 'System Maintenance Scheduled',
      message: 'Database routine index optimization scheduled for Sunday at 03:00 AM IST.',
      recipient: 'All Users',
      recipientRole: 'all',
      status: 'Read'
    });

    // 12. Create Support Tickets
    await Support.create({
      ticketId: 'SUP-2026-101',
      requesterName: 'Rajesh Sharma',
      role: 'driver',
      mobileNumber: '+919876543210',
      bookingId: 'BK-2026-9001',
      supportIssue: 'Toll plaza FASTag auto-debit discrepancy at Manesar Toll Plaza',
      status: 'In Progress',
      supportInformation: 'Driver submitted FASTag receipt copy for refund audit.',
      resolutionNotes: 'Under review with accounts team.'
    });

    await Support.create({
      ticketId: 'SUP-2026-102',
      requesterName: 'Priya Nair',
      role: 'customer',
      mobileNumber: '+919844556677',
      bookingId: 'BK-2026-9001',
      supportIssue: 'Requesting confirmation of child seating berth allocation',
      status: 'Resolved',
      supportInformation: 'Berth SL-04 and SL-05 confirmed adjacent.',
      resolutionNotes: 'Customer informed via SMS.'
    });

    // 13. Create Policies
    const policies = [
      {
        policyType: 'terms_and_conditions',
        title: 'Platform Terms & Conditions',
        content:
          'Welcome to the unified transportation management platform for Bus, EV-Sewa, and Car bookings. By accessing or using our platform, drivers, passengers, and partners agree to be bound by state transport guidelines, passenger safety mandates, and regulatory compliance standards.'
      },
      {
        policyType: 'privacy_policy',
        title: 'Privacy Policy & Data Protection',
        content:
          'We strictly protect customer personal details, travel history, and driver verification documents. Data is encrypted in transit and at rest. Identity and location data are collected solely for booking fulfillment and regulatory verification.'
      },
      {
        policyType: 'customer_terms',
        title: 'Customer Terms of Service',
        content:
          'Passengers must carry a valid government-issued ID matching the passenger name on the booking ticket. Passengers must report to designated boarding points at least 15 minutes before scheduled departure.'
      },
      {
        policyType: 'driver_terms',
        title: 'Driver Code of Conduct & Vehicle Standards',
        content:
          'All drivers must possess a valid commercial driving licence, active vehicle RC, valid commercial insurance, and state fitness certificate. Drivers must adhere to speed regulations and zero tolerance for alcohol or hazardous driving.'
      },
      {
        policyType: 'cancellation_policy',
        title: 'Booking Cancellation Policy',
        content:
          'Cancellations made 6 hours prior to departure are eligible for a 100% refund. Cancellations between 2 to 6 hours receive a 50% refund. No refunds are applicable for cancellations within 2 hours of departure or no-shows.'
      },
      {
        policyType: 'refund_policy',
        title: 'Payment Refund Policy',
        content:
          'Eligible refunds are processed directly to the original payment source within 3-5 business days upon cancellation confirmation.'
      },
      {
        policyType: 'compensation_policy',
        title: '3% Platform Technical Glitch Service Compensation Policy',
        content:
          'In the rare event that a booking experiences a verified system-side technical glitch (such as duplicate seat allocation or gateway timeout during active confirmation), the customer is eligible for an additional 3% service compensation calculated strictly on the booking base amount.'
      },
      {
        policyType: 'accident_insurance_terms',
        title: 'Accident Insurance Terms',
        content:
          'Optional and included passenger transit insurance coverage is underwritten by authorized third-party general insurance providers. Terms, covered perils, medical expense ceilings, and claim settlement timelines are governed exclusively by the insurer master policy.'
      },
      {
        policyType: 'insurance_disclaimer',
        title: 'Insurance Coverage Disclaimer',
        content:
          'Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval. The platform acts solely as a technological facilitator and does not guarantee insurance payouts.'
      }
    ];

    for (const p of policies) {
      await Policy.create(p);
    }

    // 14. Service Control
    await ServiceControl.create({
      busService: 'Active',
      evSewaService: 'Active',
      carService: 'Active',
      lastUpdatedBy: 'Super Admin'
    });

    console.log('✅ Database successfully seeded with full Indian transportation demo dataset!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during database seeding:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
