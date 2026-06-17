# Multi-Channel Maize Yield Forecasting & Advisory System

This repository contains the deployment components for the National University of Science and Technology (NUST) MPhil thesis hybrid yield prediction model. It provides separate codebases and environments for three key distribution channels (USSD, Web, and Mobile) connected to a central biophysical prediction API.

---

## Repository Structure

```
deployment_channels/
├── README.md                  # This file
├── api/                       # Biophysical Yield Prediction API (Python Flask)
│   ├── app.py                 # REST endpoint for predictions and validation
│   └── requirements.txt       # Python environment dependencies
├── ussd/                      # USSD Telephony Server (Node.js Express)
│   ├── server.js              # State engine decoding session callbacks & calling API
│   └── package.json           # Node configuration and script runners
├── web/                       # Modernized Web Portal Dashboard (HTML/CSS/JS)
│   ├── index.html             # Authorized portal gate & main workspace
│   ├── styles.css             # Premium glassmorphism dark-mode styles
│   ├── app.js                 # AJAX request handlers, canvas charts, and report generator
│   └── package.json           # Local dev web server configuration
└── mobile/                    # Mobile Application View (React Native Component)
    ├── App.js                 # Styled mobile view, input sliders, and SVG chart graphics
    └── package.json           # React Native node packages
```

---

## 1. Prediction API (`/api`)
The core prediction engine runs as a lightweight Python microservice. It models the calibrated hybrid neural/tabular limits of the thesis models and returns the 10th (low), 50th (median), and 90th (high) percentile yield forecasts.

### Setup & Launch
1. Navigate to `/api` directory.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the Flask service:
   ```bash
   python app.py
   ```
   *The API will run on `http://127.0.0.1:5000`.*

### API Endpoints
*   **POST `/api/predict`**
    *   **Payload**:
        ```json
        {
          "ward": "Ward 12",
          "variety": "SC719",
          "precip": 0.65,
          "heat": 0.32,
          "sand": 62,
          "clay": 25
        }
        ```
    *   **Success Response (200 OK)**:
        ```json
        {
          "status": "success",
          "forecast": {
            "low": 650,
            "med": 920,
            "high": 1150,
            "variety": "SC719",
            "ward": "Ward 12",
            "precip": 0.65,
            "heat": 0.32,
            "sand": 62,
            "clay": 25,
            "advisory": "Standard Season Advisory:\n- Yield forecasts are favorable..."
          }
        }
        ```
    *   **Error Response (400 Bad Request)**:
        ```json
        {
          "status": "error",
          "message": "Maize cultivar 'PIONEER' is not supported by this calibration.",
          "valid_cultivars": ["SC301", "SC436", "SC529", "SC719"]
        }
        ```

---

## 2. USSD Telephony Server (`/ussd`)
Designed to interface with commercial telecommunications gateways (e.g., Africa's Talking USSD service), this server manages session states for smallholder farmers using basic feature phones.

### Setup & Launch
1. Navigate to `/ussd` directory.
2. Install Node packages:
   ```bash
   npm install
   ```
3. Start the callback listener:
   ```bash
   npm start
   ```
   *The server runs on `http://127.0.0.1:3000/ussd`.*

### USSD State Interaction Flow
*   **Initial Dial**: User dials `*140#` -> Receives `Select Ward:` prompt.
*   **Step 1**: User inputs ward option -> Receives `Select Variety:` menu list.
*   **Step 2**: User inputs variety selection. If they input `5` ("Other"), the USSD session returns an error explaining which varieties are supported and prompts them to go back.
*   **Step 3**: User inputs rain scenario (Drought, Normal, Wet) -> Server fetches predictions from `/api/predict` and displays final yield bounds and agricultural advice via `END` response.

---

## 3. Web Portal Dashboard (`/web`)
A highly polished, responsive dashboard gated by an Agritex Officer authentication screen.

### Credentials
*   **Username**: `agritex_officer`
*   **Password**: `nust_maize_2026`

### Setup & Launch
1. Navigate to `/web` directory.
2. Install packages and run dev server:
   ```bash
   npm install
   npm run dev
   ```
3. Open `http://localhost:8080` in your web browser.

---

## 4. Mobile Screen Component (`/mobile`)
Designed as a React Native screen component that can be integrated into the Agritex mobile app. It matches the dark mode glassmorphism theme and uses high-fidelity SVG graphics to chart the yield envelope ranges.

### Setup
1. Include `App.js` into your React Native project directory.
2. Run `npm install` inside the folder to align version configurations.
