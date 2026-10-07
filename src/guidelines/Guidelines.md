# System & Architecture Guidelines for AI Assistants

## CRITICAL DIRECTIVE FOR FRONTEND REDESIGN
> **"Future UI redesign work must modify the presentation layer only and must not alter backend logic, APIs, database behavior, authentication, authorization, workflows, or business logic."**

Please review the complete specification in [`docs/FRONTEND_REDESIGN_BOUNDARY.md`](../../docs/FRONTEND_REDESIGN_BOUNDARY.md) before making changes.

---

## 1. Protected Files (DO NOT MODIFY)
- `.env` & `src/config/firebase.ts`: Cloud Firebase initialization & credentials.
- `src/services/*`: All backend service files (`authService.ts`, `leadService.ts`, `targetService.ts`, `activityService.ts`, `userService.ts`).
- `src/types/index.ts`: Core data structures (`Lead`, `Target`, `Activity`, `User`) and status literals.
- `package.json` & `vite.config.ts`: Core dependencies and bundler configuration.

## 2. Redesignable Areas (SAFE FOR VISUAL OVERHAUL)
- `src/components/Login.tsx`: Login view presentation and branding.
- `src/components/AdminDashboard.tsx`: Admin dashboard navigation, tab layouts, and overview cards.
- `src/components/SalesDashboard.tsx`: Sales representative dashboard, metrics cards, tables, and dialogs.
- `src/components/admin/*`: Management screen components (`LeadManagement.tsx`, `Reports.tsx`, `RevenueAnalytics.tsx`, `TargetManagement.tsx`, `TeamPerformance.tsx`).
- `src/components/ui/*`: All 47 Radix UI / shadcn presentation components.
- `src/styles/globals.css` & `src/index.css`: Design tokens, CSS variables, and styling classes.
- `src/assets/*`: Brand logos and background artwork.

## 3. Boundary Rules
1. **Preserve Props**: Do not modify prop signatures for screens (e.g. `AdminDashboardProps`, `SalesDashboardProps`, `LoginProps`).
2. **Preserve State & Callbacks**: All CRUD actions (`onUpdateLead`, `onAddLead`, `onDeleteLead`, `onUpdateTarget`, `onAddActivity`, `onLogin`, `onLogout`) must remain hooked to user actions.
3. **Preserve Business Logic**: Lead status enums, date filtering logic, follow-up notification intervals (5-minute trigger), and role-based views (`admin` vs `sales`) must continue functioning identically.
