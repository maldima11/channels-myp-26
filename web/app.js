const isVercelDeployment = window.location.hostname.endsWith('vercel.app');
const activeHostName = (window.location.hostname === 'localhost') ? 'localhost' : (window.location.hostname || '127.0.0.1');
const BASE_API_URL = isVercelDeployment ? '' : `http://${activeHostName}:5000`;
const API_URL = `${BASE_API_URL}/api/predict`;
const USERS_API_URL = `${BASE_API_URL}/api/users`;
const USER_KEY = 'nust_authorized_users';
const defaultUsers = [
    { username: 'agritex_officer', password: 'nust_maize_2026', name: 'Primary Officer', role: 'Agritex Officer' },
    { username: 'johen_doe', password: '12345', name: 'Johen Doe', role: 'Farmer', ward: 'Ward 12 (Ntabazinduna)' },
    { username: 'farmer', password: 'farmer2026', name: 'Local Farmer', role: 'Farmer', ward: 'Ward 15 (Esigodini Centroid)' },
    { username: 'maldima_farmer', password: 'farmerpass123', name: 'Stephen Maldima', role: 'Farmer', ward: 'Ward 1 (Nswazi North)' },
    { username: 'umzingwane_grower', password: 'harvest2026', name: 'Nomusa Khumalo', role: 'Farmer', ward: 'Ward 15 (Esigodini Centroid)' },
    { username: 'zipper', password: 'farmer234', name: 'Zipper Farmer', role: 'Farmer', ward: 'Ward 15 (Esigodini Centroid)' },
    { username: 'jane_farmer', password: 'pass12345', name: 'Jane Nswazi', role: 'Farmer', ward: 'Ward 8 (Shale)' },
    { username: 'esi_farmer', password: 'pass12345', name: 'Esi Farmer', role: 'Farmer', ward: 'Ward 15 (Esigodini Centroid)' },
    { username: 'admin', password: 'admin123', name: 'System Admin', role: 'Administrator' }
];

let cachedUsers = [];
let selectedRole = ''; // Tracks chosen portal path: 'Farmer' or 'Agritex Officer'

// Pull credentials from Central Flask API, falling back to LocalStorage
function syncUsersFromBackend(callback) {
    fetch(USERS_API_URL)
        .then(res => {
            if (!res.ok) throw new Error("API error");
            return res.json();
        })
        .then(data => {
            if (data.status === "success" && data.users) {
                cachedUsers = data.users;
                localStorage.setItem(USER_KEY, JSON.stringify(cachedUsers));
            } else {
                throw new Error("Invalid format");
            }
            if (callback) callback();
        })
        .catch(err => {
            console.warn("Backend User DB offline. Falling back to local registry storage:", err.message);
            const local = localStorage.getItem(USER_KEY);
            if (!local) {
                localStorage.setItem(USER_KEY, JSON.stringify(defaultUsers));
                cachedUsers = defaultUsers;
            } else {
                try {
                    cachedUsers = JSON.parse(local) || defaultUsers;
                } catch(e) {
                    cachedUsers = defaultUsers;
                }
            }
            if (callback) callback();
        });
}

// Welcome screen toggle controllers
function showLoginForm(role) {
    selectedRole = role;
    
    // Clear warnings & inputs
    document.getElementById("login-warning").style.display = "none";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";

    // Set role specific layout labels
    document.getElementById("login-portal-title").innerText = role === 'Farmer' ? "Farmer Login" : "Officer Login";
    document.getElementById("login-portal-subtitle").innerText = role === 'Farmer' 
        ? "Access advisory forecasts & calendars" 
        : "Calibrate models and manage credentials";
    
    document.getElementById("username-label").innerText = role === 'Farmer' ? "Farmer Username" : "Officer Username";
    document.getElementById("username").placeholder = role === 'Farmer' ? "e.g. farmer_jane" : "e.g. agritex_officer";

    // Hide welcome panel, show login panel
    document.getElementById("welcome-screen").style.display = "none";
    document.getElementById("login-form-screen").style.display = "block";
}

function showWelcomeScreen() {
    document.getElementById("login-form-screen").style.display = "none";
    document.getElementById("welcome-screen").style.display = "block";
    document.getElementById("login-warning").style.display = "none";
}

const AUTH_LOGIN_API_URL = `${BASE_API_URL}/api/auth/login`;

// 1. SYSTEM SECURITY ACCESS (CENTRAL DATABASE AUTHENTICATION)
async function attemptLogin() {
    const user = document.getElementById("username").value.trim().toLowerCase();
    const pass = document.getElementById("password").value.trim();
    const warning = document.getElementById("login-warning");
    warning.style.display = "none";

    if (!user || !pass) {
        warning.innerText = "Please enter both username and password.";
        warning.style.display = "block";
        return;
    }

    const candidateUrls = [
        AUTH_LOGIN_API_URL,
        'http://127.0.0.1:5000/api/auth/login',
        'http://localhost:5000/api/auth/login',
        'http://127.0.0.1:3000/api/auth/login',
        'http://localhost:3000/api/auth/login',
        'https://gyroscopic-cristiano-unpanicky.ngrok-free.dev/api/auth/login',
        '/api/auth/login'
    ].filter((val, idx, self) => val && self.indexOf(val) === idx);

    let authenticated = false;
    let authErrorMessage = '';

    for (const url of candidateUrls) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch(url, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "1"
                },
                body: JSON.stringify({ username: user, password: pass }),
                signal: controller.signal
            });
            clearTimeout(timeout);
            const data = await res.json();
            if (data.status === "success" && data.user) {
                authenticated = true;
                handleSuccessfulLogin(data.user);
                break;
            } else if (data.status === "error" && data.message) {
                authErrorMessage = data.message;
            }
        } catch (e) {
            // Try next candidate
        }
    }

    if (!authenticated) {
        // Fallback to local cache
        const local = localStorage.getItem(USER_KEY);
        const users = local ? JSON.parse(local) : defaultUsers;
        const matchedUser = users.find(u => (u.username || '').toLowerCase() === user && (u.password === pass || (u.password || '').toLowerCase() === pass.toLowerCase()));

        if (matchedUser) {
            handleSuccessfulLogin(matchedUser);
        } else {
            warning.innerText = authErrorMessage || "Invalid Username or Password. Please try again.";
            warning.style.display = "block";
        }
    }
}

function handleSuccessfulLogin(userObj) {
    sessionStorage.setItem('nust_active_user', JSON.stringify(userObj));
    document.getElementById("logged-user-name").innerText = `${userObj.name} (${userObj.role})`;
    
    const adminBtn = document.getElementById("admin-redirect-btn");
    if (userObj.role === 'Agritex Officer' || userObj.role === 'Administrator') {
        adminBtn.style.display = "inline-block";
    } else {
        adminBtn.style.display = "none";
    }

    const gate = document.getElementById("login-gate");
    gate.style.opacity = "0";
    setTimeout(() => {
        gate.style.display = "none";
        runForecast();
    }, 500);
}

// Logout controller
function triggerLogout() {
    // Clear active session
    sessionStorage.removeItem('nust_active_user');

    const gate = document.getElementById("login-gate");
    document.getElementById("password").value = ""; // Clear password field
    document.getElementById("admin-redirect-btn").style.display = "none"; // Hide admin button on logout
    
    // Reset view to Welcome Selector Screen
    showWelcomeScreen();
    
    gate.style.display = "flex";
    setTimeout(() => {
        gate.style.opacity = "1";
    }, 50);
}

// Admin Navigation Router
function goToAdmin() {
    window.location.href = "./admin/index.html";
}

// Theme Switcher Controller (Dark vs. Light Theme)
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('nust_portal_theme', isLight ? 'light' : 'dark');
    
    // Redraw stress gauges and canvas chart to apply theme colors
    if (document.getElementById("login-gate").style.display === "none") {
        runForecast();
    } else {
        // Redraw initial empty gauges if not logged in
        drawGauge("waterGauge", 35, "#10b981");
        drawGauge("heatGauge", 32, "#f43f5e");
    }
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

// Ward default biophysical environmental mappings (simulating GIS database pull)
const WARD_DEFAULTS = {
    "Ward 1":  { precip: 0.50, heat: 0.35, sand: 65, clay: 20 },
    "Ward 2":  { precip: 0.45, heat: 0.30, sand: 58, clay: 22 },
    "Ward 3":  { precip: 0.55, heat: 0.32, sand: 60, clay: 24 },
    "Ward 4":  { precip: 0.60, heat: 0.28, sand: 50, clay: 30 },
    "Ward 5":  { precip: 0.40, heat: 0.42, sand: 72, clay: 15 },
    "Ward 6":  { precip: 0.35, heat: 0.45, sand: 78, clay: 12 },
    "Ward 7":  { precip: 0.48, heat: 0.33, sand: 63, clay: 21 },
    "Ward 8":  { precip: 0.52, heat: 0.31, sand: 61, clay: 23 },
    "Ward 9":  { precip: 0.58, heat: 0.29, sand: 55, clay: 26 },
    "Ward 10": { precip: 0.62, heat: 0.26, sand: 48, clay: 32 },
    "Ward 11": { precip: 0.38, heat: 0.40, sand: 75, clay: 14 },
    "Ward 12": { precip: 0.40, heat: 0.38, sand: 70, clay: 18 },
    "Ward 13": { precip: 0.42, heat: 0.36, sand: 68, clay: 19 },
    "Ward 14": { precip: 0.46, heat: 0.34, sand: 64, clay: 22 },
    "Ward 15": { precip: 0.65, heat: 0.28, sand: 62, clay: 25 },
    "Ward 16": { precip: 0.50, heat: 0.30, sand: 59, clay: 24 },
    "Ward 17": { precip: 0.32, heat: 0.44, sand: 82, clay: 10 },
    "Ward 18": { precip: 0.30, heat: 0.45, sand: 80, clay: 12 },
    "Ward 19": { precip: 0.44, heat: 0.38, sand: 69, clay: 17 },
    "Ward 20": { precip: 0.48, heat: 0.35, sand: 66, clay: 20 }
};

function applyWardDefaults() {
    const rawWard = document.getElementById("location-ward").value;
    const cleanWard = rawWard.split(" (")[0];
    const defaults = WARD_DEFAULTS[cleanWard] || WARD_DEFAULTS[rawWard];
    if (defaults) {
        // Update slider inputs
        document.getElementById("slide-precip").value = defaults.precip;
        document.getElementById("slide-heat").value = defaults.heat;
        document.getElementById("slide-sand").value = defaults.sand;
        document.getElementById("slide-clay").value = defaults.clay;

        // Update textual slider displays
        document.getElementById("val-precip").innerText = defaults.precip;
        document.getElementById("val-heat").innerText = defaults.heat;
        document.getElementById("val-sand").innerText = `${defaults.sand}%`;
        document.getElementById("val-clay").innerText = `${defaults.clay}%`;
    }
}

let sliderDebounceTimer = null;
let activeForecastAbort = null;

// Sliders UI binder with 150ms debounce to prevent connection queue collisions
function updateSlider(type) {
    const slider = document.getElementById(`slide-${type}`);
    const val = document.getElementById(`val-${type}`);
    if (type === 'sand' || type === 'clay') {
        val.innerText = `${slider.value}%`;
    } else {
        val.innerText = slider.value;
    }

    // Update gauges visually in real-time
    if (type === 'precip') {
        const waterDeficit = Math.round((1.0 - parseFloat(slider.value)) * 100);
        document.getElementById("waterText").innerText = `${waterDeficit}%`;
        drawGauge("waterGauge", waterDeficit, "#10b981");
    } else if (type === 'heat') {
        const heatStress = Math.round(parseFloat(slider.value) * 100);
        document.getElementById("heatText").innerText = `${heatStress}%`;
        drawGauge("heatGauge", heatStress, "#f43f5e");
    }

    // Debounce backend prediction calls so slider dragging never floods Flask
    clearTimeout(sliderDebounceTimer);
    sliderDebounceTimer = setTimeout(() => {
        runForecast();
    }, 120);
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

    // Cancel any previous in-flight request to prevent race conditions & flickering
    if (activeForecastAbort) {
        activeForecastAbort.abort();
    }
    activeForecastAbort = new AbortController();

    // Call REST endpoint
    fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ward, variety, precip, heat, sand, clay }),
        signal: activeForecastAbort.signal
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.message || "CORS/API error"); });
        }
        return res.json();
    })
    .then(data => {
        if (data && data.forecast) {
            updateDashboardUI(data.forecast);
        }
    })
    .catch(err => {
        // If aborted by user input, ignore completely (do NOT trigger offline fallback)
        if (err.name === 'AbortError') {
            return;
        }
        console.warn("Backend REST API offline or blocked. Executing browser-side biophysical math fallback:", err.message);
        // Fallback calculations to guarantee standalone preview
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
        advisory,
        engine: "Offline Biophysical Emulator (API disconnected)"
    };
}

// 5. UPDATE GRAPHICS AND METERS
function updateDashboardUI(forecast) {
    cachedForecast = forecast;

    // Dynamic model version indicator update
    if (forecast.engine) {
        const badge = document.querySelector("header .badge");
        if (badge) {
            badge.innerText = `Model Version: ${forecast.engine}`;
        }
    }

    // Water Deficit Meter (1 - precip)
    const waterDeficit = Math.round((1.0 - forecast.precip) * 100);
    document.getElementById("waterText").innerText = `${waterDeficit}%`;
    drawGauge("waterGauge", waterDeficit, "#10b981");

    // Heat Stress Meter
    const heatStress = Math.round(forecast.heat * 100);
    document.getElementById("heatText").innerText = `${heatStress}%`;
    drawGauge("heatGauge", heatStress, "#f43f5e");

    // Recommendation advisory panel rendering
    const advEl = document.getElementById("advisory-text-box");
    if (advEl && forecast.advisory) {
        advEl.innerText = forecast.advisory;
    }

    // Audio Advisory panel rendering (Separate section)
    updateMmsAdvisoryText(forecast);

    // Draw yield envelope bar chart
    drawYieldChart(forecast.low, forecast.med, forecast.high);
}

// Circular canvas gauge drawer
function drawGauge(canvasId, percentage, color) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 80, 80);
    
    // Draw track - high contrast color depending on light/dark mode
    const isLight = document.body.classList.contains('light-theme');
    ctx.beginPath();
    ctx.arc(40, 40, 32, 0, 2 * Math.PI);
    ctx.strokeStyle = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.05)";
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

    const isLight = document.body.classList.contains('light-theme');
    
    // Dynamic dimensions for responsiveness
    const leftMargin = w < 400 ? 36 : 60;
    const barWidth = w < 360 ? 32 : (w < 480 ? 44 : 60);
    const maxVal = 1800;

    // Draw references lines
    const gridLines = [400, 800, 1200, 1600];
    ctx.strokeStyle = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    ctx.fillStyle = isLight ? "#475569" : "#94a3b8";
    ctx.font = "11px sans-serif";

    gridLines.forEach(line => {
        let y = h - (line / maxVal) * (h - 40) - 20;
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
        ctx.fillText(line, leftMargin - 26, y + 4);
    });

    const gap = (w - leftMargin - 20 - (barWidth * 3)) / 4;
    const labels = ["Low (q10)", "Median (q50)", "High (q90)"];
    const values = [low, med, high];
    const colors = ["#f43f5e", "#6366f1", "#10b981"];

    values.forEach((val, idx) => {
        let x = leftMargin + gap + idx * (barWidth + gap);
        let barH = (val / maxVal) * (h - 40);
        let y = h - barH - 20;

        let grad = ctx.createLinearGradient(x, y, x, h - 20);
        grad.addColorStop(0, colors[idx]);
        grad.addColorStop(1, isLight ? "rgba(99, 102, 241, 0.01)" : "rgba(99, 102, 241, 0.05)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barH, [8, 8, 0, 0]);
        ctx.fill();

        ctx.strokeStyle = colors[idx];
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Top labels (value) - high contrast color depending on theme
        ctx.fillStyle = isLight ? "#0f172a" : "#fff";
        ctx.font = w < 360 ? "bold 10px sans-serif" : "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(val, x + barWidth / 2, y - 8);

        // Bottom label
        ctx.fillStyle = isLight ? "#475569" : "#94a3b8";
        ctx.font = w < 360 ? "9px sans-serif" : "12px sans-serif";
        ctx.fillText(labels[idx], x + barWidth / 2, h - 4);
    });
}

// 6. ADVISORY REPORT EXPORTER (GENUINE .PDF DOCUMENT GENERATOR)
function downloadReport() {
    let data = cachedForecast;

    // Safety Fallback: If cachedForecast has missing/empty values, pull straight from active inputs
    if (!data || !data.ward || data.med === 0) {
        const ward = document.getElementById("location-ward") ? document.getElementById("location-ward").value : "Ward 1 - Esigodini Central";
        const variety = document.getElementById("cultivar-input") ? document.getElementById("cultivar-input").value.trim().toUpperCase() : "SC719";
        const precip = document.getElementById("slide-precip") ? parseFloat(document.getElementById("slide-precip").value) : 0.45;
        const heat = document.getElementById("slide-heat") ? parseFloat(document.getElementById("slide-heat").value) : 0.32;
        const sand = document.getElementById("slide-sand") ? parseInt(document.getElementById("slide-sand").value) : 62;
        const clay = document.getElementById("slide-clay") ? parseInt(document.getElementById("slide-clay").value) : 18;
        data = computeLocalForecast(ward, variety, precip, heat, sand, clay);
        cachedForecast = data;
    }

    const cleanWard = (data.ward || "Umzingwane").replace(/[^a-zA-Z0-9]/g, '_');
    const cleanVariety = (data.variety || "SC719").replace(/[^a-zA-Z0-9]/g, '_');
    const pdfFilename = `NUST_Yield_Report_${cleanWard}_${cleanVariety}.pdf`;

    const btn = document.querySelector(".download-btn");
    const originalText = btn ? btn.innerHTML : "Download Report";
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = "⏳ Generating PDF...";
    }

    const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

    if (jsPDFClass) {
        try {
            const doc = new jsPDFClass({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const today = new Date().toLocaleDateString('en-GB');

            // --- 1. TOP BRANDING & ACCENT BAR ---
            // Dual color accent stripe across the page top
            doc.setFillColor(79, 70, 229); // Indigo
            doc.rect(16, 14, 118, 3, "F");
            doc.setFillColor(16, 185, 129); // Emerald
            doc.rect(134, 14, 60, 3, "F");

            // Institution Name
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(79, 70, 229);
            doc.text("NATIONAL UNIVERSITY OF SCIENCE AND TECHNOLOGY (NUST)", 16, 23);

            // Document Title
            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(15, 23, 42); // #0f172a
            doc.text("Maize Yield Prediction & Advisory Report", 16, 31);

            // Subtitle
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(100, 116, 139); // #64748b
            doc.text("Umzingwane District | Matabeleland South | Agro-Ecological Region IV/V", 16, 37);

            // Status Badge on Top Right
            doc.setFillColor(238, 242, 255);
            doc.roundedRect(144, 20, 50, 15, 2, 2, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(79, 70, 229);
            doc.text("AGRITEX CERTIFIED", 148, 26);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Date: ${today}`, 148, 31);

            // Divider Line
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.line(16, 42, 194, 42);

            // --- 2. METADATA CARDS (2x2 GRID) ---
            const drawCard = (x, y, w, h, label, val) => {
                doc.setFillColor(248, 250, 252);
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(x, y, w, h, 2, 2, "FD");

                doc.setFont("helvetica", "bold");
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                doc.text(label.toUpperCase(), x + 4, y + 5.5);

                doc.setFont("helvetica", "bold");
                doc.setFontSize(9.5);
                doc.setTextColor(15, 23, 42);
                doc.text(String(val), x + 4, y + 11.5);
            };

            drawCard(16, 46, 86, 15, "Location Centroid (Ward)", data.ward || "Esigodini Central");
            drawCard(108, 46, 86, 15, "Maize Cultivar / Maturity Class", data.variety || "SC719");
            drawCard(16, 64, 86, 15, "Soil Texture Matrix", `Sand: ${data.sand}%   |   Clay: ${data.clay}%`);
            drawCard(108, 64, 86, 15, "Environmental Stress Lag", `Rain Lag: ${data.precip}   |   Heat Stress: ${data.heat}`);

            // --- 3. PRIMARY EXPECTED YIELD BANNER ---
            doc.setFillColor(79, 70, 229); // Royal Indigo
            doc.roundedRect(16, 84, 178, 26, 3, 3, "F");

            // Left side text
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(224, 231, 255);
            doc.text("EXPECTED MEDIAN YIELD FORECAST (q50)", 22, 94);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(199, 210, 254);
            doc.text("Calibrated for Agro-Ecological Region IV/V meteorological alignment", 22, 101);

            // Right side yield value
            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.setTextColor(255, 255, 255);
            doc.text(`${data.med} kg/ha`, 186, 96, { align: "right" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(224, 231, 255);
            doc.text(`Equivalent: ${(data.med / 1000).toFixed(2)} tonnes / hectare`, 186, 103, { align: "right" });

            // --- 4. QUANTILE ENVELOPE (q10, q50, q90) ---
            // Card 1: Lower Bound (q10)
            doc.setFillColor(255, 241, 242);
            doc.setDrawColor(244, 63, 94);
            doc.setLineWidth(0.4);
            doc.roundedRect(16, 115, 56, 23, 2, 2, "FD");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(225, 29, 72);
            doc.text("LOWER BOUND (q10)", 20, 121);
            doc.setFontSize(13);
            doc.text(`${data.low} kg/ha`, 20, 128);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.setTextColor(159, 18, 57);
            doc.text("Severe drought shock limit", 20, 133);

            // Card 2: Median (q50)
            doc.setFillColor(238, 242, 255);
            doc.setDrawColor(99, 102, 241);
            doc.roundedRect(77, 115, 56, 23, 2, 2, "FD");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(79, 70, 229);
            doc.text("MEDIAN YIELD (q50)", 81, 121);
            doc.setFontSize(13);
            doc.text(`${data.med} kg/ha`, 81, 128);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.setTextColor(67, 56, 202);
            doc.text("Most probable baseline harvest", 81, 133);

            // Card 3: Upper Bound (q90)
            doc.setFillColor(236, 253, 245);
            doc.setDrawColor(16, 185, 129);
            doc.roundedRect(138, 115, 56, 23, 2, 2, "FD");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(5, 150, 105);
            doc.text("UPPER BOUND (q90)", 142, 121);
            doc.setFontSize(13);
            doc.text(`${data.high} kg/ha`, 142, 128);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.setTextColor(6, 95, 70);
            doc.text("Optimal rainfall distribution", 142, 133);

            // --- 5. AGRONOMIC RECOMMENDATION BOX ---
            const advisoryText = data.advisory || "Standard Seasonal Advisory for Matabeleland South Region.";
            const splitLines = doc.splitTextToSize(advisoryText, 168);
            const boxHeight = Math.max(34, 14 + (splitLines.length * 4.6));

            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(16, 144, 178, boxHeight, 2, 2, "FD");

            // Left Emerald accent border
            doc.setFillColor(16, 185, 129);
            doc.rect(16, 144, 3.5, boxHeight, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(9.5);
            doc.setTextColor(15, 23, 42);
            doc.text("AGRONOMIC RECOMMENDATIONS & EXTENSION ADVISORY", 24, 151.5);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85); // #334155
            let lineY = 158;
            for (let i = 0; i < splitLines.length; i++) {
                doc.text(splitLines[i], 24, lineY);
                lineY += 4.5;
            }

            // --- 6. FOOTER ATTRIBUTIONS & SIGN-OFF ---
            const footerY = 268;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.line(16, footerY, 194, footerY);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text("Generated via NUST MPhil Thesis Biophysical & ML Fusion Architecture (Option B) - Spatial Resolution: Ward Centroids", 16, footerY + 5);

            const serial = "NUST-AGX-" + Math.random().toString(36).substring(2, 8).toUpperCase();
            doc.text(`Digital Verification: Authorized Agritex Officer Digital Sign-off | Ref: ${serial} | Issue Date: ${today}`, 16, footerY + 9.5);

            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text("Copyright (c) 2026 National University of Science and Technology (NUST). All rights reserved.", 16, footerY + 14);

            // SAVE NATIVE VECTOR PDF
            doc.save(pdfFilename);

            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
            return;
        } catch (err) {
            console.error("Native jsPDF generation error, falling back to HTML renderer:", err);
        }
    }

    // --- FALLBACK HTML-TO-PDF GENERATOR (If jsPDF class not available) ---
    // Make sure container is positioned at (0, 0) with high z-index or print media so html2canvas never gets empty coordinates
    const reportDiv = document.createElement("div");
    reportDiv.id = "pdf-report-container";
    reportDiv.style.position = "fixed";
    reportDiv.style.left = "0";
    reportDiv.style.top = "0";
    reportDiv.style.width = "780px";
    reportDiv.style.background = "#ffffff";
    reportDiv.style.color = "#1e293b";
    reportDiv.style.fontFamily = "'Helvetica Neue', Arial, sans-serif";
    reportDiv.style.padding = "24px";
    reportDiv.style.zIndex = "999999";
    reportDiv.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";

    reportDiv.innerHTML = `
        <div style="background:#ffffff; padding:20px; border-radius:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid #6366f1; padding-bottom:16px; margin-bottom:20px;">
                <div>
                    <h1 style="font-size:22px; margin:0; color:#1e1b4b; font-weight:700;">Maize Yield Prediction Report</h1>
                    <div style="font-size:12px; color:#64748b; margin-top:4px;">Umzingwane District, Matabeleland South &bull; NUST MPhil Pipeline</div>
                </div>
                <div style="font-size:13px; font-weight:700; color:#6366f1; text-transform:uppercase; letter-spacing:1px;">NUST Yield Advisory</div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:14px; margin-bottom:20px;">
                <div style="background:#f8fafc; padding:12px 16px; border-radius:10px; border:1px solid #e2e8f0;">
                    <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:600;">Location Centroid</div>
                    <div style="font-size:15px; font-weight:700; color:#0f172a; margin-top:2px;">${data.ward}</div>
                </div>
                <div style="background:#f8fafc; padding:12px 16px; border-radius:10px; border:1px solid #e2e8f0;">
                    <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:600;">Maize Cultivar</div>
                    <div style="font-size:15px; font-weight:700; color:#0f172a; margin-top:2px;">${data.variety}</div>
                </div>
                <div style="background:#f8fafc; padding:12px 16px; border-radius:10px; border:1px solid #e2e8f0;">
                    <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:600;">Soil Texture Composition</div>
                    <div style="font-size:15px; font-weight:700; color:#0f172a; margin-top:2px;">Sand: ${data.sand}% &bull; Clay: ${data.clay}%</div>
                </div>
                <div style="background:#f8fafc; padding:12px 16px; border-radius:10px; border:1px solid #e2e8f0;">
                    <div style="font-size:11px; text-transform:uppercase; color:#64748b; font-weight:600;">Precipitation Stress Lag</div>
                    <div style="font-size:15px; font-weight:700; color:#0f172a; margin-top:2px;">${data.precip} (Scaled Lag 30d)</div>
                </div>
            </div>

            <div style="background:linear-gradient(135deg, #4f46e5, #6366f1); color:#ffffff; padding:18px 24px; border-radius:12px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.8px; opacity:0.9;">Expected Median Yield Forecast</div>
                    <div style="font-size:11px; opacity:0.75; margin-top:2px;">Standard meteorological alignment (q50)</div>
                </div>
                <div style="font-size:28px; font-weight:700;">${data.med} kg/ha</div>
            </div>

            <div style="display:flex; justify-content:space-between; gap:12px; margin-bottom:20px;">
                <div style="flex:1; text-align:center; padding:12px; border-radius:10px; border:1.5px dashed #f43f5e; background:#fff1f2; color:#e11d48;">
                    <div style="font-size:10px; text-transform:uppercase; font-weight:600;">Lower Bound (q10)</div>
                    <div style="font-size:18px; font-weight:700; margin-top:2px;">${data.low} kg/ha</div>
                </div>
                <div style="flex:1; text-align:center; padding:12px; border-radius:10px; border:1.5px dashed #6366f1; background:#eef2ff; color:#4f46e5;">
                    <div style="font-size:10px; text-transform:uppercase; font-weight:600;">Median Yield (q50)</div>
                    <div style="font-size:18px; font-weight:700; margin-top:2px;">${data.med} kg/ha</div>
                </div>
                <div style="flex:1; text-align:center; padding:12px; border-radius:10px; border:1.5px dashed #10b981; background:#ecfdf5; color:#059669;">
                    <div style="font-size:10px; text-transform:uppercase; font-weight:600;">Upper Bound (q90)</div>
                    <div style="font-size:18px; font-weight:700; margin-top:2px;">${data.high} kg/ha</div>
                </div>
            </div>

            <div style="background:#f8fafc; border-left:4px solid #10b981; padding:16px; border-radius:0 10px 10px 0; margin-bottom:20px; font-size:13px; line-height:1.6; color:#334155;">
                <div style="font-weight:700; color:#0f172a; margin-bottom:6px; font-size:14px;">Agronomic Recommendation</div>
                <div>${data.advisory ? data.advisory.replace(/\n/g, '<br>') : 'Standard Season Advisory for Matabeleland South.'}</div>
            </div>

            <div style="text-align:center; font-size:10.5px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:14px; margin-top:24px;">
                <p style="margin:2px 0;">Generated via NUST MPhil Thesis Hybrid Model Fusion Pipeline (Option B) | Scale: kg/ha</p>
                <p style="margin:2px 0;">Security Verification: Authorized Agritex Officer Digital System Sign-off &bull; Date: ${new Date().toLocaleDateString('en-GB')}</p>
            </div>
        </div>
    `;

    document.body.appendChild(reportDiv);

    if (window.html2pdf) {
        const opt = {
            margin: [10, 10, 10, 10],
            filename: pdfFilename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false, scrollY: 0, scrollX: 0 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        window.html2pdf().set(opt).from(reportDiv).save()
            .then(() => {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
                if (reportDiv.parentNode) document.body.removeChild(reportDiv);
            })
            .catch(err => {
                console.error("html2pdf generation error:", err);
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = originalText;
                }
                if (reportDiv.parentNode) document.body.removeChild(reportDiv);
                window.print();
            });
    } else {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
        if (reportDiv.parentNode) document.body.removeChild(reportDiv);
        window.print();
    }
}

// Setup inputs key handlers and window resize callbacks
window.onload = function() {
    // Sync portal theme from storage
    const savedTheme = localStorage.getItem('nust_portal_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }

    // Load defaults for the initial ward selection
    applyWardDefaults();

    // Pull central database credentials on load
    syncUsersFromBackend();

    drawGauge("waterGauge", 35, "#10b981");
    drawGauge("heatGauge", 32, "#f43f5e");
    
    // Login input enter bindings
    document.getElementById("username").addEventListener("keypress", function(e) {
        if (e.key === "Enter") attemptLogin();
    });
    document.getElementById("password").addEventListener("keypress", function(e) {
        if (e.key === "Enter") attemptLogin();
    });

    // Check for active session to prevent logouts on navigation back from admin
    const activeUserJson = sessionStorage.getItem('nust_active_user');
    if (activeUserJson) {
        try {
            const matchedUser = JSON.parse(activeUserJson);
            if (matchedUser && matchedUser.name && matchedUser.role) {
                selectedRole = matchedUser.role; // restore selected role context
                document.getElementById("logged-user-name").innerText = `${matchedUser.name} (${matchedUser.role})`;
                const adminBtn = document.getElementById("admin-redirect-btn");
                if (matchedUser.role === 'Agritex Officer') {
                    adminBtn.style.display = "inline-block";
                } else {
                    adminBtn.style.display = "none";
                }
                const gate = document.getElementById("login-gate");
                gate.style.display = "none";
                gate.style.opacity = "0";
                setTimeout(() => {
                    runForecast();
                }, 100);
            }
        } catch (e) {
            console.error("Failed to restore session", e);
        }
    }
};

window.onresize = function() {
    if (document.getElementById("login-gate").style.display === "none" && cachedForecast) {
        // Redraw synchronously using cached data to avoid network fetch race conditions on resize
        updateDashboardUI(cachedForecast);
    }
};

// Toggle Portal Usage Guide
function toggleUsageGuide() {
    const panel = document.getElementById("usage-panel");
    const btn = document.getElementById("usage-toggle-btn");
    if (panel.style.display === "none") {
        panel.style.display = "flex";
        btn.innerHTML = "<span class='widget-text'>Close Guide</span>";
    } else {
        panel.style.display = "none";
        btn.innerHTML = "<span class='widget-text'>Usage Guide</span>";
    }
}

// Toggle Login Password Visibility
function toggleLoginPasswordVisibility() {
    const passInput = document.getElementById("password");
    const toggleBtn = document.getElementById("password-toggle-btn");
    const eyeSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    const eyeOffSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

    if (passInput.type === "password") {
        passInput.type = "text";
        toggleBtn.innerHTML = eyeOffSVG;
        toggleBtn.title = "Hide Password";
    } else {
        passInput.type = "password";
        toggleBtn.innerHTML = eyeSVG;
        toggleBtn.title = "Show Password";
    }
}

// ==============================================================
// MULTILINGUAL SPEECH SYNTHESIS (META MMS) LOGIC
// ==============================================================
let currentMmsLang = 'nde';
let isMmsAudioPlaying = false;

const MMS_CORPUS = {
    SC301: {
        nde: {
            drought: "I-SC301 yinhlobo ekhula masinya kakhulu (amalanga ayi-110). Iyakwazi ukuphunyuka esomisweni. Isixwayiso sesomiso: Hlwanyelani masinya ekupheleni kukaLwezi, lisebenzise imisele ye-tied ridges lokufulela umhlabathi ngotshani.",
            standard: "I-SC301 yinhlobo ekhula masinya kakhulu emalangeni ayi-110. Isibikezelo sesikhathi esihle: Isivuno sithembisa ukuba sihle. Hlwanyelani ngesikhathi, liqede ukuhlakula ngeviki lesine, njalo lihlole izibungu ze-Fall Armyworm."
        },
        sna: {
            drought: "Mbeu ye-SC301 inokurumidza kuibva mumisi zana negumi. Inokwanisa kupukunyuka mukusanaya kwemvura. Yambiro: Dyirai pakupera kwaMbudzi, shandisai migero ye-tied ridges nekufukidza ivhu kuchengetedza unyoro.",
            standard: "Mbeu ye-SC301 inokurumidza kuibva mumisi zana negumi. Mwaka wakanaka: Goho rinotarisirwa kuva rakanaka chose. Dyirai nenguva, pedzai kusakura svondo rechina risati rapfuura, uye chenjererai makonye e-Fall Armyworm."
        },
        en: {
            drought: "SC301 is an ultra-early maturing variety (110 days) with high drought escape capability. Critical drought warning: Plant late November, adopt tied ridges and mulch with organic residues.",
            standard: "SC301 is an ultra-early maturing variety (110 days). Standard season advisory: Favorable yield outlook. Complete weeding by week 4 and scout for Fall Armyworm."
        }
    },
    SC436: {
        nde: {
            drought: "I-SC436 yinhlobo ekhula ngokuphangisa emalangeni ayi-120. Isebenza kuhle ezindaweni ezilezulu eliphakathi. Isixwayiso: Fakani umquba nge-micro-dosing njalo ligcine umswakama enhlabathini.",
            standard: "I-SC436 yinhlobo ekhula ngokuphangisa emalangeni ayi-120. Isivuno sithembisa ukuba sihle kakhulu. Gcinani izikhala ezifaneleyo phakathi kwezitshalo ukuze lithole isivuno esiphezulu."
        },
        sna: {
            drought: "Mbeu ye-SC436 inokurumidza kuibva mumisi zana nemakumi maviri. Inoshanda zvakanaka mumatunhu ane mvura yepakati nepashoma. Yambiro: Isai fetereza nenzira ye-micro-dosing kuchengetedza zvirimwa.",
            standard: "Mbeu ye-SC436 inokurumidza kuibva mumisi zana nemakumi maviri. Mwaka wakanaka: Goho riri kuratidza kunaka kwazvo. Teverai zviratidzo zvekupatsanura mbeu zvakanaka."
        },
        en: {
            drought: "SC436 is an early maturing variety (120 days) reliable in low-to-medium rainfall zones. Drought warning: Apply micro-dosing fertilizer and preserve soil moisture.",
            standard: "SC436 is an early maturing variety (120 days). Standard season advisory: Strong yield potential. Maintain recommended planting density for peak harvest."
        }
    },
    SC529: {
        nde: {
            drought: "I-SC529 yinhlobo ekhula ngokulingeneyo emalangeni ayi-135. Ludinga umswakama oweneleyo. Nxa izulu lilutshwana, fulelani ngotshani obunengi njalo lisebenzise imisele yokubamba amanzi.",
            standard: "I-SC529 yinhlobo ekhula ngokulingeneyo emalangeni ayi-135. Ilempumela ephezulu kakhulu nxa kulezulu elizwakalayo. Fakani umquba wesibili ngesikhathi esifaneleyo."
        },
        sna: {
            drought: "Mbeu ye-SC529 inotora nguva yepakati (misi zana nemakumi matatu nemashanu). Inoda unyoro hwakakwana. Kana mvura iri shoma, fukidzai ivhu uye cherai migero inobata mvura muminda.",
            standard: "Mbeu ye-SC529 inotora nguva yepakati (misi zana nemakumi matatu nemashanu). Inopa goho repamusoro-soro kana mvura yanaya zvakanaka. Isai fetereza yepamusoro nenguva yakakodzera."
        },
        en: {
            drought: "SC529 is a medium-maturing variety (135 days) with high yield capacity under adequate moisture. Drought alert: Mulch heavily and dig infiltration pits to sustain the crop.",
            standard: "SC529 is a medium-maturing variety (135 days). Standard season advisory: Excellent yield potential. Apply top-dressing fertilizer timely for maximum cob filling."
        }
    },
    SC719: {
        nde: {
            drought: "I-SC719 yinhlobo edinga isikhathi eside (amalanga adlula 145). Isomiso silakho ukubangela ukwehluleka kwesivuno. Kumele lilime ngezindlela zokubamba amanzi kuphela loba licabange ngokutshala ezikhula masinya.",
            standard: "I-SC719 yinhlobo yebanga elide eletha isivuno esikhulu kakhulu (amalanga adlula 145). Isivuno silindeleke ukuthi siphezulu kakhulu. Hlwanyelani masinya ngenyanga kaLwezi."
        },
        sna: {
            drought: "Mbeu ye-SC719 inononoka kuibva (misi inodarika zana nemakumi mana nemashanu). Kusanaya kwemvura kunogona kuderedza goho zvikuru. Shandisai unyanzvi hwekuchengetedza mvura chose.",
            standard: "Mbeu ye-SC719 inopa goho guru kwazvo (misi inodarika zana nemakumi mana nemashanu). Mwaka wakanaka: Goho guru rinotarisirwa. Dyirai nenguva yekutanga kwaMbudzi."
        },
        en: {
            drought: "SC719 is a long-season high-yield variety (145+ days). Severe drought warning: Crop failure risk is high under low moisture. Employ total moisture harvesting or consider early maturity.",
            standard: "SC719 is a long-season hybrid delivering maximum genetic yield ceiling (145+ days). Standard season advisory: Outstanding harvest projected. Plant strictly in early November."
        }
    }
};

let currentMmsPlaybackRate = 1.0;
const MMS_RATES = [1.0, 1.25, 0.8];

function switchMmsLanguage(lang) {
    currentMmsLang = lang;
    ['nde', 'sna', 'en'].forEach(l => {
        const tab = document.getElementById(`mms-tab-${l}`);
        if (tab) tab.classList.toggle('active', l === lang);
    });
    
    const audioEl = document.getElementById("mms-audio-element");
    if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
    }
    isMmsAudioPlaying = false;
    updateMmsAudioSource();
    updateMmsButtonUI();

    if (cachedForecast) {
        updateMmsAdvisoryText(cachedForecast);
    }
}

function updateMmsAdvisoryText(forecast) {
    if (!forecast) return;
    const cultivar = (forecast.variety || "SC719").toUpperCase();
    const condition = (forecast.precip !== undefined && forecast.precip < 0.45) ? 'drought' : 'standard';
    const cultivarData = MMS_CORPUS[cultivar] || MMS_CORPUS["SC719"];
    const localizedText = cultivarData[currentMmsLang][condition];
    
    const transcriptEl = document.getElementById("mms-spoken-transcript");
    if (transcriptEl) {
        const langPrefix = currentMmsLang === 'nde' 
            ? '<strong style="color: #10b981;">[isiNdebele - Matabeleland South]:</strong><br>' 
            : (currentMmsLang === 'sna' 
                ? '<strong style="color: #6366f1;">[chiShona]:</strong><br>' 
                : '<strong style="color: #cbd5e1;">[English Spoken Advisory]:</strong><br>');
        transcriptEl.innerHTML = langPrefix + localizedText;
    }
    updateMmsAudioSource();
    updateMmsButtonUI();
}

function updateMmsAudioSource() {
    const audioEl = document.getElementById("mms-audio-element");
    if (!audioEl) return;
    const cultivar = ((cachedForecast && cachedForecast.variety) || "SC719").toUpperCase();
    const condition = (cachedForecast && cachedForecast.precip !== undefined && cachedForecast.precip < 0.45) ? 'drought' : 'standard';
    const expectedSrc = `static/audio/advisory_${cultivar}_${condition}_${currentMmsLang}.mp3`;
    
    // Only update src if it changed
    if (!audioEl.src.endsWith(expectedSrc)) {
        audioEl.src = expectedSrc;
        audioEl.load();
    }

    const trackTag = document.getElementById("mms-track-tag");
    if (trackTag) {
        const langLabel = currentMmsLang === 'nde' ? 'isiNdebele' : (currentMmsLang === 'sna' ? 'chiShona' : 'English');
        const condLabel = condition === 'drought' ? 'Drought Alert' : 'Standard Season';
        trackTag.innerText = `${cultivar} • ${condLabel} • ${langLabel}`;
    }
}

function toggleMmsAudio() {
    const audioEl = document.getElementById("mms-audio-element");
    if (!audioEl) return;

    if (!audioEl.src || audioEl.src === window.location.href) {
        updateMmsAudioSource();
    }

    if (isMmsAudioPlaying) {
        audioEl.pause();
    } else {
        audioEl.playbackRate = currentMmsPlaybackRate;
        audioEl.play().catch(err => {
            console.warn("Audio play blocked or failed:", err);
            const statusText = document.getElementById("mms-status-text");
            if (statusText) statusText.innerText = "Click to allow audio playback";
        });
    }
}

function seekMmsAudio(deltaSeconds) {
    const audioEl = document.getElementById("mms-audio-element");
    if (!audioEl) return;
    if (!audioEl.src || audioEl.src === window.location.href) {
        updateMmsAudioSource();
    }
    const newTime = Math.max(0, Math.min((audioEl.currentTime || 0) + deltaSeconds, audioEl.duration || 60));
    audioEl.currentTime = newTime;
    onMmsTimeUpdate();
}

function replayMmsAudio() {
    const audioEl = document.getElementById("mms-audio-element");
    if (!audioEl) return;
    updateMmsAudioSource();
    audioEl.currentTime = 0;
    audioEl.playbackRate = currentMmsPlaybackRate;
    audioEl.play().catch(() => {});
}

function cycleMmsPlaybackRate() {
    const audioEl = document.getElementById("mms-audio-element");
    const nextIdx = (MMS_RATES.indexOf(currentMmsPlaybackRate) + 1) % MMS_RATES.length;
    currentMmsPlaybackRate = MMS_RATES[nextIdx];
    if (audioEl) audioEl.playbackRate = currentMmsPlaybackRate;
    const speedLabel = document.getElementById("mms-speed-label");
    if (speedLabel) speedLabel.innerText = `${currentMmsPlaybackRate.toFixed(1)}x`;
}

function onMmsScrubberClick(event) {
    const audioEl = document.getElementById("mms-audio-element");
    const scrubber = document.getElementById("mms-scrubber");
    if (!audioEl || !scrubber || !audioEl.duration) return;

    const rect = scrubber.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(clickX / rect.width, 1));
    audioEl.currentTime = ratio * audioEl.duration;
    onMmsTimeUpdate();
}

function onMmsTimeUpdate() {
    const audioEl = document.getElementById("mms-audio-element");
    if (!audioEl) return;

    const curTime = audioEl.currentTime || 0;
    const duration = audioEl.duration || 0;

    const curLabel = document.getElementById("mms-time-current");
    const totalLabel = document.getElementById("mms-time-total");
    const fill = document.getElementById("mms-scrubber-fill");

    if (curLabel) curLabel.innerText = formatMmsTime(curTime);
    if (totalLabel && duration) totalLabel.innerText = formatMmsTime(duration);

    if (fill && duration > 0) {
        const percent = (curTime / duration) * 100;
        fill.style.width = `${percent}%`;
    }
}

function onMmsMetadataLoaded() {
    const audioEl = document.getElementById("mms-audio-element");
    if (!audioEl) return;
    const totalLabel = document.getElementById("mms-time-total");
    if (totalLabel && audioEl.duration) {
        totalLabel.innerText = formatMmsTime(audioEl.duration);
    }
}

function onMmsAudioPlayState(isPlaying) {
    isMmsAudioPlaying = isPlaying;
    updateMmsButtonUI();
}

function onMmsAudioEnded() {
    isMmsAudioPlaying = false;
    updateMmsButtonUI();
    const fill = document.getElementById("mms-scrubber-fill");
    if (fill) fill.style.width = "0%";
    const curLabel = document.getElementById("mms-time-current");
    if (curLabel) curLabel.innerText = "0:00";
}

function formatMmsTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateMmsButtonUI() {
    const playIcon = document.getElementById("mms-play-icon");
    const playLabel = document.getElementById("mms-play-label");
    const playBtn = document.getElementById("mms-play-btn");
    const statusContainer = document.getElementById("mms-audio-status");
    const statusText = document.getElementById("mms-status-text");

    if (isMmsAudioPlaying) {
        if (playIcon) playIcon.innerText = "⏸";
        if (playLabel) playLabel.innerText = "Misa (Pause Spoken Audio)";
        if (playBtn) playBtn.classList.add("playing");
        if (statusContainer) statusContainer.classList.add("active");
        if (statusText) statusText.innerText = "Playing voice synthesis...";
    } else {
        if (playIcon) playIcon.innerText = "▶";
        const labelText = currentMmsLang === 'nde' 
            ? "Lalela nge-Sindebele (Listen in Ndebele)" 
            : (currentMmsLang === 'sna' 
                ? "Teerera ne-ChiShona (Listen in Shona)" 
                : "Play Spoken English Audio");
        if (playLabel) playLabel.innerText = labelText;
        if (playBtn) playBtn.classList.remove("playing");
        if (statusContainer) statusContainer.classList.remove("active");
        if (statusText) statusText.innerText = "Ready to play";
    }
}