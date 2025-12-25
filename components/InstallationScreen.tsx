
import React, { useState } from 'react';
import { Search, Grid, Bell, MessageSquare, Phone, FileText, MoreHorizontal, ShieldCheck, Check, X, User } from 'lucide-react';

interface InstallationScreenProps {
  onInstall: () => void;
}

const InstallationScreen: React.FC<InstallationScreenProps> = ({ onInstall }) => {
  const [showModal, setShowModal] = useState(false);

  // Teams UI Colors
  const TEAMS_PURPLE = '#464775';
  const TEAMS_LIGHT_PURPLE = '#6264A7';

  return (
    <div className="flex flex-col h-screen font-sans overflow-hidden bg-[#f3f2f1] select-none">
      {/* 1. Mock Teams Top Bar */}
      <header className="h-12 bg-[#464775] flex items-center justify-between px-4 text-white shrink-0 z-10">
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
              placeholder="Search or type for a list of shortcuts"
              readOnly
            />
          </div>
        </div>
        <div className="flex items-center justify-end w-1/3 space-x-4">
          <div className="w-8 h-8 rounded-full bg-gray-300 relative overflow-hidden border-2 border-white/20">
             <img src="https://picsum.photos/id/64/100/100" alt="User" className="w-full h-full object-cover"/>
             <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-[#464775] rounded-full"></div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 2. Mock Sidebar */}
        <aside className="w-[68px] bg-[#ebebeb] flex flex-col items-center py-4 space-y-6 border-r border-gray-300 text-gray-500">
          <div className="flex flex-col items-center space-y-1 hover:text-[#6264A7] cursor-pointer">
            <Bell size={20} />
            <span className="text-[10px]">Activity</span>
          </div>
          <div className="flex flex-col items-center space-y-1 hover:text-[#6264A7] cursor-pointer">
            <MessageSquare size={20} />
            <span className="text-[10px]">Chat</span>
          </div>
          <div className="flex flex-col items-center space-y-1 hover:text-[#6264A7] cursor-pointer">
            <User size={20} />
            <span className="text-[10px]">Teams</span>
          </div>
          <div className="flex flex-col items-center space-y-1 hover:text-[#6264A7] cursor-pointer">
            <Phone size={20} />
            <span className="text-[10px]">Calls</span>
          </div>
          <div className="flex flex-col items-center space-y-1 hover:text-[#6264A7] cursor-pointer">
            <FileText size={20} />
            <span className="text-[10px]">Files</span>
          </div>
          <div className="flex flex-col items-center space-y-1 text-[#6264A7] border-l-2 border-[#6264A7] w-full cursor-pointer">
            <Grid size={20} />
            <span className="text-[10px] font-semibold">Apps</span>
          </div>
        </aside>

        {/* 3. Main Store Content */}
        <main className="flex-1 bg-white p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Apps</h1>
            
            <div className="mb-8">
               <div className="relative max-w-sm">
                  <input 
                    type="text" 
                    placeholder="Search all" 
                    className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-sm text-sm focus:border-[#6264A7] focus:ring-1 focus:ring-[#6264A7] outline-none"
                  />
                  <Search className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />
               </div>
            </div>

            <div className="flex gap-8">
                {/* Categories Sidebar */}
                <div className="w-48 shrink-0 space-y-4 text-sm text-gray-600">
                    <div className="font-semibold text-[#6264A7] cursor-pointer">All</div>
                    <div className="hover:text-gray-900 cursor-pointer">Personal apps</div>
                    <div className="hover:text-gray-900 cursor-pointer">Bots</div>
                    <div className="hover:text-gray-900 cursor-pointer">Tabs</div>
                    <div className="hover:text-gray-900 cursor-pointer">Connectors</div>
                    <div className="hover:text-gray-900 cursor-pointer">Messaging</div>
                    <div className="pt-4 border-t border-gray-200 font-semibold text-gray-800 mt-4">Top picks</div>
                    <div className="hover:text-gray-900 cursor-pointer">Analytics and BI</div>
                    <div className="hover:text-gray-900 cursor-pointer">Human resources</div>
                    <div className="hover:text-gray-900 cursor-pointer">Productivity</div>
                </div>

                {/* Apps Grid */}
                <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        
                        {/* Attendance Pro Card (Target) */}
                        <div 
                            onClick={() => setShowModal(true)}
                            className="bg-white border border-gray-200 rounded-md p-4 flex gap-4 hover:shadow-md transition-shadow cursor-pointer group"
                        >
                            <div className="w-12 h-12 bg-[#6264A7] rounded-md flex items-center justify-center shrink-0">
                                <ShieldCheck className="text-white w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800 group-hover:text-[#6264A7]">Attendance Pro</h3>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-3">
                                    Enterprise-grade attendance tracking with Geolocation, Approvals, and AI Assistant. Simplify workforce management.
                                </p>
                            </div>
                        </div>

                        {/* Dummy Card 1 (Context) */}
                        <div className="bg-white border border-gray-200 rounded-md p-4 flex gap-4 hover:shadow-md transition-shadow cursor-pointer opacity-70">
                            <div className="w-12 h-12 bg-blue-500 rounded-md flex items-center justify-center shrink-0">
                                <User className="text-white w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Visitor Management</h3>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-3">
                                    Visitor management allows user to create visitor request, edit/delete upcoming visitor request.
                                </p>
                            </div>
                        </div>

                         {/* Dummy Card 2 (Context) */}
                         <div className="bg-white border border-gray-200 rounded-md p-4 flex gap-4 hover:shadow-md transition-shadow cursor-pointer opacity-70">
                            <div className="w-12 h-12 bg-orange-500 rounded-md flex items-center justify-center shrink-0">
                                <Grid className="text-white w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Travel Assist</h3>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-3">
                                    Travel assist allows user to raise travel request, view/edit/delete upcoming travel requests easily.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
          </div>
        </main>
      </div>

      {/* 4. Installation Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
            <div className="bg-white w-[800px] h-[500px] shadow-2xl rounded-sm flex flex-col relative animate-fade-in">
                {/* Close Button */}
                <button 
                    onClick={() => setShowModal(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
                >
                    <X size={20} />
                </button>

                <div className="flex h-full">
                    {/* Left: Icon and Basic Info */}
                    <div className="w-1/3 p-8 border-r border-gray-100 flex flex-col">
                        <div className="w-24 h-24 bg-[#6264A7] rounded-lg flex items-center justify-center mb-6 shadow-sm">
                            <ShieldCheck className="text-white w-14 h-14" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-6">Attendance Pro</h2>
                        
                        <div className="space-y-4 text-sm text-gray-600">
                            <div>
                                <p className="font-semibold text-gray-800">About</p>
                                <p className="text-xs mt-1">Attendance Pro</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">Version</p>
                                <p className="text-xs mt-1">2.0.1</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-800">Created by</p>
                                <p className="text-xs mt-1">Quadra Systems</p>
                            </div>
                        </div>
                    </div>

                    {/* Right: Details and Action */}
                    <div className="flex-1 p-8 flex flex-col">
                        <div className="flex-1 overflow-y-auto pr-2">
                            <button 
                                onClick={onInstall}
                                className="w-full bg-[#6264A7] hover:bg-[#525491] text-white font-semibold py-2 px-4 rounded-[3px] shadow-sm mb-8 transition-colors flex items-center justify-center"
                            >
                                Add
                            </button>

                            <div className="space-y-6 text-sm text-gray-700">
                                <div>
                                    <p className="mb-2">
                                        Attendance Pro is a comprehensive solution for managing workforce attendance, leave requests, and shift scheduling directly within Microsoft Teams.
                                    </p>
                                    <p>
                                        It features GPS-based check-in/out, automated approval workflows for Managers, and detailed compliance reporting for HR Admins.
                                    </p>
                                </div>

                                <div>
                                    <h4 className="font-bold text-gray-900 mb-2">Capabilities</h4>
                                    <ul className="space-y-2 text-gray-600">
                                        <li className="flex items-start">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 mr-2 shrink-0"></span>
                                            Chat with the app to check in, view status, or raise requests.
                                        </li>
                                        <li className="flex items-start">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 mr-2 shrink-0"></span>
                                            Personal app tab for Dashboard and History.
                                        </li>
                                        <li className="flex items-start">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 mr-2 shrink-0"></span>
                                            Receive notifications for approvals and shift alerts.
                                        </li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-gray-900 mb-2">Permissions</h4>
                                    <p className="text-xs text-gray-500">
                                        This app will have permission to receive messages and data that I provide to it.
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                            By using Attendance Pro, you agree to the privacy policy and terms of use.
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default InstallationScreen;
