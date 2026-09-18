const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');

const formatVehicle = (vehicleDoc, req) => {
  const v = vehicleDoc.toObject ? vehicleDoc.toObject() : { ...vehicleDoc };
  if (Array.isArray(v.vehicleImages) && v.vehicleImages.length > 0) {
    const host = req ? req.get('host') : null;
    const protocol = req && req.protocol ? req.protocol : 'http';
    v.vehicleImages = v.vehicleImages.map(img => {
      if (img && typeof img === 'string' && img.startsWith('/uploads/') && host) {
        return `${protocol}://${host}${img}`;
      }
      return img;
    });
  }

  // Security: Remove internal market hire financial details for non-admin viewers
  if (v.hireDetails) {
    delete v.hireDetails.hireAmount;
    delete v.hireDetails.paidAmount;
    delete v.hireDetails.paymentReference;
  }

  return v;
};

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
      } else if (clean === 'truck' || clean === 'trucks') {
        query.vehicleType = 'Truck';
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
          v.pickupDropDetails?.pickupLocation,
          v.hireDetails?.pickup
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const allDestinations = [
          v.route?.destination,
          ...(v.route?.droppingPoints || []),
          v.pickupDropDetails?.dropLocation,
          v.hireDetails?.destination
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const originMatch = !originSearch || allOrigins.includes(originSearch);
        const destMatch = !destSearch || allDestinations.includes(destSearch);

        return originMatch && destMatch;
      });
    }

    const formattedVehicles = filtered.map(v => formatVehicle(v, req));

    res.json({
      success: true,
      count: formattedVehicles.length,
      data: formattedVehicles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single vehicle details + booked seats if bus (date-specific)
// @route   GET /api/vehicles/:id?travelDate=YYYY-MM-DD
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

    // If bus, get booked seats ONLY for the requested travel date (date-specific)
    let bookedSeats = [];
    if (vehicle.vehicleType === 'Bus') {
      // Parse travelDate from query param; default to today if not provided
      const rawDate = req.query.travelDate;
      const targetDate = rawDate ? new Date(rawDate) : new Date();

      // Day-boundary range so time component doesn't matter
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const activeBookings = await Booking.find({
        vehicle: vehicle._id,
        travelDate: { $gte: startOfDay, $lte: endOfDay },
        bookingStatus: {
          $in: ['Confirmed', 'Pending', 'Pending Driver Confirmation', 'Awaiting Cash Collection', 'Ongoing']
        }
      });

      activeBookings.forEach((b) => {
        if (b.busSeatNumbers && b.busSeatNumbers.length > 0) {
          b.busSeatNumbers.forEach((s) => bookedSeats.push(s));
        }
      });
      bookedSeats = Array.from(new Set(bookedSeats));
    }

    const formattedVehicle = formatVehicle(vehicle, req);

    res.json({
      success: true,
      data: {
        ...formattedVehicle,
        bookedSeats
      }
    });
  } catch (error) {
    next(error);
  }
};
