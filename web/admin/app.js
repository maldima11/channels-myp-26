const STORAGE_KEY = 'nust_authorized_users';
const THEME_KEY = 'nust_portal_theme';
const isVercelDeployment = window.location.hostname.endsWith('vercel.app');
const activeHostName = (window.location.hostname === 'localhost') ? 'localhost' : (window.location.hostname || '127.0.0.1');
const BASE_API_URL = isVercelDeployment ? '' : `http://${activeHostName}:5000`;
const USERS_API_URL = `${BASE_API_URL}/api/users`;
const SMS_BROADCAST_API_URL = `${BASE_API_URL}/api/sms/broadcast`;
const SMS_LOGS_API_URL = `${BASE_API_URL}/api/sms/logs`;
const PREDICT_API_URL = `${BASE_API_URL}/api/predict`;

const defaultUsers = [
    { username: 'agritex_officer', password: 'nust_maize_2026', name: 'Primary Officer', role: 'Agritex Officer', phone: '+263771234567', ward: 'All Wards' },
    { username: 'johen_doe', password: '12345', name: 'Johen Doe', role: 'Farmer', phone: '+263772345678', ward: 'Ward 12 (Ntabazinduna)' },
    { username: 'farmer', password: 'farmer2026', name: 'Local Farmer', role: 'Farmer', phone: '+263773456789', ward: 'Ward 15 (Esigodini Centroid)' },
    { username: 'maldima_farmer', password: 'farmerpass123', name: 'Stephen Maldima', role: 'Farmer', phone: '+263775551234', ward: 'Ward 1 (Nswazi North)' },
    { username: 'umzingwane_grower', password: 'harvest2026', name: 'Nomusa Khumalo', role: 'Farmer', phone: '+263776112233', ward: 'Ward 15 (Esigodini Centroid)' },
    { username: 'zipper', password: 'farmer234', name: 'Zipper Farmer', role: 'Farmer', phone: '+263777889900', ward: 'Ward 15 (Esigodini Centroid)' },
    { username: 'admin', password: 'admin123', name: 'System Admin', role: 'Administrator', phone: '+263774567890', ward: 'All Wards' }
];

const SMS_TEMPLATES = {
    drought: "⚠️ AGRITEX DROUGHT ALERT: Hello {name}, forecast for {ward} on {date} predicts dry conditions. Practice mulching, maintain tied ridges, and conserve topsoil moisture.",
    planting: "🌱 AGRITEX PLANTING ADVISORY: Hello {name}, effective planting window for {ward} is active ({date}). Use certified Seed Co varieties (SC301/SC436/SC529/SC719) with 25cm in-row spacing.",
    fertilizer: "🧪 AGRITEX FERTILIZER NOTICE: Hello {name}, apply split-dose nitrogen top-dressing (AN/Urea) 3-4 weeks after germination for {ward} maize stands. Avoid application during peak dry heat.",
    pest: "🐛 AGRITEX PEST ALERT: Attention {name} in {ward}, scout maize whorls for Fall Armyworm larvae ({date}). Apply registered biopesticides or contact your local Agritex officer immediately.",
    harvest: "🌾 AGRITEX HARVEST NOTICE: Hello {name}, check cobs for physiological black-layer maturity in {ward} ({date}). Dry grain to under 12.5% moisture before silo storage.",
    custom: "AGRITEX ADVISORY ({date}): Hello {name}, localized maize crop advice for {ward}: "
};

let cachedUsersList = [];
let editMode = false;
let editUsername = '';

// 1. INITIALIZE ON LOAD
function initUsers() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
    
    renderUsers();
    loadSmsLogs();
    applySmsTemplate();
}

// 2. TAB SWITCHER
function switchTab(tabName) {
    document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    const tabBtn = document.getElementById(`tab-${tabName}-btn`);
    const tabPane = document.getElementById(`tab-${tabName}-content`);
    
    if (tabBtn) tabBtn.classList.add('active');
    if (tabPane) tabPane.classList.add('active');

    if (tabName === 'sms') {
        updateRecipientCount();
        loadSmsLogs();
    }
}

// 3. THEME SWITCH CONTROLLER
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
}

// 4. NAVIGATION CONTROLLER
function goBack() {
    window.location.href = "../index.html";
}

// SHA-256 / FNV fallback for password hashing display
function sha256(message) {
    if (window.crypto && crypto.subtle) {
        const msgBuffer = new TextEncoder().encode(message);
        return crypto.subtle.digest('SHA-256', msgBuffer).then(hashBuffer => {
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        });
    } else {
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Promise.resolve("fnv_" + Math.abs(hash).toString(16).padStart(8, '0'));
    }
}

// -------------------------------------------------------------
// USER MANAGEMENT FUNCTIONS
// -------------------------------------------------------------
function drawUsersTable(users) {
    cachedUsersList = users;
    const tbody = document.getElementById("user-table-body");
    tbody.innerHTML = "";
    
    let officerCount = 0;
    let farmerCount = 0;
    let farmersWithPhone = 0;

    users.forEach(user => {
        if (user.role === "Agritex Officer") officerCount++;
        if (user.role === "Farmer") {
            farmerCount++;
            if (user.phone && user.phone.length > 5) farmersWithPhone++;
        }

        const tr = document.createElement("tr");

        // Name
        const tdName = document.createElement("td");
        tdName.setAttribute("data-label", "Name");
        tdName.innerText = user.name;
        tr.appendChild(tdName);

        // Username
        const tdUser = document.createElement("td");
        tdUser.setAttribute("data-label", "Username");
        tdUser.innerText = user.username;
        tr.appendChild(tdUser);

        // Phone (SMS)
        const tdPhone = document.createElement("td");
        tdPhone.setAttribute("data-label", "Phone");
        tdPhone.innerHTML = user.phone ? `<span style="font-family: monospace; color: var(--accent-green);">${user.phone}</span>` : '<span style="color: var(--text-muted);">None</span>';
        tr.appendChild(tdPhone);

        // Ward
        const tdWard = document.createElement("td");
        tdWard.setAttribute("data-label", "Ward");
        tdWard.innerText = user.ward || 'All Wards';
        tr.appendChild(tdWard);

        // Role
        const tdRole = document.createElement("td");
        tdRole.setAttribute("data-label", "Role");
        tdRole.innerHTML = user.role === 'Farmer' 
            ? `<span style="color: #34d399; font-weight:600;">🌾 Farmer</span>`
            : `<span style="color: #818cf8; font-weight:600;">👔 Officer</span>`;
        tr.appendChild(tdRole);

        // Actions
        const tdActions = document.createElement("td");
        tdActions.setAttribute("data-label", "Actions");
        
        // Edit button
        const editBtn = document.createElement("button");
        editBtn.className = "edit-btn";
        editBtn.innerText = "Edit";
        editBtn.onclick = () => startEdit(user);
        tdActions.appendChild(editBtn);

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.innerText = "Delete";
        
        if (user.username === 'agritex_officer') {
            deleteBtn.disabled = true;
            deleteBtn.style.opacity = "0.5";
            deleteBtn.style.cursor = "not-allowed";
        } else {
            deleteBtn.onclick = () => deleteUser(user.username);
        }
        
        tdActions.appendChild(deleteBtn);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });

    // Update highlights
    document.getElementById("stat-total").innerText = users.length;
    document.getElementById("stat-officers").innerText = officerCount;
    document.getElementById("stat-farmers").innerText = farmerCount;
    
    // Update SMS tab reach stats
    const reachEl = document.getElementById("stat-sms-reach");
    if (reachEl) reachEl.innerText = `${farmersWithPhone} / ${farmerCount}`;
    
    updateRecipientCount();
}

function filterUsersTable() {
    const query = document.getElementById("search-users").value.toLowerCase().trim();
    if (!query) {
        drawUsersTable(cachedUsersList);
        return;
    }

    const filtered = cachedUsersList.filter(u => 
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.username && u.username.toLowerCase().includes(query)) ||
        (u.ward && u.ward.toLowerCase().includes(query)) ||
        (u.phone && u.phone.includes(query))
    );
    drawUsersTable(filtered);
}

async function postUserWithFallback(urlPath, method, payload) {
    const urls = [
        USERS_API_URL + (urlPath || ''),
        `http://localhost:5000/api/users${urlPath || ''}`,
        `http://127.0.0.1:5000/api/users${urlPath || ''}`,
        `http://${window.location.hostname || 'localhost'}:5000/api/users${urlPath || ''}`
    ].filter((v, i, a) => a.indexOf(v) === i);

    for (const url of urls) {
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'success') return data;
            }
        } catch(e) {
            // Try next candidate
        }
    }
    throw new Error("Could not reach backend API servers");
}

function renderUsers() {
    fetch(USERS_API_URL)
        .then(res => {
            if (!res.ok) throw new Error("API offline");
            return res.json();
        })
        .then(async data => {
            if (data.status === "success" && Array.isArray(data.users)) {
                // Check if any offline-created users in localStorage need auto-syncing to backend database
                const localRaw = localStorage.getItem(STORAGE_KEY);
                let localUsers = [];
                try { localUsers = localRaw ? JSON.parse(localRaw) : []; } catch(e) {}
                
                const dbUsernames = new Set(data.users.map(u => (u.username || '').toLowerCase()));
                const unsynced = localUsers.filter(u => u.username && !dbUsernames.has(u.username.toLowerCase()));

                if (unsynced.length > 0) {
                    console.log(`[Admin Auto-Sync] Syncing ${unsynced.length} offline account(s) to SQLite database...`);
                    for (const u of unsynced) {
                        try {
                            await postUserWithFallback('', 'POST', u);
                            data.users.push(u);
                        } catch(e) {
                            console.warn("Could not sync user:", u.username, e);
                        }
                    }
                }

                localStorage.setItem(STORAGE_KEY, JSON.stringify(data.users));
                drawUsersTable(data.users);
            } else {
                throw new Error("Invalid response");
            }
        })
        .catch(err => {
            console.warn("Backend offline. Loading credentials directory from LocalStorage fallback:", err);
            const local = localStorage.getItem(STORAGE_KEY);
            let users = defaultUsers;
            if (local) {
                try {
                    users = JSON.parse(local) || defaultUsers;
                } catch(e) {
                    users = defaultUsers;
                }
            }
            drawUsersTable(users);
        });
}

async function createUser() {
    const userField = document.getElementById("reg-username");
    const passField = document.getElementById("reg-password");
    const nameField = document.getElementById("reg-name");
    const phoneField = document.getElementById("reg-phone");
    const wardField = document.getElementById("reg-ward");
    const roleField = document.getElementById("reg-role");

    const err = document.getElementById("form-error");
    const succ = document.getElementById("form-success");

    err.style.display = "none";
    succ.style.display = "none";

    const username = userField.value.trim().toLowerCase();
    const password = passField.value.trim();
    const name = nameField.value.trim();
    const phone = phoneField ? phoneField.value.trim() : '+263770000000';
    const ward = wardField ? wardField.value : 'All Wards';
    const role = roleField.value;

    if (!username || !password || !name) {
        err.innerText = "Please complete username, password, and name.";
        err.style.display = "block";
        return;
    }

    if (editMode) {
        try {
            await postUserWithFallback(`/${editUsername}`, 'PUT', { password, name, role, phone, ward });
            finishEditForm(succ, "User updated successfully in database!");
            renderUsers();
        } catch(errObj) {
            const local = localStorage.getItem(STORAGE_KEY);
            let users = local ? JSON.parse(local) : defaultUsers;
            users = users.map(u => u.username === editUsername ? { ...u, password, name, role, phone, ward } : u);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
            finishEditForm(succ, "User updated in local storage (Offline)");
            drawUsersTable(users);
        }
    } else {
        try {
            await postUserWithFallback('', 'POST', { username, password, name, role, phone, ward });
            // Also update localStorage immediately
            const local = localStorage.getItem(STORAGE_KEY);
            let users = local ? JSON.parse(local) : defaultUsers;
            users = users.filter(u => u.username !== username);
            users.push({ username, password, name, role, phone, ward });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

            succ.innerText = "User registered successfully in database!";
            succ.style.display = "block";
            clearForm();
            renderUsers();
        } catch(errObj) {
            const local = localStorage.getItem(STORAGE_KEY);
            let users = local ? JSON.parse(local) : defaultUsers;
            if (users.find(u => u.username === username)) {
                err.innerText = `Username '${username}' already exists.`;
                err.style.display = "block";
                return;
            }
            users.push({ username, password, name, role, phone, ward });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
            succ.innerText = "User registered locally (Will auto-sync to backend when online)";
            succ.style.display = "block";
            clearForm();
            drawUsersTable(users);
        }
    }
}

function startEdit(user) {
    switchTab('users');
    editMode = true;
    editUsername = user.username;

    document.getElementById("form-title-action").innerText = `Edit Account (${user.username})`;
    document.getElementById("reg-username").value = user.username;
    document.getElementById("reg-username").disabled = true;
    document.getElementById("reg-password").value = user.password;
    document.getElementById("reg-name").value = user.name;
    if (document.getElementById("reg-phone")) document.getElementById("reg-phone").value = user.phone || '+26377';
    if (document.getElementById("reg-ward")) document.getElementById("reg-ward").value = user.ward || 'All Wards';
    document.getElementById("reg-role").value = user.role;

    document.getElementById("reg-primary-btn").innerText = "Save Changes";
    document.getElementById("reg-cancel-btn").style.display = "block";
}

function cancelEdit() {
    clearForm();
    editMode = false;
    editUsername = '';
    document.getElementById("form-title-action").innerText = "Add Authorized Account";
    document.getElementById("reg-username").disabled = false;
    document.getElementById("reg-primary-btn").innerText = "Register User";
    document.getElementById("reg-cancel-btn").style.display = "none";
}

function finishEditForm(succEl, msg) {
    succEl.innerText = msg;
    succEl.style.display = "block";
    cancelEdit();
}

function clearForm() {
    document.getElementById("reg-username").value = "";
    document.getElementById("reg-password").value = "";
    document.getElementById("reg-name").value = "";
    if (document.getElementById("reg-phone")) document.getElementById("reg-phone").value = "+26377";
    if (document.getElementById("reg-ward")) document.getElementById("reg-ward").value = "All Wards";
}

function deleteUser(username) {
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) return;

    fetch(`${USERS_API_URL}/${username}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
            if (data.status === "success") {
                renderUsers();
            } else {
                throw new Error(data.message || "Failed to delete");
            }
        })
        .catch(err => {
            const local = localStorage.getItem(STORAGE_KEY);
            if (local) {
                let users = JSON.parse(local);
                users = users.filter(u => u.username !== username);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
                drawUsersTable(users);
            }
        });
}

// -------------------------------------------------------------
// SMS BROADCAST CONSOLE FUNCTIONS
// -------------------------------------------------------------
function applySmsTemplate() {
    const select = document.getElementById("sms-template-select");
    const textarea = document.getElementById("sms-message-text");
    if (!select || !textarea) return;

    const key = select.value;
    textarea.value = SMS_TEMPLATES[key] || SMS_TEMPLATES.drought;
    updateSmsPreview();
}

function insertPlaceholder(tag) {
    const textarea = document.getElementById("sms-message-text");
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    textarea.value = text.substring(0, start) + tag + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    updateSmsPreview();
}

function updateSmsPreview() {
    const textarea = document.getElementById("sms-message-text");
    const charCountEl = document.getElementById("sms-char-count");
    const segmentCountEl = document.getElementById("sms-segment-count");
    const phoneBubble = document.getElementById("phone-sms-preview");
    const phoneTime = document.getElementById("phone-sms-time");

    if (!textarea) return;

    const rawText = textarea.value;
    const length = rawText.length;
    const segments = Math.max(1, Math.ceil(length / 160));

    if (charCountEl) charCountEl.innerText = length;
    if (segmentCountEl) segmentCountEl.innerText = segments;

    // Simulate replacement for phone preview
    const ward = document.getElementById("sms-target-ward") ? document.getElementById("sms-target-ward").value : "Ward 12";
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    
    let previewText = rawText
        .replace(/{name}/g, "John Moyo")
        .replace(/{ward}/g, ward)
        .replace(/{date}/g, dateStr);

    if (phoneBubble) {
        phoneBubble.innerText = previewText || "Type your advisory message above to see a live recipient simulation...";
    }
    if (phoneTime) {
        const now = new Date();
        phoneTime.innerText = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} • SMS (${segments} seg)`;
    }
}

let currentRecipientMode = 'ward'; // 'ward' or 'manual'

function setRecipientMode(mode) {
    currentRecipientMode = mode;
    const wardBtn = document.getElementById("mode-ward-btn");
    const manualBtn = document.getElementById("mode-manual-btn");
    const wardGroup = document.getElementById("recipient-ward-group");
    const manualGroup = document.getElementById("recipient-manual-group");

    if (mode === 'ward') {
        if (wardBtn) wardBtn.classList.add('active');
        if (manualBtn) manualBtn.classList.remove('active');
        if (wardGroup) wardGroup.style.display = 'block';
        if (manualGroup) manualGroup.style.display = 'none';
    } else {
        if (manualBtn) manualBtn.classList.add('active');
        if (wardBtn) wardBtn.classList.remove('active');
        if (wardGroup) wardGroup.style.display = 'none';
        if (manualGroup) manualGroup.style.display = 'block';
    }
    updateRecipientCount();
}

function updateRecipientCount() {
    const wardSelect = document.getElementById("sms-target-ward");
    const countBadge = document.getElementById("sms-count-badge");
    const manualInput = document.getElementById("sms-manual-numbers");
    const manualCountBadge = document.getElementById("sms-manual-count-badge");

    if (currentRecipientMode === 'ward') {
        if (!wardSelect || !countBadge) return;
        const targetWard = wardSelect.value;
        const local = localStorage.getItem(STORAGE_KEY);
        const users = local ? JSON.parse(local) : cachedUsersList;

        const matchingFarmers = users.filter(u => {
            if (u.role !== 'Farmer') return false;
            if (targetWard === 'All Wards') return true;
            return u.ward === targetWard || u.ward === 'All Wards' || (u.ward && u.ward.includes(targetWard));
        });

        countBadge.innerText = matchingFarmers.length;
    } else {
        if (!manualInput || !manualCountBadge) return;
        const text = manualInput.value.trim();
        if (!text) {
            manualCountBadge.innerText = "0";
        } else {
            const nums = text.split(/[\s,;\n]+/).filter(n => n.trim().length > 0);
            manualCountBadge.innerText = nums.length;
        }
    }
    updateSmsPreview();
}

function updateSmsPreview() {
    const textarea = document.getElementById("sms-message-text");
    const charCountEl = document.getElementById("sms-char-count");
    const segmentCountEl = document.getElementById("sms-segment-count");
    const phoneBubble = document.getElementById("phone-sms-preview");
    const phoneTime = document.getElementById("phone-sms-time");

    if (!textarea) return;

    const rawText = textarea.value;
    const length = rawText.length;
    const segments = Math.max(1, Math.ceil(length / 160));

    if (charCountEl) charCountEl.innerText = length;
    if (segmentCountEl) segmentCountEl.innerText = segments;

    // Simulate replacement for phone preview
    let ward = "Ward 12";
    if (currentRecipientMode === 'ward') {
        ward = document.getElementById("sms-target-ward") ? document.getElementById("sms-target-ward").value : "Ward 12";
    } else {
        ward = "Direct Mobile";
    }
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    
    let previewText = rawText
        .replace(/{name}/g, currentRecipientMode === 'manual' ? "Farmer" : "John Moyo")
        .replace(/{ward}/g, ward)
        .replace(/{date}/g, dateStr);

    if (phoneBubble) {
        phoneBubble.innerText = previewText || "Type your advisory message above to see a live recipient simulation...";
    }
    if (phoneTime) {
        const now = new Date();
        phoneTime.innerText = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')} • SMS (${segments} seg)`;
    }
}

function fetchLiveModelAdvisory() {
    const wardSelect = document.getElementById("sms-target-ward");
    const textarea = document.getElementById("sms-message-text");
    const selectedWard = (currentRecipientMode === 'ward' && wardSelect) ? wardSelect.value : "Ward 12";
    
    const cleanWard = selectedWard.split(" (")[0] || "Ward 12";

    textarea.value = "Fetching latest biophysical AI model forecast...";
    updateSmsPreview();

    fetch(PREDICT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ward: cleanWard,
            variety: "SC719",
            precip: 0.38,
            heat: 0.42,
            sand: 65,
            clay: 20
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.status === "success" && data.forecast) {
            const f = data.forecast;
            const dateStr = "{date}";
            textarea.value = `🌾 NUST AGRITEX AI ALERT (${dateStr}): Hello {name}, forecast for ${selectedWard}: Yield [${f.low}-${f.high}] kg/ha. Rainfall is restricted. Apply mulch and conservation ridges.`;
            updateSmsPreview();
        } else {
            throw new Error("Invalid forecast");
        }
    })
    .catch(() => {
        const dateStr = "{date}";
        textarea.value = `🌾 NUST AGRITEX ADVISORY (${dateStr}): Hello {name}, biophysical models predict low moisture for ${selectedWard}. Practice water-harvesting and split nitrogen top-dressing.`;
        updateSmsPreview();
    });
}

function sendSmsBroadcast() {
    const wardSelect = document.getElementById("sms-target-ward");
    const manualInput = document.getElementById("sms-manual-numbers");
    const templateSelect = document.getElementById("sms-template-select");
    const textarea = document.getElementById("sms-message-text");
    const sendBtn = document.getElementById("sms-broadcast-btn");
    const statusMsg = document.getElementById("sms-status-msg");

    const category = templateSelect ? templateSelect.options[templateSelect.selectedIndex].text : "General Advisory";
    const message = textarea.value.trim();

    if (!message) {
        statusMsg.className = "status-msg error-msg";
        statusMsg.innerText = "Please enter an advisory message to broadcast.";
        statusMsg.style.display = "block";
        return;
    }

    let payload = {
        category: category,
        message: message,
        sender: "District Agritex Admin"
    };

    if (currentRecipientMode === 'manual') {
        const manualText = manualInput ? manualInput.value.trim() : "";
        if (!manualText) {
            statusMsg.className = "status-msg error-msg";
            statusMsg.innerText = "Please enter at least one manual phone number (e.g. +263771234567).";
            statusMsg.style.display = "block";
            return;
        }
        payload.manual_numbers = manualText;
        payload.ward = "Direct / Manual";
    } else {
        payload.ward = wardSelect ? wardSelect.value : "All Wards";
        payload.role = "Farmer";
    }

    sendBtn.disabled = true;
    sendBtn.innerText = "⏳ Dispatching SMS Broadcast...";
    statusMsg.style.display = "none";

    fetch(SMS_BROADCAST_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        sendBtn.disabled = false;
        sendBtn.innerText = "📡 Dispatch SMS Broadcast";

        if (data.status === "success") {
            statusMsg.className = "status-msg success-msg";
            statusMsg.innerHTML = `✅ <strong>Success!</strong> ${data.message} <br><small>Gateway: ${data.gateway}</small>`;
            statusMsg.style.display = "block";
            loadSmsLogs();
        } else if (data.status === "warning") {
            statusMsg.className = "status-msg error-msg";
            statusMsg.innerText = `⚠️ ${data.message}`;
            statusMsg.style.display = "block";
        } else {
            throw new Error(data.message || "Failed to dispatch SMS broadcast");
        }
    })
    .catch(err => {
        sendBtn.disabled = false;
        sendBtn.innerText = "📡 Dispatch SMS Broadcast";

        // Local simulation fallback
        let recipientCount = 1;
        if (currentRecipientMode === 'manual') {
            const manualText = manualInput ? manualInput.value.trim() : "";
            recipientCount = manualText.split(/[\s,;\n]+/).filter(n => n.length > 0).length || 1;
        } else {
            const targetWard = wardSelect ? wardSelect.value : "All Wards";
            const local = localStorage.getItem(STORAGE_KEY);
            const users = local ? JSON.parse(local) : cachedUsersList;
            recipientCount = users.filter(u => u.role === 'Farmer' && (targetWard === 'All Wards' || u.ward === targetWard || u.ward === 'All Wards')).length;
        }

        statusMsg.className = "status-msg success-msg";
        statusMsg.innerHTML = `✅ <strong>Offline Simulation:</strong> Dispatched advisory to ${recipientCount} recipient(s). <br><small>Gateway: Local Mock Simulator</small>`;
        statusMsg.style.display = "block";
    });
}

function loadSmsLogs() {
    const logsBody = document.getElementById("sms-logs-body");
    const totalEl = document.getElementById("stat-sms-total");
    const gatewayEl = document.getElementById("stat-sms-gateway");
    if (!logsBody) return;

    fetch(SMS_LOGS_API_URL)
        .then(res => res.json())
        .then(data => {
            if (data.status === "success" && data.logs) {
                renderSmsLogsTable(data.logs);
                if (totalEl) totalEl.innerText = data.total || data.logs.length;
                if (data.logs.length > 0 && gatewayEl) {
                    gatewayEl.innerText = data.logs[0].gateway.includes("Africa") ? "Africa's Talking" : (data.logs[0].gateway.includes("Twilio") ? "Twilio" : "Simulator");
                }
            }
        })
        .catch(() => {
            renderSmsLogsTable([]);
        });
}

function renderSmsLogsTable(logs) {
    const tbody = document.getElementById("sms-logs-body");
    if (!tbody) return;
    tbody.innerHTML = "";

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">No broadcast history recorded yet.</td></tr>`;
        return;
    }

    logs.slice(0, 20).forEach(log => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-size: 12px; white-space: nowrap; color: var(--text-muted);">${log.timestamp}</td>
            <td><span style="font-weight: 600; color: #818cf8;">${log.target_ward}</span></td>
            <td><span style="color: #34d399; font-weight: 700;">${log.recipient_count} Recipient(s)</span></td>
            <td style="font-size: 13px; line-height: 1.4; color: var(--text-main); word-break: break-word;">${log.message_sample}</td>
            <td><span style="font-size: 11px; padding: 4px 8px; border-radius: 6px; background: rgba(255,255,255,0.05); color: var(--text-muted); white-space: nowrap;">${log.gateway}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function clearSmsLogs() {
    if (!confirm("Are you sure you want to clear the SMS broadcast history?")) return;

    fetch(SMS_LOGS_API_URL, { method: 'DELETE' })
        .then(res => res.json())
        .then(() => {
            loadSmsLogs();
        })
        .catch(() => {
            renderSmsLogsTable([]);
        });
}

// 5. BOOTSTRAP ON LOAD
window.onload = initUsers;