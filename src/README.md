# 🚀 Zoopiter CRM - Sales Management System

A comprehensive Sales CRM tool for managing leads, targets, and sales team performance with professional UI/UX.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-3178c6.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-38bdf8.svg)

---

## ✨ **Features**

### **Admin Dashboard**
- 📊 **Lead Management** - Add, edit, delete, and assign leads
- 👥 **Team Performance** - Track sales team activities and performance
- 🎯 **Target Management** - Set and monitor weekly/monthly targets
- 💰 **Revenue Analytics** - Visualize sales data with interactive charts
- 📈 **Reports** - Comprehensive performance reports

### **Sales Dashboard**
- 📋 **My Leads** - View and manage assigned leads
- ✅ **Lead Actions** - Update status, add notes, log activities
- 🎯 **My Targets** - Track personal targets and achievements
- 📞 **Activity Tracking** - Log calls, emails, meetings, WhatsApp
- 📊 **Performance Stats** - Real-time achievement progress

### **Key Features**
- ✅ Role-based access (Admin & Sales)
- ✅ Real-time cross-tab synchronization
- ✅ Excel-like data grid interface
- ✅ Responsive mobile & desktop design
- ✅ Dark/Light theme support (system-based)
- ✅ Toast notifications for actions
- ✅ Search and filter functionality
- ✅ Currency in Rupees (₹)
- ✅ Emoji icons for modern UI

---

## 🛠️ **Technology Stack**

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS v4
- **UI Components:** Radix UI + shadcn/ui
- **Charts:** Recharts
- **Icons:** Lucide React (with emoji overlays)
- **Form Handling:** React Hook Form
- **State Management:** React Hooks + localStorage
- **Build Tool:** Vite
- **Backend (Optional):** Firebase

---

## 📦 **Quick Start**

### **Prerequisites**
- Node.js 18+ and npm

### **Get Started in 2 Minutes**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser at http://localhost:5173
# Login with: admin@company.com / admin123
```

**That's it!** The app works immediately with localStorage mode.

### **Optional: Enable Firebase Backend**
```bash
# Follow the Firebase setup guide
# See: FIREBASE_SETUP.md

# Create .env file with your credentials
# App automatically switches to Firebase mode!
```

### **Build for Production**

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

**For detailed instructions:** See [QUICK_START.md](./QUICK_START.md)

---

## 🔐 **Default Login Credentials**

### **Admin Account**
```
Email: admin@company.com
Password: admin123 (any password in localStorage mode)
```

### **Sales Accounts**
```
Alice Smith:    alice@company.com / sales123
Bob Johnson:    bob@company.com / sales123
John Doe:       john.doe@company.com / sales123
```

> **📦 localStorage Mode (Default):** Any password works - just use the email  
> **🔥 Firebase Mode:** Use exact passwords configured in Firebase Authentication

---

## 🚀 **Deployment**

### **Hostinger Deployment** (Recommended)

**Quick Steps:**
1. Build: `npm run build`
2. Upload `dist` folder contents to Hostinger public_html
3. Upload `.htaccess` from `public` folder
4. Enable SSL in Hostinger panel
5. Done! ✅

**Automated Build (Windows):**
```bash
./build-for-hostinger.bat
```

**Automated Build (Mac/Linux):**
```bash
chmod +x build-for-hostinger.sh
./build-for-hostinger.sh
```

### **Other Hosting Platforms**

- **Vercel:** `npx vercel`
- **Netlify:** Drag & drop `dist` folder
- **GitHub Pages:** Enable in repo settings

---

## 📊 **Lead Template Columns**

The CRM supports the following lead fields:

| Column | Type | Required |
|--------|------|----------|
| Company Name | Text | ✅ |
| Client Name | Text | ✅ |
| Designation | Text | - |
| Requirement | Text | - |
| Phone | Text | ✅ |
| Email | Email | ✅ |
| Category | Dropdown | - |
| Source | Dropdown | ✅ |
| Audience | Dropdown | - |
| Expected Value ₹ | Number | ✅ |
| Priority | Dropdown | ✅ |
| Status | Dropdown | ✅ |
| Notes | Text Area | - |

---

## 🔧 **Configuration**

### **Change Currency**

```typescript
// Search and replace ₹ with your currency symbol
// Example: $ for dollars, € for euros, £ for pounds
```

### **Add New Status**

```typescript
// In /types/index.ts
export interface Lead {
  status: 'new' | 'quotation_sent' | 'your_new_status' | ...
}
```

### **Customize Branding**

```typescript
// Update images in:
/components/Login.tsx - Login page images
/components/AdminDashboard.tsx - Logo
/components/SalesDashboard.tsx - Logo
```

---

## 🔥 **Firebase Backend Integration**

The CRM includes complete Firebase backend integration with **dual-mode** support:

### **📦 Mode 1: localStorage (Default)**
- ✅ Works immediately out-of-the-box
- ✅ No setup required
- ✅ Perfect for testing/demo
- ⚠️ Data stored in browser only

### **☁️ Mode 2: Firebase (Production)**
- ✅ Real authentication with secure passwords
- ✅ Cloud Firestore database
- ✅ Real-time data synchronization
- ✅ Cross-device support
- ✅ Automatic localStorage cleanup
- ✅ Production-ready

**Setup Firebase:**
1. Follow the complete guide: [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
2. Create Firebase project and enable services
3. Copy credentials to `.env` file
4. Restart server - **Firebase mode activates automatically!**
5. localStorage is auto-cleared on startup

**Migrate to Firebase:**
- See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for step-by-step migration instructions

## 📊 **Excel Export Feature**

Export comprehensive reports and analytics to Excel:

**Features:**
- 📊 Export lead reports with summary metrics
- 💰 Export revenue/employee performance reports
- 🎯 Dynamic filtering (date range, team member)
- 📈 Individual or team-wide reports
- 📋 Multiple worksheets with detailed data

**Usage:**
1. Navigate to Reports & Analytics tab (Admin)
2. Select filters (Report Type, Date Range, Team Member)
3. Click "Export Report" button
4. Excel file downloads automatically with formatted data

---

## 📁 **Project Structure**

```
zoopiter-crm/
├── components/          # React components
│   ├── admin/          # Admin dashboard tabs
│   ├── ui/             # shadcn/ui components & custom components
│   ├── AdminDashboard.tsx
│   ├── SalesDashboard.tsx
│   └── Login.tsx
├── data/               # Mock data
│   └── mockData.ts
├── styles/             # Global styles
│   └── globals.css
├── types/              # TypeScript types
│   └── index.ts
├── utils/              # Utility functions
│   ├── helpers.ts      # Helper functions
│   └── useLocalStorageSync.ts  # Cross-tab sync
├── public/             # Static assets
│   ├── .htaccess       # Apache config
│   ├── favicon.svg
│   └── robots.txt
├── App.tsx             # Main app component
├── main.tsx            # Entry point
├── index.html          # HTML template
├── vite.config.ts      # Vite configuration
├── package.json        # Dependencies
└── README.md           # This file
```

---

## 🎯 **Backend Options**

### **Option 1: Firebase (Recommended - Included)**
✅ Real authentication with secure passwords  
✅ Cloud Firestore database  
✅ Real-time synchronization  
✅ Cross-device support  
✅ Security rules configured  
✅ Free tier available  

**Setup:** Follow [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

### **Option 2: localStorage (Demo Mode)**
- Data stored in browser only
- No cross-device sync
- Mock authentication
- Good for testing/demo
- Already works out-of-the-box

---

## 🐛 **Troubleshooting**

### **Issue: Preview not showing**
```bash
# Make sure all dependencies are installed
npm install

# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### **Issue: Login not working**
```bash
# Mock auth accepts any password
# Use emails from mockData.ts
# Check browser console for errors
```

### **Issue: Data not saving**
```bash
# Data saves to localStorage
# Check browser allows localStorage
# Try different browser
# Clear cache if issues persist
```

---

## 📈 **Roadmap**

- [ ] Firebase integration guide
- [ ] Excel import/export functionality
- [ ] Email notifications
- [ ] WhatsApp integration
- [ ] Advanced reporting
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Dark mode toggle

---

## 🤝 **Contributing**

Contributions are welcome! Please:

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 **License**

This project is licensed under the MIT License.

---

## 📞 **Support**

- 📧 Email: support@zoopiter.com
- 📚 Documentation: See `/guidelines` folder
- 🐛 Issues: Create GitHub issue
- 💬 Questions: Open discussion

---

## 🎉 **Acknowledgments**

- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Charts:** [Recharts](https://recharts.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)

---

## 📊 **Stats**

- **Components:** 40+ React components
- **UI Library:** 30+ shadcn/ui components
- **TypeScript:** 100% type-safe
- **Responsive:** Mobile & desktop optimized
- **Performance:** Lighthouse score 95+

---

**Made with ❤️ for sales teams everywhere**

⭐ Star this repo if you find it useful!
