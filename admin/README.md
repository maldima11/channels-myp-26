# Admin Credentials Management Portal (`/admin`)

This folder contains the administration interface for registering and managing user accounts for farmers and Agritex officers. 

---

## Technical Specifications

### Functional Components
1.  **Account Registration Form**: Captures Username, Password, Full Name, and System Role (Agritex Officer or Farmer).
2.  **Duplicate Check**: Prevents registering identical usernames.
3.  **Active Directory Listing**: Renders a tabular list of all active user records.
4.  **Credential Purging**: Allows deleting accounts (except the default fallback `agritex_officer` account to prevent lockout).
5.  **Metrics Board**: Displays running count highlights of total users, officers, and farmers in real-time.

### Non-Functional Components
*   **Zero-Dependency Portability**: Built using vanilla HTML5, CSS3, and ES6 Javascript. No external database servers or package installs are required.
*   **Shared Client-side Storage**: Credentials are mapped in `localStorage` under the key `nust_authorized_users`. This shared space is directly read by the Web Portal and Mobile App.
*   **Security & Safety Gates**: Employs validation rules on all inputs.

---

## Setup & Running
1.  Open [index.html](file:///Users/mac/Documents/first_anti/deployment_channels/admin/index.html) in any web browser.
2.  Fill in the form to register new accounts.
3.  The registered accounts will be instantly usable to authorize logins on the Web Portal and Mobile App running in the same browser context.
