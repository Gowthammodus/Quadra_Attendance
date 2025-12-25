
import React, { useState } from 'react';
import { useApp } from '../AppContext';
import { UserRole } from '../types';
import { Bell, Menu, Search, MoreHorizontal, Grid, MessageSquare, Layout as LayoutIcon, FileText, Settings, Users, ShieldAlert, LogOut } from 'lucide-react';
import ChatTab from './ChatTab';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, logout, activePage, setActivePage } = useApp();
  
  // Teams Brand Colors
  const TEAMS_PURPLE = '#6264A7'; // Brand color
  const TEAMS_BG = '#F5F5F5'; // App background

  // Map internal pages to Teams Tabs
  // We will treat 'activePage' as the current Tab
  
  const getTabs = () => {
    const common = [
        { id: 'chat', label: 'Chat' },
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'history', label: 'My Attendance' }, // Added for all roles
    ];
    
    if (currentUser.role === UserRole.EMPLOYEE) {
        return [...common, { id: 'requests', label: 'My Requests' }];
    }
    
    if (currentUser.role === UserRole.MANAGER) {
        return [
            ...common, 
            { id: 'team', label: 'Team Status' }, 
            { id: 'approvals', label: 'Approvals' },
            { id: 'reports', label: 'Reports' }
        ];
    }
    
    if (currentUser.role === UserRole.HR_ADMIN) {
        return [
            ...common,
            { id: 'global_directory', label: 'Directory' },
            { id: 'admin_management', label: 'Admin' },
            { id: 'compliance', label: 'Compliance' }
        ];
    }
    
    return common;
  };

  const tabs = getTabs();

  // If active page isn't in tabs (e.g. from internal navigation), default to dashboard
  const currentTab = tabs.find(t => t.id === activePage) ? activePage : 'dashboard';

  return (
    <div className="flex flex-col h-screen font-sans overflow-hidden bg-[#f3f2f1]">
      {/* 1. Teams Client Top Bar (Purple) - Matches PDF Page 5 */}
      <header className="h-12 bg-[#464775] flex items-center justify-between px-4 text-white shrink-0 z-50">
          <div className="flex items-center w-1/3">
             <Grid className="w-5 h-5 mr-4 opacity-80" />
             <span className="font-semibold tracking-wide text-sm opacity-90">Microsoft Teams</span>
          </div>
          
          <div className="flex-1 max-w-xl mx-4">
              <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                      type="text" 
                      className="block w-full pl-10 pr-3 py-1.5 border-none rounded-[4px] leading-5 bg-[#e1e1e8] text-gray-900 placeholder-gray-500 focus:outline-none focus:bg-white sm:text-sm shadow-sm"
                      placeholder="Search for or type a command"
                  />
              </div>
          </div>

          <div className="flex items-center justify-end w-1/3 space-x-4">
             <div className="relative">
                 <div className="w-8 h-8 rounded-full bg-indigo-200 text-[#464775] flex items-center justify-center font-bold text-xs border-2 border-white cursor-pointer" title={currentUser.name}>
                     {currentUser.name.charAt(0)}
                     <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-[#464775] rounded-full"></span>
                 </div>
             </div>
             <button onClick={logout} className="opacity-70 hover:opacity-100"><LogOut size={16}/></button>
          </div>
      </header>

      {/* 2. Teams App Context Header (White with Tabs) - Matches PDF Page 8 */}
      <div className="bg-white border-b border-gray-200 px-6 pt-4 pb-0 shrink-0 shadow-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                  <div className="p-1.5 bg-[#6264A7] rounded-md shadow-sm">
                      <ShieldAlert className="text-white w-6 h-6" />
                  </div>
                  <h1 className="text-lg font-bold text-gray-800">Attendance Pro</h1>
              </div>
          </div>
          
          <div className="flex space-x-6">
              {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActivePage(tab.id)}
                    className={`pb-3 text-sm font-medium border-b-[3px] transition-all px-1 ${
                        currentTab === tab.id
                        ? 'border-[#6264A7] text-[#6264A7]'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                      {tab.label}
                  </button>
              ))}
          </div>
      </div>

      {/* 3. Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
          {activePage === 'chat' ? (
              <ChatTab />
          ) : (
             <div className="h-full overflow-y-auto p-6">
                 <div className="max-w-7xl mx-auto">
                    {children}
                 </div>
             </div>
          )}
      </main>
    </div>
  );
};

export default Layout;
