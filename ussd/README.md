# NUST Maize Yield USSD Telephony Gateway (`/ussd`)

A production-grade, zero-dependency Node.js USSD telephony server engineered for smallholder farmers across all **20 administrative wards of Umzingwane District**, Matabeleland South, Zimbabwe. Compatible with **Africa's Talking**, **Econet Wireless VAS**, and **NetOne VAS** gateways.

---

## 1. Key Capabilities & Architecture

*   **All 20 Umzingwane Wards Supported**: Direct numeric entry (`1-20`) mapped to calibrated soil (sand/clay %) and local agro-ecological baselines (e.g., Ward 15 Esigodini, Ward 6 Mawabeni, Ward 12 Ntabazinduna, Ward 1 Nswazi).
*   **Bilingual Localization**:
    *   **English** (`en`)
    *   **isiNdebele** (`nd`) — the primary language spoken by rural smallholder farmers in Umzingwane.
*   **Certified Drought-Tolerant Hybrids**: Calibrated for Seed Co certified varieties:
    *   `SC301` (Ultra-Early / 110 days / High drought escape)
    *   `SC436` (Early / 120 days / Drought tolerant)
    *   `SC529` (Medium / 135 days / High yield potential)
    *   `SC719` (Late / 145+ days / Maximum yield with moisture conservation)
*   **Strict GSM 7-bit 160-Character Compliance**: Every single USSD screen and advisory message is strictly verified to fit within the 160-character budget of basic 2G feature phones (Nokia 105, Itel, Bontel).
*   **Hybrid Dual-Engine Architecture**:
    *   *Primary*: Real-time HTTP REST query to the central Python/Flask prediction API (`/api/predict`) with an aggressive 1.2-second timeout.
    *   *Autonomous Fallback*: Instant local biophysical calculation if the backend is down or unreachable, ensuring the telecom gateway never encounters a session drop.
*   **Zero-Dependency Node.js Core**: Operates using Node's standard `http` and `querystring` modules with zero npm packages required.

---

## 2. USSD Session State Flow

Dial: `*384*20#` (or dedicated shortcode)

```
[Screen 0] Dial Code (*384*20#)
   │
   ├── 1. English
   └── 2. isiNdebele
         │
[Screen 1] Enter Ward Number (1 - 20)
         │  (e.g., 15 for Esigodini, 6 for Mawabeni, 1 for Nswazi)
         │
[Screen 2] Select Certified Cultivar
         │  1. SC301 (Ultra-Early)
         │  2. SC436 (Early)
         │  3. SC529 (Medium)
         │  4. SC719 (Late)
         │
[Screen 3] Select Expected Rainfall Outlook
         │  1. Below Normal (Isomiso / Drought)
         │  2. Normal / Average
         │  3. Above Normal (Izulu Elinengi / High Rain)
         │
[Screen 4] END Advisory Screen (<= 160 chars) + SMS Copy Sent
            - Median & Range [q10 - q90] in kg/ha
            - Contextual agronomic recommendation (mulching, top-dressing, armyworm)
```

---

## 3. Running & Testing Locally

### A. Run Automated Regression & Compliance Test Suite
Tests all 20 wards, both languages, and verifies character limits:
```bash
node simulator.js
```

### B. Interactive Feature Phone Simulator (Terminal CLI)
Simulate dialing `*384*20#` on a feature phone right inside your terminal:
```bash
node simulator.js -i
```

### C. Run Standalone USSD HTTP Server
```bash
node server.js
```
The server listens on `http://127.0.0.1:3000`:
*   `GET /health` — Health check and supported ward metadata.
*   `POST /ussd` — Telecom gateway callback endpoint.

### D. Simulate Gateway POST via cURL
```bash
# Initial Dial
curl -X POST http://127.0.0.1:3000/ussd \
  -d "sessionId=sess001&serviceCode=*384*20#&phoneNumber=+263771234567&text="

# Complete English Query (Ward 15, SC529, Normal Rain)
curl -X POST http://127.0.0.1:3000/ussd \
  -d "sessionId=sess001&serviceCode=*384*20#&phoneNumber=+263771234567&text=1*15*3*2"

# Complete isiNdebele Query (Ward 6, SC301, Drought Rain)
curl -X POST http://127.0.0.1:3000/ussd \
  -d "sessionId=sess002&serviceCode=*384*20#&phoneNumber=+263771234567&text=2*6*1*1"
```
