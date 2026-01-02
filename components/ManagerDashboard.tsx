
import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { Users, AlertTriangle, CheckCircle, Clock, Download, ArrowLeft, History, MapPin, MessageSquare, X, Send, Bell, AlertOctagon, LogIn, LogOut, ChevronLeft, ChevronRight, BarChart3, PieChart as PieChartIcon, Calendar, FileText, ChevronRight as ChevronRightIcon, TrendingUp, Navigation } from 'lucide-react';
import { RequestStatus, RequestType, UserRole, LocationType } from '../types';
import { VisualTimeline, AttendanceCalendar, formatDuration } from './SharedComponents';
import { differenceInMinutes, format, addMonths, isSameMonth } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ManagerDashboardProps {
    view?: 'dashboard' | 'team' | 'approvals' | 'reports';
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ view = 'dashboard' }) => {
    const { currentUser, requests, approveRequest, rejectRequest, requestInformation, users, attendanceRecords, checkIn, checkOut, createRequest, managerApproveShiftChange } = useApp();
    const [localView, setLocalView] = useState(view);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [viewDate, setViewDate] = useState(new Date()); // Track selected month for history

    // --- Personal Attendance State (Manager's own) ---
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isAcquiringLoc, setIsAcquiringLoc] = useState(false);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false); // For personal requests
    const [gpsData, setGpsData] = useState<{lat: number, lng: number, distance: number, inside: boolean} | null>(null);
    const [locationType, setLocationType] = useState<LocationType>(LocationType.OFFICE);
    
    // Personal Request Form State
    const [requestType, setRequestType] = useState(RequestType.LEAVE);
    const [leaveStartDate, setLeaveStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [leaveReason, setLeaveReason] = useState("");
    const [duration, setDuration] = useState("Full Day");

    // Filtering State
    const [teamStatusDate, setTeamStatusDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [approvalFilterDate, setApprovalFilterDate] = useState('');

    // Report Date State
    const now = new Date();
    const startOfMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [reportStart, setReportStart] = useState(format(startOfMonthDate, 'yyyy-MM-dd'));
    const [reportEnd, setReportEnd] = useState(format(endOfMonthDate, 'yyyy-MM-dd'));

    // Request Information Modal State
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
    const [infoNote, setInfoNote] = useState("");

    // Sync prop changes to local state if needed
    React.useEffect(() => {
        setLocalView(view);
    }, [view]);

    // Clock Effect
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Filter requests for Manager (usually their team, here we mock it by role)
    const pendingRequests = requests.filter(r => r.status === RequestStatus.PENDING);
    
    // Quick Stats
    const totalTeam = users.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const presentToday = attendanceRecords.filter(r => r.date === todayStr && (r.status === 'Present' || r.status === 'Work From Home')).length;
    const onLeave = users.length - presentToday; // Simplified logic

    // Manager's Personal Status
    const myTodayRecords = attendanceRecords.filter(r => r.userId === currentUser.id && r.date === todayStr);
    const myActiveRecord = myTodayRecords.find(r => !r.checkOutTime);
    const isCheckedIn = !!myActiveRecord;
    const DURATION_OPTIONS = ["1 hour", "2 hours", "3 hours", "4 hours", "5 hours", "6 hours", "7 hours", "Full Day"];

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
         checkOut([{ id: '1', locationType: LocationType.OFFICE, durationMinutes: 480, notes: 'Manager End of Day' }]);
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

    // --- Manager Actions Handlers ---
    const handleViewHistory = (userId: string) => {
        setSelectedUserId(userId);
        setViewDate(new Date()); // Reset to current month when opening
        setLocalView('member_detail' as any);
    };

    const initiateRequestInfo = (requestId: string) => {
        setSelectedRequestId(requestId);
        setInfoNote("");
        setShowInfoModal(true);
    };

    const submitRequestInfo = () => {
        if (selectedRequestId && infoNote) {
            requestInformation(selectedRequestId, infoNote);
            setShowInfoModal(false);
        }
    };

    const getNotifications = () => {
        const notifs = [];
        
        // 1. Escalations (Simulated for Demo)
        notifs.push({
            id: 'esc-1',
            type: 'escalation',
            title: 'Attendance Escalation',
            message: 'Michael Smith has missed 3 consecutive shifts without approval.',
            time: '08:30 AM',
            urgent: true
        });

        // 2. Missed Shift
        const absentUsers = users.filter(u => !attendanceRecords.some(r => r.userId === u.id && r.date === todayStr));
        absentUsers.forEach(u => {
            notifs.push({
                id: `abs-${u.id}`,
                type: 'missed',
                title: 'Missed Shift Warning',
                message: `${u.name} has not checked in yet.`,
                time: '09:15 AM',
                urgent: false
            });
        });

        // 3. Requests Waiting
        if (pendingRequests.length > 0) {
            notifs.push({
                id: 'req-summary',
                type: 'request',
                title: 'Pending Approvals',
                message: `You have ${pendingRequests.length} requests waiting for action.`,
                time: 'Just now',
                urgent: false
            });
        }

        // 4. Check In/Out Activity
        attendanceRecords.filter(r => r.date === todayStr).forEach(r => {
            const u = users.find(user => user.id === r.userId);
            if (u) {
                notifs.push({
                    id: `ci-${r.id}`,
                    type: 'check-in',
                    title: 'Check-In Update',
                    message: `${u.name} checked in from ${r.locationType}.`,
                    time: format(new Date(r.checkInTime!), 'hh:mm a'),
                    urgent: false
                });
                
                if (r.checkOutTime) {
                    notifs.push({
                        id: `co-${r.id}`,
                        type: 'check-out',
                        title: 'Check-Out Update',
                        message: `${u.name} checked out.`,
                        time: format(new Date(r.checkOutTime), 'hh:mm a'),
                        urgent: false
                    });
                }
            }
        });

        return notifs.sort((a,b) => (a.urgent === b.urgent) ? 0 : a.urgent ? -1 : 1);
    };

    const renderMemberDetail = () => {
        if (!selectedUserId) return null;
        const user = users.find(u => u.id === selectedUserId);
        const allUserRecords = attendanceRecords.filter(r => r.userId === selectedUserId);
        const displayedRecords = allUserRecords
            .filter(r => isSameMonth(new Date(r.date), viewDate))
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const todayRecord = allUserRecords.find(r => r.date === todayStr);

        return (
            <div className="space-y-6">
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setLocalView('team')}
                        className="p-2 bg-white border border-gray-200 rounded-sm text-gray-600 hover:bg-gray-50"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                        <p className="text-sm text-gray-500">Attendance History & Detailed View</p>
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
                             <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                 <div className="font-semibold text-gray-700">Detailed Logs</div>
                                 <div className="flex items-center space-x-4">
                                    <button onClick={() => setViewDate(addMonths(viewDate, -1))} className="p-1 hover:bg-gray-200 rounded"><ChevronLeft size={16}/></button>
                                    <span className="text-sm font-medium text-gray-600 w-24 text-center">{format(viewDate, 'MMMM yyyy')}</span>
                                    <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 hover:bg-gray-200 rounded"><ChevronRight size={16}/></button>
                                 </div>
                             </div>
                             <table className="w-full text-sm text-left">
                                 <thead className="bg-white text-gray-500 font-medium border-b border-gray-100">
                                     <tr>
                                         <th className="px-4 py-3 font-normal">Date</th>
                                         <th className="px-4 py-3 font-normal">Check In</th>
                                         <th className="px-4 py-3 font-normal">Check Out</th>
                                         <th className="px-4 py-3 font-normal">Duration</th>
                                         <th className="px-4 py-3 font-normal">Status</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100">
                                     {displayedRecords.map(record => (
                                         <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                             <td className="px-4 py-3 font-medium text-gray-800">
                                                 {format(new Date(record.date), 'MMM d, yyyy')}
                                             </td>
                                             <td className="px-4 py-3 text-green-700">
                                                 {format(new Date(record.checkInTime!), 'hh:mm a')}
                                             </td>
                                             <td className="px-4 py-3 text-blue-700">
                                                 {record.checkOutTime ? format(new Date(record.checkOutTime), 'hh:mm a') : '-'}
                                             </td>
                                             <td className="px-4 py-3 font-medium">
                                                 {record.checkOutTime ? formatDuration(differenceInMinutes(new Date(record.checkOutTime), new Date(record.checkInTime!))) : '-'}
                                             </td>
                                              <td className="px-4 py-3">
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
                             {displayedRecords.length === 0 && <p className="p-6 text-center text-gray-400">No attendance history found for {format(viewDate, 'MMMM')}.</p>}
                         </div>
                    </div>
                    <div>
                         <AttendanceCalendar records={allUserRecords} currentDate={viewDate} />
                    </div>
                </div>
            </div>
        );
    };

    const renderReports = () => {
        const CHART_DATA = [
            { name: 'Mon', Present: Math.floor(totalTeam * 0.9), Absent: Math.floor(totalTeam * 0.1), Late: 0 },
            { name: 'Tue', Present: Math.floor(totalTeam * 0.8), Absent: Math.floor(totalTeam * 0.2), Late: 1 },
            { name: 'Wed', Present: Math.floor(totalTeam * 0.95), Absent: Math.floor(totalTeam * 0.05), Late: 0 },
            { name: 'Thu', Present: Math.floor(totalTeam * 0.85), Absent: Math.floor(totalTeam * 0.1), Late: 1 },
            { name: 'Fri', Present: Math.floor(totalTeam * 0.7), Absent: Math.floor(totalTeam * 0.3), Late: 2 },
        ];
        const LOCATION_DATA = [
             { name: 'Office', value: 60 },
             { name: 'WFH', value: 30 },
             { name: 'Site', value: 10 },
        ];
        const COLORS = ['#4f46e5', '#6366f1', '#f59e0b'];

        return (
            <div className="space-y-6">
                <div className="bg-white border-b border-gray-200 p-6 rounded-md shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                         <h2 className="text-xl font-bold text-gray-900">Team Analytics Report</h2>
                         <p className="text-sm text-gray-500">Weekly breakdown of attendance and location stats.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        <div className="flex items-center bg-gray-50 p-1.5 rounded-sm border border-gray-200">
                             <div className="px-2 text-gray-500"><Calendar size={14}/></div>
                             <input 
                                type="date" 
                                value={reportStart} 
                                onChange={(e) => setReportStart(e.target.value)}
                                className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 p-1 outline-none"
                            />
                            <span className="text-gray-400 px-1">-</span>
                             <input 
                                type="date" 
                                value={reportEnd} 
                                onChange={(e) => setReportEnd(e.target.value)}
                                className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 p-1 outline-none"
                            />
                        </div>
                        <div className="flex space-x-2">
                            <button className="px-3 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-sm hover:bg-gray-50 flex items-center">
                                <Download size={16} className="mr-2"/> Export CSV
                            </button>
                            <button className="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-sm hover:bg-indigo-700 flex items-center">
                                <Download size={16} className="mr-2"/> Export PDF
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Avg Attendance" value="88%" icon={<BarChart3 size={20} className="text-green-500"/>} trend="+2%" />
                    <StatCard title="Late Arrivals" value="3" icon={<Clock size={20} className="text-orange-500"/>} trend="-1" />
                    <StatCard title="Remote Work" value="30%" icon={<MapPin size={20} className="text-indigo-500"/>} trend="+5%" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-6">Weekly Attendance Trend</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={CHART_DATA}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '4px', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                                    <Legend />
                                    <Bar dataKey="Present" fill="#4f46e5" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="Absent" fill="#ef4444" radius={[2, 2, 0, 0]} />
                                    <Bar dataKey="Late" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-6">Location Distribution</h3>
                        <div className="h-64 flex justify-center items-center">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={LOCATION_DATA} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                                        {LOCATION_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const renderApprovals = () => {
        const filteredPendingRequests = pendingRequests.filter(req => 
            !approvalFilterDate || req.startDate === approvalFilterDate
        );

        return (
            <div className="bg-white rounded-md shadow-sm border border-gray-200 flex flex-col h-full">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div className="flex items-center space-x-4">
                        <h3 className="font-semibold text-gray-800">Pending Requests</h3>
                        <div className="flex items-center bg-white border border-gray-200 rounded-sm px-2 py-1">
                            <Calendar size={14} className="text-gray-400 mr-2"/>
                            <input 
                                type="date" 
                                value={approvalFilterDate}
                                onChange={(e) => setApprovalFilterDate(e.target.value)}
                                className="text-sm border-none focus:ring-0 p-0 outline-none text-gray-600 bg-transparent"
                                placeholder="Filter by Date"
                            />
                        </div>
                    </div>
                    <span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded text-xs font-medium">{filteredPendingRequests.length} Pending</span>
                </div>
                <div className="p-6 overflow-y-auto max-h-[600px]">
                    {filteredPendingRequests.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <CheckCircle className="mx-auto mb-2 opacity-50" size={32} />
                            <p>All caught up! No pending requests {approvalFilterDate ? `for ${approvalFilterDate}` : ''}.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredPendingRequests.map(req => (
                                <div key={req.id} className="border border-gray-200 rounded-md p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h4 className="font-medium text-gray-900">{req.userName}</h4>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                    req.type === RequestType.LEAVE ? 'bg-orange-100 text-orange-700' :
                                                    req.type === RequestType.REGULARIZATION ? 'bg-blue-100 text-blue-700' : 
                                                    req.type === RequestType.LOCATION_EXCEPTION ? 'bg-blue-100 text-blue-700' :
                                                    req.type === RequestType.SHIFT_CHANGE ? 'bg-purple-100 text-purple-700' :
                                                    req.type === RequestType.LATE_CHECKIN || req.type === RequestType.EARLY_CHECKOUT ? 'bg-red-100 text-red-700 border border-red-200' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                    {req.type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mt-1">{req.startDate}</p>
                                            
                                            {/* Feature 3: Enhanced Violation Details */}
                                            {req.violationDetails && (
                                                <div className="mt-3 grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded border border-gray-200">
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Actual Time</p>
                                                        <p className="text-sm font-bold text-red-600">{req.violationDetails.actualTime}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase">Expected</p>
                                                        <p className="text-sm font-bold text-gray-700">{req.violationDetails.expectedTime}</p>
                                                    </div>
                                                    <div className="col-span-2 flex items-start space-x-2 pt-1 border-t border-gray-100 mt-1">
                                                        <Navigation size={12} className="text-gray-400 mt-0.5"/>
                                                        <p className="text-[11px] text-gray-600 italic leading-snug">
                                                            Detected at: {req.violationDetails.location}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="mt-3">
                                                <p className="text-xs text-gray-400 font-bold uppercase mb-1">Reason provided</p>
                                                <p className="text-sm text-gray-700 italic bg-white p-2 rounded border border-gray-100 shadow-inner">"{req.reason}"</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col space-y-2 ml-4 min-w-[120px]">
                                            <button 
                                                onClick={() => req.type === RequestType.SHIFT_CHANGE ? managerApproveShiftChange(req.id) : approveRequest(req.id)}
                                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700 shadow-sm"
                                            >
                                                Approve
                                            </button>
                                            <button 
                                                onClick={() => initiateRequestInfo(req.id)}
                                                className="px-3 py-1.5 bg-white border border-yellow-300 text-yellow-800 text-xs font-bold rounded hover:bg-yellow-50"
                                            >
                                                Request Info
                                            </button>
                                            <button 
                                                onClick={() => rejectRequest(req.id)}
                                                className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-bold rounded hover:bg-gray-50"
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
    };

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

    const renderTeamList = () => (
        <div className="bg-white rounded-md shadow-sm border border-gray-200 p-6">
             <div className="flex justify-between items-center mb-4">
                <div className="flex items-center space-x-4">
                    <h3 className="font-semibold text-gray-800">Team Status</h3>
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-sm px-2 py-1">
                        <Calendar size={14} className="text-gray-400 mr-2"/>
                        <input 
                            type="date" 
                            value={teamStatusDate} 
                            onChange={(e) => setTeamStatusDate(e.target.value)}
                            className="bg-transparent border-none text-sm text-gray-700 focus:ring-0 p-0 outline-none"
                        />
                    </div>
                </div>
                <button className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-sm hover:bg-gray-200 flex items-center">
                    <Download size={14} className="mr-2" /> Export Report
                </button>
             </div>
             <ul className="divide-y divide-gray-100">
                {users.map(u => {
                    const record = attendanceRecords.find(r => r.userId === u.id && r.date === teamStatusDate);
                    const status = record ? record.status : 'Absent/Not Checked In';
                    
                    return (
                        <li key={u.id} className="flex items-center justify-between py-4 group">
                            <div className="flex items-center space-x-3">
                                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{u.name}</p>
                                    <p className="text-xs text-gray-500">{u.department}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    status === 'Present' ? 'bg-green-100 text-green-800' :
                                    status.includes('Home') ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {status}
                                </span>
                                
                                {localView === 'team' && (
                                    <button 
                                        onClick={() => handleViewHistory(u.id)}
                                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                        title="View History"
                                    >
                                        <History size={18} />
                                    </button>
                                )}
                            </div>
                        </li>
                    );
                })}
             </ul>
        </div>
    );

    const renderDashboard = () => (
        <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-6">
                <h2 className="text-indigo-900 font-bold text-lg">
                    Manager Overview: <span className="font-normal text-indigo-700">Team performance and approvals.</span>
                </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Team" value={totalTeam} icon={<Users size={20} className="text-indigo-500"/>} trend="+2 new" />
                <StatCard title="Present Today" value={presentToday} icon={<CheckCircle size={20} className="text-green-500"/>} trend="92% Rate" />
                <StatCard title="On Leave" value={onLeave} icon={<Clock size={20} className="text-orange-500"/>} trend="Low" />
                <StatCard title="Pending Approvals" value={pendingRequests.length} icon={<AlertTriangle size={20} className="text-sky-500"/>} trend="Action Needed" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {renderApprovals()}
                </div>
                <div className="space-y-6">
                    {renderNotifications()}
                    {renderTeamList()}
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

    const renderPersonalModal = () => {
        if (!showLeaveModal && !showCheckInModal) return null;
        const isCheckIn = showCheckInModal;
        const title = isCheckIn ? "Check In" : "New Request";

        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                <div className="bg-white w-full max-w-2xl shadow-2xl rounded-sm overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="flex justify-between items-center p-5 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                             <div className="bg-[#6264A7] p-1.5 rounded-sm">
                                {isCheckIn ? <MapPin className="text-white w-5 h-5"/> : <FileText className="text-white w-5 h-5"/>}
                             </div>
                             <h3 className="text-xl font-bold text-gray-800">{title}</h3>
                        </div>
                        <button onClick={closePersonalModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-6">
                        {isCheckIn ? (
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                <div className="col-span-2 bg-gray-50 p-3 border border-gray-200 rounded-sm text-center">
                                    <p className="text-xs text-gray-500 uppercase">Detected Location</p>
                                    <p className="text-gray-800 font-mono text-sm mt-1">{gpsData?.lat.toFixed(4)}, {gpsData?.lng.toFixed(4)}</p>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Work Location</label>
                                    <select value={locationType} onChange={(e) => setLocationType(e.target.value as LocationType)} className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] outline-none">
                                        <option value={LocationType.OFFICE}>Office</option>
                                        <option value={LocationType.HOME}>Home</option>
                                        <option value={LocationType.CUSTOMER_SITE}>Customer Site</option>
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-500 mb-1">Request Type</label><select value={requestType} onChange={(e) => setRequestType(e.target.value as RequestType)} className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] outline-none"><option value={RequestType.PERMISSION}>{RequestType.PERMISSION}</option><option value={RequestType.LEAVE}>{RequestType.LEAVE}</option><option value={RequestType.REGULARIZATION}>{RequestType.REGULARIZATION}</option><option value={RequestType.LOCATION_EXCEPTION}>{RequestType.LOCATION_EXCEPTION}</option></select></div>
                                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label><div className="relative"><input type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] outline-none"/></div></div>
                                <div><label className="block text-xs font-semibold text-gray-500 mb-1">Duration</label><select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] outline-none">{DURATION_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></div>
                                <div className="col-span-2"><label className="block text-xs font-semibold text-gray-500 mb-1">Reason / Remarks</label><textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Enter reason..." className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm h-24 resize-none focus:ring-1 focus:ring-[#6264A7] outline-none"></textarea></div>
                            </div>
                        )}
                    </div>
                    <div className="p-5 border-t border-gray-200 flex justify-end bg-white">
                        <button onClick={isCheckIn ? confirmCheckIn : submitPersonalRequest} className="bg-[#6264A7] hover:bg-[#51538f] text-white font-semibold py-2 px-8 rounded-[3px] text-sm transition-colors shadow-sm">
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
            {localView === 'team' && renderTeamList()}
            {localView === 'approvals' && renderApprovals()}
            {localView === 'reports' && renderReports()}
            {(localView as any) === 'member_detail' && renderMemberDetail()}
            {renderPersonalModal()}
            {showInfoModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <MessageSquare className="mr-2 text-yellow-600" size={20}/> Request More Information
                            </h3>
                            <button onClick={() => setShowInfoModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                This will send the request back to the employee with your note. The status will update to "Info Requested".
                            </p>
                            <textarea
                                value={infoNote}
                                onChange={(e) => setInfoNote(e.target.value)}
                                className="w-full border-gray-300 rounded-sm p-2.5 bg-gray-50 text-sm focus:ring-yellow-500 focus:border-yellow-500 outline-none"
                                rows={4}
                                placeholder="e.g. Please explain why you need to leave early, or provide proof of appointment."
                            ></textarea>
                            <div className="flex justify-end space-x-3">
                                <button onClick={() => setShowInfoModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-sm text-sm font-medium">Cancel</button>
                                <button 
                                    onClick={submitRequestInfo}
                                    disabled={!infoNote.trim()}
                                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-sm text-sm font-medium disabled:opacity-50 flex items-center"
                                >
                                    <Send size={14} className="mr-1"/> Send Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard: React.FC<{title: string, value: number | string, icon: React.ReactNode, trend: string}> = ({ title, value, icon, trend }) => (
    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        </div>
        <div className="mt-4 text-xs text-gray-500">
            <span className="text-green-600 font-medium">{trend}</span> vs last week
        </div>
    </div>
);

export default ManagerDashboard;
