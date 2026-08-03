from flask import Flask, request, jsonify
import json
import os

app = Flask(__name__)

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

# Central User Account Database configuration
USERS_DB_FILE = os.path.join(os.path.dirname(__file__), 'users_db.json')
DEFAULT_USERS = [
    { "username": "agritex_officer", "password": "nust_maize_2026", "name": "Primary Officer", "role": "Agritex Officer" }
]

def load_users():
    if not os.path.exists(USERS_DB_FILE):
        save_users(DEFAULT_USERS)
        return DEFAULT_USERS
    try:
        with open(USERS_DB_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return DEFAULT_USERS

def save_users(users):
    try:
        with open(USERS_DB_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=4)
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
            
            if not username or not password or not name or not role:
                return make_cors_response({"status": "error", "message": "Missing required fields"}, 400)
                
            users = load_users()
            if any(u['username'] == username for u in users):
                return make_cors_response({"status": "error", "message": f"Username '{username}' already exists"}, 400)
                
            users.append({"username": username, "password": password, "name": name, "role": role})
            save_users(users)
            return make_cors_response({"status": "success", "message": "User registered successfully"})
        except Exception as e:
            return make_cors_response({"status": "error", "message": str(e)}, 500)

@app.route('/api/users/<username>', methods=['DELETE', 'OPTIONS'])
def delete_user(username):
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})
        
    try:
        username = username.strip().lower()
        if username == "agritex_officer":
            return make_cors_response({"status": "error", "message": "Cannot delete primary fallback officer"}, 400)
            
        users = load_users()
        initial_len = len(users)
        users = [u for u in users if u['username'] != username]
        
        if len(users) == initial_len:
            return make_cors_response({"status": "error", "message": "User not found"}, 404)
            
        save_users(users)
        return make_cors_response({"status": "success", "message": "User deleted successfully"})
    except Exception as e:
        return make_cors_response({"status": "error", "message": str(e)}, 500)

@app.route('/api/users/<username>', methods=['PUT', 'OPTIONS'])
def update_user(username):
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})
        
    try:
        username = username.strip().lower()
        req_data = request.get_json() or {}
        password = str(req_data.get("password", "")).strip()
        name = str(req_data.get("name", "")).strip()
        role = str(req_data.get("role", "")).strip()
        
        if not password or not name or not role:
            return make_cors_response({"status": "error", "message": "Missing required fields"}, 400)
            
        users = load_users()
        user_found = False
        
        for u in users:
            if u['username'] == username:
                u['password'] = password
                u['name'] = name
                u['role'] = role
                user_found = True
                break
                
        if not user_found:
            return make_cors_response({"status": "error", "message": f"User '{username}' not found"}, 404)
            
        save_users(users)
        return make_cors_response({"status": "success", "message": "User updated successfully"})
    except Exception as e:
        return make_cors_response({"status": "error", "message": str(e)}, 500)

@app.route('/api/predict', methods=['POST', 'OPTIONS'])
def predict():
    # Handle preflight options requests
    if request.method == 'OPTIONS':
        return make_cors_response({"status": "ok"})

    try:
        req_data = request.get_json() or {}
        
        # Extract inputs
        ward = req_data.get("ward", "Ward 12")
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
            # Columns 0-4: Spatial PCA (5)
            # Columns 5-7: Temporal PCA (3)
            # Columns 8-12: Semantic PCA (5)
            # Column 13: Sand (scaled to [0,1])
            # Column 14: Clay (scaled to [0,1])
            # Column 15: Precipitation (scaled)
            # Column 16: Canopy Water Index (Precipitation * NDVI approximation)
            # Column 17: Heat Stress Index (scaled)
            # Columns 18-21: Variety one-hot (4)
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
                "engine": "XGBoost Quantile Model (Option B)" if models_loaded else "Biophysical Emulation Fallback"
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