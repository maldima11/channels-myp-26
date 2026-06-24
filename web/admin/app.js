const STORAGE_KEY = 'nust_authorized_users';
const THEME_KEY = 'nust_portal_theme';
const USERS_API_URL = "http://127.0.0.1:5000/api/users";

const defaultUsers = [
    { username: 'agritex_officer', password: 'nust_maize_2026', name: 'Primary Officer', role: 'Agritex Officer' }
];

let editMode = false;
let editUsername = '';

// 1. INITIALIZE LOCAL STORAGE CREDENTIALS & THEME ON LOAD
function initUsers() {
    // Sync theme
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    }
    
    renderUsers();
}

// 2. THEME SWITCH CONTROLLER
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
}

// 3. NAVIGATION CONTROLLER
function goBack() {
    window.location.href = "../index.html";
}

// Helper to render users list
function drawUsersTable(users) {
    const tbody = document.getElementById("user-table-body");
    tbody.innerHTML = "";
    
    let officerCount = 0;
    let farmerCount = 0;

    users.forEach(user => {
        if (user.role === "Agritex Officer") officerCount++;
        if (user.role === "Farmer") farmerCount++;

        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.innerText = user.name;
        tr.appendChild(tdName);

        const tdUser = document.createElement("td");
        tdUser.innerText = user.username;
        tr.appendChild(tdUser);

        const tdPass = document.createElement("td");
        tdPass.innerText = user.password;
        tr.appendChild(tdPass);

        const tdRole = document.createElement("td");
        tdRole.innerText = user.role;
        tr.appendChild(tdRole);

        const tdActions = document.createElement("td");
        
        // Edit button
        const editBtn = document.createElement("button");
        editBtn.className = "edit-btn";
        editBtn.innerText = "Edit";
        editBtn.onclick = () => startEdit(user);
        tdActions.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.innerText = "Delete";
        
        // Prevent deleting the primary fallback officer
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
}

// 4. RENDER DIRECTORY TABLE AND UPDATE STATS (SYNCED WITH BACKEND)
function renderUsers() {
    fetch(USERS_API_URL)
        .then(res => {
            if (!res.ok) throw new Error("API offline");
            return res.json();
        })
        .then(data => {
            if (data.status === "success" && data.users) {
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
            } else {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
            }
            drawUsersTable(users);
        });
}

// 5. CREATE USER ACCOUNT
function createUser() {
    const usernameInput = document.getElementById("reg-username");
    const passwordInput = document.getElementById("reg-password");
    const nameInput = document.getElementById("reg-name");
    const roleInput = document.getElementById("reg-role");

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();
    const name = nameInput.value.trim();
    const role = roleInput.value;

    const errorMsg = document.getElementById("form-error");
    const successMsg = document.getElementById("form-success");

    errorMsg.style.display = "none";
    successMsg.style.display = "none";

    if (!username || !password || !name || !role) {
        errorMsg.innerText = "Please fill all input fields.";
        errorMsg.style.display = "block";
        return;
    }

    if (editMode) {
        updateUser(username, password, name, role);
        return;
    }

    // Try posting to Flask API
    fetch(USERS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name, role })
    })
    .then(res => {
        return res.json().then(data => {
            if (!res.ok) throw new Error(data.message || "Failed to register");
            return data;
        });
    })
    .then(data => {
        // Clear inputs
        usernameInput.value = "";
        passwordInput.value = "";
        nameInput.value = "";

        successMsg.innerText = "User registered successfully!";
        successMsg.style.display = "block";
        renderUsers();
    })
    .catch(err => {
        console.warn("Backend registration failed. Falling back to browser LocalStorage registry:", err.message);
        
        // Local fallback
        const local = localStorage.getItem(STORAGE_KEY);
        let users = [];
        try {
            users = JSON.parse(local) || [];
        } catch(e) {
            users = [];
        }

        const exists = users.some(u => u.username === username);
        if (exists) {
            errorMsg.innerText = `Username '${username}' is already registered.`;
            errorMsg.style.display = "block";
            return;
        }

        users.push({ username, password, name, role });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

        // Clear inputs
        usernameInput.value = "";
        passwordInput.value = "";
        nameInput.value = "";

        successMsg.innerText = "User registered locally (Backend offline)!";
        successMsg.style.display = "block";
        renderUsers();
    });
}

// 5b. UPDATE USER ACCOUNT ADJUSTMENTS
function updateUser(username, password, name, role) {
    const errorMsg = document.getElementById("form-error");
    const successMsg = document.getElementById("form-success");

    fetch(`${USERS_API_URL}/${username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, name, role })
    })
    .then(res => {
        return res.json().then(data => {
            if (!res.ok) throw new Error(data.message || "Failed to update user");
            return data;
        });
    })
    .then(data => {
        cancelEdit();
        successMsg.innerText = "User adjusted successfully!";
        successMsg.style.display = "block";
        renderUsers();
    })
    .catch(err => {
        console.warn("Backend update request failed. Falling back to local update:", err.message);
        
        // Local fallback
        const local = localStorage.getItem(STORAGE_KEY);
        let users = [];
        try {
            users = JSON.parse(local) || [];
        } catch(e) {
            users = [];
        }

        let userFound = false;
        for (let u of users) {
            if (u.username === username) {
                u.password = password;
                u.name = name;
                u.role = role;
                userFound = true;
                break;
            }
        }

        if (!userFound) {
            errorMsg.innerText = `User '${username}' not found.`;
            errorMsg.style.display = "block";
            return;
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
        cancelEdit();
        successMsg.innerText = "User adjusted locally (Backend offline)!";
        successMsg.style.display = "block";
        renderUsers();
    });
}

// 5c. EDIT CONTROL TRIGGERS
function startEdit(user) {
    document.getElementById("reg-username").value = user.username;
    document.getElementById("reg-username").disabled = true;
    document.getElementById("reg-password").value = user.password;
    document.getElementById("reg-name").value = user.name;
    document.getElementById("reg-role").value = user.role;

    editMode = true;
    editUsername = user.username;

    document.getElementById("form-title-action").innerText = "Edit Authorized Account";
    document.getElementById("reg-primary-btn").innerText = "Save Adjustments";
    document.getElementById("reg-cancel-btn").style.display = "inline-block";

    document.getElementById("form-error").style.display = "none";
    document.getElementById("form-success").style.display = "none";
}

function cancelEdit() {
    document.getElementById("reg-username").value = "";
    document.getElementById("reg-username").disabled = false;
    document.getElementById("reg-password").value = "";
    document.getElementById("reg-name").value = "";
    document.getElementById("reg-role").value = "Agritex Officer";

    editMode = false;
    editUsername = "";

    document.getElementById("form-title-action").innerText = "Add Authorized Account";
    document.getElementById("reg-primary-btn").innerText = "Register User";
    document.getElementById("reg-cancel-btn").style.display = "none";

    document.getElementById("form-error").style.display = "none";
    document.getElementById("form-success").style.display = "none";
}

// 6. DELETE USER ACCOUNT
function deleteUser(username) {
    fetch(`${USERS_API_URL}/${username}`, {
        method: "DELETE"
    })
    .then(res => {
        return res.json().then(data => {
            if (!res.ok) throw new Error(data.message || "Failed to delete");
            return data;
        });
    })
    .then(data => {
        renderUsers();
    })
    .catch(err => {
        console.warn("Backend delete request failed. Falling back to local deletion:", err.message);
        
        // Local fallback
        const local = localStorage.getItem(STORAGE_KEY);
        let users = [];
        try {
            users = JSON.parse(local) || [];
        } catch(e) {
            users = [];
        }
        
        users = users.filter(u => u.username !== username);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
        renderUsers();
    });
}

// Run init on load
window.onload = initUsers;
