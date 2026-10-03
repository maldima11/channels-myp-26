# NUST Maize Yield Forecasting, Advisory & SMS Broadcast System

This repository houses the deployment architecture for the **National University of Science and Technology (NUST)** MPhil thesis hybrid biophysical crop yield forecasting model for **Umzingwane District, Matabeleland South**.

It connects predictive biophysical AI/XGBoost models to multi-channel interfaces: **Web Portal**, **Admin Credentials & SMS Broadcast Center**, **React Native Mobile App (Android & iOS)**, and **USSD Telephony**.

---

## Repository Structure

```
channels-myp-26/
├── README.md                  # Project overview, architecture, and SMS setup guide
├── api/                       # Biophysical AI Forecasting & SMS Gateway Microservice
│   ├── app.py                 # Flask REST API endpoints (predict, users, sms broadcast)
│   ├── users_db.json          # Central credentials, phone numbers & ward registry
│   ├── sms_logs.json          # Audit log for dispatched SMS advisories
│   └── requirements.txt       # Python dependencies (Flask, XGBoost, etc.)
├── web/                       # Web Portal & Admin Center
│   ├── index.html             # Multi-role portal (Farmer & Agritex Officer consoles)
│   ├── styles.css             # Glassmorphism dark/light UI design system
│   ├── app.js                 # Prediction UI, biophysical gauges, and PDF export
│   └── admin/                 # Administrator Console & SMS Broadcast Center
│       ├── index.html         # User Management & SMS Broadcast tabs
│       ├── styles.css         # Admin styling, live phone mockup, and tables
│       ├── app.js             # User CRUD, template composer, and SMS dispatch engine
│       └── README.md          # Admin Center & SMS quick-start guide
└── mobile/                    # React Native Mobile Application
    ├── App.js                 # Standalone mobile app with offline emulator fallback
    ├── package.json           # React Native dependencies
    └── android/               # Native Android configuration (APK / Play Store bundle)
```

---

## 1. Prediction & SMS API Service (`/api`)

The Python Flask microservice handles:
1. **Hybrid Biophysical & XGBoost Yield Inferences**: Returns probabilistic boundaries (q10 low, q50 median, q90 high in kg/ha) and agronomic advice.
2. **Centralized User Account Registry**: Stores and authenticates Agritex Officers and Farmers with phone numbers and assigned wards.
3. **SMS Advisory Gateway Engine**: Supports **Africa's Talking**, **Twilio**, or the **Built-in Mock Simulator** for local and offline testing.

### Setup & Launch
```bash
cd api
pip install -r requirements.txt
python app.py
```
*API runs at `http://127.0.0.1:5000`.*

---

## 🔮 FUTURE INTEGRATION: Live Cellular SMS Gateway Providers

The platform currently operates in a **High-Fidelity Sandbox & Simulation Mode**. In this mode:
- SMS dispatches are parsed, formatted with personalized tags (`{name}`, `{ward}`, `{date}`), rendered on the interactive smartphone simulation mockup, and recorded in the audit logs (`sms_logs.json`) without incurring cellular carrier billing charges.

To connect the system to real telecommunications towers (e.g. **Econet Wireless**, **NetOne**, and **Telecel Zimbabwe**) so farmers receive physical text messages on their mobile handsets, configure the following environment variables in production (e.g., in **Vercel Dashboard > Project Settings > Environment Variables**):

### 1. Africa's Talking (Recommended for Zimbabwe & Southern Africa)
* **Website**: [africastalking.com](https://africastalking.com)
* **Direct Network Coverage**: Econet (+263 77 / +263 78), NetOne (+263 71), Telecel (+263 73)
* **Environment Variables**:
  ```bash
  AFRICASTALKING_USERNAME="your_africastalking_username"
  AFRICASTALKING_API_KEY="your_live_api_key"
  AFRICASTALKING_SENDER_ID="AGRITEX"  # Optional registered alphanumeric sender ID
  ```

### 2. Twilio (Global Carrier Gateway)
* **Website**: [twilio.com](https://twilio.com)
* **Environment Variables**:
  ```bash
  TWILIO_ACCOUNT_SID="your_twilio_account_sid"
  TWILIO_AUTH_TOKEN="your_twilio_auth_token"
  TWILIO_FROM_NUMBER="+1234567890"  # Your Twilio-purchased SMS enabled number
  ```

### 3. Direct SMPP / Telecom Operator Integration (Optional Enterprise Roadmap)
* For large-scale national rollouts, a direct SMPP v3.4 connection can be established with Econet Wireless or NetOne VAS gateways via a high-throughput queue daemon.

> **Zero Code Change Activation**: The backend automatically detects when live credentials are set and dynamically switches from `NUST Agritex SMS Simulator (Sandbox Mode)` to `Africa's Talking Live Gateway` or `Twilio Live SMS Gateway`.

---

### Key API Endpoints
* **`POST /api/predict`**: Computes quantile yield forecasts based on ward, variety, precipitation, and heat stress.
* **`GET /api/users`** / **`POST /api/users`** / **`PUT /api/users/<username>`** / **`DELETE /api/users/<username>`**: Manages user directory (Name, Username, Role, Phone, Ward).
* **`POST /api/sms/broadcast`**: Dispatches targeted SMS broadcasts to farmers filtered by Ward or Manual Numbers with dynamic placeholder merging (`{name}`, `{ward}`, `{date}`).
* **`POST /api/sms/send`**: Dispatches a single SMS advisory to a specific phone number.
* **`GET /api/sms/logs`**: Retrieves the audit history of sent SMS broadcasts.
* **`DELETE /api/sms/logs`**: Clears SMS dispatch history.

---

## 2. Web Portal & Admin Center (`/web`)

### A. Main Yield Portal (`/web/index.html`)
* **Multi-Role Access**: Dedicated sign-in paths for **Farmers** and **Agritex Officers**.
* **Live Biophysical Controls**: Steppers and interactive sliders for Precipitation and Thermal Stress.
* **Meters & Gauges**: Real-time **Water Deficit Index (WDI)** and **Heat Accumulation Stress** gauges.
* **Presentable PDF Export**: One-click **"Download Report"** button that invokes browser Print-to-PDF formatting (no `.html` files).

### B. Admin & SMS Advisory Center (`/web/admin/index.html`)
* **User & Role Management**:
  * Create, edit, and delete **Farmer** and **Agritex Officer** accounts.
  * Assign phone numbers (*e.g., `+263771234567`*) and specific location wards (Wards 1–20).
  * Real-time search and filtering directory.
* **SMS Advisory Broadcast Console**:
  * **Targeting Filter**: Select specific ward (*e.g., Ward 12*) or broadcast to all registered farmers.
  * **Preset Advisory Templates**:
    - *⚠️ Drought Early Warning & Moisture Conservation*
    - *🌱 Planting Window & Cultivar Selection*
    - *🧪 Top-Dressing & Fertilizer Scheduling*
    - *🐛 Fall Armyworm & Pest Surveillance*
    - *🌾 Pre-Harvest & Storage Safety*
    - *✍️ Custom Advisory*
  * **Pull Live AI Model Advice**: Automatically queries `/api/predict` for the selected ward to generate localized SMS advice.
  * **Live Smartphone Mockup Preview**: Renders dynamic placeholders in real-time.
  * **SMS Segment Counter**: 160-character segment tracker to optimize telco costs.
  * **Audit Log Viewer**: Shows sent date, recipient count, gateway used, and message preview.

### Default Login Accounts
| Role | Username | Password | Default Ward |
| :--- | :--- | :--- | :--- |
| **Agritex Officer** | `agritex_officer` | `nust_maize_2026` | All Wards |
| **Farmer** | `johen_doe` | `12345` | Ward 12 (Ntabazinduna) |
| **Farmer** | `farmer` | `farmer2026` | Ward 15 (Esigodini Centroid) |
| **Administrator** | `admin` | `admin123` | All Wards |

---

## 3. React Native Mobile Application (`/mobile`)

The mobile application runs on Android and iOS devices, featuring biophysical sliders, quantile charts, and an offline biophysical emulator fallback.

### Features
* **Android Status Bar Inset**: Content aligns below device battery, time, and notch areas.
* **Far-End Dropdown Indicators**: Location ward and maize cultivar dropdown buttons have arrows (`▾`) aligned to the far right.
* **Presentable PDF / Native Share Sheet**: Tapping **"Download & Share Report"** opens the device's native sharing menu to save or share reports as PDF summaries without `.html` extensions.
* **Cross-Platform Authentication**: Works seamlessly with all accounts created in the Admin panel.

### Building & Running Standalone APK
```bash
cd mobile/android
./gradlew assembleRelease
```
*Generated Standalone APK:*
`mobile/android/app/build/outputs/apk/release/app-release.apk`

---

## License & Copyright

© 2026 National University of Science and Technology (NUST). All rights reserved.  
Thesis Hybrid Biophysical Modeling for Umzingwane District, Matabeleland South.
