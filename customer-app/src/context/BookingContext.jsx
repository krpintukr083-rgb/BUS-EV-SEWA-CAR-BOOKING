import React, { createContext, useContext, useState } from 'react';

const BookingContext = createContext();

export const BookingProvider = ({ children }) => {
  const [bookingDraft, setBookingDraft] = useState({
    serviceType: 'Bus', // 'Bus' | 'EV-Sewa' | 'Car'
    bookingMode: 'NORMAL',
    vehicle: null,
    pickupLocation: '',
    dropLocation: '',
    selectedSeats: [],
    passengerCount: 1,
    passengerDetails: [
      { name: '', phone: '', age: '', gender: 'Male' }
    ],
    baseFare: 0,
    totalFare: 0,
    travelDate: new Date().toISOString().split('T')[0],
    confirmedBooking: null
  });

  const updateDraft = fields => {
    setBookingDraft(prev => ({
      ...prev,
      ...fields
    }));
  };

  const resetDraft = () => {
    setBookingDraft({
      serviceType: 'Bus',
      bookingMode: 'NORMAL',
      vehicle: null,
      pickupLocation: '',
      dropLocation: '',
      selectedSeats: [],
      passengerCount: 1,
      passengerDetails: [{ name: '', phone: '', age: '', gender: 'Male' }],
      baseFare: 0,
      totalFare: 0,
      travelDate: new Date().toISOString().split('T')[0],
      confirmedBooking: null
    });
  };

  return (
    <BookingContext.Provider value={{ bookingDraft, updateDraft, resetDraft }}>
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => useContext(BookingContext);
