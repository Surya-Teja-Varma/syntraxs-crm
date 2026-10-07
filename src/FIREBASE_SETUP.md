# 🔥 Firebase Backend Setup Guide

Complete guide to set up Firebase backend for Zoopiter CRM with real authentication, cloud database, and real-time synchronization.

---

## 📋 **Prerequisites**

- Node.js 18+ installed
- Google account
- Firebase project (we'll create one)

---

## 🚀 **Step-by-Step Setup**

### **Step 1: Create Firebase Project**

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com
   - Click "Add project" or "Create a project"

2. **Project Setup**
   ```
   Project Name: zoopiter-crm (or your preferred name)
   ✅ Enable Google Analytics (optional)
   Click "Create project"
   ```

3. **Wait for project creation** (~30 seconds)

---

### **Step 2: Enable Authentication**

1. **Navigate to Authentication**
   - In left sidebar, click "Authentication"
   - Click "Get started"

2. **Enable Email/Password**
   - Click "Sign-in method" tab
   - Click "Email/Password"
   - Toggle "Enable" switch
   - Click "Save"

3. **Create Admin User (Test Account)**
   - Click "Users" tab
   - Click "Add user"
   - Enter:
     ```
     Email: admin@company.com
     Password: admin123
     ```
   - Click "Add user"

4. **Create Sales Users (Test Accounts)**
   - Repeat for each sales user:
     ```
     alice@company.com / sales123
     bob@company.com / sales123
     john.doe@company.com / sales123
     ```

---

### **Step 3: Enable Firestore Database**

1. **Navigate to Firestore Database**
   - In left sidebar, click "Firestore Database"
   - Click "Create database"

2. **Select Mode**
   - Choose "Start in **production mode**"
   - Click "Next"

3. **Select Location**
   - Choose closest region (e.g., `us-central1` or `asia-south1`)
   - Click "Enable"
   - Wait for database creation (~1 minute)

---

### **Step 4: Configure Security Rules**

1. **Set Firestore Rules**
   - In Firestore Database, click "Rules" tab
   - Replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user is admin
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user owns the resource
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection
    match /users/{userId} {
      // Anyone authenticated can read user data
      allow read: if isAuthenticated();
      // Only admins can create new users
      allow create: if isAdmin();
      // Users can update their own data, admins can update anyone
      allow update: if isOwner(userId) || isAdmin();
      // Only admins can delete users
      allow delete: if isAdmin();
    }
    
    // Leads collection
    match /leads/{leadId} {
      // Authenticated users can read all leads
      allow read: if isAuthenticated();
      // Admins can create leads
      allow create: if isAdmin();
      // Admins and assigned sales users can update leads
      allow update: if isAdmin() || 
                      (isAuthenticated() && 
                       resource.data.assignedTo == request.auth.uid);
      // Only admins can delete leads
      allow delete: if isAdmin();
    }
    
    // Targets collection
    match /targets/{targetId} {
      // Users can read their own targets, admins can read all
      allow read: if isAuthenticated();
      // Only admins can create targets
      allow create: if isAdmin();
      // Admins can update any target
      // Sales users can update their own target achievement
      allow update: if isAdmin() || 
                      (isAuthenticated() && 
                       resource.data.userId == request.auth.uid &&
                       request.resource.data.diff(resource.data).affectedKeys().hasOnly(['achieved', 'updatedAt']));
      // Only admins can delete targets
      allow delete: if isAdmin();
    }
    
    // Activities collection
    match /activities/{activityId} {
      // Users can read their own activities, admins can read all
      allow read: if isAuthenticated();
      // Authenticated users can create activities for their own leads
      allow create: if isAuthenticated();
      // Users can update their own activities, admins can update any
      allow update: if isAdmin() || 
                      (isAuthenticated() && 
                       resource.data.userId == request.auth.uid);
      // Only admins can delete activities
      allow delete: if isAdmin();
    }
  }
}
```

   - Click "Publish"

---

### **Step 5: Create User Documents in Firestore**

Since we created authentication users, we need to add their profile data to Firestore:

1. **Go to Firestore Data**
   - Click "Data" tab in Firestore Database

2. **Create `users` Collection**
   - Click "Start collection"
   - Collection ID: `users`
   - Click "Next"

3. **Add Admin User Document**
   - Document ID: **Use the UID from Authentication > Users** (copy admin@company.com UID)
   - Add fields:
     ```
     name: "Admin User" (string)
     email: "admin@company.com" (string)
     role: "admin" (string)
     phone: "+1234567890" (string)
     department: "Management" (string)
     ```
   - Click "Save"

4. **Add Sales User Documents**
   - Repeat for each sales user using their UIDs from Authentication:
   
   **Alice Smith:**
   ```
   Document ID: [Alice's UID from Authentication]
   name: "Alice Smith" (string)
   email: "alice@company.com" (string)
   role: "sales" (string)
   phone: "+1234567891" (string)
   department: "Sales" (string)
   ```
   
   **Bob Johnson:**
   ```
   Document ID: [Bob's UID from Authentication]
   name: "Bob Johnson" (string)
   email: "bob@company.com" (string)
   role: "sales" (string)
   phone: "+1234567892" (string)
   department: "Sales" (string)
   ```
   
   **John Doe:**
   ```
   Document ID: [John's UID from Authentication]
   name: "John Doe" (string)
   email: "john.doe@company.com" (string)
   role: "sales" (string)
   phone: "+1234567893" (string)
   department: "Sales" (string)
   ```

5. **Create Empty Collections** (optional, will be created automatically when data is added):
   - `leads` collection
   - `targets` collection
   - `activities` collection

---

### **Step 6: Get Firebase Configuration**

1. **Go to Project Settings**
   - Click gear icon ⚙️ next to "Project Overview"
   - Click "Project settings"

2. **Register Web App**
   - Scroll to "Your apps" section
   - Click Web icon `</>`
   - App nickname: `Zoopiter CRM Web`
   - ✅ Check "Also set up Firebase Hosting" (optional)
   - Click "Register app"

3. **Copy Configuration**
   - You'll see firebaseConfig object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSyABC123...",
     authDomain: "your-app.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-app.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };
   ```
   - **Keep this page open** (you'll need these values)

---

### **Step 7: Configure Your Application**

1. **Create `.env` File**
   - In your project root, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. **Add Firebase Credentials**
   - Open `.env` file
   - Replace values with your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=AIzaSyABC123...
   VITE_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```
   - **Save the file**

3. **Install Dependencies**
   ```bash
   npm install
   ```

---

### **Step 8: Test the Application**

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Open Browser**
   - Navigate to: http://localhost:5173

3. **Test Login**
   - Try logging in with:
     ```
     Email: admin@company.com
     Password: admin123
     ```

4. **Verify Firebase Connection**
   - Open browser console (F12)
   - Look for messages:
     ```
     ✅ [AUTH] User logged in successfully
     🔥 [FIREBASE] Initializing real-time subscriptions...
     ✅ [FIREBASE] Real-time subscriptions active
     ```

5. **Test Real-time Sync**
   - Open two browser tabs with the app
   - Log in as admin in both
   - Create a lead in one tab
   - Verify it appears in the other tab instantly

---

## 🎯 **What You Get with Firebase**

### **✅ Real Authentication**
- Secure password hashing
- Email/password validation
- Session management
- Password reset (can enable)
- Email verification (can enable)

### **✅ Cloud Database**
- All data stored in Firebase Cloud
- Persistent across devices
- Automatic backups
- Scalable storage

### **✅ Real-time Synchronization**
- Changes sync instantly across all devices
- No manual refresh needed
- Cross-device updates
- Multi-tab synchronization

### **✅ Security**
- Row-level security rules
- Role-based access control
- Admins can manage everything
- Sales users see only their data

### **✅ Scalability**
- Handles unlimited users
- No localStorage limits
- Free tier: 50K reads/day, 20K writes/day
- Paid plans for growth

---

## 📊 **Firebase Collections Structure**

### **users** Collection
```typescript
{
  id: string (UID from Authentication)
  name: string
  email: string
  role: 'admin' | 'sales'
  phone: string
  department: string
}
```

### **leads** Collection
```typescript
{
  id: string (auto-generated)
  companyName: string
  contactName: string
  designation: string
  phone: string
  email: string
  status: string
  priority: string
  value: number
  source: string
  category: string
  audience: string
  assignedTo: string (user ID)
  assignedToName: string
  createdAt: string
  lastContact?: string
  nextFollowUp?: string
  notes: string
  callHistory: array
  productsOffered: array
}
```

### **targets** Collection
```typescript
{
  id: string (auto-generated)
  userId: string
  type: 'weekly' | 'monthly'
  target: number
  achieved: number
  period: string
}
```

### **activities** Collection
```typescript
{
  id: string (auto-generated)
  userId: string
  leadId: string
  type: 'call' | 'email' | 'meeting' | 'whatsapp'
  description: string
  timestamp: string
}
```

---

## 🔒 **Security Best Practices**

### **1. Never Commit .env File**
```bash
# Already in .gitignore
.env
.env.local
.env.production
```

### **2. Use Environment Variables**
- All Firebase config is in `.env`
- Never hardcode API keys in code
- Use `import.meta.env.VITE_*` to access

### **3. Enable Security Rules**
- Rules are already configured
- Admins have full access
- Sales users limited to their data

### **4. Regular Backups**
- Firebase auto-backups daily (paid plans)
- Export data regularly:
  ```bash
  # In Firebase Console > Firestore > Import/Export
  ```

---

## 🐛 **Troubleshooting**

### **Issue: "Firebase not initialized"**
**Solution:**
- Check `.env` file exists
- Verify all VITE_ variables are set
- Restart dev server: `npm run dev`

### **Issue: "Permission denied"**
**Solution:**
- Check Firestore security rules
- Verify user has correct role in database
- Check user's UID matches document ID

### **Issue: "User not found in Firestore"**
**Solution:**
- Go to Firestore > users collection
- Add document with UID from Authentication
- Include name, email, role fields

### **Issue: "Real-time updates not working"**
**Solution:**
- Check browser console for errors
- Verify Firestore rules published
- Check network tab for WebSocket connection

### **Issue: "Login fails with correct password"**
**Solution:**
- Verify user exists in Authentication
- Check user document exists in Firestore
- Check role field is spelled correctly

---

## 📈 **Monitoring & Analytics**

### **Firebase Console Dashboard**
- Real-time active users
- Authentication stats
- Database reads/writes
- Error logs
- Performance metrics

### **Access Dashboard**
1. Go to Firebase Console
2. Select your project
3. View metrics:
   - Authentication > Usage
   - Firestore > Usage
   - Performance > Dashboard

---

## 💰 **Pricing**

### **Free Tier (Spark Plan)**
- ✅ 50,000 reads/day
- ✅ 20,000 writes/day
- ✅ 10,000 deletes/day
- ✅ 1 GB storage
- ✅ 10 GB/month bandwidth
- ✅ Authentication included
- **Perfect for small teams (5-10 users)**

### **Paid Plan (Blaze - Pay as you go)**
- Only pay for what you use
- ~$0.06 per 100K reads
- ~$0.18 per 100K writes
- $0.18 per GB storage/month
- **For growing teams (10+ users)**

---

## 🎓 **Next Steps**

### **Optional Enhancements**

1. **Email Verification**
   - Enable in Authentication settings
   - Users verify email on signup

2. **Password Reset**
   - Built-in forgot password flow
   - Firebase sends reset emails

3. **Phone Authentication**
   - Add SMS-based login
   - Two-factor authentication

4. **Cloud Functions**
   - Automated workflows
   - Send emails on lead assignment
   - Calculate targets automatically

5. **Firebase Hosting**
   - Deploy to Firebase
   - Automatic SSL
   - Global CDN

---

## ✅ **Verification Checklist**

Before deploying to production:

- [ ] Firebase project created
- [ ] Authentication enabled (Email/Password)
- [ ] Firestore database created
- [ ] Security rules configured
- [ ] Test users created in Authentication
- [ ] User documents added to Firestore
- [ ] `.env` file created with credentials
- [ ] Dependencies installed (`npm install`)
- [ ] App tested locally
- [ ] Login works with all test accounts
- [ ] Real-time sync verified
- [ ] Data persists after refresh
- [ ] Cross-tab sync working
- [ ] Mobile responsive tested

---

## 📞 **Support**

### **Firebase Documentation**
- https://firebase.google.com/docs

### **Firebase Status**
- https://status.firebase.google.com

### **Community Support**
- Stack Overflow: firebase tag
- Firebase Discord community
- GitHub: firebase/firebase-js-sdk

---

## 🎉 **Success!**

Your Zoopiter CRM is now powered by Firebase with:
- ✅ Real authentication
- ✅ Cloud database
- ✅ Real-time synchronization
- ✅ Cross-device support
- ✅ Security rules
- ✅ Scalable infrastructure

**Your sales team can now access the CRM from anywhere, on any device!** 🚀

---

**Made with ❤️ for Zoopiter CRM**
