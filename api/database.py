import sqlite3
import os
import json
import datetime

# Serverless / Read-only filesystem support (e.g. Vercel Lambda)
if os.environ.get('VERCEL') or not os.access(os.path.dirname(__file__), os.W_OK):
    DB_FILE = os.path.join('/tmp', 'nust_system.db')
    USERS_JSON_FILE = os.path.join('/tmp', 'users_db.json')
    SMS_JSON_FILE = os.path.join('/tmp', 'sms_logs.json')
else:
    DB_FILE = os.path.join(os.path.dirname(__file__), 'nust_system.db')
    USERS_JSON_FILE = os.path.join(os.path.dirname(__file__), 'users_db.json')
    SMS_JSON_FILE = os.path.join(os.path.dirname(__file__), 'sms_logs.json')

DEFAULT_USERS = [
    { "username": "agritex_officer", "password": "nust_maize_2026", "name": "Primary Officer", "role": "Agritex Officer", "phone": "+263771234567", "ward": "All Wards" },
    { "username": "johen_doe", "password": "12345", "name": "Johen Doe", "role": "Farmer", "phone": "+263772345678", "ward": "Ward 12 (Ntabazinduna)" },
    { "username": "farmer", "password": "farmer2026", "name": "Local Farmer", "role": "Farmer", "phone": "+263773456789", "ward": "Ward 15 (Esigodini Centroid)" },
    { "username": "admin", "password": "admin123", "name": "System Admin", "role": "Administrator", "phone": "+263774567890", "ward": "All Wards" }
]

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes SQLite database tables and migrates existing JSON records."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users table for authentication and profile management
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            phone TEXT DEFAULT '',
            ward TEXT DEFAULT 'All Wards',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Login activity audit log table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS login_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            role TEXT,
            status TEXT NOT NULL,
            ip_address TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 3. SMS broadcast history table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sms_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            category TEXT,
            target_ward TEXT,
            target_role TEXT,
            sender TEXT,
            recipient_count INTEGER,
            message_sample TEXT,
            gateway TEXT,
            recipients_json TEXT
        )
    ''')
    conn.commit()

    # Check if users table needs seeding
    cursor.execute('SELECT COUNT(*) FROM users')
    count = cursor.fetchone()[0]

    if count == 0:
        # Load from existing users_db.json if available, else DEFAULT_USERS
        seed_users = DEFAULT_USERS
        if os.path.exists(USERS_JSON_FILE):
            try:
                with open(USERS_JSON_FILE, 'r', encoding='utf-8') as f:
                    file_users = json.load(f)
                    if isinstance(file_users, list) and len(file_users) > 0:
                        seed_users = file_users
            except Exception as e:
                print(f"[Database Init Warning] Could not read users_db.json ({e}), using default seed users.")

        for u in seed_users:
            cursor.execute('''
                INSERT OR IGNORE INTO users (username, password, name, role, phone, ward)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                u.get('username'),
                u.get('password'),
                u.get('name'),
                u.get('role'),
                u.get('phone', '+263770000000'),
                u.get('ward', 'All Wards')
            ))
        conn.commit()
        print(f"[Database Init] Seeded {len(seed_users)} user accounts into SQLite database.")

    # Migrate any SMS logs if available
    cursor.execute('SELECT COUNT(*) FROM sms_logs')
    sms_count = cursor.fetchone()[0]
    if sms_count == 0 and os.path.exists(SMS_JSON_FILE):
        try:
            with open(SMS_JSON_FILE, 'r', encoding='utf-8') as f:
                logs = json.load(f)
                if isinstance(logs, list):
                    for log in logs:
                        cursor.execute('''
                            INSERT OR IGNORE INTO sms_logs 
                            (id, timestamp, category, target_ward, target_role, sender, recipient_count, message_sample, gateway, recipients_json)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (
                            log.get('id', f"sms_{int(datetime.datetime.now().timestamp())}"),
                            log.get('timestamp', ''),
                            log.get('category', ''),
                            log.get('target_ward', ''),
                            log.get('target_role', ''),
                            log.get('sender', ''),
                            log.get('recipient_count', 0),
                            log.get('message_sample', ''),
                            log.get('gateway', ''),
                            json.dumps(log.get('recipients', []))
                        ))
                    conn.commit()
        except Exception as e:
            print(f"[Database Init Warning] Could not migrate sms_logs.json ({e}).")

    conn.close()

def sync_users_to_json():
    """Keeps users_db.json in sync with SQLite database for backward compatibility."""
    users = get_all_users()
    try:
        with open(USERS_JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump(users, f, indent=4)
    except Exception as e:
        print(f"[Database Warning] Could not sync to users_db.json: {e}")

def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, password, name, role, phone, ward, created_at FROM users ORDER BY id ASC')
    rows = cursor.fetchall()
    users = [dict(row) for row in rows]
    conn.close()
    return users

def get_user_by_username(username):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', (username.strip(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def create_user(username, password, name, role, phone='+26377', ward='All Wards'):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO users (username, password, name, role, phone, ward)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (username.strip().lower(), password.strip(), name.strip(), role.strip(), phone.strip(), ward.strip()))
        conn.commit()
        conn.close()
        sync_users_to_json()
        return True, "User registered successfully in database."
    except sqlite3.IntegrityError:
        conn.close()
        return False, f"Username '{username}' already exists in database."
    except Exception as e:
        conn.close()
        return False, str(e)

def update_user(username, data):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', (username.strip(),))
        existing = cursor.fetchone()
        if not existing:
            conn.close()
            return False, f"User '{username}' not found in database."

        updates = []
        params = []
        if 'name' in data and data['name']:
            updates.append("name = ?")
            params.append(data['name'].strip())
        if 'password' in data and data['password']:
            updates.append("password = ?")
            params.append(data['password'].strip())
        if 'role' in data and data['role']:
            updates.append("role = ?")
            params.append(data['role'].strip())
        if 'phone' in data and data['phone']:
            updates.append("phone = ?")
            params.append(data['phone'].strip())
        if 'ward' in data and data['ward']:
            updates.append("ward = ?")
            params.append(data['ward'].strip())

        updates.append("updated_at = CURRENT_TIMESTAMP")
        params.append(username.strip())

        sql = f"UPDATE users SET {', '.join(updates)} WHERE LOWER(username) = LOWER(?)"
        cursor.execute(sql, params)
        conn.commit()
        conn.close()
        sync_users_to_json()
        return True, "User updated successfully."
    except Exception as e:
        conn.close()
        return False, str(e)

def delete_user(username):
    if username.strip().lower() == 'agritex_officer':
        return False, "Cannot delete primary root officer account."

    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('DELETE FROM users WHERE LOWER(username) = LOWER(?)', (username.strip(),))
        deleted = cursor.rowcount > 0
        conn.commit()
        conn.close()
        if deleted:
            sync_users_to_json()
            return True, "User deleted successfully from database."
        return False, f"User '{username}' not found in database."
    except Exception as e:
        conn.close()
        return False, str(e)

def verify_and_log_login(username, password, role=None, ip_address='127.0.0.1'):
    """Authenticates credentials against database and records an audit log entry."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    clean_user = username.strip().lower()
    clean_pass = password.strip()

    cursor.execute('SELECT * FROM users WHERE LOWER(username) = ?', (clean_user,))
    row = cursor.fetchone()

    status = 'FAILED'
    authenticated_user = None

    if row and row['password'] == clean_pass:
        if role and row['role'] != role:
            status = f"FAILED_ROLE_MISMATCH (Expected {role}, got {row['role']})"
        else:
            status = 'SUCCESS'
            authenticated_user = {
                "id": row['id'],
                "username": row['username'],
                "name": row['name'],
                "role": row['role'],
                "phone": row['phone'],
                "ward": row['ward']
            }

    # Record login attempt in login_logs table
    cursor.execute('''
        INSERT INTO login_logs (username, role, status, ip_address)
        VALUES (?, ?, ?, ?)
    ''', (clean_user, role or (row['role'] if row else 'Unknown'), status, ip_address))
    conn.commit()
    conn.close()

    return status == 'SUCCESS', authenticated_user, status

def get_login_logs(limit=50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, username, role, status, ip_address, timestamp FROM login_logs ORDER BY id DESC LIMIT ?', (limit,))
    rows = cursor.fetchall()
    logs = [dict(row) for row in rows]
    conn.close()
    return logs

def save_sms_log_db(log_entry):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO sms_logs 
            (id, timestamp, category, target_ward, target_role, sender, recipient_count, message_sample, gateway, recipients_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            log_entry.get('id', f"sms_{int(datetime.datetime.now().timestamp())}"),
            log_entry.get('timestamp', datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            log_entry.get('category', 'Advisory'),
            log_entry.get('target_ward', 'All Wards'),
            log_entry.get('target_role', 'Farmer'),
            log_entry.get('sender', 'Admin'),
            log_entry.get('recipient_count', 0),
            log_entry.get('message_sample', ''),
            log_entry.get('gateway', 'Simulator'),
            json.dumps(log_entry.get('recipients', []))
        ))
        conn.commit()
    except Exception as e:
        print(f"[Database Error] Could not save SMS log to SQLite: {e}")
    finally:
        conn.close()

def get_sms_logs_db(limit=50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, timestamp, category, target_ward, target_role, sender, recipient_count, message_sample, gateway, recipients_json
        FROM sms_logs ORDER BY rowid DESC LIMIT ?
    ''', (limit,))
    rows = cursor.fetchall()
    logs = []
    for r in rows:
        d = dict(r)
        try:
            d['recipients'] = json.loads(d.pop('recipients_json', '[]'))
        except:
            d['recipients'] = []
        logs.append(d)
    conn.close()
    return logs

def clear_sms_logs_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM sms_logs')
    conn.commit()
    conn.close()
    try:
        with open(SMS_JSON_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
    except:
        pass
    return True
