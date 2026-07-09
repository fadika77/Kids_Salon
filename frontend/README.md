# Kids Barbershop – Frontend (React + Vite + Capacitor)

## Prerequisites

- Node.js 18+
- npm 9+
- For Android: Android Studio + JDK 17
- For iOS: Xcode 14+ (macOS only)

---

## 1. Setup

### Step 1 – Install dependencies

```bash
cd frontend
npm install
```

### Step 2 – Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
# URL of your backend API (no trailing slash)
VITE_API_URL=http://localhost:8000
```

> For a device on the same network, use your machine's local IP:
> `VITE_API_URL=http://192.168.1.100:8000`

---

## 2. Run in Development

Make sure the backend is running on port 8000, then:

```bash
npm run dev
```

Open: `http://localhost:5173`

---

## 3. Build for Production

```bash
npm run build
```

The built files will be in the `dist/` folder.

---

## 4. Mobile App with Capacitor

### Step 1 – Build the web app

```bash
npm run build
```

### Step 2 – Add mobile platforms

```bash
# Android
npm run cap:add:android

# iOS (macOS only)
npm run cap:add:ios
```

### Step 3 – Sync web assets to native

```bash
npm run cap:sync
```

Run this every time you rebuild the web app.

### Step 4 – Open in native IDE

```bash
# Open in Android Studio
npm run cap:open:android

# Open in Xcode (macOS only)
npm run cap:open:ios
```

### Step 5 – Build & run on device / emulator

**Android:**
1. Android Studio opens automatically
2. Connect your Android device (enable USB debugging) or use an emulator
3. Click the ▶ Run button in Android Studio

**iOS:**
1. Xcode opens automatically
2. Select your device or simulator
3. Click ▶ Run (you may need to set your Apple Developer team in Signing & Capabilities)

---

## 5. Important – API URL for Mobile Builds

When running on a real device, `localhost` points to the device itself, not your computer. Use your local IP address:

1. Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Update `.env`:
   ```
   VITE_API_URL=http://192.168.1.xxx:8000
   ```
3. Rebuild: `npm run build && npm run cap:sync`

For production, use your deployed backend URL:
```
VITE_API_URL=https://api.yourdomain.com
```

---

## 6. Project Structure

```
frontend/
├── public/
├── src/
│   ├── api/
│   │   ├── api.js        ← Base fetch wrapper
│   │   ├── auth.js       ← Auth API + localStorage helpers
│   │   ├── bookings.js   ← Customer booking API calls
│   │   └── admin.js      ← Admin API calls
│   ├── components/
│   │   ├── ProtectedRoute.jsx   ← Requires any login
│   │   ├── AdminRoute.jsx       ← Admin-only + Navbar layout
│   │   ├── CustomerRoute.jsx    ← Customer-only + BottomNav layout
│   │   ├── Navbar.jsx           ← Admin top navigation
│   │   ├── BottomNav.jsx        ← Customer bottom navigation
│   │   ├── Loading.jsx          ← Spinner component
│   │   └── Message.jsx          ← Error/success messages & toasts
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── CustomerHomePage.jsx
│   │   ├── ChooseAppointmentTypePage.jsx
│   │   ├── ChooseDatePage.jsx
│   │   ├── ChooseTimePage.jsx
│   │   ├── ConfirmBookingPage.jsx
│   │   ├── MyAppointmentsPage.jsx
│   │   ├── CustomerProfilePage.jsx
│   │   ├── AdminDashboardPage.jsx
│   │   ├── AdminSlotsPage.jsx
│   │   ├── AdminCreateSlotPage.jsx
│   │   ├── AdminEditSlotPage.jsx
│   │   ├── AdminBookingsPage.jsx
│   │   └── AdminSettingsPage.jsx
│   ├── styles/
│   │   └── global.css    ← All CSS (variables, components, utilities)
│   ├── App.jsx            ← Routes
│   └── main.jsx           ← React entry point
├── index.html
├── vite.config.js
├── capacitor.config.json
├── package.json
├── .env.example
└── README.md
```

---

## 7. App Flow

### Customer
```
/login  →  /home
         /home  →  /book  →  /book/date  →  /book/time  →  /book/confirm
         /my-appointments
         /profile
```

### Admin
```
/login  →  /admin/dashboard
         /admin/dashboard  →  /admin/slots  →  /admin/slots/create
                                              /admin/slots/edit/:id
         /admin/dashboard  →  /admin/bookings
         /admin/dashboard  →  /admin/settings
```

---

## 8. Default Credentials

After running the backend seed script:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@kidsbarbershop.com | Admin123! |

Customers register via the app.

---

## 9. Capacitor Config

`capacitor.config.json` sets:
- `appId`: `com.kidsbarbershop.app`
- `appName`: `Kids Barbershop`
- `webDir`: `dist`

Change the `appId` to something unique before publishing to app stores.
