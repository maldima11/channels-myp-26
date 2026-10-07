# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Multi-Channel Agricultural Decision Support System (DSS) for Maize Yield Forecasting & Extension Advisory
**Institution:** National University of Science and Technology (NUST), Bulawayo, Zimbabwe  
**Target Agro-Ecological Zone:** Umzingwane District (Natural Regions IV & V)  
**System Designation:** NUST Agri-Yield AI DSS  
**Version:** 2.4.0 (Production-Ready)  
**Document Classification:** Academic & Engineering Specification  

---

## 1. Executive Summary & Academic Context

Smallholder farming systems in semi-arid southern Zimbabwe (specifically Umzingwane District in Matabeleland South) operate under severe climate vulnerability characterized by erratic precipitation (<450–650 mm annually), frequent mid-season dry spells, and poor soil fertility (high sand/clay heterogeneity). Agricultural extension officers (Agritex) face an unfavorable officer-to-farmer ratio (exceeding 1:800), severely hindering timely, site-specific agronomic guidance.

The **NUST Agri-Yield AI DSS** bridges this technological and spatial divide through an integrated, multi-tier artificial intelligence platform. The system couples machine learning yield quantile estimation ($q_{10}, q_{50}, q_{90}$) with biophysical stress diagnostic models (Water Deficit and Heat Stress Indices) and local-dialect speech synthesis.

To guarantee equitable access across the socio-economic and infrastructural spectrum, the system implements a **Quad-Channel Deployment Architecture**:
1. **Web Advisory & Analytics Portal** (Desktop/Tablet/Workstation for Agritex Supervisors, Researchers, Policy Planners).
2. **Cross-Platform Mobile Application** (Android & iOS for Extension Agents & Connected Smallholders).
3. **Interactive USSD Gateway (`*384#`)** (GSM 2G protocol for basic feature phone access without internet connectivity).
4. **Targeted SMS Broadcast & Alert Center** (Cellular push notifications for localized climate warnings and cultivar recommendations).

---

## 2. System Architecture & Common Backend Infrastructure

All four channels communicate with a unified, high-performance biophysical computing backend:

```
                                  +---------------------------------------------------+
                                  |         NUST Central Backend Infrastructure       |
                                  |                                                   |
                                  |   +-------------------+   +--------------------+  |
                                  |   | Flask REST Engine |   | Central SQLite DB  |  |
                                  |   | (Port 5000)       |   | (Thread-Safe WAL)  |  |
                                  |   +---------+---------+   +----------+---------+  |
                                  |             |                        |            |
                                  |   +---------+---------+              |            |
                                  |   | Meta MMS TTS      |              |            |
                                  |   | (Ndebele & Shona) |              |            |
                                  |   +-------------------+              |            |
                                  +-------------^------------------------^------------+
                                                |                        |
         +--------------------------------------+------------------------+------------------------------------+
         |                                      |                        |                                    |
+--------v---------+                  +---------v--------+      +--------v---------+                +---------v--------+
|    CHANNEL 1     |                  |    CHANNEL 2     |      |    CHANNEL 3     |                |    CHANNEL 4     |
|   Web Advisory   |                  |   Mobile App     |      |   USSD Gateway   |                |   SMS Broadcast  |
|      Portal      |                  | (Android / iOS)  |      |     (*384#)      |                |      Center      |
|                  |                  |                  |      |                  |                |                  |
| - Ward Presets   |                  | - Offline Cache  |      | - 2G GSM Stack   |                | - Batch Dispatch |
| - Stress Gauges  |                  | - Native Audio   |      | - Zero Data Req  |                | - Localized SMS  |
| - Vector PDF Rep |                  | - Direct Auth    |      | - Menu Traversal |                | - Delivery Audit |
+------------------+                  +------------------+      +------------------+                +------------------+
```

### Shared Core Services
- **Flask REST API (`/api/`)**: Evaluates biophysical yield projections, crop calendar schedules, and soil nutrient balancing.
- **Centralized Authentication (`/api/auth/*`)**: Role-based access control (Admin, Agritex Officer, Farmer) authenticated against central SQLite database.
- **Speech Synthesis Engine (`/api/tts`)**: Meta MMS (Massive Multilingual Speech) VITS neural checkpoints generating natural-language wav audio in **isiNdebele** (`nde`) and **chiShona** (`sna`).
- **Telemetry & Audit Registry**: Unified logging for farm queries, ward-level advisory trends, and broadcast metrics.

---

## 3. Detailed Channel Specifications

### Channel 1: Web Advisory & Administration Portal

#### 3.1 Target Persona & Objective
- **Primary Users:** Senior Agritex Officers, Agronomic Researchers, District Agricultural Planners.
- **Environment:** District offices, desktop browsers, field tablets with broadband/4G.
- **Core Purpose:** High-resolution biophysical modeling, multi-scenario simulation, PDF report issuance, and user management.

#### 3.2 Key Functional Features
1. **Interactive Biophysical Simulation Canvas:**
   - Sliders for Precipitation (150–900 mm), Mean Temperature (18–38°C), Sand Fraction (10–85%), and Clay Fraction (5–55%).
   - Immediate mathematical gauge synchronization for **Water Deficit Index (WDI)** and **Heat Stress Index (HSI)**.
2. **Yield Quantile Distribution Visualizer:**
   - Visual distribution rendering of $q_{10}$ (Adverse), $q_{50}$ (Expected Median), and $q_{90}$ (Optimal Potential) yield in t/ha.
3. **Bilingual Audio Advisory Player:**
   - Dedicated Audio Recommendation Console with native HTML5 audio waveform controls, voice language selector (Ndebele / Shona), dynamic playback speed, and download capability.
4. **Vector Report Generation Engine:**
   - Embedded jsPDF and html2pdf client-side rendering engine generating branded advisory dossiers with NUST seal, ward coordinates, agronomic timeline, and sign-off fields.
5. **Administrative Console (`/admin`):**
   - User creation, role toggling, farmer account provisioning, and live SMS campaign dispatch.

#### 3.3 Non-Functional Requirements
- **Lighthouse Performance Score:** >90 on Desktop/Tablet.
- **Design System:** Custom CSS Glassmorphism with dark/light dynamic theme switching.
- **Cross-Browser Compatibility:** Chromium 100+, Safari 15+, Firefox 98+.

---

### Channel 2: Cross-Platform Mobile Application (Android & iOS)

#### 3.1 Target Persona & Objective
- **Primary Users:** Mobile Field Extension Agents, Lead Farmers, Agro-Dealers.
- **Environment:** Rural in-field evaluations, spotty 3G/EDGE connectivity, handheld smartphones.
- **Core Purpose:** Rapid farm profiling, instant yield calculation, and accessible audio advisory for farmers with low reading literacy.

#### 3.2 Key Functional Features
1. **Direct In-App Registration & Secure Login:**
   - Native authentication interface communicating directly with central backend SQLite database.
   - Self-registration with district/ward auto-assignment and persistent session caching.
2. **Simplified Biophysical Assessment Input:**
   - Fast picker selection for Umzingwane Wards (Wards 1 through 20) with automatic retrieval of baseline soil textures.
   - Cultivar selector (SC719, SC513, PAN53, ZM521, Pioneer 30G19).
3. **Indigenous Language Audio Advisory Engine:**
   - Full integration with MMS neural voice backend.
   - Built-in audio controller with native sound playback, visual buffering indicator, and automatic script transliteration.
4. **Direct Phone Call Hotline Integration:**
   - One-tap dialer linking the field officer or farmer directly to the Umzingwane District Agritex Emergency Advisory Desk.
5. **Local Persistence:**
   - Offline fallback caching for historical predictions and user credentials via AsyncStorage.

#### 3.3 Native Packaging & Branding
- **Android Target:** API Level 34 (Android 14) with backward compatibility down to Android 7.0 (Nougat).
- **Launcher Iconography:** Adaptive square and circular mipmap assets (`ic_launcher.png`, `ic_launcher_round.png`) across all 5 screen densities (mdpi to xxxhdpi).
- **iOS Target:** iOS 14.0+ with full vector asset catalog support (`icon-1024.png`, `@3x`, `@2x`).

---

### Channel 3: Interactive USSD Gateway (`*384#`)

#### 3.1 Target Persona & Objective
- **Primary Users:** Rural Smallholder Farmers without smartphones, living in deep-rural zones with zero internet coverage.
- **Device Support:** Basic GSM 2G feature phones (e.g., Nokia 105, Itel, neon).
- **Core Purpose:** Zero-data, menu-driven yield estimation, cultivar matching, and emergency drought advisory.

#### 3.2 Protocol Architecture & Protocol Flow
- **Protocol:** USSD over GSM signaling layer (Phase 2+ standard).
- **Session Duration SLA:** Response rendered within <1,200 ms to prevent telco session timeout (20s limit).
- **Gateway Bridge:** Node.js USSD Server running on Port 3000, interfacing with Africa's Talking USSD Sandbox/Production Gateway.

#### 3.3 Menu Traversal Hierarchy
```
[User Dials *384#]
    |
    +--> 1. Select Language / Khetha Ulimi / Sarudza Mutauro
    |        |-- 1. English
    |        |-- 2. isiNdebele
    |        |-- 3. chiShona
    |
    +--> 2. Select Ward in Umzingwane
    |        |-- 1. Ward 1 (Esigodini)
    |        |-- 2. Ward 5 (Mawabeni)
    |        |-- 3. Ward 9 (Matopos Border)
    |        |-- 4. Ward 14 (Dula / Mtshabezi)
    |        +-- [Next >>]
    |
    +--> 3. Select Cultivar
    |        |-- 1. SC513 (Early Maturing)
    |        |-- 2. SC719 (High Yielding)
    |        |-- 3. ZM521 (Drought Tolerant)
    |
    +--> 4. Real-Time Advisory Output (Paged)
             |-- Predicted Yield Range (t/ha)
             |-- Water Stress Alert (Deficit / Normal)
             |-- Basal/Top-Dress Fertilizer Window
             +-- 1. Receive Full Advisory via SMS
```

---

### Channel 4: Automated & Bulk SMS Advisory Broadcast Center

#### 3.1 Target Persona & Objective
- **Primary Users:** All registered farmers in Umzingwane District.
- **Trigger Mechanisms:** Agritex Admin scheduled broadcasts, emergency weather warnings (Met Department), and USSD follow-up dispatches.
- **Core Purpose:** Push delivery of actionable agronomic instructions directly into the farmer's pocket without requiring user initiation.

#### 3.2 Technical Capabilities
1. **Targeted Ward Segmentation:**
   - Agritex operators can filter broadcasts by specific wards (e.g., Ward 5 only) or issue district-wide alerts.
2. **Multilingual Template Engine:**
   - Pre-formatted dynamic templates in English, isiNdebele, and chiShona:
     - *Ndebele:* `NUST AgriAlert: Isixwayiso sesomiso Ward 5. Linyelani umumbu we SC513. Faka umquba ekuqaleni kweviki.`
     - *Shona:* `NUST AgriAlert: Yambiro yekusanaya kwemvura Ward 5. Dyai mbeu ye SC513. Isai fotereza pakutanga kwevhiki.`
3. **Delivery Status & Audit Logging:**
   - Real-time logging of phone numbers, ward associations, carrier dispatch status (`Delivered`, `Sent`, `Pending`), and error auditing.

---

## 4. Brand Identity & Visual Asset System

The visual identity embodies academic prestige, technological innovation, and sustainable agro-ecological stewardship.

### 4.1 Heraldic Logo Specification
- **Shield Silhouette:** Dual-bordered heraldic shield representing academic institutional authority (NUST) and crop resilience against adverse weather shocks.
- **Golden Maize Cob:** Stylized cob with 12 distinct kernels symbolizing agricultural abundance, harvest optimization, and hybrid seed technology.
- **Emerald Foliage:** Dual curving leaves curling outward, signifying photosynthetic vitality, soil health, and organic sustainability.
- **Neural Circuit Traces & Nodes:** Cyan circuit lines radiating from the shield base, denoting artificial intelligence, machine learning inference, and digital extension connectivity.
- **Institutional Banner:** "NUST AGRI-YIELD AI" ribbon grounding the crest.

### 4.2 Official Color Matrix
| Tone Name | Hex Code | Usage |
|---|---|---|
| Academic Navy | `#0b1329` – `#1e293b` | Primary background, heraldic shield field |
| Harvest Gold | `#f59e0b` – `#fbbf24` | Maize kernels, yield indicators, highlights |
| Agro Emerald | `#10b981` – `#059669` | Leaves, success states, farmer portal theme |
| AI Cyan | `#38bdf8` – `#0284c7` | Neural circuitry, model telemetry, data charts |
| Institutional Indigo | `#6366f1` – `#818cf8` | Agritex officer console, administrative badges |

### 4.3 Asset Manifest Across Platforms
- **Web Portal:**
  - Vector SVG: `web/static/logo.svg`
  - High-Res Icons: `web/static/logo-512.png`, `web/static/logo-192.png`
  - Favicons: `web/static/favicon.svg`, `web/static/favicon.png`
- **Mobile Application:**
  - Asset bundle: `mobile/assets/logo.png`, `mobile/assets/logo-512.png`
  - Android Mipmap (`ic_launcher.png`, `ic_launcher_round.png`):
    - `mipmap-mdpi` (48x48)
    - `mipmap-hdpi` (72x72)
    - `mipmap-xhdpi` (96x96)
    - `mipmap-xxhdpi` (144x144)
    - `mipmap-xxxhdpi` (192x192)
  - iOS AppIcon: `icon-1024.png`, `icon-180.png`, `icon-120.png`

---

## 5. Academic Significance & Thesis Defense Matrix

| Evaluation Dimension | Traditional Agritex Extension | NUST Agri-Yield Multi-Channel DSS |
|---|---|---|
| **Coverage & Reach** | Restricted to farm visits (~1:800 officer ratio) | Pervasive: 100% reachable via GSM USSD/SMS + Mobile App |
| **Literacy Barrier** | Text-heavy paper bulletins | Eliminated via Indigenous Neural Speech Synthesis (MMS) |
| **Infrastructural Barrier** | Dependent on broadband / physical presence | Operates over 2G GSM cellular signaling without internet |
| **Advisory Precision** | Generic regional recommendations | Site-specific: 20 wards, calibrated soil sand/clay, quantile ML |
| **Verification & Accountability** | No audit trail of recommendations | Central SQLite WAL database logging all farmer queries & alerts |

---

## 6. Verification, Deployment & Health Monitoring

1. **Backend API Health Check:**
   ```bash
   curl -s http://127.0.0.1:5000/api/health | jq .
   ```
2. **USSD Sandbox Tunnel Verification:**
   ```bash
   curl -s http://127.0.0.1:3000/health
   ```
3. **MMS Voice Audio Generation Check:**
   ```bash
   curl -X POST http://127.0.0.1:5000/api/tts \
     -H "Content-Type: application/json" \
     -d '{"text": "Salibonani balimi base Umzingwane", "lang": "nde"}'
   ```
4. **Android Production Build:**
   ```bash
   cd mobile/android && ./gradlew assembleRelease
   ```

---
*Signed & Certified for Academic Defense by the Department of Computer Science & Agronomic Engineering, National University of Science and Technology (NUST).*
