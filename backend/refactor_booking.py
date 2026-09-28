import re

with open('src/controllers/bookingController.js', 'r', encoding='utf8') as f:
    content = f.read()

# 1. Split createBooking
create_start = content.find('exports.createBooking = async (req, res, next) => {')
create_end = content.find('exports.getInstantBookingAvailability = async', create_start)
create_fn = content[create_start:create_end]

# Extract the body of createBooking
body_start = create_fn.find('try {')
body_end = create_fn.rfind('} catch')
body = create_fn[body_start:body_end]

# Find where the instant branch ends
instant_start = body.find("if (bookingMode === 'INSTANT') {")
instant_end = body.find("if (!vehicleId || !serviceType || !pickupLocation || !dropLocation) {", instant_start)
instant_block = body[instant_start:instant_end]

# Instant Function
instant_fn = "const createInstantBooking = async (req, res, next) => {\n  " + body[:instant_start] + "\n  " + instant_block.strip()[:-1].strip() + "\n  } catch (error) {\n    next(error);\n  }\n};\n"

# Schedule Function (the rest)
schedule_fn = "const createScheduleBooking = async (req, res, next) => {\n  " + body[:instant_start] + "\n  " + body[instant_end:] + "\n  } catch (error) {\n    next(error);\n  }\n};\n"

# Wrapper
wrapper_fn = """
exports.createInstantBooking = createInstantBooking;
exports.createScheduleBooking = createScheduleBooking;
exports.createBooking = async (req, res, next) => {
  const { bookingMode } = req.body;
  if (bookingMode === 'INSTANT') return createInstantBooking(req, res, next);
  return createScheduleBooking(req, res, next);
};
"""

content = content[:create_start] + instant_fn + "\n" + schedule_fn + "\n" + wrapper_fn + "\n" + content[create_end:]

with open('src/controllers/bookingController.js', 'w', encoding='utf8') as f:
    f.write(content)
