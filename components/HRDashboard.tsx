
import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Users, AlertTriangle, CheckCircle, Clock, Download, ArrowLeft, History, MapPin, BarChart3, Settings, Edit3, X, ShieldAlert, FileText, Upload, Ban, Unlock, Filter, Calendar, List, Search, Save, Trash2, Database, FileBarChart, Plus, Bell, AlertOctagon, LogIn, LogOut, MessageSquare, ChevronRight as ChevronRightIcon, TrendingUp } from 'lucide-react';
import { RequestStatus, RequestType, UserStatus, ShiftConfig, LocationType } from '../types';
import { VisualTimeline, AttendanceCalendar, formatDuration } from './SharedComponents';
import { differenceInMinutes, format, isSameMonth, addMonths } from 'date-fns';
import HRReports from './HRReports';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, LineChart, Line } from 'recharts';

interface HRDashboardProps {
    view?: 'dashboard' | 'directory' | 'approvals' | 'reports' | 'compliance' | 'admin';
}

const HRDashboard: React.FC<HRDashboardProps> = ({ view = 'dashboard' }) => {
    const { currentUser, requests, approveRequest, rejectRequest, users, attendanceRecords, updateUserShift, auditLogs, toggleUserStatus, checkIn, checkOut, createRequest, finalizeShiftChange } = useApp();
    const [localView, setLocalView] = useState(view);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    
    // Directory State
    const [directoryTab, setDirectoryTab] = useState<'attendance' | 'logs'>('attendance');
    const [adminSubTab, setAdminSubTab] = useState<'shifts' | 'requests' | 'escalations' | 'bulk' | 'reports'>('shifts');
    const [directoryDate, setDirectoryDate] = useState(format(new Date(), 'yyyy-MM-dd')); 
    const [searchTerm, setSearchTerm] = useState('');

    // Edit Shift Modal State
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [shiftEditUserId, setShiftEditUserId] = useState<string | null>(null);
    const [shiftName, setShiftName] = useState("");
    const [shiftStart, setShiftStart] = useState("");
    const [shiftEnd, setShiftEnd] = useState("");

    // Create Shift State
    const [showCreateShiftModal, setShowCreateShiftModal] = useState(false);
    const [newShiftName, setNewShiftName] = useState("");
    const [newShiftStart, setNewShiftStart] = useState("09:00");
    const [newShiftEnd, setNewShiftEnd] = useState("18:00");
    const [shiftTemplates, setShiftTemplates] = useState<ShiftConfig[]>([
        { name: 'General Shift A', startTime: '09:00', endTime: '18:00' },
        { name: 'Morning Shift', startTime: '07:00', endTime: '16:00' },
        { name: 'Night Shift', startTime: '22:00', endTime: '07:00' },
    ]);

    // Edit Request State
    const [editRequestId, setEditRequestId] = useState<string | null>(null);

    // Report Generation State
    const [showReportResults, setShowReportResults] = useState(false);

    // --- Personal Attendance State (HR Admin's own) ---
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isAcquiringLoc, setIsAcquiringLoc] = useState(false);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [gpsData, setGpsData] = useState<{lat: number, lng: number, distance: number, inside: boolean} | null>(null);
    const [locationType, setLocationType] = useState<LocationType>(LocationType.OFFICE);
    
    // Personal Request Form State
    const [requestType, setRequestType] = useState(RequestType.LEAVE);
    const [leaveStartDate, setLeaveStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [leaveReason, setLeaveReason] = useState("");
    const [duration, setDuration] = useState("Full Day");

    const DURATION_OPTIONS = ["1 hour", "2 hours", "3 hours", "4 hours", "5 hours", "6 hours", "7 hours", "Full Day"];

    React.useEffect(() => {
        setLocalView(view);
    }, [view]);

    // Clock Effect
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // HR sees ALL pending requests and Manager Approved shift changes
    const pendingRequests = requests.filter(r => r.status === RequestStatus.PENDING || r.status === RequestStatus.MANAGER_APPROVED);
    
    // Global Stats
    const totalEmployees = users.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const presentToday = attendanceRecords.filter(r => r.date === todayStr && (r.status === 'Present' || r.status === 'Work From Home')).length;
    const absentToday = totalEmployees - presentToday;
    
    // Escalations logic (Users absent > 3 times recently - Mock logic)
    const escalationUserIds = users.filter((_, i) => i % 3 === 0 && i !== 0).map(u => u.id);

    // HR's Personal Status
    const myTodayRecords = attendanceRecords.filter(r => r.userId === currentUser.id && r.date === todayStr);
    const myActiveRecord = myTodayRecords.find(r => !r.checkOutTime);
    const isCheckedIn = !!myActiveRecord;

    // --- Personal Actions Handlers ---
    const initiateCheckIn = () => {
        setIsAcquiringLoc(true);
        setTimeout(() => {
            const mockLat = 40.7128; const mockLng = -74.0060;
            setGpsData({ lat: mockLat, lng: mockLng, distance: 10, inside: true });
            setIsAcquiringLoc(false);
            setShowCheckInModal(true);
        }, 1000);
    };

    const confirmCheckIn = () => {
        if (gpsData) {
            checkIn(locationType, gpsData.lat, gpsData.lng);
            setShowCheckInModal(false);
        }
    };

    const initiateCheckOut = () => {
         checkOut([{ id: '1', locationType: LocationType.OFFICE, durationMinutes: 480, notes: 'HR Admin End of Day' }]);
    };

    const handlePersonalRequest = (type: RequestType) => {
        setRequestType(type);
        setShowLeaveModal(true);
    };

    const submitPersonalRequest = () => {
        createRequest(requestType, leaveStartDate, leaveReason, { duration });
        closePersonalModal();
    };

    const closePersonalModal = () => {
        setShowLeaveModal(false);
        setShowCheckInModal(false);
        setLeaveReason("");
        setDuration("Full Day");
    };

    const getNotifications = () => {
        const notifs = [];
        
        // 1. Escalations
        if (escalationUserIds.length > 0) {
            notifs.push({
                id: 'esc-summary',
                type: 'escalation',
                title: 'Attendance Escalations',
                message: `${escalationUserIds.length} employees flagged for absence patterns.`,
                time: '08:00 AM',
                urgent: true
            });
        }

        // 2. Pending Approvals
        if (pendingRequests.length > 0) {
             notifs.push({
                id: 'req-summary',
                type: 'request',
                title: 'Pending Approvals',
                message: `There are ${pendingRequests.length} requests awaiting HR approval.`,
                time: 'Just now',
                urgent: false
            });
        }

        // 3. System Alerts
        notifs.push({
            id: 'sys-1',
            type: 'system',
            title: 'Audit Log',
            message: 'Weekly compliance report generated successfully.',
            time: '09:00 AM',
            urgent: false
        });

        return notifs;
    };

    const handleViewHistory = (userId: string) => {
        setSelectedUserId(userId);
        setLocalView('member_detail' as any);
    };

    const openShiftModal = (user: any) => {
        setShiftEditUserId(user.id);
        setShiftName(user.shift?.name || "General Shift");
        setShiftStart(user.shift?.startTime || "09:00");
        setShiftEnd(user.shift?.endTime || "18:00");
        setShowShiftModal(true);
    };

    const saveShift = () => {
        if (shiftEditUserId && shiftName && shiftStart && shiftEnd) {
            updateUserShift(shiftEditUserId, {
                name: shiftName,
                startTime: shiftStart,
                endTime: shiftEnd
            });
            setShowShiftModal(false);
        }
    };

    const handleCreateShift = () => {
        if (newShiftName && newShiftStart && newShiftEnd) {
            setShiftTemplates([...shiftTemplates, {
                name: newShiftName,
                startTime: newShiftStart,
                endTime: newShiftEnd
            }]);
            setShowCreateShiftModal(false);
            setNewShiftName("");
        }
    };
    
    const handleToggleBlock = (userId: string, currentStatus: UserStatus = UserStatus.ACTIVE) => {
        const newStatus = currentStatus === UserStatus.ACTIVE ? UserStatus.BLOCKED : UserStatus.ACTIVE;
        toggleUserStatus(userId, newStatus);
    };

    const handleSaveRequestEdit = (reqId: string) => {
        // Logic to save the edited request would go here
        setEditRequestId(null);
    };

    const renderMemberDetail = () => {
        if (!selectedUserId) return null;
        const user = users.find(u => u.id === selectedUserId);
        const userRecords = attendanceRecords.filter(r => r.userId === selectedUserId).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const todayRecord = userRecords.find(r => r.date === todayStr);

        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setLocalView('directory')}
                        className="p-2 bg-white border border-gray-200 rounded-sm text-gray-600 hover:bg-gray-50"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                        <p className="text-sm text-gray-500">Employee Profile & History</p>
                    </div>
                </div>

                <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-800 mb-2">Today's Activity</h3>
                     {todayRecord ? (
                         <VisualTimeline records={[todayRecord]} />
                     ) : (
                         <p className="text-gray-400 py-4">No activity recorded for today.</p>
                     )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                         <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                             <div className="p-4 border-b border-gray-100 font-semibold text-gray-700">
                                 Detailed Logs
                             </div>
                             <table className="w-full text-sm text-left border-collapse border border-gray-200">
                                 <thead className="bg-gray-50 text-gray-500 font-medium">
                                     <tr>
                                         <th className="px-4 py-3 border border-gray-200">Date</th>
                                         <th className="px-4 py-3 border border-gray-200">Check In</th>
                                         <th className="px-4 py-3 border border-gray-200">Check Out</th>
                                         <th className="px-4 py-3 border border-gray-200">Duration</th>
                                         <th className="px-4 py-3 border border-gray-200">Status</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-200">
                                     {userRecords.map(record => (
                                         <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                             <td className="px-4 py-3 font-medium text-gray-800 border border-gray-200">
                                                 {format(new Date(record.date), 'MMM d, yyyy')}
                                             </td>
                                             <td className="px-4 py-3 text-green-700 border border-gray-200">
                                                 {format(new Date(record.checkInTime!), 'hh:mm a')}
                                             </td>
                                             <td className="px-4 py-3 text-blue-700 border border-gray-200">
                                                 {record.checkOutTime ? format(new Date(record.checkOutTime), 'hh:mm a') : '-'}
                                             </td>
                                             <td className="px-4 py-3 font-medium border border-gray-200">
                                                 {record.checkOutTime ? formatDuration(differenceInMinutes(new Date(record.checkOutTime), new Date(record.checkInTime!))) : '-'}
                                             </td>
                                              <td className="px-4 py-3 border border-gray-200">
                                                 <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                     record.status === 'Present' ? 'bg-green-100 text-green-800' : 
                                                     record.status.includes('Home') ? 'bg-blue-100 text-blue-800' : 'bg-gray-100'
                                                 }`}>
                                                     {record.status}
                                                 </span>
                                              </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                             {userRecords.length === 0 && <p className="p-6 text-center text-gray-400">No history found.</p>}
                         </div>
                    </div>
                    <div>
                         <AttendanceCalendar records={userRecords} />
                    </div>
                </div>
            </div>
        );
    };

    const renderApprovals = () => (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 flex flex-col h-full">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">Global Pending Requests</h3>
                <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded text-xs font-medium">{pendingRequests.length} Pending</span>
            </div>
            <div className="p-6 overflow-y-auto">
                {pendingRequests.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
                        <p>No pending requests across the organization.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2">
                                            <h4 className="font-medium text-gray-900">{req.userName}</h4>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                req.type === RequestType.LEAVE ? 'bg-orange-100 text-orange-700' :
                                                req.type === RequestType.REGULARIZATION ? 'bg-blue-100 text-blue-700' : 
                                                req.type === RequestType.SHIFT_CHANGE ? 'bg-purple-100 text-purple-700' :
                                                'bg-green-100 text-green-700'
                                            }`}>
                                                {req.type}
                                            </span>
                                            {req.status === RequestStatus.MANAGER_APPROVED && (
                                                <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                                                    Manager Approved
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-500 mt-1">{req.startDate}</p>
                                        
                                        {req.type === RequestType.SHIFT_CHANGE && req.shiftChangeDetails && (
                                            <div className="mt-2 text-xs bg-purple-50 p-2 rounded text-purple-800 border border-purple-100">
                                                <p className="flex items-center font-semibold"><TrendingUp size={12} className="mr-1"/> Requested Shift: {req.shiftChangeDetails.requestedShift.name}</p>
                                                <p>Time: {req.shiftChangeDetails.requestedShift.startTime} - {req.shiftChangeDetails.requestedShift.endTime}</p>
                                            </div>
                                        )}

                                        <p className="text-xs text-gray-400 mt-2 italic">"{req.reason}"</p>
                                    </div>
                                    <div className="flex flex-col space-y-2 ml-4 min-w-[150px]">
                                        {req.type === RequestType.SHIFT_CHANGE && req.status === RequestStatus.MANAGER_APPROVED ? (
                                            <button 
                                                onClick={() => finalizeShiftChange(req.id)}
                                                className="px-3 py-1 bg-[#6264A7] text-white text-xs font-bold rounded-sm hover:bg-[#51538f] w-full flex items-center justify-center"
                                            >
                                                <Settings size={12} className="mr-1"/> Complete Shift Update
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => approveRequest(req.id)}
                                                className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-sm hover:bg-green-700 w-full"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        
                                        <button 
                                            onClick={() => rejectRequest(req.id)}
                                            className="px-3 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium rounded-sm hover:bg-gray-50 w-full"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );

    // --- Directory Sub-Components ---

    // 1. View all employee attendance across the organization
    const renderAttendanceOverview = () => {
        const filtered = users.filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            u.department.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-100 text-xs text-gray-600 uppercase tracking-wider">
                            <th className="py-3 px-4 border border-gray-200">Employee</th>
                            <th className="py-3 px-4 border border-gray-200">Department</th>
                            <th className="py-3 px-4 border border-gray-200">Status ({format(new Date(directoryDate), 'MMM d')})</th>
                            <th className="py-3 px-4 border border-gray-200">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                        {filtered.map(u => {
                            const record = attendanceRecords.find(r => r.userId === u.id && r.date === directoryDate);
                            const status = record ? record.status : 'Absent';
                            return (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 flex items-center space-x-3 border border-gray-200">
                                        <img src={u.avatar} className="w-8 h-8 rounded-full" alt=""/>
                                        <span className="font-medium text-gray-900">{u.name}</span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-500 border border-gray-200">{u.department}</td>
                                    <td className="py-3 px-4 border border-gray-200">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                            status === 'Present' ? 'bg-green-100 text-green-800' :
                                            status.includes('Home') ? 'bg-blue-100 text-blue-800' :
                                            'bg-red-50 text-red-800'
                                        }`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 border border-gray-200">
                                        <button onClick={() => handleViewHistory(u.id)} className="text-indigo-600 hover:underline text-xs">View History</button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    // 2. See every check-in and check-out record with location
    const renderAttendanceLogs = () => {
        // Iterate through ALL users to ensure everyone appears in the list
        const filteredUsers = users.filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-100 text-xs text-gray-600 uppercase tracking-wider">
                            <th className="py-3 px-4 border border-gray-200">Employee</th>
                            <th className="py-3 px-4 border border-gray-200">Check In</th>
                            <th className="py-3 px-4 border border-gray-200">Check Out</th>
                            <th className="py-3 px-4 border border-gray-200">Location</th>
                            <th className="py-3 px-4 border border-gray-200">Coordinates</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                        {filteredUsers.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-400 border border-gray-200">No employees found.</td></tr>
                        ) : (
                            filteredUsers.map(u => {
                                const log = attendanceRecords.find(r => r.userId === u.id && r.date === directoryDate);
                                return (
                                    <tr key={u.id} className="hover:bg-gray-50">
                                        <td className="py-3 px-4 font-medium text-gray-900 border border-gray-200 flex items-center gap-2">
                                            <img src={u.avatar} className="w-6 h-6 rounded-full" alt="" />
                                            {u.name}
                                        </td>
                                        <td className="py-3 px-4 text-green-700 border border-gray-200">
                                            {log?.checkInTime ? format(new Date(log.checkInTime), 'hh:mm a') : '-'}
                                        </td>
                                        <td className="py-3 px-4 text-blue-700 border border-gray-200">
                                            {log?.checkOutTime ? format(new Date(log.checkOutTime), 'hh:mm a') : '-'}
                                        </td>
                                        <td className="py-3 px-4 flex items-center border border-gray-200">
                                            {log ? <><MapPin size={12} className="mr-1 text-gray-400"/> {log.locationType}</> : '-'}
                                        </td>
                                        <td className="py-3 px-4 font-mono text-xs text-gray-500 border border-gray-200">
                                            {log?.coordinates ? `${log.coordinates.lat.toFixed(4)}, ${log.coordinates.lng.toFixed(4)}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        );
    };

    // 3. Manage employee shifts and work schedules
    const renderShiftManagement = () => {
         const filtered = users.filter(u => 
            u.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return (
            <div className="space-y-8">
                {/* Available Shift Patterns Section */}
                <div className="bg-white border border-gray-200 rounded-md p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-gray-700">Available Shift Patterns</h4>
                        <button onClick={() => setShowCreateShiftModal(true)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-sm flex items-center">
                            <Plus size={16} className="mr-1" /> Create New Shift
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {shiftTemplates.map((template, idx) => (
                            <div key={idx} className="border border-gray-100 bg-gray-50 rounded-sm p-3 flex justify-between items-center hover:shadow-sm transition-shadow">
                                <div>
                                    <p className="font-bold text-gray-800 text-sm">{template.name}</p>
                                    <p className="text-xs text-gray-500">{template.startTime} - {template.endTime}</p>
                                </div>
                                <Clock size={16} className="text-blue-400"/>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="overflow-x-auto bg-white border border-gray-200 rounded-md">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <h4 className="font-semibold text-gray-700">Employee Shift Assignments</h4>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-xs text-gray-600 uppercase tracking-wider">
                                <th className="py-3 px-4 border-b border-gray-200">Employee</th>
                                <th className="py-3 px-4 border-b border-gray-200">Current Shift</th>
                                <th className="py-3 px-4 border-b border-gray-200">Timing</th>
                                <th className="py-3 px-4 border-b border-gray-200">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-sm">
                            {filtered.map(u => (
                                <tr key={u.id} className="hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium text-gray-900">{u.name}</td>
                                    <td className="py-3 px-4">
                                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">
                                            {u.shift?.name || 'Standard'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 font-mono text-xs">
                                        {u.shift ? `${u.shift.startTime} - ${u.shift.endTime}` : '09:00 - 18:00'}
                                    </td>
                                    <td className="py-3 px-4">
                                        <button onClick={() => openShiftModal(u)} className="flex items-center text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                                            <Edit3 size={12} className="mr-1"/> Edit Shift
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // 4. Track all leave and permission requests company-wide
    const renderGlobalRequests = () => {
         // Show history and pending
         const filteredRequests = requests.filter(r => 
             r.userName.toLowerCase().includes(searchTerm.toLowerCase())
         ).sort((a,b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime());

         return (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-gray-200">
                    <thead>
                        <tr className="bg-gray-100 text-xs text-gray-600 uppercase tracking-wider">
                            <th className="py-3 px-4 border border-gray-200">Employee</th>
                            <th className="py-3 px-4 border border-gray-200">Type</th>
                            <th className="py-3 px-4 border border-gray-200">Applied Date</th>
                            <th className="py-3 px-4 border border-gray-200">Status</th>
                            <th className="py-3 px-4 border border-gray-200">Details</th>
                            <th className="py-3 px-4 border border-gray-200">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                         {filteredRequests.map(req => {
                             const isEditing = editRequestId === req.id;
                             return (
                                 <tr key={req.id} className={`hover:bg-gray-50 ${isEditing ? 'bg-blue-50/50' : ''}`}>
                                     <td className="py-3 px-4 font-medium text-gray-900 border border-gray-200">{req.userName}</td>
                                     <td className="py-3 px-4 border border-gray-200">
                                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            req.type === RequestType.LEAVE ? 'bg-orange-100 text-orange-700' :
                                            req.type === RequestType.REGULARIZATION ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                        }`}>{req.type}</span>
                                     </td>
                                     <td className="py-3 px-4 text-gray-500 border border-gray-200">{req.appliedOn}</td>
                                     <td className="py-3 px-4 border border-gray-200">
                                         {isEditing ? (
                                             <select 
                                                defaultValue={req.status} 
                                                className="text-xs border border-gray-300 rounded p-1 bg-white"
                                             >
                                                 <option>{RequestStatus.PENDING}</option>
                                                 <option>{RequestStatus.APPROVED}</option>
                                                 <option>{RequestStatus.REJECTED}</option>
                                             </select>
                                         ) : (
                                             <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                 req.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                 req.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                             }`}>{req.status}</span>
                                         )}
                                     </td>
                                     <td className="py-3 px-4 text-gray-500 text-xs truncate max-w-xs border border-gray-200" title={req.reason}>
                                         {req.reason}
                                     </td>
                                     <td className="py-3 px-4 border border-gray-200">
                                         <div className="flex items-center space-x-2">
                                             {isEditing ? (
                                                 <>
                                                    <button onClick={() => handleSaveRequestEdit(req.id)} className="text-indigo-600 hover:text-indigo-800" title="Save"><Save size={16}/></button>
                                                    <button onClick={() => setEditRequestId(null)} className="text-gray-500 hover:text-gray-700" title="Cancel"><X size={16}/></button>
                                                 </>
                                             ) : (
                                                 <>
                                                     {req.status === RequestStatus.PENDING && (
                                                         <>
                                                             <button onClick={() => approveRequest(req.id)} className="text-green-600 hover:text-green-800" title="Approve"><CheckCircle size={16}/></button>
                                                             <button onClick={() => rejectRequest(req.id)} className="text-red-600 hover:text-red-800" title="Reject"><X size={16}/></button>
                                                         </>
                                                     )}
                                                     <button onClick={() => setEditRequestId(req.id)} className="text-indigo-600 hover:text-indigo-800" title="Edit"><Edit3 size={16}/></button>
                                                 </>
                                             )}
                                         </div>
                                     </td>
                                 </tr>
                             );
                         })}
                    </tbody>
                </table>
            </div>
         );
    };

    // 5. View pending escalations and user blocks
    const renderEscalationsAndBlocks = () => {
        const blockedUsers = users.filter(u => u.status === UserStatus.BLOCKED);
        const escalatedUsers = users.filter(u => escalationUserIds.includes(u.id));

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Escalations */}
                    <div className="border border-red-100 rounded-md bg-white overflow-hidden">
                        <div className="p-4 bg-red-50 border-b border-red-100 flex items-center text-red-900 font-bold">
                            <AlertTriangle size={18} className="mr-2"/> Attendance Escalations
                        </div>
                        <div className="p-4">
                            {escalatedUsers.length === 0 ? <p className="text-gray-400 text-sm">No active escalations.</p> : (
                                <ul className="space-y-2">
                                    {escalatedUsers.map(u => (
                                        <li key={u.id} className="flex justify-between items-center p-3 bg-red-50/50 rounded-lg border border-red-100">
                                            <div className="flex items-center space-x-2">
                                                <img src={u.avatar} className="w-8 h-8 rounded-full" alt=""/>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                                                    <p className="text-xs text-red-500">3 Consecutive Absences</p>
                                                </div>
                                            </div>
                                            <button className="text-xs bg-red-600 text-white px-2 py-1 rounded">Action</button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Blocked Users */}
                    <div className="border border-gray-200 rounded-md bg-white overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center text-gray-800 font-bold">
                            <Ban size={18} className="mr-2"/> Blocked Users
                        </div>
                        <div className="p-4">
                            {blockedUsers.length === 0 ? <p className="text-gray-400 text-sm">No blocked users.</p> : (
                                <ul className="space-y-2">
                                    {blockedUsers.map(u => (
                                        <li key={u.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                                            <div className="flex items-center space-x-2">
                                                <div className="relative">
                                                    <img src={u.avatar} className="w-8 h-8 rounded-full grayscale opacity-50" alt=""/>
                                                    <div className="absolute -top-1 -right-1 bg-red-500 p-0.5 rounded-full"><X size={8} className="text-white"/></div>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-600 text-sm line-through">{u.name}</p>
                                                    <p className="text-xs text-gray-400">Account Disabled</p>
                                                </div>
                                            </div>
                                            <button onClick={() => handleToggleBlock(u.id, u.status)} className="text-xs text-green-600 hover:underline flex items-center">
                                                <Unlock size={12} className="mr-1"/> Unblock
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderBulkOperations = () => (
        <div className="p-6 space-y-6">
            <h3 className="font-bold text-gray-800 text-lg">Bulk Data Operations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-md p-6 bg-white shadow-sm">
                    <div className="flex items-center mb-4 text-indigo-600">
                        <Upload size={24} className="mr-2"/>
                        <h4 className="font-semibold text-lg">Import Attendance</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Upload a CSV file containing attendance records to bulk update or backfill data.</p>
                    <button className="w-full py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-sm hover:bg-gray-50 flex justify-center items-center">
                        <Upload size={16} className="mr-2"/> Select CSV File
                    </button>
                </div>
                 <div className="border border-gray-200 rounded-md p-6 bg-white shadow-sm">
                    <div className="flex items-center mb-4 text-green-600">
                        <Download size={24} className="mr-2"/>
                        <h4 className="font-semibold text-lg">Export Records</h4>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Download all attendance data, user profiles, and shift configurations.</p>
                    <div className="space-y-3">
                        <button className="w-full py-2 bg-green-50 text-green-700 border border-green-200 font-medium rounded-sm hover:bg-green-100 flex justify-center items-center">
                            Download Attendance Log
                        </button>
                        <button className="w-full py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-sm hover:bg-gray-50 flex justify-center items-center">
                            Download User List
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderDetailedReports = () => {
        // Mock Data for Charts
        const ATTENDANCE_TREND = [
            { day: 'Mon', Present: 42, Absent: 3 },
            { day: 'Tue', Present: 40, Absent: 5 },
            { day: 'Wed', Present: 44, Absent: 1 },
            { day: 'Thu', Present: 41, Absent: 4 },
            { day: 'Fri', Present: 38, Absent: 7 },
            { day: 'Sat', Present: 20, Absent: 25 }, // Half day maybe
        ];

        const DEPT_DATA = [
            { name: 'Engineering', Rate: 95 },
            { name: 'Sales', Rate: 88 },
            { name: 'HR', Rate: 98 },
            { name: 'Marketing', Rate: 92 },
        ];

        const LATE_DATA = [
            { day: 'Mon', count: 2 },
            { day: 'Tue', count: 5 },
            { day: 'Wed', count: 1 },
            { day: 'Thu', count: 3 },
            { day: 'Fri', count: 6 },
        ];

        return (
            <div className="p-6 space-y-8">
                <h3 className="font-bold text-gray-800 text-lg">Generate Detailed Reports</h3>
                
                {/* Filters */}
                <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                            <select className="w-full border-gray-300 rounded-sm p-2 text-sm bg-white">
                                <option>Attendance Summary</option>
                                <option>Absenteeism Report</option>
                                <option>Late Arrivals</option>
                                <option>Overtime Report</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                             <select className="w-full border-gray-300 rounded-sm p-2 text-sm bg-white">
                                <option>All Departments</option>
                                <option>Engineering</option>
                                <option>Sales</option>
                                <option>HR</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                             <select className="w-full border-gray-300 rounded-sm p-2 text-sm bg-white">
                                <option>All Locations</option>
                                <option>Office</option>
                                <option>WFH</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input type="date" className="w-full border-gray-300 rounded-sm p-2 text-sm" defaultValue={format(new Date(), 'yyyy-MM-01')} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input type="date" className="w-full border-gray-300 rounded-sm p-2 text-sm" defaultValue={format(new Date(), 'yyyy-MM-dd')} />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button onClick={() => setShowReportResults(true)} className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-sm hover:bg-indigo-700 flex items-center">
                            <FileBarChart size={18} className="mr-2"/> Generate Report
                        </button>
                    </div>
                </div>

                {/* Report Results */}
                {showReportResults && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm text-center">
                                <p className="text-gray-500 text-xs uppercase font-bold">Total Work Hours</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">1,240h</p>
                            </div>
                            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm text-center">
                                <p className="text-gray-500 text-xs uppercase font-bold">Avg Attendance</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">94%</p>
                            </div>
                            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm text-center">
                                <p className="text-gray-500 text-xs uppercase font-bold">Late Arrivals</p>
                                <p className="text-2xl font-bold text-orange-500 mt-1">17</p>
                            </div>
                            <div className="bg-white p-4 rounded-sm border border-gray-200 shadow-sm text-center">
                                <p className="text-gray-500 text-xs uppercase font-bold">Avg Overtime</p>
                                <p className="text-2xl font-bold text-indigo-600 mt-1">45m</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Daily Trend */}
                            <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
                                <h4 className="font-semibold text-gray-700 mb-6">Daily Attendance Trends</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={ATTENDANCE_TREND}>
                                            <defs>
                                                <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="day" axisLine={false} tickLine={false}/>
                                            <YAxis axisLine={false} tickLine={false}/>
                                            <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                                            <Tooltip/>
                                            <Area type="monotone" dataKey="Present" stroke="#4f46e5" fillOpacity={1} fill="url(#colorPresent)" />
                                            <Area type="monotone" dataKey="Absent" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Department Breakdown */}
                            <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
                                <h4 className="font-semibold text-gray-700 mb-6">Department Attendance %</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={DEPT_DATA} layout="vertical">
                                            <XAxis type="number" hide domain={[0, 100]}/>
                                            <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false}/>
                                            <Tooltip cursor={{fill: 'transparent'}}/>
                                            <Bar dataKey="Rate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20}/>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Late Trend */}
                        <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
                            <h4 className="font-semibold text-gray-700 mb-6">Late Arrivals Trend (This Week)</h4>
                            <div className="h-48">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={LATE_DATA}>
                                        <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                                        <XAxis dataKey="day" axisLine={false} tickLine={false}/>
                                        <YAxis axisLine={false} tickLine={false}/>
                                        <Tooltip/>
                                        <Line type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}}/>
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderAdminManagement = () => (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
             {/* Header */}
             <div className="p-6 border-b border-gray-200">
                <h3 className="font-bold text-xl text-gray-900 flex items-center">
                    <Settings className="mr-2 text-indigo-600" /> Admin Management
                </h3>
                <p className="text-sm text-gray-500 mt-1">Configure system settings, approvals, and user access.</p>
             </div>
             
             {/* Main Content Split */}
            <div className="flex flex-1 h-full bg-gray-50 overflow-hidden">
                {/* Sidebar for Admin Section */}
                <div className="w-64 border-r border-gray-200 bg-white p-4 flex-shrink-0">
                     <div className="space-y-1">
                        <button onClick={() => setAdminSubTab('shifts')} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-sm transition-colors ${adminSubTab === 'shifts' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <Clock size={16} className="mr-3"/> Shift Management
                        </button>
                        <button onClick={() => setAdminSubTab('requests')} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-sm transition-colors ${adminSubTab === 'requests' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <FileText size={16} className="mr-3"/> Request Approvals
                        </button>
                        <button onClick={() => setAdminSubTab('escalations')} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-sm transition-colors ${adminSubTab === 'escalations' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <ShieldAlert size={16} className="mr-3"/> Escalations & Blocks
                        </button>
                         <button onClick={() => setAdminSubTab('bulk')} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-sm transition-colors ${adminSubTab === 'bulk' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <Database size={16} className="mr-3"/> Bulk Operations
                        </button>
                         <button onClick={() => setAdminSubTab('reports')} className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-sm transition-colors ${adminSubTab === 'reports' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <FileBarChart size={16} className="mr-3"/> Custom Reports
                        </button>
                     </div>
                </div>
                
                {/* Content Area */}
                <div className="flex-1 overflow-y-auto">
                     {adminSubTab === 'shifts' && (
                         <div className="p-6">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800">Shift Assignments</h3>
                             </div>
                             {renderShiftManagement()}
                         </div>
                     )}
                     {adminSubTab === 'requests' && (
                         <div className="p-6">
                             <h3 className="font-bold text-gray-800 mb-4">Global Requests</h3>
                             {renderGlobalRequests()}
                         </div>
                     )}
                     {adminSubTab === 'escalations' && (
                         <div className="p-6">
                            <h3 className="font-bold text-gray-800 mb-4">Escalations & User Access</h3>
                            {renderEscalationsAndBlocks()}
                         </div>
                     )}
                     {adminSubTab === 'bulk' && renderBulkOperations()}
                     {adminSubTab === 'reports' && renderDetailedReports()}
                </div>
            </div>
        </div>
    );

    const renderDirectory = () => {
        return (
            <div className="bg-white rounded-md shadow-sm border border-gray-200 flex flex-col h-full overflow-hidden">
                 {/* Main Header */}
                 <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h3 className="font-bold text-xl text-gray-900 flex items-center">
                                <Users className="mr-2 text-indigo-600" /> Employee Directory
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">Centralized management for attendance, shifts, and access control.</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search employees..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            {(directoryTab === 'attendance' || directoryTab === 'logs') && (
                                <div className="flex items-center bg-gray-50 px-2 rounded-sm border border-gray-200 py-1.5">
                                    <Calendar size={14} className="text-gray-400 mr-2"/>
                                    <input 
                                        type="date" 
                                        value={directoryDate} 
                                        onChange={(e) => setDirectoryDate(e.target.value)}
                                        className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 p-0 outline-none cursor-pointer"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="flex space-x-6 border-b border-gray-100 overflow-x-auto">
                        {[
                            { id: 'attendance', label: 'Attendance Overview', icon: <CheckCircle size={16}/> },
                            { id: 'logs', label: 'Check-In/Out Logs', icon: <List size={16}/> },
                        ].map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setDirectoryTab(tab.id as any)}
                                className={`flex items-center space-x-2 pb-3 px-1 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                                    directoryTab === tab.id 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                 </div>
                 
                 {/* Content Area */}
                 <div className="flex-1 overflow-y-auto bg-gray-50">
                    {directoryTab === 'attendance' && <div className="p-6">{renderAttendanceOverview()}</div>}
                    {directoryTab === 'logs' && <div className="p-6">{renderAttendanceLogs()}</div>}
                 </div>
            </div>
        );
    }
    
    const renderCompliance = () => (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-md shadow-sm border border-gray-200">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <ShieldAlert className="mr-2 text-indigo-600" /> Compliance & Audit
                    </h2>
                    <p className="text-sm text-gray-500">Manage escalations, audit trails, and regulatory compliance.</p>
                </div>
                <div className="flex space-x-3">
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-sm hover:bg-gray-50">
                        Export Audit Log
                    </button>
                    <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-sm hover:bg-indigo-700">
                        Compliance Report
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Audit Log Table */}
                <div className="lg:col-span-3 bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 font-semibold text-gray-700 flex justify-between items-center">
                        <span>System Audit Trail</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">Last 30 Days</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-3">Timestamp</th>
                                    <th className="px-4 py-3">Action</th>
                                    <th className="px-4 py-3">Performed By</th>
                                    <th className="px-4 py-3">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {auditLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-mono text-gray-500 text-xs">{log.timestamp}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800">{log.action}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            <div className="flex items-center space-x-2">
                                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold">{log.performedBy[0]}</span>
                                                <span>{log.performedBy}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 truncate max-w-xs" title={log.details}>{log.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            
            {/* Compliance Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-md">
                    <h4 className="font-bold text-blue-900 mb-2">Data Retention Policy</h4>
                    <p className="text-sm text-blue-700">Historical attendance data is automatically retained for <span className="font-bold">3 years</span> to comply with labor regulations. Archived data is available via export.</p>
                </div>
                <div className="bg-green-50 border border-green-100 p-6 rounded-md">
                    <h4 className="font-bold text-green-900 mb-2">Automated Reporting</h4>
                    <p className="text-sm text-green-700">Monthly compliance reports are scheduled to be sent to <b>management@quadra.com</b> on the 1st of every month.</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-6 rounded-md">
                    <h4 className="font-bold text-orange-900 mb-2">Geo-Fencing Strictness</h4>
                    <p className="text-sm text-orange-700">Currently set to <span className="font-bold">Strict (50m)</span>. Exceptions require manual approval. 12 exceptions flagged this month.</p>
                </div>
            </div>
        </div>
    );

    const renderNotifications = () => {
        const notifs = getNotifications();

        return (
             <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6 flex flex-col h-[400px]">
                <div className="flex items-center space-x-2 mb-4">
                    <Bell size={20} className="text-gray-600" />
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                </div>
                <div className="overflow-y-auto space-y-3 pr-2">
                    {notifs.length === 0 ? (
                         <p className="text-gray-400 text-sm text-center py-4">No new notifications.</p>
                    ) : (
                        notifs.map((n) => (
                            <div key={n.id} className={`p-3 rounded-md border flex items-start space-x-3 ${n.urgent ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                <div className="mt-0.5">
                                    {n.type === 'escalation' ? <AlertOctagon size={16} className="text-red-600" /> :
                                     n.type === 'check-in' ? <LogIn size={16} className="text-green-600" /> :
                                     n.type === 'check-out' ? <LogOut size={16} className="text-blue-600" /> :
                                     n.type === 'missed' ? <AlertTriangle size={16} className="text-orange-500" /> :
                                     <MessageSquare size={16} className="text-blue-500" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`text-sm font-medium ${n.urgent ? 'text-red-900' : 'text-gray-900'}`}>{n.title}</h4>
                                        <span className="text-[10px] text-gray-400">{n.time}</span>
                                    </div>
                                    <p className={`text-xs mt-0.5 ${n.urgent ? 'text-red-700' : 'text-gray-500'}`}>{n.message}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
             </div>
        );
    };

    const renderDashboard = () => (
        <div className="space-y-6">
             {/* HR Banner */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-6">
                <h2 className="text-indigo-900 font-bold text-lg">
                    HR Admin Dashboard: <span className="font-normal text-indigo-700">Organization-wide attendance & analytics.</span>
                </h2>
            </div>

             {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                     <p className="text-sm font-medium text-gray-500">Total Employees</p>
                     <h3 className="text-2xl font-bold text-gray-900 mt-1">{totalEmployees}</h3>
                     <div className="mt-4 p-2 bg-indigo-50 rounded-lg w-fit"><Users size={20} className="text-indigo-500"/></div>
                </div>
                
                <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                     <p className="text-sm font-medium text-gray-500">Present Today</p>
                     <h3 className="text-2xl font-bold text-gray-900 mt-1">{presentToday}</h3>
                     <div className="mt-4 p-2 bg-green-50 rounded-lg w-fit"><CheckCircle size={20} className="text-green-500"/></div>
                </div>

                <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                     <p className="text-sm font-medium text-gray-500">Absent Today</p>
                     <h3 className="text-2xl font-bold text-gray-900 mt-1">{absentToday}</h3>
                     <div className="mt-4 p-2 bg-red-50 rounded-lg w-fit"><AlertTriangle size={20} className="text-red-500"/></div>
                </div>
                
                <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                     <p className="text-sm font-medium text-gray-500">Avg. Work Hours</p>
                     <h3 className="text-2xl font-bold text-gray-900 mt-1">8h 12m</h3>
                     <div className="mt-4 p-2 bg-indigo-50 rounded-lg w-fit"><Clock size={20} className="text-indigo-500"/></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {renderApprovals()}
                </div>
                <div className="space-y-6">
                     {/* Preview of Directory in Dashboard, linking to full view */}
                    <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-gray-800">Quick Directory</h3>
                            <button onClick={() => setLocalView('directory')} className="text-indigo-600 text-sm font-medium hover:underline">View All</button>
                        </div>
                        <ul className="divide-y divide-gray-100">
                            {users.slice(0, 4).map(u => (
                                <li key={u.id} className="py-2 flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <img src={u.avatar} className="w-8 h-8 rounded-full" alt=""/>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{u.name}</p>
                                            <p className="text-xs text-gray-500">{u.role}</p>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                    {/* Notifications Section */}
                    {renderNotifications()}
                </div>
            </div>

            {/* Personal Attendance & Quick Actions (At Bottom) */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Clock & Check-In */}
                <div className="bg-white p-8 rounded-md shadow-sm border border-gray-200 text-center relative overflow-hidden">
                    <div className="h-1 bg-[#6264A7] absolute top-0 left-0 w-full"></div>
                    <h2 className="text-4xl font-light text-gray-800 mb-1">{format(currentTime, 'hh:mm a')}</h2>
                    <p className="text-gray-500 mb-8">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
                    
                    {isCheckedIn ? (
                        <div className="max-w-xs mx-auto">
                            <div className="flex items-center justify-center text-green-600 mb-4 bg-green-50 py-2 rounded">
                                <CheckCircle size={18} className="mr-2"/> Checked In at {format(new Date(myActiveRecord!.checkInTime!), 'hh:mm a')}
                            </div>
                            <button onClick={initiateCheckOut} className="w-full py-2 bg-[#C4314B] hover:bg-[#a3263d] text-white font-semibold rounded shadow-sm">
                                Check Out
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-xs mx-auto">
                            <p className="text-sm text-gray-500 mb-4">You are not checked in yet.</p>
                            <button onClick={initiateCheckIn} className="w-full py-2 bg-[#6264A7] hover:bg-[#525491] text-white font-semibold rounded shadow-sm">
                                Check In
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200 flex flex-col justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button onClick={() => handlePersonalRequest(RequestType.LEAVE)} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Request Leave</span>
                                <ChevronRightIcon size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                            <button onClick={() => handlePersonalRequest(RequestType.PERMISSION)} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Request Permission</span>
                                <ChevronRightIcon size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                            <button onClick={() => handlePersonalRequest(RequestType.REGULARIZATION)} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Regularize Attendance</span>
                                <ChevronRightIcon size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Personal Leave Balance */}
                <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200 flex flex-col justify-center">
                    <h3 className="font-semibold text-gray-800 mb-4">My Leave Balance</h3>
                    <div className="flex justify-between text-center">
                        <div><div className="text-2xl font-bold text-[#6264A7]">{currentUser.leaveBalance.casual}</div><div className="text-xs text-gray-500 uppercase mt-1">Casual</div></div>
                        <div><div className="text-2xl font-bold text-[#6264A7]">{currentUser.leaveBalance.sick}</div><div className="text-xs text-gray-500 uppercase mt-1">Sick</div></div>
                        <div><div className="text-2xl font-bold text-[#6264A7]">{currentUser.leaveBalance.earned}</div><div className="text-xs text-gray-500 uppercase mt-1">Earned</div></div>
                    </div>
                </div>
             </div>
        </div>
    );

    // --- Personal Modal Render (Check-In / Request) ---
    const renderPersonalModal = () => {
        if (!showLeaveModal && !showCheckInModal) return null;
        
        const isCheckIn = showCheckInModal;
        const title = isCheckIn ? "Check In" : "New Request";

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                <div className="bg-white w-full max-w-2xl shadow-2xl rounded-sm overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Header */}
                    <div className="flex justify-between items-center p-5 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                             <div className="bg-[#6264A7] p-1.5 rounded-sm">
                                {isCheckIn ? <MapPin className="text-white w-5 h-5"/> : <FileText className="text-white w-5 h-5"/>}
                             </div>
                             <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                        </div>
                        <button onClick={closePersonalModal} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto space-y-6">
                        {isCheckIn ? (
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                <div className="col-span-2 bg-gray-50 p-3 border border-gray-200 rounded-sm text-center">
                                    <p className="text-xs text-gray-500 uppercase">Detected Location</p>
                                    <p className="text-gray-800 font-mono text-sm mt-1">{gpsData?.lat.toFixed(4)}, {gpsData?.lng.toFixed(4)}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Work Location</label>
                                    <select 
                                        value={locationType} 
                                        onChange={(e) => setLocationType(e.target.value as LocationType)} 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] focus:border-[#6264A7] outline-none"
                                    >
                                        <option value={LocationType.OFFICE}>Office</option>
                                        <option value={LocationType.HOME}>Home</option>
                                        <option value={LocationType.CUSTOMER_SITE}>Customer Site</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Request Type</label>
                                    <select
                                        value={requestType}
                                        onChange={(e) => setRequestType(e.target.value as RequestType)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] focus:border-[#6264A7] outline-none"
                                    >
                                        <option value={RequestType.PERMISSION}>{RequestType.PERMISSION}</option>
                                        <option value={RequestType.LEAVE}>{RequestType.LEAVE}</option>
                                        <option value={RequestType.REGULARIZATION}>{RequestType.REGULARIZATION}</option>
                                        <option value={RequestType.LOCATION_EXCEPTION}>{RequestType.LOCATION_EXCEPTION}</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label>
                                    <div className="relative">
                                        <input 
                                            type="date" 
                                            value={leaveStartDate} 
                                            onChange={(e) => setLeaveStartDate(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] outline-none"
                                        />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Duration</label>
                                    <select 
                                        value={duration} 
                                        onChange={(e) => setDuration(e.target.value)} 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] focus:border-[#6264A7] outline-none"
                                    >
                                        {DURATION_OPTIONS.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Reason / Remarks</label>
                                    <textarea 
                                        value={leaveReason} 
                                        onChange={(e) => setLeaveReason(e.target.value)}
                                        placeholder="Enter reason..." 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm h-24 resize-none focus:ring-1 focus:ring-[#6264A7] outline-none"
                                    ></textarea>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-gray-200 flex justify-end bg-white">
                        <button 
                            onClick={isCheckIn ? confirmCheckIn : submitPersonalRequest}
                            className="bg-[#6264A7] hover:bg-[#51538f] text-white font-semibold py-2 px-8 rounded-[3px] text-sm transition-colors shadow-sm"
                        >
                            {isCheckIn ? "Check In" : "Submit"}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in">
            {localView === 'dashboard' && renderDashboard()}
            {localView === 'directory' && renderDirectory()}
            {localView === 'approvals' && renderApprovals()}
            {localView === 'admin' && renderAdminManagement()}
            {localView === 'reports' && <HRReports />}
            {localView === 'compliance' && renderCompliance()}
            {(localView as any) === 'member_detail' && renderMemberDetail()}
            
            {/* Personal Modal */}
            {renderPersonalModal()}

            {/* Edit Shift Modal */}
            {showShiftModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Edit Shift Details</h3>
                            <button onClick={() => setShowShiftModal(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
                                <input type="text" value={shiftName} onChange={(e) => setShiftName(e.target.value)} className="w-full border-gray-300 rounded-sm p-2" placeholder="e.g. General Shift A" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} className="w-full border-gray-300 rounded-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                    <input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} className="w-full border-gray-300 rounded-sm p-2" />
                                </div>
                            </div>
                            <button onClick={saveShift} className="w-full py-2 bg-indigo-600 text-white font-bold rounded-sm hover:bg-indigo-700">Save Shift</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create New Shift Modal */}
            {showCreateShiftModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Create New Shift Pattern</h3>
                            <button onClick={() => setShowCreateShiftModal(false)}><X size={20} className="text-gray-400"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Shift Name</label>
                                <input type="text" value={newShiftName} onChange={(e) => setNewShiftName(e.target.value)} className="w-full border-gray-300 rounded-sm p-2" placeholder="e.g. Flexible Shift B" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                                    <input type="time" value={newShiftStart} onChange={(e) => setNewShiftStart(e.target.value)} className="w-full border-gray-300 rounded-sm p-2" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                                    <input type="time" value={newShiftEnd} onChange={(e) => setNewShiftEnd(e.target.value)} className="w-full border-gray-300 rounded-sm p-2" />
                                </div>
                            </div>
                            <button onClick={handleCreateShift} disabled={!newShiftName} className="w-full py-2 bg-indigo-600 text-white font-bold rounded-sm hover:bg-indigo-700 disabled:opacity-50">Create Shift Pattern</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HRDashboard;
