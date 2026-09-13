# TravelEase - Customer Android Application

A complete, production-grade Customer Mobile Application for **Bus Booking + EV-Sewa + Car Booking Platform**, built using **React Native**, **Expo**, **JavaScript ONLY (JSX)**, **React Navigation**, and connected to the common **Node.js + Express.js + MongoDB backend**.

---

## 📱 Features & Screen Architecture (28 Screens)

### 1. Authentication & Onboarding
- **LoginScreen**: Dual login (Mobile Number OR Email) + Password with JWT authentication.
- **SignUpScreen**: New customer registration with instant backend verification.

### 2. Home & Core Hub
- **HomeScreen**: Customer greeting, notification shortcut, profile shortcut, and direct entry points to 3 services:
  1. 🚌 **Bus Booking**
  2. ⚡ **EV-Sewa Booking**
  3. 🚗 **Car Booking**
  - Active Service availability check with Super Admin controls.

### 3. Bus Booking Flow
- **BusSearchScreen**: Origin, destination and travel date selection.
- **BusListingScreen**: Filtered active buses with operator names, boarding/dropping points, fare and seat availability.
- **BusDetailsScreen**: Bus specs, capacity, seating layout overview, and route stops.
- **BusSeatSelectionScreen**: Interactive multi-seat layout (Available, Selected, Booked) with dynamic seat multiplier fare calculation.

### 4. EV-Sewa Flow
- **EvSewaListingScreen**: Eco-friendly electric vehicle listings with range, zero-emissions badge, and base fares.
- **EvSewaDetailsScreen**: EV vehicle specs, battery capacity, route details, and booking initiation.

### 5. Car Booking Flow
- **CarListingScreen**: Premium Sedans, SUVs, and chauffeur rental fleet.
- **CarDetailsScreen**: Passenger capacity, AC features, luggage allowance, and route terms.

### 6. Booking & Checkout Funnel
- **PickupDropScreen**: Interactive pickup and drop-off terminal selection with route visualizer.
- **PassengerDetailsScreen**: Form for passenger names, contact numbers, ages, and genders for each seat/ticket.
- **FareSummaryScreen**: Comprehensive fare breakdown (Base Fare, Multipliers, Taxes & Complimentary Insurance).
- **PaymentScreen**: Online payment gateway (UPI, Credit/Debit Card, Net Banking) with processing animations and failure retry handling.
- **BookingConfirmationScreen**: Instant confirmation display with booking code, transaction ID, and route preview.
- **DigitalTicketScreen**: Boarding pass design with perforated edges styling, journey summary, and QR Code digital boarding pass.

### 7. Bookings Management & History
- **MyBookingsScreen**: Two-tab switch for **Upcoming** and **Completed / Past** bookings.
- **BookingDetailsScreen**: Full reservation inspection with vehicle details, allocated seat numbers, and live status.
- **BookingCancellationScreen**: Cancellation reason submission, 10% processing calculation, and refund confirmation.
- **BookingHistoryScreen**: Comprehensive historical archive of past journeys and payment records.

### 8. Notifications, Profile & Policies
- **NotificationsScreen**: Real-time transaction alerts, payment receipts, booking confirmations, and refund updates.
- **CustomerProfileScreen**: Profile details, quick links to bookings, safety info, and secure logout.
- **CustomerSupportScreen**: 24x7 toll-free helpline, official email, corporate address, and booking FAQs (no live chat).
- **InsuranceScreen**: Transit accident policy details, underwriter status, and claim status.
  - *Statutory Notice*: "Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval." (Never displayed as guaranteed payout).
- **Policies Screens**:
  - `TermsScreen`: Platform terms and user agreement.
  - `PrivacyScreen`: Data handling and privacy protections.
  - `RefundPolicyScreen`: Cancellation time windows and refund timelines.
  - `InsuranceDisclaimerScreen`: Statutory coverage limits and exclusions.

---

## 🛠️ Technology Stack

- **Framework**: React Native + Expo
- **Language**: JavaScript Only (`.js`, `.jsx`) — Zero TypeScript
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **HTTP Client**: Axios
- **State Management**: React Context API (`CustomerAuthContext`, `BookingContext`)
- **Design Language**: Custom StyleSheet design system with Professional Blue (`#1d4ed8`), Dark Navy (`#0f172a`), Clean White cards (`#ffffff`), and Slate backgrounds (`#f8fafc`).

---

## 🚀 How to Run Locally

### 1. Start the Common Backend (Ensure MongoDB Atlas is running)
```bash
cd BUS-EV-SEWA-CAR-BOOKING/backend
npm start
```
The backend will run on `http://localhost:5000`.

### 2. Start the Customer App with Expo
```bash
cd BUS-EV-SEWA-CAR-BOOKING/customer-app
npm install
npm start
```

- Press `a` to open on an Android Emulator (or scan QR code with Expo Go on your physical Android device).
- Press `w` to run on Web browser for quick preview.

---

## 🔑 Test Credentials

- **Customer Login**: `priya.nair@example.com` / `user123` (or Mobile: `9876543213` / `user123`)
- **Or Register a new customer account** directly via the Sign Up screen.
