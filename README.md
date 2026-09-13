# Unified Transportation Booking Platform (MERN Stack)
### Bus Booking + EV-Sewa + Car Booking Management System

A real, production-ready full-stack MERN application connecting a **Driver Panel**, a **Super Admin Panel**, and REST API infrastructure prepared for the **Customer Android App**, using **JavaScript ONLY** (No TypeScript).

---

## 📁 Repository Structure

```
BUS-EV-SEWA-CAR-BOOKING/
├── backend/               # Common Node.js + Express.js REST API + MongoDB/Mongoose
│   ├── src/
│   │   ├── config/        # MongoDB connection & JWT settings
│   │   ├── controllers/   # Auth, Driver, and Super Admin Controllers
│   │   ├── middleware/    # JWT verification, driverAuth, adminAuth, errorHandler
│   │   ├── models/        # Mongoose Schema Definitions
│   │   ├── routes/        # Auth, Driver, and Admin Routes
│   │   └── utils/         # Seed script with realistic Indian transportation data
│   ├── server.js          # Express server entry point
│   ├── package.json
│   └── .env.example
├── driver-panel/          # React.js Driver Dashboard (Port 3000)
│   ├── src/
│   │   ├── components/    # Sidebar (10 items), Header, StatusBadge, StatCards, Modals
│   │   ├── pages/         # Dashboard, Profile, Vehicle, Requests, History, Earnings, Documents, Status, Support, Login
│   │   ├── context/       # Driver AuthContext with JWT session persistence
│   │   ├── services/      # Axios REST API client
│   │   └── styles/        # Responsive CSS theme
│   ├── index.html
│   └── package.json
├── admin-panel/           # React.js Super Admin Dashboard (Port 3001)
│   ├── src/
│   │   ├── components/    # AdminSidebar, AdminHeader, Badges, Modals
│   │   ├── pages/         # Dashboard (13 counters), Customers, Drivers, Vehicles, Bus, EV-Sewa, Car, 3% Compensation, Insurance, Policies, Reports, Service Control
│   │   ├── context/       # Admin AuthContext
│   │   ├── services/      # Super Admin REST API client
│   │   └── styles/        # Enterprise Dark Navy / Clean CSS theme
│   ├── index.html
│   └── package.json
├── database/
│   └── seed.js            # Direct seed runner script
├── customer-app/
│   └── README.md          # Android App architectural guide & API endpoints
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Common Backend (`/backend`)
```bash
cd backend
npm install
npm run seed     # Seeds realistic Indian transport dataset
npm start        # Starts server on http://localhost:5000
```

### 2. Driver Panel (`/driver-panel`)
```bash
cd driver-panel
npm install
npm run dev      # Starts Driver Panel on http://localhost:3000
```
- **Demo Driver Login**: `driver@platform.com` / `driver123` (or Phone: `+919876543210`)

### 3. Super Admin Panel (`/admin-panel`)
```bash
cd admin-panel
npm install
npm run dev      # Starts Super Admin Panel on http://localhost:3001
```
- **Demo Admin Login**: `admin@platform.com` / `admin123`

---

## 🔑 Key Features Implemented

### A. Driver Panel
1. **Dashboard**: Live trip counters, driver status, assigned vehicle summary, recent booking requests, recent history, earnings summary.
2. **My Profile**: Full name, mobile number, profile photo, vehicle details, driver duty status.
3. **Assigned Vehicle**: Bus/EV/Car model, category, seating capacity, owner contact, RC, insurance policy, and fitness safety certificates.
4. **Booking Requests**: Accept / Reject incoming trip requests in real-time.
5. **Booking History**: Chronological log of past trips with route, passenger, and fare details.
6. **Earnings / Payment Records**: Trip earnings records with transaction references (strictly no wallet).
7. **Driver Documents**: Verification tracking for Driving Licence, RC, Fleet Insurance, and Fitness Certificate.
8. **Driver Status**: Active / Inactive on-duty toggle (inactive/blocked drivers cannot take new bookings).
9. **Support**: 24x7 Driver Helpline, email, and emergency breakdown contacts (no unrequested chat).
10. **Logout**: Confirmation modal and JWT token invalidation.

### B. Super Admin Panel
1. **Dashboard**: 13 key real-time counters (Customers, Drivers, Active/Inactive/Blocked Vehicles, Bookings, Payments, Pending Verifications, Cancellations, 3% Compensations, Accident Insurance).
2. **Customer Management**: User directory with lifetime spend tracking and status control.
3. **Driver Management & Verification**: Add, Edit, Verify documents (Approve/Reject DL, RC, Insurance, Fitness), and change driver status.
4. **Vehicle Management**: Add & manage Buses, EV-Sewa electric shuttles, and Cars.
5. **Specific Service Modules**: Dedicated management views for Bus, EV-Sewa, and Car fleets.
6. **Driver Assignment**: Vehicle-to-driver reassignment workspace.
7. **Compliance Records**: RC, Driving Licence, Fleet Insurance, and Vehicle Fitness records repository.
8. **Booking Management**: Comprehensive booking stream across all 3 services.
9. **Payment Management**: Audited gross revenue, driver payout settlements, and refund logs.
10. **Cancellation Management**: Trip cancellation reasons and refund disbursement.
11. **3% Customer Service Compensation Management**: Dedicated workflow for platform technical glitch compensation (e.g. ₹30 on ₹1,000 booking) - strictly NOT admin commission.
12. **Accident Insurance Records**: Passenger safety policy coverage logs with the mandatory statutory disclaimer (*"Coverage up to ₹5,00,000 is subject to the actual insurer policy, eligibility, premium, exclusions and claim approval"*).
13. **Notifications**: Platform announcements and safety bulletins.
14. **Customer Support**: Ticket tracking and resolution desk.
15. **Terms & Policies**: Dynamic editor for Platform Terms, Privacy Policy, Driver Code of Conduct, Cancellation Policy, and Disclaimers.
16. **Basic Reports**: Summary tables for Bookings, Payments, Cancellations, Compensations, and Insurance.
17. **Service Control**: Independent operational switches for Bus, EV-Sewa, and Car booking channels.
