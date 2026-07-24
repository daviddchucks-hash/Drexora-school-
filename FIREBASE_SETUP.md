# 🔥 Firebase Setup Guide — Drexora School Portal

Follow these steps to fix the admin section so it can fetch all students.

---

## Step 1 — Publish the Database Security Rules

**This is the main fix for the admin not seeing all students.**

The rules in `database.rules.json` must be published to Firebase Console.
Without this, Firebase uses its own default rules which block the admin from reading all student records.

1. Go to [Firebase Console → Drexora School → Realtime Database → Rules](https://console.firebase.google.com/project/drexora-school/database/rules)
2. Click **Edit rules**
3. **Delete** all existing content in the editor
4. **Paste** the entire contents of `database.rules.json` (from this project)
5. Click **Publish**

The rules should look like this after publishing:

```json
{
  "rules": {
    "students": {
      ".read":  "root.child('admins').child(auth.uid).exists()",
      ".write": "root.child('admins').child(auth.uid).exists()",
      "$uid": {
        "profile": {
          ".read":  "auth != null && (auth.uid === $uid || root.child('admins').child(auth.uid).exists())",
          ".write": "auth != null && (auth.uid === $uid || root.child('admins').child(auth.uid).exists())"
        },
        "results": {
          ".read":  "auth != null && (auth.uid === $uid || root.child('admins').child(auth.uid).exists())",
          ".write": "root.child('admins').child(auth.uid).exists()"
        }
      }
    },
    "admins": {
      ".read":  "auth != null",
      ".write": "root.child('admins').child(auth.uid).exists()"
    },
    "announcements": {
      ".read":  "auth != null",
      ".write": "root.child('admins').child(auth.uid).exists()"
    }
  }
}
```

---

## Step 2 — Make Sure Your Admin Account is in the Database

For the rules to work, your admin account's UID must exist in the `admins` node.

1. Go to [Firebase Console → Authentication → Users](https://console.firebase.google.com/project/drexora-school/authentication/users)
2. Find your admin email and copy the **User UID** (the long string in the UID column)

3. Go to [Firebase Console → Realtime Database → Data](https://console.firebase.google.com/project/drexora-school/database/data)
4. Check if the `admins` node exists and contains your UID:
   ```
   admins/
     YOUR_UID_HERE/
       name: "Administrator"
       email: "your-admin@email.com"
   ```

5. If it doesn't exist, click **+** (Add child) and create it manually:
   - Node: `admins`
   - Child: `YOUR_UID` (paste the UID from step 2)
   - Add children: `name` = "Administrator", `email` = "your email"

---

## Step 3 — Deploy the Updated Files

After publishing the rules in Firebase Console, deploy the updated HTML/JS files:

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy hosting files
firebase deploy --only hosting
```

Or deploy rules + hosting together:
```bash
firebase deploy
```

---

## Why Was Only 1 Student Showing?

**Root cause:** The database rules were not deployed to Firebase Console.

Without the proper rules, Firebase fell back to default/locked rules where:
- The admin-level read (`students/.read`) was not recognized
- Only the individual `students/$uid/.read` child rule applied
- This allowed each user to only see their own data — so the admin only saw 1 student record (their own, if they also had a student profile)

The overview stat (showing 5) used a count that may have been loaded before the rules locked, or was using cached data.

**After publishing the rules:** The admin account's UID will be verified against the `admins` node, granting full read/write access to all student records.

---

## Security Improvements in the Updated Rules

The new `database.rules.json` also fixes a **security vulnerability** in the original rules:

| Path | Old Rule | New Rule |
|------|----------|----------|
| `students/$uid/results` | Students could write their own results ❌ | Only admins can write results ✅ |
| `students/$uid/profile` | Students could write their own profile ✅ | Students + Admins can write ✅ |
| `admins` write | Any auth user could modify ❌ | Only existing admins can modify ✅ |
