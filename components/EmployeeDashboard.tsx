
import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { 
    MapPin, Clock, CheckCircle, 
    Briefcase, Coffee, FileText, ChevronRight, 
    AlertTriangle, X, Download, Plus, Trash2, Building2, Globe, MessageCircle, ChevronLeft, Filter, Search, Edit, Bell, Calendar as CalendarIcon, MapPinned
} from 'lucide-react';
import { format, differenceInMinutes, addMonths, isSameMonth } from 'date-fns';
import { LocationType, RequestType, RequestStatus, AttendanceSegment, UserRole, RequestItem, ShiftConfig } from '../types';
import ManagerDashboard from './ManagerDashboard';
import HRDashboard from './HRDashboard';
import { VisualTimeline, AttendanceCalendar, formatDuration } from './SharedComponents';

const EmployeeDashboard: React.FC<{ defaultTab?: 'overview' | 'calendar' | 'requests' }> = ({ defaultTab = 'overview' }) => {
    const { currentUser, attendanceRecords, checkIn, checkOut, createRequest, updateRequest, deleteRequest, replyToInfoRequest, requests, activePage } = useApp();
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Check-In/Out Logic State
    const [isAcquiringLoc, setIsAcquiringLoc] = useState(false);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showCheckOutModal, setShowCheckOutModal] = useState(false);
    const [gpsData, setGpsData] = useState<{lat: number, lng: number, distance: number, inside: boolean} | null>(null);
    const [locationType, setLocationType] = useState<LocationType>(LocationType.OFFICE);
    const [locationReason, setLocationReason] = useState("");
    const [splitSegments, setSplitSegments] = useState<AttendanceSegment[]>([]);

    // Request Modals
    const [showNewRequestModal, setShowNewRequestModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [requestSearch, setRequestSearch] = useState("");
    const [requestFilterDate, setRequestFilterDate] = useState("");
    
    // Form Data
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
    const [leaveReason, setLeaveReason] = useState("");
    const [leaveStartDate, setLeaveStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [leaveEndDate, setLeaveEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [requestType, setRequestType] = useState(RequestType.LEAVE); // For unified modal
    const [duration, setDuration] = useState("Full Day");

    // Shift Change specific
    const [selectedShift, setSelectedShift] = useState<string>("General Shift A");

    // Location Exception specific
    const [exceptionLocation, setExceptionLocation] = useState<LocationType>(LocationType.HOME);

    const SHIFT_TEMPLATES: ShiftConfig[] = [
        { name: 'General Shift A', startTime: '09:00', endTime: '18:00' },
        { name: 'Morning Shift', startTime: '07:00', endTime: '16:00' },
        { name: 'Night Shift', startTime: '22:00', endTime: '07:00' },
    ];

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayRecords = attendanceRecords.filter(r => r.userId === currentUser.id && r.date === todayStr);
    const activeRecord = todayRecords.find(r => !r.checkOutTime);
    const isCheckedIn = !!activeRecord;

    const DURATION_OPTIONS = [
        "1 hour", "2 hours", "3 hours", "4 hours", 
        "5 hours", "6 hours", "7 hours", "Full Day"
    ];

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Action Handlers
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
         // Simplified checkout for demo
         checkOut([{ id: '1', locationType: LocationType.OFFICE, durationMinutes: 480, notes: 'End of Day' }]);
    };

    const handleSubmitRequest = () => {
        let details: any = { duration };
        
        if (requestType === RequestType.SHIFT_CHANGE) {
            const shift = SHIFT_TEMPLATES.find(s => s.name === selectedShift);
            details = { requestedShift: shift };
        } else if (requestType === RequestType.LOCATION_EXCEPTION) {
            details = { locationType: exceptionLocation, duration };
        }

        const payload: any = {
            startDate: leaveStartDate,
            reason: leaveReason,
        };

        if (requestType === RequestType.LEAVE) {
            payload.endDate = leaveEndDate;
        }

        if (editingRequestId) {
            updateRequest(editingRequestId, requestType, leaveStartDate, leaveReason, details);
            // AppContext updateRequest doesn't currently support endDate as a separate param, so we might need to adjust details or common fields
            // For now, let's stick to existing Context API and assume startDate/endDate are handled in standard Leave logic
        } else {
            createRequest(requestType, leaveStartDate, leaveReason, details);
        }
        closeModal();
    };

    const handleEditRequest = (req: RequestItem) => {
        setEditingRequestId(req.id);
        setRequestType(req.type);
        setLeaveStartDate(req.startDate);
        setLeaveEndDate(req.endDate || req.startDate);
        setLeaveReason(req.reason);
        
        // Try to extract duration from details if present
        let d = "Full Day";
        const det: any = req.permissionDetails || req.regularizationDetails || req.locationExceptionDetails;
        if (det && det.duration) {
            d = det.duration;
        }
        setDuration(d);

        if (req.type === RequestType.SHIFT_CHANGE && req.shiftChangeDetails) {
            setSelectedShift(req.shiftChangeDetails.requestedShift.name);
        }

        if (req.type === RequestType.LOCATION_EXCEPTION && req.locationExceptionDetails) {
            setExceptionLocation(req.locationExceptionDetails.locationType);
        }

        setShowLeaveModal(true);
    };

    const handleDeleteRequest = (id: string) => {
        if (window.confirm("Are you sure you want to delete this request?")) {
            deleteRequest(id);
        }
    };

    const closeModal = () => {
        setShowLeaveModal(false);
        setShowCheckInModal(false);
        // Reset Form
        setLeaveReason("");
        setDuration("Full Day");
        setEditingRequestId(null);
        setLeaveStartDate(format(new Date(), 'yyyy-MM-dd'));
        setLeaveEndDate(format(new Date(), 'yyyy-MM-dd'));
    };

    const getNotifications = () => {
        const notifs = [];
        
        // Recent Requests Updates
        const recentRequests = requests
            .filter(r => r.userId === currentUser.id && r.status !== RequestStatus.PENDING && r.status !== RequestStatus.MANAGER_APPROVED)
            .sort((a,b) => new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime())
            .slice(0, 3);
            
        recentRequests.forEach(r => {
            notifs.push({
                id: r.id,
                title: `Request ${r.status}`,
                message: `Your ${r.type} request was ${r.status.toLowerCase()}.`,
                time: r.appliedOn,
                type: r.status === 'Approved' ? 'success' : 'error'
            });
        });

        // Shift Info
        if (currentUser.shift) {
            notifs.push({
                id: 'shift-info',
                title: 'Upcoming Shift',
                message: `Shift: ${currentUser.shift.name} (${currentUser.shift.startTime} - ${currentUser.shift.endTime})`,
                time: 'Today',
                type: 'info'
            });
        }

        return notifs;
    };

    // Render Logic
    
    const renderOverview = () => (
        <div className="animate-fade-in space-y-6">
            {/* If user is HR/Manager, render their dashboard content here */}
            {currentUser.role === UserRole.HR_ADMIN && <HRDashboard view="dashboard" />}
            {currentUser.role === UserRole.MANAGER && <ManagerDashboard view="dashboard" />}
            
            {/* Employee Specific Content */}
            {currentUser.role === UserRole.EMPLOYEE && (
                <>
                <div className="bg-white p-8 rounded-md shadow-sm border border-gray-200 text-center relative overflow-hidden">
                    <div className="h-1 bg-[#6264A7] absolute top-0 left-0 w-full"></div>
                    <h2 className="text-4xl font-light text-gray-800 mb-1">{format(currentTime, 'hh:mm a')}</h2>
                    <p className="text-gray-500 mb-8">{format(currentTime, 'EEEE, MMMM d, yyyy')}</p>
                    
                    {isCheckedIn ? (
                        <div className="max-w-xs mx-auto">
                            <div className="flex items-center justify-center text-green-600 mb-4 bg-green-50 py-2 rounded">
                                <CheckCircle size={18} className="mr-2"/> Checked In at {format(new Date(activeRecord!.checkInTime!), 'hh:mm a')}
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Quick Actions */}
                    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button onClick={() => { setRequestType(RequestType.LEAVE); setShowLeaveModal(true); }} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Request Leave</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                            <button onClick={() => { setRequestType(RequestType.PERMISSION); setShowLeaveModal(true); }} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Request Permission</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                            <button onClick={() => { setRequestType(RequestType.REGULARIZATION); setShowLeaveModal(true); }} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Regularize Attendance</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                            <button onClick={() => { setRequestType(RequestType.LOCATION_EXCEPTION); setShowLeaveModal(true); }} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Request Location Exception</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                            <button onClick={() => { setRequestType(RequestType.SHIFT_CHANGE); setShowLeaveModal(true); }} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Request Shift Change</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                        </div>
                    </div>

                    {/* Leave Balance */}
                    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Leave Balance</h3>
                        <div className="flex justify-between text-center">
                            <div><div className="text-2xl font-bold text-[#6264A7]">{currentUser.leaveBalance.casual}</div><div className="text-xs text-gray-500 uppercase mt-1">Casual</div></div>
                            <div><div className="text-2xl font-bold text-[#6264A7]">{currentUser.leaveBalance.sick}</div><div className="text-xs text-gray-500 uppercase mt-1">Sick</div></div>
                            <div><div className="text-2xl font-bold text-[#6264A7]">{currentUser.leaveBalance.earned}</div><div className="text-xs text-gray-500 uppercase mt-1">Earned</div></div>
                        </div>
                    </div>

                    {/* Notifications Section */}
                    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                        <div className="flex items-center space-x-2 mb-4">
                            <Bell size={18} className="text-gray-600"/>
                            <h3 className="font-semibold text-gray-800">Notifications</h3>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[200px] pr-2">
                             {getNotifications().length === 0 ? (
                                <p className="text-gray-400 text-sm">No new notifications.</p>
                             ) : (
                                 getNotifications().map(n => (
                                     <div key={n.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded border border-gray-100">
                                         <div className={`mt-0.5 p-1 rounded-full ${n.type === 'success' ? 'bg-green-100 text-green-600' : n.type === 'error' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {n.type === 'success' ? <CheckCircle size={12}/> : n.type === 'error' ? <X size={12}/> : <Clock size={12}/>}
                                         </div>
                                         <div className="flex-1">
                                             <div className="flex justify-between">
                                                 <p className="text-sm font-medium text-gray-800">{n.title}</p>
                                                 <span className="text-[10px] text-gray-400">{n.time}</span>
                                             </div>
                                             <p className="text-xs text-gray-500 leading-tight">{n.message}</p>
                                         </div>
                                     </div>
                                 ))
                             )}
                        </div>
                    </div>
                </div>
                </>
            )}
        </div>
    );

    const renderRequestsList = () => {
        // Matches PDF Page 25 "My visitor requests tab"
        const filtered = requests.filter(r => 
            r.userId === currentUser.id && 
            r.reason.toLowerCase().includes(requestSearch.toLowerCase()) &&
            (!requestFilterDate || r.startDate === requestFilterDate)
        );

        return (
            <div className="bg-white h-full flex flex-col shadow-sm border border-gray-200 rounded-md">
                {/* Header Actions */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                    <div className="flex space-x-2 flex-1 max-w-lg">
                        <div className="relative flex-1">
                             <input 
                                type="text" 
                                placeholder="Search requests..." 
                                value={requestSearch}
                                onChange={(e) => setRequestSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-[#6264A7] focus:border-[#6264A7]"
                             />
                             <Search className="absolute left-2.5 top-2 text-gray-400 w-4 h-4"/>
                        </div>
                        <div className="relative">
                            <input 
                                type="date"
                                value={requestFilterDate}
                                onChange={(e) => setRequestFilterDate(e.target.value)}
                                className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-[#6264A7] focus:border-[#6264A7]"
                            />
                             <CalendarIcon className="absolute left-2.5 top-2 text-gray-400 w-4 h-4"/>
                        </div>
                    </div>
                    <div className="flex space-x-2">
                        <button 
                            onClick={() => { setEditingRequestId(null); setRequestType(RequestType.LEAVE); setShowLeaveModal(true); }}
                            className="px-4 py-1.5 bg-[#6264A7] text-white text-sm font-medium rounded-[3px] hover:bg-[#51538f] transition-colors"
                        >
                            Add Request
                        </button>
                    </div>
                </div>

                {/* Table Header */}
                <div className="flex bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <div className="flex-1 px-4 py-3">Type</div>
                    <div className="flex-1 px-4 py-3">Date</div>
                    <div className="flex-[2] px-4 py-3">Reason</div>
                    <div className="flex-1 px-4 py-3">Status</div>
                    <div className="w-32 px-4 py-3 text-right">Actions</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto">
                    {filtered.map(req => (
                        <div key={req.id} className="flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm text-gray-700">
                            <div className="flex-1 px-4 py-3 font-medium text-[#6264A7]">{req.type}</div>
                            <div className="flex-1 px-4 py-3">{req.startDate}{req.endDate && req.endDate !== req.startDate ? ` to ${req.endDate}` : ''}</div>
                            <div className="flex-[2] px-4 py-3 text-gray-500 truncate">{req.reason}</div>
                            <div className="flex-1 px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-800' :
                                    req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-800' :
                                    req.status === RequestStatus.MANAGER_APPROVED ? 'bg-blue-100 text-blue-800' :
                                    'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {req.status}
                                </span>
                            </div>
                            <div className="w-32 px-4 py-3 text-right flex justify-end space-x-3 text-gray-400">
                                <button onClick={() => handleEditRequest(req)} className="hover:text-[#6264A7] flex items-center text-xs"><Edit size={14} className="mr-1"/> Edit</button>
                                <button onClick={() => handleDeleteRequest(req.id)} className="hover:text-red-600 flex items-center text-xs"><Trash2 size={14} className="mr-1"/> Delete</button>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && <div className="p-8 text-center text-gray-400">No requests found</div>}
                </div>
            </div>
        );
    };

    // --- Task Module Modal (Matches PDF Page 12) ---
    const renderModal = () => {
        if (!showLeaveModal && !showCheckInModal) return null;
        
        const isCheckIn = showCheckInModal;
        const title = isCheckIn ? "Check In" : (editingRequestId ? "Edit Request" : "New Request");

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
                        <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto space-y-6">
                        {/* Toggle Self/On Behalf (Visual Only) */}
                        <div className="flex items-center space-x-6">
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="w-4 h-4 rounded-full border-[5px] border-[#6264A7]"></div>
                                <span className="text-sm font-medium text-gray-700">Self</span>
                            </label>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <div className="w-4 h-4 rounded-full border border-gray-300"></div>
                                <span className="text-sm font-medium text-gray-500">On Behalf</span>
                            </label>
                        </div>

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
                                        <option value={RequestType.SHIFT_CHANGE}>{RequestType.SHIFT_CHANGE}</option>
                                    </select>
                                </div>
                                
                                {requestType === RequestType.SHIFT_CHANGE ? (
                                    <div className="col-span-2 space-y-4">
                                        <div className="bg-indigo-50 border border-indigo-100 rounded p-3">
                                            <p className="text-xs font-semibold text-indigo-700 uppercase mb-1">Current Shift</p>
                                            <p className="text-sm font-bold text-indigo-900">{currentUser.shift?.name} ({currentUser.shift?.startTime} - {currentUser.shift?.endTime})</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Effective Date</label>
                                                <input 
                                                    type="date" 
                                                    value={leaveStartDate} 
                                                    onChange={(e) => setLeaveStartDate(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">New Requested Shift</label>
                                                <select 
                                                    value={selectedShift}
                                                    onChange={(e) => setSelectedShift(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] focus:border-[#6264A7] outline-none"
                                                >
                                                    {SHIFT_TEMPLATES.map(s => (
                                                        <option key={s.name} value={s.name}>{s.name} ({s.startTime} - {s.endTime})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ) : requestType === RequestType.LOCATION_EXCEPTION ? (
                                    <div className="col-span-2 space-y-4">
                                        <div className="bg-blue-50 border border-blue-100 rounded p-3 flex items-center space-x-3">
                                            <MapPinned className="text-blue-600 w-5 h-5"/>
                                            <div>
                                                <p className="text-xs font-semibold text-blue-700 uppercase mb-0.5">Location Exception</p>
                                                <p className="text-sm text-blue-800">Request permission to check-in outside geo-fence.</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Target Location</label>
                                                <select 
                                                    value={exceptionLocation}
                                                    onChange={(e) => setExceptionLocation(e.target.value as LocationType)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] outline-none"
                                                >
                                                    <option value={LocationType.HOME}>Home</option>
                                                    <option value={LocationType.CUSTOMER_SITE}>Customer Site</option>
                                                    <option value={LocationType.OTHER}>Other / Outside Fence</option>
                                                </select>
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
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                                            <input 
                                                type="date" 
                                                value={leaveStartDate} 
                                                onChange={(e) => setLeaveStartDate(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] outline-none"
                                            />
                                        </div>
                                    </div>
                                ) : requestType === RequestType.LEAVE ? (
                                    <>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">From Date</label>
                                            <input 
                                                type="date" 
                                                value={leaveStartDate} 
                                                onChange={(e) => setLeaveStartDate(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 mb-1">To Date</label>
                                            <input 
                                                type="date" 
                                                value={leaveEndDate} 
                                                onChange={(e) => setLeaveEndDate(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-[3px] px-3 py-2 text-sm focus:ring-1 focus:ring-[#6264A7] outline-none"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
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
                                    </>
                                )}

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
                            onClick={isCheckIn ? confirmCheckIn : handleSubmitRequest}
                            className="bg-[#6264A7] hover:bg-[#51538f] text-white font-semibold py-2 px-8 rounded-[3px] text-sm transition-colors shadow-sm"
                        >
                            {isCheckIn ? "Check In" : (editingRequestId ? "Update" : "Submit")}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {activePage === 'dashboard' && renderOverview()}
            {activePage === 'requests' && renderRequestsList()}
            {renderModal()}
        </>
    );
};

export default EmployeeDashboard;
