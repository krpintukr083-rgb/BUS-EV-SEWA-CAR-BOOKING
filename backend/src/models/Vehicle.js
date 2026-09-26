const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleSource: {
      type: String,
      enum: ['OWN', 'THIRD_PARTY'],
      default: 'OWN'
    },
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    vehicleType: {
      type: String,
      enum: ['Bus', 'EV-Sewa', 'Car', 'Truck'],
      required: true
    },
    vehicleCategory: {
      type: String,
      required: true // e.g. 'AC Sleeper 2+1', 'Electric Shuttle 12-Seater', 'Sedan / Prime EV', '10-Ton Heavy Haulage'
    },
    vehicleModel: {
      type: String,
      required: true // e.g. 'Volvo 9600 Multi-Axle', 'Tata Tigor EV', 'Mahindra XUV400 EV', 'Tata Prima 3530.K'
    },
    vehicleName: {
      type: String,
      required: true // e.g. 'Royal Express Deluxe', 'Green City EV Shuttle', 'Market Hired Truck #1'
    },
    seatingCapacity: {
      type: Number,
      default: 1
    },
    loadCapacity: {
      type: String,
      default: '' // e.g. '10 Ton', '1200 kg', '36 Seats'
    },
    ownerName: {
      type: String,
      required: true
    },
    ownerMobileNumber: {
      type: String,
      required: true
    },
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      default: null
    },
    // Third-party market driver details (when not registered in system)
    thirdPartyDriver: {
      driverName: { type: String, default: '' },
      driverMobile: { type: String, default: '' },
      driverLicenseNumber: { type: String, default: '' }
    },
    // Vendor/Party Details for Third Party Hire
    vendorDetails: {
      vendorName: { type: String, default: '' },
      vendorMobile: { type: String, default: '' },
      vendorAddress: { type: String, default: '' }
    },
    // Market Hire Financials & Notes
    hireDetails: {
      hireAmount: { type: Number, default: 0 },
      additionalExpense: { type: Number, default: 0 },
      hireDate: { type: Date, default: Date.now },
      paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid'],
        default: 'Pending'
      },
      paidAmount: { type: Number, default: 0 },
      paymentDate: { type: Date, default: null },
      paymentReference: { type: String, default: '' },
      tripReference: { type: String, default: '' },
      pickup: { type: String, default: '' },
      destination: { type: String, default: '' },
      notes: { type: String, default: '' }
    },
    vehicleImages: [
      {
        type: String
      }
    ],
    vehicleStatus: {
      type: String,
      enum: ['Pending', 'Active', 'Inactive', 'Blocked', 'Rejected'],
      default: 'Active'
    },
    submission: {
      submittedByDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null },
      rejectionReason: { type: String, default: '' }
    },
    // Vehicle Compliance Documents
    rcNumber: {
      type: String,
      default: 'RC-VERIFIED-COMMERCIAL'
    },
    rcDocument: {
      type: String,
      default: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80'
    },
    insurancePolicyNumber: {
      type: String,
      default: 'INS-FLEET-COVER-VALID'
    },
    insuranceDocument: {
      type: String,
      default: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80'
    },
    insuranceExpiryDetails: {
      type: String,
      default: '2026-12-31'
    },
    fitnessDetails: {
      type: String,
      default: 'State Transport Certified Fitness Valid'
    },
    fitnessDocument: {
      type: String,
      default: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80'
    },
    fareRate: {
      type: Number,
      default: 500
    },
    route: {
      origin: { type: String, default: '' },
      destination: { type: String, default: '' },
      departureTime: { type: String, default: '06:00 AM' },
      arrivalTime: { type: String, default: '11:30 AM' },
      duration: { type: String, default: '5h 30m' },
      boardingPoints: [{ type: String }],
      droppingPoints: [{ type: String }],
      stops: [{
        name: { type: String, required: true, trim: true },
        fareFromOrigin: { type: Number, min: 0 },
        fareFromPrevious: { type: Number, min: 0 }
      }],
      destinationFareFromOrigin: { type: Number, min: 0, default: undefined },
      finalSegmentFare: { type: Number, min: 0, default: undefined }
    },
    pickupDropDetails: {
      pickupLocation: { type: String, default: '' },
      dropLocation: { type: String, default: '' }
    },
    // Bus Specifics
    busDetails: {
      busType: { type: String, default: 'AC Sleeper' },
      seatLayout: { type: String, default: '2+1 Luxury Sleeper' },
      availableSeats: { type: Number, default: 36 }
    },
    // EV Specifics
    evDetails: {
      batteryCapacity: { type: mongoose.Schema.Types.Mixed, default: undefined },
      batteryPercentage: { type: Number, min: 0, max: 100 },
      rangeKm: { type: Number, default: 280 }
    },
    // Car Specifics
    carDetails: {
      ac: { type: Boolean, default: true },
      fuelType: { type: String, default: 'Electric / Hybrid' }
    },
    // Truck / Haulage Specifics
    truckDetails: {
      cargoType: { type: String, default: 'General Freight / Dry Goods' },
      grossVehicleWeight: { type: String, default: '16 Tonnes' },
      axleCount: { type: Number, default: 2 }
    }
  },
  {
    timestamps: true
  }
);

// Performance Indexes
vehicleSchema.index({ vehicleStatus: 1, vehicleType: 1 });
vehicleSchema.index({ vehicleStatus: 1 });
vehicleSchema.index({ vehicleSource: 1 });
vehicleSchema.index({ assignedDriver: 1 });
vehicleSchema.index({ 'hireDetails.paymentStatus': 1 });

module.exports = mongoose.model('Vehicle', vehicleSchema);
