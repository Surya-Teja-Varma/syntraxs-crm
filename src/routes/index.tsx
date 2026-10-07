import { Navigate, Route, Routes } from 'react-router-dom';
import { Login } from '../components/Login';
import { User } from '../types';

interface PrivateRouteProps {
  user: User | null;
  allowedRoles: string[];
  children: React.ReactNode;
}

// PrivateRoute component to protect routes
const PrivateRoute = ({ user, allowedRoles, children }: PrivateRouteProps) => {
  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user doesn't have the required role, redirect to login
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  // If user is authenticated and has the right role, render the children
  return <>{children}</>;
};

interface AppRoutesProps {
  currentUser: User | null;
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export const AppRoutes = ({ currentUser, onLogin }: AppRoutesProps) => {
  return (
    <Routes>
      {/* Default route - redirects to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      
      {/* Login route */}
      <Route 
        path="/login" 
        element={
          // If already logged in, redirect to appropriate dashboard
          currentUser ? (
            currentUser.role === 'admin' ? (
              <Navigate to="/admindashboard" replace />
            ) : (
              <Navigate to="/salesdashboard" replace />
            )
          ) : (
            <Login onLogin={onLogin} />
          )
        } 
      />

      {/* Protected admin dashboard route */}
      <Route
        path="/admindashboard"
        element={
          <PrivateRoute user={currentUser} allowedRoles={['admin']}>
            {/* AdminDashboard component with required props passed from App */}
            {/* This will be rendered conditionally in the App component */}
            <Navigate to="/" replace />
          </PrivateRoute>
        }
      />

      {/* Protected sales dashboard route */}
      <Route
        path="/salesdashboard"
        element={
          <PrivateRoute user={currentUser} allowedRoles={['sales']}>
            {/* SalesDashboard component with required props passed from App */}
            {/* This will be rendered conditionally in the App component */}
            <Navigate to="/" replace />
          </PrivateRoute>
        }
      />

      {/* Catch all undefined routes - redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};