const API_URL = "http://127.0.0.1:5000/api/predict";
const USER_KEY = 'nust_authorized_users';
const defaultUsers = [
    { username: 'agritex_officer', password: 'nust_maize_2026', name: 'Primary Officer', role: 'Agritex Officer' }
];

// Helper to pull accounts from shared LocalStorage
function getAuthorizedUsers() {
    const users = localStorage.getItem(USER_KEY);
    if (!users) {
        localStorage.setItem(USER_KEY, JSON.stringify(defaultUsers));
        return defaultUsers;
    }
    return JSON.parse(users);
}

// 1. SYSTEM SECURITY ACCESS (WITH ADMIN PORTAL INTEGRATION)
function attemptLogin() {
    const user = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    
    const users = getAuthorizedUsers();
    const matchedUser = users.find(u => u.username === user && u.password === pass);

    if (matchedUser) {
        document.getElementById("logged-user-name").innerText = `${matchedUser.name} (${matchedUser.role})`;
        const gate = document.getElementById("login-gate");
        gate.style.opacity = "0";
        setTimeout(() => {
            gate.style.display = "none";
            runForecast(); // Render gauges and chart upon entry
        }, 500);
    } else {
        document.getElementById("login-warning").style.display = "block";
    }
}

// Logout controller
function triggerLogout() {
    const gate = document.getElementById("login-gate");
    document.getElementById("password").value = ""; // Clear password field
    gate.style.display = "flex";
    setTimeout(() => {
        gate.style.opacity = "1";
    }, 50);
}

// 2. CULTIVAR GUARD CONFIGURATION
const VALID_CULTIVARS = ["SC301", "SC436", "SC529", "SC719"];

function validateCultivar() {
    const input = document.getElementById("cultivar-input").value.trim().toUpperCase();
    if (!VALID_CULTIVARS.includes(input)) {
        showCultivarWarning(input);
        document.getElementById("cultivar-input").value = "SC719"; // Fallback reset
    } else {
        runForecast();
    }
}

function showCultivarWarning(name) {
    const modal = document.getElementById("warning-modal");
    document.getElementById("warning-title-text").innerText = `Cultivar '${name}' Calibrating Alert`;
    document.getElementById("warning-text-content").innerText = `Maize cultivar '${name}' is not supported by this calibration. Please utilize supported NUST cultivars: SC301, SC436, SC529, or SC719.`;
    modal.classList.add("active");
}

function dismissWarning() {
    document.getElementById("warning-modal").classList.remove("active");
    runForecast();
}

// Sliders UI binder
function updateSlider(type) {
    const slider = document.getElementById(`slide-${type}`);
    const val = document.getElementById(`val-${type}`);
    if (type === 'sand' || type === 'clay') {
        val.innerText = `${slider.value}%`;
    } else {
        val.innerText = slider.value;
    }
    runForecast();
}

// 3. CACHED FORECAST DATA FOR REPORT DOWNLOADS
let cachedForecast = {
    low: 0,
    med: 0,
    high: 0,
    variety: "",
    ward: "",
    precip: 0,
    heat: 0,
    sand: 0,
    clay: 0,
    advisory: ""
};

// 4. API CONNECTED FORECAST RUNNER
function runForecast() {
    const ward = document.getElementById("location-ward").value;
    const variety = document.getElementById("cultivar-input").value.trim().toUpperCase();
    const precip = parseFloat(document.getElementById("slide-precip").value);
    const heat = parseFloat(document.getElementById("slide-heat").value);
    const sand = parseInt(document.getElementById("slide-sand").value);
    const clay = parseInt(document.getElementById("slide-clay").value);

    // Call REST endpoint
    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ward, variety, precip, heat, sand, clay })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.message || "CORS/API error"); });
        }
        return res.json();
    })
    .then(data => {
        updateDashboardUI(data.forecast);
    })
    .catch(err => {
        console.warn("Backend REST API offline or blocked. Executing browser-side biophysical math fallback:", err.message);
        // Fallback calculations to guarantee standalone file preview
        const localForecast = computeLocalForecast(ward, variety, precip, heat, sand, clay);
        updateDashboardUI(localForecast);
    });
}

// Standalone offline calculation engine
function computeLocalForecast(ward, variety, precip, heat, sand, clay) {
    let base_yield = 950.0;
    let soil_factor = -150.0 * (sand / 100.0) + 120.0 * (clay / 100.0);
    let rain_factor = 680.0 * precip;
    let heat_factor = -390.0 * heat;
    
    let variety_factor = 0;
    let maturity_notes = "";
    
    if (variety === "SC301") {
        variety_factor = -80;
        maturity_notes = "SC301 (Ultra-Early Maturing, 110 days):\n- Calibrated for extreme dry conditions. Very high drought escape capabilities.";
    } else if (variety === "SC436") {
        variety_factor = -40;
        maturity_notes = "SC436 (Early Maturing, 120 days):\n- Fast establishment, moderate drought tolerance.";
    } else if (variety === "SC529") {
        variety_factor = 50;
        maturity_notes = "SC529 (Medium Maturing, 135 days):\n- High yield potential under optimal rainfall, medium drought susceptibility.";
    } else if (variety === "SC719") {
        variety_factor = 180;
        maturity_notes = "SC719 (Late Maturing, 145+ days):\n- Maximum structural yield potential, but highly sensitive to mid-season drought shocks.";
    }

    let median_yield = base_yield + soil_factor + rain_factor + heat_factor + variety_factor;
    median_yield = Math.max(150, Math.min(1600, median_yield));

    let uncertainty_mult = 1.0 + (1.0 - precip) * 0.4;
    let low_yield = Math.max(120, Math.round(median_yield - 140 * uncertainty_mult));
    let high_yield = Math.round(median_yield + 180 * uncertainty_mult);
    median_yield = Math.round(median_yield);

    let advisory = `Cultivar Advisory:\n${maturity_notes}\n\n`;
    if (precip < 0.45) {
        advisory += `CRITICAL drought alert (Ward: ${ward}):\n- Water scarcity is predicted to limit yields. Expected Range: [${low_yield} - ${high_yield}] kg/ha.\n- Implement immediate moisture conservation measures: Mulch with crop residues and restrict weeding to manual weeding.`;
    } else {
        advisory += `Standard Season Advisory:\n- Yield forecasts are favorable at [${low_yield} - ${high_yield}] kg/ha.\n- Ensure complete weeding by week 4 and check for Fall Armyworm sightings.`;
    }

    return {
        low: low_yield,
        med: median_yield,
        high: high_yield,
        variety,
        ward,
        precip,
        heat,
        sand,
        clay,
        advisory
    };
}

// 5. UPDATE GRAPHICS AND METERS
function updateDashboardUI(forecast) {
    cachedForecast = forecast;

    // Water Deficit Meter (1 - precip)
    const waterDeficit = Math.round((1.0 - forecast.precip) * 100);
    document.getElementById("waterText").innerText = `${waterDeficit}%`;
    drawGauge("waterGauge", waterDeficit, "#10b981");

    // Heat Stress Meter
    const heatStress = Math.round(forecast.heat * 100);
    document.getElementById("heatText").innerText = `${heatStress}%`;
    drawGauge("heatGauge", heatStress, "#f43f5e");

    // Advisory panel rendering
    document.getElementById("advisory-text-box").innerHTML = forecast.advisory.replace(/\n/g, '<br>');

    // Draw yield envelope bar chart
    drawYieldChart(forecast.low, forecast.med, forecast.high);
}

// Circular canvas gauge drawer
function drawGauge(canvasId, percentage, color) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 80, 80);
    
    // Draw track
    ctx.beginPath();
    ctx.arc(40, 40, 32, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 6;
    ctx.stroke();

    // Draw value arc
    ctx.beginPath();
    ctx.arc(40, 40, 32, -Math.PI / 2, (-Math.PI / 2) + (2 * Math.PI * (percentage / 100)));
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.stroke();
}

// Bar chart canvas rendering
function drawYieldChart(low, med, high) {
    const canvas = document.getElementById("yieldChart");
    const ctx = canvas.getContext("2d");
    
    const w = canvas.width = canvas.parentElement.clientWidth;
    const h = canvas.height = 220;

    ctx.clearRect(0, 0, w, h);

    // Draw references lines
    const maxVal = 1800;
    const gridLines = [400, 800, 1200, 1600];
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";

    gridLines.forEach(line => {
        let y = h - (line / maxVal) * (h - 40) - 20;
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
        ctx.fillText(line, 20, y + 4);
    });

    const barWidth = 60;
    const gap = (w - 80 - (barWidth * 3)) / 4;
    const labels = ["Low (q10)", "Median (q50)", "High (q90)"];
    const values = [low, med, high];
    const colors = ["#f43f5e", "#6366f1", "#10b981"];

    values.forEach((val, idx) => {
        let x = 60 + gap + idx * (barWidth + gap);
        let barH = (val / maxVal) * (h - 40);
        let y = h - barH - 20;

        let grad = ctx.createLinearGradient(x, y, x, h - 20);
        grad.addColorStop(0, colors[idx]);
        grad.addColorStop(1, "rgba(99, 102, 241, 0.05)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, [8, 8, 0, 0]);
        ctx.fill();

        ctx.strokeStyle = colors[idx];
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Top labels (value)
        ctx.fillStyle = "#fff";
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(val, x + barWidth / 2, y - 8);

        // Bottom label
        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px sans-serif";
        ctx.fillText(labels[idx], x + barWidth / 2, h - 4);
    });
}

// 6. ADVISORY REPORT EXPORTER (GRAPHICAL HTML PRINT FORMAT)
function downloadReport() {
    const data = cachedForecast;
    const reportContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NUST Maize Yield Advisory Report - ${data.ward} - ${data.variety}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            background-color: #f1f5f9;
            color: #1e293b;
            padding: 40px;
            margin: 0;
        }
        .report-card {
            background: #ffffff;
            border-radius: 20px;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 24px;
            margin-bottom: 30px;
        }
        .title {
            font-size: 24px;
            font-weight: 700;
            color: #1e1b4b;
        }
        .logo-txt {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #6366f1;
            font-weight: 700;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .meta-item {
            background: #f8fafc;
            padding: 16px;
            border-radius: 12px;
            border: 1px solid #f1f5f9;
        }
        .meta-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }
        .meta-value {
            font-size: 16px;
            font-weight: 600;
            color: #0f172a;
        }
        .yield-box {
            background: linear-gradient(135deg, #4f46e5, #6366f1);
            color: #ffffff;
            padding: 24px;
            border-radius: 16px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .yield-title {
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            opacity: 0.9;
        }
        .yield-value {
            font-size: 32px;
            font-weight: 700;
        }
        .envelope-container {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin-bottom: 30px;
        }
        .envelope-card {
            flex: 1;
            text-align: center;
            padding: 16px;
            border-radius: 12px;
            border: 1.5px dashed #cbd5e1;
        }
        .envelope-card.low { border-color: #f43f5e; color: #f43f5e; background: #fff1f2; }
        .envelope-card.med { border-color: #6366f1; color: #6366f1; background: #eef2ff; }
        .envelope-card.high { border-color: #10b981; color: #10b981; background: #ecfdf5; }
        .envelope-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 4px;
        }
        .envelope-val {
            font-size: 20px;
            font-weight: 700;
        }
        .advisory-box {
            background: #fafafa;
            border-left: 4px solid #10b981;
            padding: 24px;
            border-radius: 0 12px 12px 0;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .footer {
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
            margin-top: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
        }
        @media print {
            body { padding: 0; background: none; }
            .report-card { border: none; box-shadow: none; padding: 0; }
        }
    </style>
</head>
<body>
    <div class="report-card">
        <div class="header">
            <div>
                <div class="title">Maize Yield Prediction Report</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Umzingwane District, Matabeleland South</div>
            </div>
            <div class="logo-txt">NUST MPhil Pipeline</div>
        </div>

        <div class="meta-grid">
            <div class="meta-item">
                <div class="meta-label">Location Centroid</div>
                <div class="meta-value">${data.ward}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Maize Cultivar</div>
                <div class="meta-value">${data.variety}</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Soil Textures</div>
                <div class="meta-value">Sand: ${data.sand}% | Clay: ${data.clay}%</div>
            </div>
            <div class="meta-item">
                <div class="meta-label">Precipitation (Scaled Lag 30d)</div>
                <div class="meta-value">${data.precip}</div>
            </div>
        </div>

        <div class="yield-box">
            <div>
                <div class="yield-title">Expected Median Yield</div>
                <div style="font-size: 12px; opacity: 0.8;">Standard meteorological alignment (q50)</div>
            </div>
            <div class="yield-value">${data.med} kg/ha</div>
        </div>

        <div class="envelope-container">
            <div class="envelope-card low">
                <div class="envelope-label">Lower Bound (q10)</div>
                <div class="envelope-val">${data.low} kg/ha</div>
            </div>
            <div class="envelope-card med">
                <div class="envelope-label">Median Yield (q50)</div>
                <div class="envelope-val">${data.med} kg/ha</div>
            </div>
            <div class="envelope-card high">
                <div class="envelope-label">Upper Bound (q90)</div>
                <div class="envelope-val">${data.high} kg/ha</div>
            </div>
        </div>

        <div class="advisory-box">
            <h3 style="margin-top: 0; color: #0f172a; margin-bottom: 12px;">Agronomic Recommendation</h3>
            <div>${data.advisory.replace(/\n/g, '<br>')}</div>
        </div>

        <div class="footer">
            <p>Generated via NUST MPhil Thesis Hybrid Model Fusion Pipeline (Option B) | Scale: kg/ha</p>
            <p>Security Signature: Authorized Agritex Officer System Log Verification</p>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([reportContent], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `NUST_Yield_Report_${data.ward.replace(' ', '_')}_${data.variety}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Setup inputs key handlers and window resize callbacks
window.onload = function() {
    drawGauge("waterGauge", 35, "#10b981");
    drawGauge("heatGauge", 32, "#f43f5e");
    
    // Login input enter bindings
    document.getElementById("username").addEventListener("keypress", function(e) {
        if (e.key === "Enter") attemptLogin();
    });
    document.getElementById("password").addEventListener("keypress", function(e) {
        if (e.key === "Enter") attemptLogin();
    });
};

window.onresize = function() {
    if (document.getElementById("login-gate").style.display === "none") {
        runForecast();
    }
};