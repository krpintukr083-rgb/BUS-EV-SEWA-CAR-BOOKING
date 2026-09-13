const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

// @desc    Get vehicles with case-insensitive type filter (?type=bus|ev-sewa|car) and search routes
// @route   GET /api/vehicles
// @access  Public
exports.getVehicles = async (req, res, next) => {
  try {
    const { type, from, to } = req.query;

    const query = { vehicleStatus: 'Active' };

    if (type) {
      const clean = type.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (clean === 'bus' || clean === 'buses') {
        query.vehicleType = 'Bus';
      } else if (clean === 'evsewa' || clean === 'ev') {
        query.vehicleType = 'EV-Sewa';
      } else if (clean === 'car' || clean === 'cars') {
        query.vehicleType = 'Car';
      }
    }

    const vehicles = await Vehicle.find(query).populate('assignedDriver').sort({ createdAt: -1 });

    let filtered = vehicles;
    if (from || to) {
      filtered = vehicles.filter((v) => {
        const originSearch = (from || '').toLowerCase().trim();
        const destSearch = (to || '').toLowerCase().trim();

        const allOrigins = [
          v.route?.origin,
          ...(v.route?.boardingPoints || []),
          v.pickupDropDetails?.pickupLocation
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const allDestinations = [
          v.route?.destination,
          ...(v.route?.droppingPoints || []),
          v.pickupDropDetails?.dropLocation
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const originMatch = !originSearch || allOrigins.includes(originSearch);
        const destMatch = !destSearch || allDestinations.includes(destSearch);

        return originMatch && destMatch;
      });
    }

    res.json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vehicle details + booked seats if bus
// @route   GET /api/vehicles/:id
// @access  Public
exports.getVehicleById = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id).populate('assignedDriver');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    if (vehicle.vehicleStatus !== 'Active') {
      return res.status(404).json({
        success: false,
        message: 'Vehicle is currently unavailable or inactive'
      });
    }

    // If bus, get currently booked seats across active bookings
    let bookedSeats = [];
    if (vehicle.vehicleType === 'Bus') {
      const activeBookings = await Booking.find({
        vehicle: vehicle._id,
        bookingStatus: { $in: ['Confirmed', 'Pending', 'Ongoing'] }
      });

      activeBookings.forEach((b) => {
        if (b.busSeatNumbers && b.busSeatNumbers.length > 0) {
          b.busSeatNumbers.forEach((s) => bookedSeats.push(s));
        }
      });
      bookedSeats = Array.from(new Set(bookedSeats));
    }

    res.json({
      success: true,
      data: {
        ...vehicle.toObject(),
        bookedSeats
      }
    });
  } catch (error) {
    next(error);
  }
};
