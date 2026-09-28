import re

with open('src/controllers/driverController.js', 'r', encoding='utf8') as f:
    content = f.read()

# 1. Refactor getBookingRequests
get_start = content.find('exports.getBookingRequests = async (req, res, next) => {')
get_end = content.find('exports.getActiveBookingsForDriver = async', get_start)
get_fn = content[get_start:get_end]

new_get_instant = get_fn.replace('exports.getBookingRequests = async', 'const getInstantBookingRequests = async')
new_get_instant = new_get_instant.replace("reqItem.bookingMode === 'INSTANT'", "true")

new_get_schedule = get_fn.replace('exports.getBookingRequests = async', 'const getScheduleBookingRequests = async')
new_get_schedule = new_get_schedule.replace("reqItem.bookingMode === 'INSTANT'", "false")

wrapper_get = """
exports.getBookingRequests = async (req, res, next) => {
  const isInstantReq = req.query.mode === 'INSTANT';
  if (isInstantReq) return getInstantBookingRequests(req, res, next);
  return getScheduleBookingRequests(req, res, next);
};
"""

content = content[:get_start] + new_get_instant + "\n" + new_get_schedule + "\n" + wrapper_get + "\n" + content[get_end:]

# 2. Refactor acceptBookingRequest
acc_start = content.find('exports.acceptBookingRequest = async (req, res, next) => {')
acc_end = content.find('exports.rejectBookingRequest = async', acc_start)
acc_fn = content[acc_start:acc_end]

new_acc_instant = acc_fn.replace('exports.acceptBookingRequest = async', 'const acceptInstantBookingRequest = async')
new_acc_instant = new_acc_instant.replace("const isInstant = booking.bookingMode === 'INSTANT';", "const isInstant = true;")

new_acc_schedule = acc_fn.replace('exports.acceptBookingRequest = async', 'const acceptScheduleBookingRequest = async')
new_acc_schedule = new_acc_schedule.replace("const isInstant = booking.bookingMode === 'INSTANT';", "const isInstant = false;")

wrapper_acc = """
exports.acceptBookingRequest = async (req, res, next) => {
  const { id } = req.params;
  const booking = await Booking.findOne(getBookingQuery(id));
  if (!booking) return res.status(404).json({ success: false, message: 'Booking request not found' });
  req.bookingObj = booking; // pass down

  if (booking.bookingMode === 'INSTANT') return acceptInstantBookingRequest(req, res, next);
  return acceptScheduleBookingRequest(req, res, next);
};
"""

new_acc_instant = new_acc_instant.replace("const booking = await Booking.findOne(getBookingQuery(id));", "const booking = req.bookingObj;")
new_acc_schedule = new_acc_schedule.replace("const booking = await Booking.findOne(getBookingQuery(id));", "const booking = req.bookingObj;")

content = content[:acc_start] + new_acc_instant + "\n" + new_acc_schedule + "\n" + wrapper_acc + "\n" + content[acc_end:]

# 3. Refactor verifyRideOtp
ver_start = content.find('exports.verifyRideOtp = async (req, res, next) => {')
ver_end = content.find('exports.updateCashCollectionStatus = async', ver_start)
ver_fn = content[ver_start:ver_end]

new_ver_instant = ver_fn.replace('exports.verifyRideOtp = async', 'const verifyInstantRideOtp = async')
new_ver_instant = new_ver_instant.replace("const isInstant = booking.bookingMode === 'INSTANT';", "const isInstant = true;")

new_ver_schedule = ver_fn.replace('exports.verifyRideOtp = async', 'const verifyScheduleRideOtp = async')
new_ver_schedule = new_ver_schedule.replace("const isInstant = booking.bookingMode === 'INSTANT';", "const isInstant = false;")

wrapper_ver = """
exports.verifyRideOtp = async (req, res, next) => {
  const { id } = req.params;
  const targetBookingId = id || req.body.bookingId || req.body.id;
  const booking = await Booking.findOne(getBookingQuery(targetBookingId));
  if (!booking) return res.status(404).json({ success: false, message: 'Booking request not found' });
  req.bookingObj = booking;

  if (booking.bookingMode === 'INSTANT') return verifyInstantRideOtp(req, res, next);
  return verifyScheduleRideOtp(req, res, next);
};
"""

new_ver_instant = new_ver_instant.replace("const booking = await Booking.findOne(getBookingQuery(targetBookingId)).select('+confirmationOtpHash');", "const booking = await Booking.findOne(getBookingQuery(targetBookingId)).select('+confirmationOtpHash');")
new_ver_schedule = new_ver_schedule.replace("const booking = await Booking.findOne(getBookingQuery(targetBookingId)).select('+confirmationOtpHash');", "const booking = await Booking.findOne(getBookingQuery(targetBookingId)).select('+confirmationOtpHash');")

content = content[:ver_start] + new_ver_instant + "\n" + new_ver_schedule + "\n" + wrapper_ver + "\n" + content[ver_end:]

with open('src/controllers/driverController.js', 'w', encoding='utf8') as f:
    f.write(content)
