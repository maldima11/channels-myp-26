# NUST Yield Portal - Admin & SMS Broadcast Center (`/web/admin`)

This module provides the central administration console and **SMS Advisory Broadcast Center** for the NUST Maize Yield Forecasting System. It is bundled within the `/web` frontend directory for unified hosting and static deployments.

---

## Key Features

### 1. User & Contact Directory Management
* **Account Provisioning**: Register and manage login credentials for **Farmers** and **Agritex Officers**.
* **Contact & Location Attribution**: Assign mobile phone numbers (*e.g., `+263 77 123 4567`*) and primary administrative wards (Umzingwane Wards 1 to 20).
* **Live Directory Search**: Filter user tables in real-time by name, ward, phone number, or role.
* **Synchronized Backend & Local Storage**: Auto-syncs with the Flask API (`/api/users`) with an offline browser `localStorage` fallback.

### 2. SMS Advisory Broadcast Console
* **Targeted Recipient Selection**: Broadcast advisory SMS alerts filtered by **Ward** (*e.g., Ward 12 (Ntabazinduna)*) or **All Wards** (District-Wide).
* **Advisory Presets**:
  * ⚠️ *Drought Early Warning & Moisture Conservation*
  * 🌱 *Planting Window & Cultivar Guidance*
  * 🧪 *Top-Dressing & Fertilizer Timing*
  * 🐛 *Fall Armyworm & Pest Surveillance*
  * 🌾 *Harvest Timing & Storage Safety*
  * ✍️ *Custom Advisory*
* **Pull Live AI Model Advice**: Integrates directly with `/api/predict` to generate localized recommendations and quantile yield ranges for the selected ward.
* **Dynamic Tag Interpolation**: Supports `{name}`, `{ward}`, and `{date}` placeholders for personalized farmer delivery.
* **Live Smartphone Mockup**: Displays a real-time recipient preview as you compose your advisory.
* **Segment Tracker**: Live counter calculates characters and standard SMS segment counts (160 chars / segment).
* **Audit Logs**: Inspect previous dispatches, recipient counts, timestamps, and delivery gateways.

---

## SMS Gateway Configuration

The system connects to the Flask API backend (`/api/sms/broadcast`), which can be configured for live telco delivery:

1. **Africa's Talking Gateway (Zimbabwe & Southern Africa)**:
   ```bash
   export AFRICASTALKING_USERNAME="your_username"
   export AFRICASTALKING_API_KEY="your_api_key"
   export AFRICASTALKING_SENDER_ID="AGRITEX"
   ```
2. **Twilio SMS Gateway**:
   ```bash
   export TWILIO_ACCOUNT_SID="your_account_sid"
   export TWILIO_AUTH_TOKEN="your_auth_token"
   export TWILIO_FROM_NUMBER="+1234567890"
   ```
3. **Sandbox Simulator Mode**:
   If no gateway credentials are configured, the console operates in **Mock Simulator Mode**, logging all personalized dispatches to `api/sms_logs.json` for risk-free testing and demonstrations.

---

## Quick Start
1. Start the backend API: `python api/app.py`
2. Open `web/admin/index.html` in your browser.
3. Switch between **User & Role Management** and **SMS Advisory Broadcast Center** using the top navigation tabs.
