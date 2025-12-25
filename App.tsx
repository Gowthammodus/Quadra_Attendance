
import React, { useState } from 'react';
import { AppProvider, useApp } from './AppContext';
import Layout from './components/Layout';
import EmployeeDashboard from './components/EmployeeDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import HRDashboard from './components/HRDashboard';
import InstallationScreen from './components/InstallationScreen';
import { MyAttendanceHistory } from './components/SharedComponents';
import { UserRole } from './types';
import { User, Briefcase, ShieldCheck, ArrowRight, Grid } from 'lucide-react';

const LandingPage: React.FC<{ onLogin: (role: UserRole) => void }> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center font-sans p-4">
      <div className="bg-white p-10 rounded-sm shadow-md max-w-md w-full border border-gray-200">
        <div className="flex items-center space-x-2 mb-8">
            <div className="p-2 bg-[#6264A7] rounded-sm">
                <Grid className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-semibold text-gray-700">Quadra for Teams</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-2">Sign in</h1>
        <p className="text-sm text-gray-600 mb-8">Select your role to access.</p>

        <div className="space-y-3">
            <button 
              onClick={() => onLogin(UserRole.EMPLOYEE)}
              className="w-full group flex items-center p-3 border border-gray-300 hover:border-[#6264A7] hover:bg-indigo-50 transition-all rounded-sm text-left"
            >
              <div className="w-10 h-10 bg-gray-100 group-hover:bg-white rounded-full flex items-center justify-center mr-4 border border-gray-200">
                <User className="w-5 h-5 text-gray-600 group-hover:text-[#6264A7]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Employee</h3>
                <p className="text-xs text-gray-500">Personal Dashboard</p>
              </div>
            </button>
            <button 
              onClick={() => onLogin(UserRole.MANAGER)}
              className="w-full group flex items-center p-3 border border-gray-300 hover:border-[#6264A7] hover:bg-indigo-50 transition-all rounded-sm text-left"
            >
              <div className="w-10 h-10 bg-gray-100 group-hover:bg-white rounded-full flex items-center justify-center mr-4 border border-gray-200">
                <Briefcase className="w-5 h-5 text-gray-600 group-hover:text-[#6264A7]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Manager</h3>
                <p className="text-xs text-gray-500">Team & Approvals</p>
              </div>
            </button>
            <button 
              onClick={() => onLogin(UserRole.HR_ADMIN)}
              className="w-full group flex items-center p-3 border border-gray-300 hover:border-[#6264A7] hover:bg-indigo-50 transition-all rounded-sm text-left"
            >
              <div className="w-10 h-10 bg-gray-100 group-hover:bg-white rounded-full flex items-center justify-center mr-4 border border-gray-200">
                <ShieldCheck className="w-5 h-5 text-gray-600 group-hover:text-[#6264A7]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">HR Admin</h3>
                <p className="text-xs text-gray-500">System Management</p>
              </div>
            </button>
        </div>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { currentUser, login, isLoggedIn, activePage } = useApp();
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // 1. Show Installation Screen first
  if (!isAppInstalled) {
    return <InstallationScreen onInstall={() => setIsAppInstalled(true)} />;
  }

  // 2. Show Login Screen next
  if (!isLoggedIn) {
    return <LandingPage onLogin={login} />;
  }

  // 3. Show Main App
  return (
    <Layout>
      {activePage === 'history' && <MyAttendanceHistory />}
      {(activePage === 'dashboard' || activePage === 'requests') && <EmployeeDashboard />}
      
      {/* Manager Specific Pages */}
      {activePage === 'team' && <ManagerDashboard view="team" />}
      {activePage === 'approvals' && (currentUser.role === UserRole.HR_ADMIN ? <HRDashboard view="approvals" /> : <ManagerDashboard view="approvals" />)}
      {activePage === 'reports' && (currentUser.role === UserRole.HR_ADMIN ? <HRDashboard view="reports" /> : <ManagerDashboard view="reports" />)}
      
      {/* HR Specific Pages */}
      {activePage === 'global_directory' && <HRDashboard view="directory" />}
      {activePage === 'admin_management' && <HRDashboard view="admin" />}
      {activePage === 'compliance' && <HRDashboard view="compliance" />}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
