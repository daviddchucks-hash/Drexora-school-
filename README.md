# Drexora School Portal

A modern, full-featured School Management Portal built with HTML, CSS, JavaScript, and Firebase.

## 🌐 Live Site
Deployed via Firebase Hosting on the `drexora-school` project.

## 🔧 Tech Stack
- **Frontend:** HTML5, CSS3 (with CSS Custom Properties for theming), Vanilla JavaScript (ES6+)
- **Backend/Database:** Firebase (Authentication, Realtime Database, Storage)
- **PDF Generation:** jsPDF
- **Icons:** Font Awesome 6
- **Fonts:** Inter (Google Fonts)

## 📁 Project Structure

```
drexora/
├── index.html              # Landing page
├── login.html              # Student/Admin login
├── dashboard.html          # Student dashboard
├── results.html            # Academic results + PDF download
├── profile.html            # Student profile management
├── notifications.html      # School announcements
├── admin/
│   ├── index.html          # Admin dashboard overview
│   ├── students.html       # Student management (CRUD)
│   ├── results.html        # Results upload & management
│   └── announcements.html  # Announcements management
├── css/
│   ├── main.css            # Global styles, variables, components
│   ├── landing.css         # Landing page styles
│   └── admin.css           # Admin panel styles
├── js/
│   ├── firebase-config.js  # Firebase initialization
│   ├── utils.js            # Shared utilities (toast, spinner, theme, etc.)
│   ├── auth-guard.js       # Authentication protection
│   ├── landing.js          # Landing page interactivity
│   ├── login.js            # Login logic
│   ├── dashboard.js        # Student dashboard
│   ├── results.js          # Results + PDF generation
│   ├── profile.js          # Profile management
│   ├── notifications.js    # Announcements display
│   ├── admin.js            # Admin dashboard
│   ├── admin-students.js   # Student CRUD operations
│   ├── admin-results.js    # Results upload & management
│   └── admin-announcements.js # Announcements CRUD
├── firebase.json           # Firebase Hosting config
├── .firebaserc             # Firebase project config
└── README.md
```

## 🚀 Features

### Student Portal
- 🔒 Secure Firebase Authentication login
- 📊 Personalized dashboard with profile info & stats
- 📸 Passport photo display (uploaded by admin)
- 📋 Full academic results viewer (by session & term)
- 📄 Download results as professional PDF report card
- 🔔 School announcements/notifications
- 👤 Profile management (edit phone, parent info, change password)
- 🌙 Dark/Light mode toggle
- 📱 Fully responsive (mobile, tablet, desktop)

### Admin Portal
- 🔐 Separate admin authentication & access control
- 👥 Create student accounts with Firebase Auth
- 📸 Upload passport photos to Firebase Storage
- 📝 Full student profile CRUD (create, read, update, delete)
- 📈 Upload results for any student, session, and term
- ✏️ Edit and delete results
- 🔑 Send password reset emails to students
- 📢 Post, edit, and delete school announcements
- 🔍 Search students by name, admission no, or class

## 🔥 Firebase Database Structure

```
students/
  {uid}/
    profile/
      fullname, admissionNo, class, gender, dob, email, phone, parent, photo, createdAt
    results/
      {session}/
        {term}/
          subjects/
            {subjectName}/
              ca, exam, total
          meta/
            position, teacherComment, principalComment, nextTermBegins, uploadedAt

announcements/
  {id}/
    title, message, type, postedBy, timestamp

admins/
  {uid}/
    name, email, createdAt

contact_messages/
  {id}/
    name, email, message, timestamp
```

## 🛡️ Security
- Students can only access their own data (enforced via client-side auth guards)
- Admins are verified against the `admins` node in Realtime Database
- All protected pages redirect unauthenticated users to the login page
- Passwords are never stored in the database (Firebase Auth only)

## 📲 Deployment (Firebase Hosting)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Deploy
firebase deploy --only hosting
```

## 🎨 Design System
- **Primary:** Blue (#1565C0)
- **Accent:** Gold (#F9A825)
- **Background:** #F0F4F8 (light) / #0F172A (dark)
- **Font:** Inter (system-ui fallback)
- **Radius:** 12px cards, 8px inputs
- **Shadows:** Layered elevation system

## 📱 Responsive Breakpoints
- Mobile: < 768px (collapsible sidebar)
- Tablet: 768px – 1024px
- Desktop: > 1024px

---

Built with ❤️ for Drexora School — Excellence in Education
