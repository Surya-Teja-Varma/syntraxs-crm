import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { AdminDashboard } from './components/AdminDashboard';
import { SalesDashboard } from './components/SalesDashboard';
import { Toaster } from './components/ui/sonner';
import { NotificationManager } from './components/NotificationManager';
import { User, Lead, Target, Activity } from './types';
import { isFirebaseEnabled } from './config/firebase';
import {
  loginUser,
  logoutUser,
  getActiveUser,
  ensureFirebaseAuth
} from './services/authService';
import { useFirebaseData } from './hooks/useFirebaseData';
import { addLead as firebaseAddLead, updateLead as firebaseUpdateLead, deleteLead as firebaseDeleteLead } from './services/leadService';
import { addTarget as firebaseAddTarget, updateTarget as firebaseUpdateTarget } from './services/targetService';
import { addActivity as firebaseAddActivity } from './services/activityService';
import { addUser as firebaseAddUser } from './services/userService';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getActiveUser());
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize session and background Firebase connection
  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      try {
        if (isFirebaseEnabled()) {
          await ensureFirebaseAuth();
        }
        const active = getActiveUser();
        if (isMounted && active) {
          setCurrentUser(active);
        }
      } catch (err) {
        console.error('Session init error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initialize();
    return () => {
      isMounted = false;
    };
  }, []);

  // Use Firebase subscriptions for data management
  // Subscribes when user is authenticated
  useFirebaseData({
    setUsers,
    setLeads,
    setTargets,
    setActivities,
    currentUser
  });

  const handleLogin = async (email: string, password: string, role?: 'admin' | 'sales') => {
    try {
      const user = await loginUser(email, password, role);
      if (user) {
        setCurrentUser(user);

        // Redirect based on role
        if (user.role === 'admin') {
          window.location.hash = '#/admindashboard';
        } else if (user.role === 'sales') {
          window.location.hash = '#/salesdashboard';
        }
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      window.location.hash = '#/login';
    } catch (error) {
      console.error('❌ [AUTH] Logout failed:', error);
      setCurrentUser(null);
      window.location.hash = '#/login';
    }
  };

  const updateLead = async (leadId: string, updates: Partial<Lead>) => {
    if (isFirebaseEnabled()) {
      await firebaseUpdateLead(leadId, updates);
    } else {
      setLeads(prev => prev.map(lead =>
        lead.id === leadId ? { ...lead, ...updates } : lead
      ));
    }
  };

  const addLead = async (lead: Omit<Lead, 'id'>) => {
    if (isFirebaseEnabled()) {
      await firebaseAddLead(lead);
    } else {
      const newLead: Lead = {
        ...lead,
        id: Date.now().toString(),
        createdAt: lead.createdAt || new Date().toISOString(),
        callHistory: lead.callHistory || [],
        productsOffered: lead.productsOffered || [],
        notes: lead.notes || ''
      };
      setLeads(prev => [...prev, newLead]);
    }
  };

  const deleteLead = async (leadId: string) => {
    if (isFirebaseEnabled()) {
      await firebaseDeleteLead(leadId);
    } else {
      setLeads(prev => prev.filter(lead => lead.id !== leadId));
    }
  };

  const updateTarget = async (targetId: string, achieved: number) => {
    if (isFirebaseEnabled()) {
      await firebaseUpdateTarget(targetId, { achieved });
    } else {
      setTargets(prev => prev.map(target =>
        target.id === targetId ? { ...target, achieved } : target
      ));
    }
  };

  const editTarget = async (targetId: string, updates: Partial<Target>) => {
    if (isFirebaseEnabled()) {
      await firebaseUpdateTarget(targetId, updates);
    } else {
      setTargets(prev => prev.map(target =>
        target.id === targetId ? { ...target, ...updates } : target
      ));
    }
  };

  const addTarget = async (target: Omit<Target, 'id' | 'achieved'>) => {
    if (isFirebaseEnabled()) {
      await firebaseAddTarget(target);
    } else {
      const newTarget: Target = {
        ...target,
        id: Date.now().toString(),
        achieved: 0
      };
      setTargets(prev => [...prev, newTarget]);
    }
  };

  const addActivity = async (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    if (isFirebaseEnabled()) {
      await firebaseAddActivity(activity);
    } else {
      const newActivity: Activity = {
        ...activity,
        id: Date.now().toString(),
        timestamp: new Date().toISOString()
      };
      setActivities(prev => [...prev, newActivity]);
    }
  };

  const addUser = async (user: Omit<User, 'id'>) => {
    if (isFirebaseEnabled()) {
      try {
        const userId = await firebaseAddUser(user);
        if (!userId) {
          throw new Error("Failed to create user account");
        }
        return userId;
      } catch (error: any) {
        console.error('Failed to add user:', error);
        throw error;
      }
    } else {
      const newUser: User = {
        ...user,
        id: Date.now().toString()
      };
      setUsers(prev => [...prev, newUser]);
      return newUser.id;
    }
  };

  // Filter data for sales users - these will update when state changes
  const userTargets = currentUser?.role === 'sales'
    ? targets.filter(target => target.userId === currentUser.id)
    : [];

  const userActivities = currentUser?.role === 'sales'
    ? activities.filter(activity => activity.userId === currentUser.id)
    : [];

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading Zoopiter CRM...</p>
        </div>
        <Toaster />
      </div>
    );
  }

  // Render the application with routing
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Login Route */}
          <Route path="/login" element={
            currentUser ? (
              <Navigate to={currentUser.role === 'admin' ? "/admindashboard" : "/salesdashboard"} replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          } />

          {/* Default Route - Redirect to appropriate page */}
          <Route path="/" element={
            !currentUser ? (
              <Navigate to="/login" replace />
            ) : currentUser.role === 'admin' ? (
              <Navigate to="/admindashboard" replace />
            ) : (
              <Navigate to="/salesdashboard" replace />
            )
          } />

          {/* Admin Dashboard Route - Protected */}
          <Route path="/admindashboard" element={
            !currentUser ? <Navigate to="/login" replace /> :
              currentUser.role !== 'admin' ? <Navigate to="/salesdashboard" replace /> :
                <AdminDashboard
                  key={`admin-${currentUser.id}`}
                  user={currentUser}
                  users={users}
                  leads={leads}
                  targets={targets}
                  activities={activities}
                  onLogout={handleLogout}
                  onUpdateLead={updateLead}
                  onAddLead={addLead}
                  onDeleteLead={deleteLead}
                  onUpdateTarget={updateTarget}
                  onEditTarget={editTarget}
                  onAddTarget={addTarget}
                  onAddUser={addUser}
                />
          } />

          {/* Sales Dashboard Route - Protected */}
          <Route path="/salesdashboard" element={
            !currentUser ? <Navigate to="/login" replace /> :
              currentUser.role !== 'sales' ? <Navigate to="/admindashboard" replace /> :
                <SalesDashboard
                  key={`sales-${currentUser.id}-${userTargets.length}-${leads.length}-${targets.length}`}
                  user={currentUser}
                  leads={leads}
                  targets={userTargets}
                  activities={userActivities}
                  onLogout={handleLogout}
                  onUpdateLead={updateLead}
                  onAddActivity={addActivity}
                />
          } />

          {/* Catch all undefined routes */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
        {currentUser && <NotificationManager leads={leads} currentUser={currentUser} onUpdateLead={updateLead} />}
      </div>
    </Router>
  );
}
