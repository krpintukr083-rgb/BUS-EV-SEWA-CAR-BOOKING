const driverBookingResponse = (booking, canViewCustomerPhone) => {
  const data = typeof booking.toObject === 'function' ? booking.toObject() : { ...booking };
  const customer = data.customer && typeof data.customer === 'object'
    ? { ...data.customer }
    : data.customer;
  const user = data.user && typeof data.user === 'object'
    ? { ...data.user }
    : data.user;
  const driver = data.driver && typeof data.driver === 'object'
    ? { ...data.driver }
    : data.driver;

  if (driver && typeof driver === 'object') {
    delete driver.canViewCustomerPhone;
    data.driver = driver;
  }
  if (canViewCustomerPhone) {
    const phone = user?.phone || customer?.phone || data.customerPhone || data.passengerPhone;
    if (customer && typeof customer === 'object') {
      if (phone) customer.phone = phone;
      data.customer = customer;
    }
    if (phone) data.customerPhone = phone;
    return data;
  }

  if (customer && typeof customer === 'object') {
    delete customer.phone;
    data.customer = customer;
  }
  if (user && typeof user === 'object') {
    delete user.phone;
    data.user = user;
  }
  delete data.customerPhone;
  delete data.passengerPhone;
  return data;
};

module.exports = driverBookingResponse;
