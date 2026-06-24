const STORAGE_KEY = 'nust_authorized_users';
const defaultUsers = [
    { username: 'agritex_officer', password: 'nust_maize_2026', name: 'Primary Officer', role: 'Agritex Officer' }
];

// 1. INITIALIZE LOCAL STORAGE CREDENTIALS
function initUsers() {
    if (!localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
    }
    renderUsers();
}

// 2. RENDER TABLE AND UPDATE HIGHLIGHT STATS
function renderUsers() {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
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

        const tdRole = document.createElement("td");
        tdRole.innerText = user.role;
        tr.appendChild(tdRole);

        const tdActions = document.createElement("td");
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

// 3. CREATE NEW USER ACCOUNT
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

    const users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    
    // Check for duplicate username
    const exists = users.some(u => u.username === username);
    if (exists) {
        errorMsg.innerText = `Username '${username}' is already registered.`;
        errorMsg.style.display = "block";
        return;
    }

    // Add and save
    users.push({ username, password, name, role });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

    // Clear inputs
    usernameInput.value = "";
    passwordInput.value = "";
    nameInput.value = "";

    successMsg.style.display = "block";
    renderUsers();
}

// 4. DELETE USER ACCOUNT
function deleteUser(username) {
    let users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    users = users.filter(u => u.username !== username);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    renderUsers();
}

// Run init on load
window.onload = initUsers;
