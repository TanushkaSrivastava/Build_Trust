import json
import os

class UserDB:
    def __init__(self):
        self.file_path = os.path.join(os.path.dirname(__file__), '../../local_users.json')
        self.users = self._load_users()

    def _load_users(self):
        if os.path.exists(self.file_path):
            try:
                with open(self.file_path, 'r') as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def _save_users(self):
        with open(self.file_path, 'w') as f:
            json.dump(self.users, f, indent=4)

    def get_user(self, email):
        return self.users.get(email.lower().strip())

    def create_user(self, email, password_hash, role, full_name):
        import datetime
        email = email.lower().strip()
        self.users[email] = {
            "email": email,
            "password_hash": password_hash,
            "role": role,
            "name": full_name,
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        self._save_users()
        return self.users[email]

user_db = UserDB()
