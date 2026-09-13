const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    vehicleNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    vehicleType: {
      type: String,
      enum: ['Bus', 'EV-Sewa', 'Car'],
      required: true
    },
    vehicleCategory: {
      type: String,
      required: true // e.g. 'AC Sleeper 2+1', 'Electric Shuttle 12-Seater', 'Sedan / Prime EV'
    },
    vehicleModel: {
      type: String,
      required: true // e.g. 'Volvo 9600 Multi-Axle', 'Tata Tigor EV', 'Mahindra XUV400 EV'
    },
    vehicleName: {
      type: String,
      required: true // e.g. 'Royal Express Deluxe', 'Green City EV Shuttle'
    },
    seatingCapacity: {
      type: Number,
      required: true
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
    vehicleImages: [
      {
        type: String
      }
    ],
    vehicleStatus: {
      type: String,
      enum: ['Active', 'Inactive', 'Blocked'],
      default: 'Active'
    },
    // Vehicle Compliance Documents
    rcNumber: {
      type: String,
      required: true
    },
    rcDocument: {
      type: String,
      default: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?auto=format&fit=crop&w=600&q=80'
    },
    insurancePolicyNumber: {
      type: String,
      required: true
    },
    insuranceDocument: {
      type: String,
      default: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80'
    },
    insuranceExpiryDetails: {
      type: String,
      required: true
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
      required: true
    },
    route: {
      origin: { type: String, default: '' },
      destination: { type: String, default: '' },
      departureTime: { type: String, default: '06:00 AM' },
      arrivalTime: { type: String, default: '11:30 AM' },
      duration: { type: String, default: '5h 30m' },
      boardingPoints: [{ type: String }],
      droppingPoints: [{ type: String }]
    },
    pickupDropDetails: {
      pickupLocation: { type: String, default: '' },
      dropLocation: { type: String, default: '' }
    },
    // Bus Specifics
    busDetails: {
      busType: { type: String, default: 'AC Sleeper' }, // AC Sleeper, Semi-Sleeper, Luxury Volvo
      seatLayout: { type: String, default: '2+1 Luxury Sleeper' },
      availableSeats: { type: Number, default: 36 }
    },
    // EV Specifics
    evDetails: {
      batteryCapacity: { type: String, default: '72 kWh' },
      rangeKm: { type: Number, default: 280 }
    },
    // Car Specifics
    carDetails: {
      ac: { type: Boolean, default: true },
      fuelType: { type: String, default: 'Electric / Hybrid' }
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
