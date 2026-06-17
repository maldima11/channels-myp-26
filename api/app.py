from flask import Flask, request, jsonify

app = Flask(__name__)

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
    response.headers.add("Access-Control-Allow-Methods", "POST,GET,OPTIONS")
    return response, status_code

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
            
        # 2. Biophysical Forecasting Calculation (PCA-Tuned Emulation)
        base_yield = 950.0
        
        # Soil factor (sandy soil reduces capacity, clay soil improves retention)
        soil_factor = -150.0 * (sand / 100.0) + 120.0 * (clay / 100.0)
        
        # Climate elements
        rain_factor = 680.0 * precip
        heat_factor = -390.0 * heat
        
        # Variety growth cycle coefficients
        variety_factor = 0
        maturity_notes = ""
        
        if variety == "SC301":
            variety_factor = -80  # ultra-early maturity, lower potential ceiling
            maturity_notes = (
                "SC301 (Ultra-Early Maturing, 110 days to physiological maturity):\n"
                "- Calibrated for extreme dry conditions. Very high drought escape capabilities.\n"
                "- Advised Planting Window: Mid-to-Late November.\n"
                "- Nitrogen Management: Apply top-dressing fertilizer (Urea/AN) split-dose at 3 weeks and 6 weeks."
            )
        elif variety == "SC436":
            variety_factor = -40  # early maturity
            maturity_notes = (
                "SC436 (Early Maturing, 120 days):\n"
                "- Fast establishment, moderate drought tolerance.\n"
                "- Advised Planting Window: Mid-November.\n"
                "- Recommended spacing: 25cm within-row x 75cm between-row spacing."
            )
        elif variety == "SC529":
            variety_factor = 50   # medium maturity
            maturity_notes = (
                "SC529 (Medium Maturing, 135 days):\n"
                "- High yield potential under optimal rainfall, medium drought susceptibility.\n"
                "- Advised Planting Window: Early November.\n"
                "- Management: Keep clean of weeds during critical first 6 weeks. High potential for conservation agriculture."
            )
        elif variety == "SC719":
            variety_factor = 180  # late maturity, high yield potential but moisture sensitive
            maturity_notes = (
                "SC719 (Late Maturing, 145+ days):\n"
                "- Maximum structural yield potential, but highly sensitive to mid-season drought shocks.\n"
                "- Advised Planting Window: Late October (with planting rains).\n"
                "- Water stress management: Mulching and minimum tillage are critical. If possible, utilize supplementary drip irrigation during flowering."
            )

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
                "advisory": advisory
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
