# TravelEase Driver App (Android / Expo)

A completely independent, dedicated mobile application for Drivers & Conductors across Bus, EV-Sewa, and Car/Cab booking operations.

---

## Key Architecture & Features

1. **Independent Android App (`driver-app/`)**:
   - Built with React Native & Expo (`expo ~51.0.28`, `react-native 0.74.5`).
   - Pure JavaScript / JSX (NO TypeScript).
   - Dedicated `package.json`, `app.json`, `App.js`, and navigation stack.
   - Independent Android application ID: `com.travelease.driver`.

2. **Zero GPS Invariant**:
   - Absolutely NO live GPS tracking, NO background location permissions, NO battery-draining telemetry.
   - All navigation uses external Google Maps intents (`Linking.openURL`).

3. **Complete Ride & Booking Lifecycles**:
   - **Trip Request**: 45-second countdown timer, sound/haptic alerts, accept / reject with reasons.
   - **Ride Flow**: Arriving → Arrived at Pickup (with waiting timer) → 4-digit OTP/PIN Verification Barrier → Ride Started → End Ride.
   - **Dual Bus State Machine**:
     - *Online Paid*: Driver confirms seat booking.
     - *Offline Cash on Boarding*: Driver confirms seat reservation and collects cash (`Collect Cash & Mark Paid`).
   - **Financials**: Gross Fare breakdown, 20% Platform Commission fee deduction, 80% Net Earnings credited to Driver Wallet.
   - **Wallet & Payouts**: Real-time balance ledger, withdrawal requests for Bank Transfer, eSewa, and Khalti.
   - **KYC Compliance**: 5 Document cards (Citizenship, License, RC, Insurance, Fitness) with expiry tracking & renewal upload.
   - **EV Hub**: Battery % gauge, estimated range, manual SOC updater, charging stations directory with Google Maps navigation.
   - **Safety & SOS**: Zero GPS emergency dispatcher & 1-touch national helpline dialers.
   - **Localization**: English (`en`), Nepali (`ne`), and Hindi (`hi`).

---

## Running Locally

```bash
# Navigate to driver-app
cd driver-app

# Install dependencies (if not already installed)
npm install

# Start the Expo development server
npm start
# or
npx expo start --android
```

---

## Building Android APK / Production Bundle

To build an independent Android standalone APK using EAS Build:
```bash
# Install EAS CLI globally if not already installed
npm install -g eas-cli

# Configure build
eas build --profile preview --platform android
```
