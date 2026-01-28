# Pack Attack Admin Credentials

**KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT**

---

## Admin Login

| Field | Value |
|-------|-------|
| **URL** | https://pack-attack.de/login |
| **Email** | tim@meggert.email |
| **Password** | PackAttack2026!Secure |
| **Name** | Tim |
| **Role** | ADMIN |
| **User ID** | cmkwo499b0000jxp9fqobjkss |

---

## Admin Dashboard

After logging in, access the admin panel at:
- https://pack-attack.de/admin

---

## Change Password

To change the password later, run on the server:
```bash
ssh -i ~/.ssh/id_ed25519_packattack root@82.165.66.236
cd /var/www/packattack/app
ADMIN_EMAIL='tim@meggert.email' ADMIN_PASSWORD='NewPassword123!' sudo -u packattack -E npx tsx scripts/create-admin.ts
```

---

## Server Access

| Method | Command |
|--------|---------|
| SSH | `ssh -i ~/.ssh/id_ed25519_packattack root@82.165.66.236` |
| Deploy Updates | `sudo packattack-deploy` |
| View Logs | `sudo -u packattack pm2 logs packattack` |

---

*Created: 2026-01-27*
