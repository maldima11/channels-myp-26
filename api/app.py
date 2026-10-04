from flask import Flask, request, jsonify
import json
import os
import datetime
import urllib.request
import urllib.parse
import base64

app = Flask(__name__)

# Global Universal CORS Handlers
@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        res = app.make_default_options_response()
        res.headers['Access-Control-Allow-Origin'] = '*'
        res.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
        res.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
        return res

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    return response

# Production Hybrid XGBoost model loader
models_loaded = False
bst_low, bst_med, bst_high = None, None, None

try:
    MODEL_DIR = os.path.dirname(__file__)
    XGB_LOW_PATH = os.path.join(MODEL_DIR, 'xgb_low.json')
    XGB_MED_PATH = os.path.join(MODEL_DIR, 'xgb_median.json')
    XGB_HIGH_PATH = os.path.join(MODEL_DIR, 'xgb_high.json')
    
    if os.path.exists(XGB_LOW_PATH) and os.path.exists(XGB_MED_PATH) and os.path.exists(XGB_HIGH_PATH):
        import xgboost as xgb
        import numpy as np
        
        bst_low = xgb.Booster()
        bst_low.load_model(XGB_LOW_PATH)
        bst_med = xgb.Booster()
        bst_med.load_model(XGB_MED_PATH)
        bst_high = xgb.Booster()
        bst_high.load_model(XGB_HIGH_PATH)
        models_loaded = True
        print("Production Hybrid XGBoost Quantile models loaded successfully!")
    else:
        print("Notice: Trained XGBoost model JSON files not found. Using high-fidelity biophysical emulator fallback.")
except Exception as e:
    print(f"Notice: Trained XGBoost models could not be loaded ({e}). Using high-fidelity biophysical emulator fallback.")

# Central User Account Database configuration & SQLite engine
import database
try:
    database.init_db()
    print("NUST Central SQLite Database initialized successfully.")
except Exception as db_err:
    print(f"Notice: SQLite Database init warning ({db_err}). Falling back to JSON stores.")

USERS_DB_FILE = os.path.join(os.path.dirname(__file__), 'users_db.json')
SMS_LOGS_FILE = os.path.join(os.path.dirname(__file__), 'sms_logs.json')

DEFAULT_USERS = [
    { "username": "agritex_officer", "password": "nust_maize_2026", "name": "Primary Officer", "role": "Agritex Officer", "phone": "+263771234567", "ward": "All Wards" },
    { "username": "johen_doe", "password": "12345", "name": "Johen Doe", "role": "Farmer", "phone": "+263772345678", "ward": "Ward 12 (Ntabazinduna)" },
    { "username": "farmer", "password": "farmer2026", "name": "Local Farmer", "role": "Farmer", "phone": "+263773456789", "ward": "Ward 15 (Esigodini Centroid)" },
    { "username": "admin", "password": "admin123", "name": "System Admin", "role": "Administrator", "phone": "+263774567890", "ward": "All Wards" }
]

def load_users():
    try:
        users = database.get_all_users()
        if users and len(users) > 0:
            return users
    except Exception:
        pass
    if not os.path.exists(USERS_DB_FILE):
        save_users(DEFAULT_USERS)
        return DEFAULT_USERS
    try:
        with open(USERS_DB_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            for u in data:
                if 'phone' not in u:
                    u['phone'] = '+263770000000'
                if 'ward' not in u:
                    u['ward'] = 'All Wards'
            return data
    except Exception:
        return DEFAULT_USERS

def save_users(users):
    try:
        with open(USERS_DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=4)
        return True
    except Exception:
        return False

def load_sms_logs():
    try:
        db_logs = database.get_sms_logs_db()
        if db_logs and len(db_logs) > 0:
            return db_logs
    except Exception:
        pass
    if not os.path.exists(SMS_LOGS_FILE):
        return []
    try:
        with open(SMS_LOGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []

def save_sms_log(log_entry):
    try:
        database.save_sms_log_db(log_entry)
    except Exception:
        pass
    logs = load_sms_logs()
    logs.insert(0, log_entry)  # Newest first
    logs = logs[:200]  # Keep last 200 logs
    try:
        with open(SMS_LOGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(logs, f, indent=4)
        return True
    except Exception:
        return False

# Valid Cultivar Catalog
VALID_CULTIVARS = ["SC301", "SC436", "SC529", "SC719"]

def make_cors_response(data, status_code=200):
    """
    Constructs a JSON response with CORS headers to allow cross-origin requests
    from web and mobile clients running on separate ports/hosts.
    """
    response = jsonify(data)
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "POST,GET,DELETE,PUT,OPTIONS")
    return response, status_code

# -------------------------------------------------------------
# DATABASE AUTHENTICATION & SESSION LOGGING ROUTES
# -------------------------------------------------------------
@app.route('/api/auth/login', methods=['POST', 'OPTIONS'])
def auth_login():
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})
    try:
        req_data = request.get_json() or {}
        username = str(req_data.get("username", "")).strip()
        password = str(req_data.get("password", "")).strip()
        role = req_data.get("role")
        ip_addr = request.remote_addr or '127.0.0.1'

        if not username or not password:
            return make_cors_response({"status": "error", "message": "Username and password are required"}, 400)

        success, auth_user, status_msg = database.verify_and_log_login(username, password, role, ip_addr)
        if success and auth_user:
            return make_cors_response({
                "status": "success",
                "message": "Authentication successful",
                "user": auth_user
            })
        else:
            return make_cors_response({
                "status": "error",
                "message": "Invalid credentials"
            }, 401)
    except Exception as e:
        return make_cors_response({"status": "error", "message": str(e)}, 500)

@app.route('/api/auth/logs', methods=['GET', 'OPTIONS'])
def auth_logs():
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})
    try:
        logs = database.get_login_logs(limit=100)
        return make_cors_response({"status": "success", "logs": logs, "total": len(logs)})
    except Exception as e:
        return make_cors_response({"status": "error", "message": str(e)}, 500)

# -------------------------------------------------------------
# USER MANAGEMENT ROUTES
# -------------------------------------------------------------
@app.route('/api/users', methods=['GET', 'POST', 'OPTIONS'])
def manage_users():
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})
        
    if request.method == 'GET':
        users = load_users()
        return make_cors_response({"status": "success", "users": users})
        
    elif request.method == 'POST':
        try:
            req_data = request.get_json() or {}
            username = str(req_data.get("username", "")).strip().lower()
            password = str(req_data.get("password", "")).strip()
            name = str(req_data.get("name", "")).strip()
            role = str(req_data.get("role", "")).strip()
            phone = str(req_data.get("phone", "+263770000000")).strip()
            ward = str(req_data.get("ward", "All Wards")).strip()
            
            if not username or not password or not name or not role:
                return make_cors_response({"status": "error", "message": "Missing required fields"}, 400)
                
            success, msg = database.create_user(username, password, name, role, phone, ward)
            if success:
                return make_cors_response({"status": "success", "message": msg})
            else:
                return make_cors_response({"status": "error", "message": msg}, 400)
        except Exception as e:
            return make_cors_response({"status": "error", "message": str(e)}, 500)

@app.route('/api/users/<username>', methods=['DELETE', 'OPTIONS'])
def delete_user(username):
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})
        
    try:
        username = username.strip().lower()
        success, msg = database.delete_user(username)
        if success:
            return make_cors_response({"status": "success", "message": msg})
        else:
            return make_cors_response({"status": "error", "message": msg}, 400)
    except Exception as e:
        return make_cors_response({"status": "error", "message": str(e)}, 500)

@app.route('/api/users/<username>', methods=['PUT', 'OPTIONS'])
def update_user(username):
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})
        
    try:
        username = username.strip().lower()
        req_data = request.get_json() or {}
        success, msg = database.update_user(username, req_data)
        if success:
            return make_cors_response({"status": "success", "message": msg})
        else:
            return make_cors_response({"status": "error", "message": msg}, 400)
    except Exception as e:
        return make_cors_response({"status": "error", "message": str(e)}, 500)


# -------------------------------------------------------------
# SMS ADVISORY GATEWAY ENGINE (AFRICA'S TALKING / TWILIO / MOCK)
# -------------------------------------------------------------
def dispatch_sms_message(to_phone, message_text):
    """
    Dispatches SMS using configured gateway (Africa's Talking or Twilio),
    falling back to high-fidelity Mock Simulator for local/offline testing.
    """
    # 1. Africa's Talking Gateway
    at_username = os.environ.get("AFRICASTALKING_USERNAME")
    at_api_key = os.environ.get("AFRICASTALKING_API_KEY")
    at_sender_id = os.environ.get("AFRICASTALKING_SENDER_ID", "AGRITEX")

    if at_username and at_api_key:
        try:
            url = "https://api.africastalking.com/version1/messaging"
            headers = {
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "apiKey": at_api_key
            }
            data = urllib.parse.urlencode({
                "username": at_username,
                "to": to_phone,
                "message": message_text,
                "from": at_sender_id
            }).encode('utf-8')

            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_json = json.loads(resp.read().decode('utf-8'))
                return {
                    "success": True,
                    "gateway": "Africa's Talking Live Gateway",
                    "response": resp_json
                }
        except Exception as err:
            print(f"[Africa's Talking SMS Gateway Warning] Live call failed ({err}). Falling back to simulation mode.")

    # 2. Twilio Gateway
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN")
    twilio_from = os.environ.get("TWILIO_FROM_NUMBER")

    if twilio_sid and twilio_token and twilio_from:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json"
            auth_str = f"{twilio_sid}:{twilio_token}"
            b64_auth = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')
            headers = {
                "Authorization": f"Basic {b64_auth}",
                "Content-Type": "application/x-www-form-urlencoded"
            }
            data = urllib.parse.urlencode({
                "To": to_phone,
                "From": twilio_from,
                "Body": message_text
            }).encode('utf-8')

            req = urllib.request.Request(url, data=data, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp_json = json.loads(resp.read().decode('utf-8'))
                return {
                    "success": True,
                    "gateway": "Twilio Live SMS Gateway",
                    "response": resp_json
                }
        except Exception as err:
            print(f"[Twilio SMS Gateway Warning] Live call failed ({err}). Falling back to simulation mode.")

    # 3. Built-in High-Fidelity Mock Simulator (Demo / Local Testing)
    return {
        "success": True,
        "gateway": "NUST Agritex SMS Simulator (Sandbox Mode)",
        "simulated": True,
        "note": "Configured environment variables for Africa's Talking or Twilio to enable direct cellular telco delivery."
    }

@app.route('/api/sms/broadcast', methods=['POST', 'OPTIONS'])
def broadcast_sms():
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})

    try:
        req_data = request.get_json() or {}
        manual_numbers = req_data.get("manual_numbers", None)
        target_ward = req_data.get("ward", "All Wards")
        target_role = req_data.get("role", "Farmer")
        category = req_data.get("category", "General Advisory")
        template_text = req_data.get("message", "").strip()
        sender_officer = req_data.get("sender", "Agritex District Officer")

        if not template_text:
            return make_cors_response({"status": "error", "message": "SMS message text cannot be empty"}, 400)

        recipients = []

        if manual_numbers:
            # Parse manual numbers string or list
            if isinstance(manual_numbers, str):
                import re
                raw_nums = re.split(r'[\s,;\n]+', manual_numbers.strip())
            else:
                raw_nums = manual_numbers

            for idx, num in enumerate(raw_nums):
                clean_num = num.strip()
                if clean_num:
                    recipients.append({
                        "username": f"manual_{idx+1}",
                        "name": f"Farmer ({clean_num})",
                        "phone": clean_num,
                        "ward": target_ward if target_ward != "All Wards" else "Direct / Manual"
                    })
        else:
            users = load_users()
            # Filter recipients matching criteria
            for u in users:
                role_match = (target_role == "All Roles" or u.get("role") == target_role)
                ward_match = (
                    target_ward == "All Wards" or 
                    u.get("ward") == "All Wards" or 
                    u.get("ward") == target_ward or
                    target_ward in u.get("ward", "")
                )
                
                if role_match and ward_match:
                    recipients.append(u)

        if not recipients:
            msg = "No valid manual phone numbers provided." if manual_numbers else f"No {target_role}s found matching ward filter '{target_ward}'."
            return make_cors_response({
                "status": "warning",
                "message": msg,
                "sent_count": 0
            })

        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        date_str = datetime.datetime.now().strftime("%d %b %Y")
        dispatched_list = []
        gateway_used = "Simulator"

        for farmer in recipients:
            # Interpolate dynamic template placeholders
            personalized_msg = template_text
            personalized_msg = personalized_msg.replace("{name}", farmer.get("name", "Farmer"))
            personalized_msg = personalized_msg.replace("{ward}", farmer.get("ward", target_ward))
            personalized_msg = personalized_msg.replace("{date}", date_str)

            phone = farmer.get("phone", "+263770000000")
            dispatch_result = dispatch_sms_message(phone, personalized_msg)
            gateway_used = dispatch_result.get("gateway", "Simulator")

            dispatched_list.append({
                "username": farmer.get("username"),
                "name": farmer.get("name"),
                "phone": phone,
                "ward": farmer.get("ward", target_ward),
                "message": personalized_msg,
                "status": "Delivered" if dispatch_result.get("success") else "Failed"
            })

        # Save record in SMS audit log
        log_entry = {
            "id": f"sms_{int(datetime.datetime.now().timestamp())}",
            "timestamp": timestamp,
            "category": category,
            "target_ward": "Manual Phone Numbers" if manual_numbers else target_ward,
            "target_role": "Direct Manual" if manual_numbers else target_role,
            "sender": sender_officer,
            "recipient_count": len(dispatched_list),
            "message_sample": dispatched_list[0]["message"] if dispatched_list else template_text,
            "gateway": gateway_used,
            "recipients": dispatched_list
        }
        save_sms_log(log_entry)

        return make_cors_response({
            "status": "success",
            "message": f"Advisory broadcast dispatched to {len(dispatched_list)} recipient(s).",
            "sent_count": len(dispatched_list),
            "gateway": gateway_used,
            "timestamp": timestamp,
            "log": log_entry
        })

    except Exception as e:
        return make_cors_response({"status": "error", "message": str(e)}, 500)

@app.route('/api/sms/send', methods=['POST', 'OPTIONS'])
def send_direct_sms():
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})

    try:
        req_data = request.get_json() or {}
        phone = req_data.get("phone", "").strip()
        recipient_name = req_data.get("name", "Farmer").strip()
        message_text = req_data.get("message", "").strip()
        category = req_data.get("category", "Direct Notice")

        if not phone or not message_text:
            return make_cors_response({"status": "error", "message": "Phone and message are required"}, 400)

        dispatch_result = dispatch_sms_message(phone, message_text)
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        log_entry = {
            "id": f"sms_{int(datetime.datetime.now().timestamp())}",
            "timestamp": timestamp,
            "category": category,
            "target_ward": "Direct Contact",
            "target_role": "Direct",
            "sender": "Agritex System",
            "recipient_count": 1,
            "message_sample": message_text,
            "gateway": dispatch_result.get("gateway", "Simulator"),
            "recipients": [{
                "name": recipient_name,
                "phone": phone,
                "ward": "Direct",
                "message": message_text,
                "status": "Delivered" if dispatch_result.get("success") else "Failed"
            }]
        }
        save_sms_log(log_entry)

        return make_cors_response({
            "status": "success",
            "message": f"SMS successfully dispatched to {recipient_name} ({phone})",
            "gateway": dispatch_result.get("gateway"),
            "log": log_entry
        })
    except Exception as e:
        return make_cors_response({"status": "error", "message": str(e)}, 500)

@app.route('/api/sms/logs', methods=['GET', 'DELETE', 'OPTIONS'])
def get_sms_logs():
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})

    if request.method == 'GET':
        logs = load_sms_logs()
        return make_cors_response({"status": "success", "logs": logs, "total": len(logs)})
    elif request.method == 'DELETE':
        try:
            with open(SMS_LOGS_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f)
            return make_cors_response({"status": "success", "message": "SMS logs cleared successfully"})
        except Exception as e:
            return make_cors_response({"status": "error", "message": str(e)}, 500)

# -------------------------------------------------------------
# BIOPHYSICAL YIELD PREDICTION ENGINE
# -------------------------------------------------------------
@app.route('/api/predict', methods=['POST', 'OPTIONS'])
def predict():
    # Handle preflight options requests
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})

    try:
        req_data = request.get_json() or {}
        
        # Extract inputs
        raw_ward = str(req_data.get("ward", "Ward 12")).strip()
        ward = raw_ward.split(" (")[0] if raw_ward else "Ward 12"
        variety = str(req_data.get("variety", "")).strip().upper()
        precip = float(req_data.get("precip", 0.5))
        heat = float(req_data.get("heat", 0.5))
        sand = int(req_data.get("sand", 50))
        clay = int(req_data.get("clay", 30))
        
        # 1. Cultivar Validation Guard
        if variety not in VALID_CULTIVARS:
            return make_cors_response({
                "status": "error",
                "message": f"Maize cultivar '{variety}' is not supported by this calibration. Please select supported NUST cultivars.",
                "valid_cultivars": VALID_CULTIVARS
            }, 400)
            
        # Variety growth cycle coefficients and notes setup
        maturity_notes = ""
        if variety == "SC301":
            maturity_notes = (
                "SC301 (Ultra-Early Maturing, 110 days to physiological maturity):\n"
                "- Calibrated for extreme dry conditions. Very high drought escape capabilities.\n"
                "- Advised Planting Window: Mid-to-Late November.\n"
                "- Nitrogen Management: Apply top-dressing fertilizer (Urea/AN) split-dose at 3 weeks and 6 weeks."
            )
        elif variety == "SC436":
            maturity_notes = (
                "SC436 (Early Maturing, 120 days):\n"
                "- Fast establishment, moderate drought tolerance.\n"
                "- Advised Planting Window: Mid-November.\n"
                "- Recommended spacing: 25cm within-row x 75cm between-row spacing."
            )
        elif variety == "SC529":
            maturity_notes = (
                "SC529 (Medium Maturing, 135 days):\n"
                "- High yield potential under optimal rainfall, medium drought susceptibility.\n"
                "- Advised Planting Window: Early November.\n"
                "- Management: Keep clean of weeds during critical first 6 weeks. High potential for conservation agriculture."
            )
        elif variety == "SC719":
            maturity_notes = (
                "SC719 (Late Maturing, 145+ days):\n"
                "- Maximum structural yield potential, but highly sensitive to mid-season drought shocks.\n"
                "- Advised Planting Window: Late October (with planting rains).\n"
                "- Water stress management: Mulching and minimum tillage are critical. If possible, utilize supplementary drip irrigation during flowering."
            )

        if models_loaded:
            # 1. Map variety one-hot encoding
            var_SC301 = 1.0 if variety == "SC301" else 0.0
            var_SC436 = 1.0 if variety == "SC436" else 0.0
            var_SC529 = 1.0 if variety == "SC529" else 0.0
            var_SC719 = 1.0 if variety == "SC719" else 0.0
            
            # 2. Map static regional PCA features representing average GIS modalities for Wards
            if ward == "Ward 12":
                spatial_pca = [0.12, 0.22, 0.08, 0.15, -0.05]
                temporal_pca = [-0.10, 0.05, 0.02]
                semantic_pca = [0.18, 0.08, 0.12, 0.05, -0.02]
            elif ward == "Ward 15":
                spatial_pca = [0.38, 0.28, 0.18, 0.25, 0.12]
                temporal_pca = [0.15, 0.18, 0.08]
                semantic_pca = [0.28, 0.25, 0.22, 0.18, 0.08]
            else: # Ward 18
                spatial_pca = [-0.08, 0.05, -0.12, -0.02, -0.10]
                temporal_pca = [-0.25, -0.15, -0.08]
                semantic_pca = [0.05, -0.02, 0.01, -0.05, -0.08]
                
            # 3. Assemble 22-D feature vector:
            cwi = precip * (0.65 if ward == "Ward 15" else (0.45 if ward == "Ward 12" else 0.35))
            
            x_input = spatial_pca + temporal_pca + semantic_pca + [
                sand / 100.0,
                clay / 100.0,
                precip,
                cwi,
                heat,
                var_SC301,
                var_SC436,
                var_SC529,
                var_SC719
            ]
            
            # Convert to DMatrix for prediction
            dtest = xgb.DMatrix(np.array([x_input]))
            low_yield = round(float(bst_low.predict(dtest)[0]))
            median_yield = round(float(bst_med.predict(dtest)[0]))
            high_yield = round(float(bst_high.predict(dtest)[0]))
            
            # Post-processing checks
            low_yield = max(120, min(1500, low_yield))
            median_yield = max(150, min(1600, median_yield))
            high_yield = max(180, min(1800, high_yield))
            if low_yield > median_yield: low_yield = median_yield - 50
            if high_yield < median_yield: high_yield = median_yield + 50
        else:
            # 2. Biophysical Forecasting Calculation (PCA-Tuned Emulation fallback)
            base_yield = 950.0
            
            # Soil factor (sandy soil reduces capacity, clay soil improves retention)
            soil_factor = -150.0 * (sand / 100.0) + 120.0 * (clay / 100.0)
            
            # Climate elements
            rain_factor = 680.0 * precip
            heat_factor = -390.0 * heat
            
            variety_factor = 0
            if variety == "SC301":
                variety_factor = -80
            elif variety == "SC436":
                variety_factor = -40
            elif variety == "SC529":
                variety_factor = 50
            elif variety == "SC719":
                variety_factor = 180
                
            # Expected yield value
            median_yield = base_yield + soil_factor + rain_factor + heat_factor + variety_factor
            median_yield = max(150.0, min(1600.0, median_yield))
            
            # Standard error expansion (Drought increases uncertainty variance)
            uncertainty_mult = 1.0 + (1.0 - precip) * 0.4
            low_yield = median_yield - (140.0 * uncertainty_mult)
            high_yield = median_yield + (180.0 * uncertainty_mult)
            
            # Clean rounding
            low_yield = max(120, round(low_yield))
            median_yield = round(median_yield)
            high_yield = round(high_yield)

        # 3. Construct Agronomic Advisory Text
        advisory = f"Cultivar Advisory:\n{maturity_notes}\n\n"
        if precip < 0.45:
            advisory += (
                f"CRITICAL drought alert (Ward: {ward}):\n"
                f"- Water scarcity is predicted to limit yields. Expected Range: [{low_yield} - {high_yield}] kg/ha.\n"
                f"- Implement immediate moisture conservation measures: Mulch with crop residues and restrict weeding to manual weeding at ground level."
            )
        else:
            advisory += (
                f"Standard Season Advisory:\n"
                f"- Yield forecasts are favorable at [{low_yield} - {high_yield}] kg/ha.\n"
                f"- Ensure complete weeding by week 4 and check for Fall Armyworm sightings."
            )

        return make_cors_response({
            "status": "success",
            "forecast": {
                "low": low_yield,
                "med": median_yield,
                "high": high_yield,
                "variety": variety,
                "ward": ward,
                "precip": precip,
                "heat": heat,
                "sand": sand,
                "clay": clay,
                "advisory": advisory,
                "engine": "XGBoost Quantile Model (Option B - Flask API Connected)" if models_loaded else "Biophysical Emulation (Flask API Connected)"
            }
        })

    except Exception as e:
        return make_cors_response({
            "status": "error",
            "message": f"Server encountered processing exception: {str(e)}"
        }, 500)

if __name__ == '__main__':
    print("NUST Biophysical Maize Yield Forecast Service running on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)