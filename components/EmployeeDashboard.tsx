
import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { 
    MapPin, Clock, CheckCircle, 
    Briefcase, Coffee, FileText, ChevronRight, 
    AlertTriangle, X, Download, Plus, Trash2, Building2, Globe, MessageCircle, ChevronLeft, Filter, Search, Edit, Bell, Calendar as CalendarIcon, MapPinned, AlertCircle
} from 'lucide-react';
import { format, differenceInMinutes, addMonths, isSameMonth } from 'date-fns';
import { LocationType, RequestType, RequestStatus, AttendanceSegment, UserRole, RequestItem, ShiftConfig } from '../types';
import ManagerDashboard from './ManagerDashboard';
import HRDashboard from './HRDashboard';
import { VisualTimeline, AttendanceCalendar, formatDuration } from './SharedComponents';

// Mock DB for location coordinates focused on South India & Maharashtra
const LOCATION_COORDINATES: Record<string, { lat: number, lng: number }> = {
    // Tamil Nadu - Chennai
    'Office-Tamil Nadu-Chennai-Guindy': { lat: 13.0067, lng: 80.2206 },
    'Office-Tamil Nadu-Chennai-T-Nagar': { lat: 13.0418, lng: 80.2341 },
    'Customer-TechCorp-Tamil Nadu-Chennai-Guindy': { lat: 13.0060, lng: 80.2200 },
    
    // Karnataka - Bangalore
    'Office-Karnataka-Bangalore-Koramangala': { lat: 12.9352, lng: 77.6245 },
    'Office-Karnataka-Bangalore-Whitefield': { lat: 12.9698, lng: 77.7500 },
    'Customer-GlobalIndustries-Karnataka-Bangalore-Whitefield': { lat: 12.9700, lng: 77.7510 },

    // Kerala - Kochi
    'Office-Kerala-Kochi-Kakkanad': { lat: 10.0159, lng: 76.3419 },
    
    // Maharashtra - Mumbai
    'Office-Maharashtra-Mumbai-Andheri': { lat: 19.1136, lng: 72.8697 },
    'Office-Maharashtra-Mumbai-Powai': { lat: 19.1176, lng: 72.9060 },

    'Home-Default': { lat: 13.0827, lng: 80.2707 } // Simulated GPS Home (Chennai Center)
};

const EmployeeDashboard: React.FC<{ defaultTab?: 'overview' | 'calendar' | 'requests' }> = ({ defaultTab = 'overview' }) => {
    const { currentUser, attendanceRecords, checkIn, checkOut, createRequest, updateRequest, deleteRequest, replyToInfoRequest, requests, activePage } = useApp();
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Check-In/Out Logic State
    const [isAcquiringLoc, setIsAcquiringLoc] = useState(false);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [showCheckOutModal, setShowCheckOutModal] = useState(false);
    const [gpsData, setGpsData] = useState<{lat: number, lng: number, distance: number, inside: boolean} | null>(null);
    const [locationType, setLocationType] = useState<LocationType>(LocationType.OFFICE);
    
    // Check-In Details State
    const [checkInState, setCheckInState] = useState("Tamil Nadu");
    const [checkInCity, setCheckInCity] = useState("Chennai");
    const [checkInArea, setCheckInArea] = useState("Guindy");
    const [otherAreaText, setOtherAreaText] = useState("");
    const [checkInCompany, setCheckInCompany] = useState("TechCorp");
    
    // Geo Alert State
    const [showGeoAlert, setShowGeoAlert] = useState(false);
    const [geoMismatchDist, setGeoMismatchDist] = useState(0);

    // Request Modals
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [requestSearch, setRequestSearch] = useState("");
    const [requestFilterDate, setRequestFilterDate] = useState("");
    
    // Form Data
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
    const [leaveReason, setLeaveReason] = useState("");
    const [leaveStartDate, setLeaveStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [leaveEndDate, setLeaveEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [requestType, setRequestType] = useState(RequestType.LEAVE); 
    const [duration, setDuration] = useState("Full Day");

    // Shift/Exception specific
    const [selectedShift, setSelectedShift] = useState<string>("General Shift A");
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

    const DURATION_OPTIONS = ["1 hour", "2 hours", "3 hours", "4 hours", "5 hours", "6 hours", "7 hours", "Full Day"];

    // Location Data Options Mapping
    const STATE_CITY_MAP: Record<string, string[]> = {
        "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
        "Karnataka": ["Bangalore", "Mysore", "Hubli"],
        "Kerala": ["Kochi", "Thiruvananthapuram", "Kozhikode"],
        "Maharashtra": ["Mumbai", "Pune", "Nagpur"]
    };

    const CITY_AREA_MAP: Record<string, string[]> = {
        "Chennai": ["Guindy", "T-Nagar", "Adyar", "Others"],
        "Coimbatore": ["Peelamedu", "Gandhipuram", "Others"],
        "Bangalore": ["Koramangala", "Whitefield", "Indiranagar", "Others"],
        "Kochi": ["Kakkanad", "Edappally", "Others"],
        "Mumbai": ["Andheri", "Powai", "Bandra", "Others"],
        "Pune": ["Hinjewadi", "Magarpatta", "Others"]
    };

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Haversine formula to calculate distance in meters
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in metres
    };

    const initiateCheckIn = () => {
        setIsAcquiringLoc(true);
        setTimeout(() => {
            // Simulated detected location: Near Chennai Home
            const mockLat = 13.0830; const mockLng = 80.2710;
            setGpsData({ lat: mockLat, lng: mockLng, distance: 0, inside: true });
            setIsAcquiringLoc(false);
            setShowCheckInModal(true);
        }, 800);
    };

    const handleConfirmCheckIn = (isOverriding: boolean = false) => {
        if (!gpsData) return;

        let dbCoordKey = "";
        const finalArea = checkInArea === "Others" ? otherAreaText : checkInArea;

        if (locationType === LocationType.OFFICE) {
            dbCoordKey = `Office-${checkInState}-${checkInCity}-${finalArea}`;
        } else if (locationType === LocationType.CUSTOMER_SITE) {
            dbCoordKey = `Customer-${checkInCompany}-${checkInState}-${checkInCity}-${finalArea}`;
        } else if (locationType === LocationType.HOME) {
            dbCoordKey = 'Home-Default';
        }

        const dbCoords = LOCATION_COORDINATES[dbCoordKey] || { lat: 0, lng: 0 };
        const distance = calculateDistance(gpsData.lat, gpsData.lng, dbCoords.lat, dbCoords.lng);

        if (distance > 100 && !isOverriding) {
            setGeoMismatchDist(Math.round(distance));
            setShowGeoAlert(true);
            return;
        }

        // Proceed with check in
        checkIn(locationType, gpsData.lat, gpsData.lng);
        
        // If they overrode a geo-fence warning, notify manager by creating an automatic Exception Request
        if (isOverriding) {
            createRequest(
                RequestType.LOCATION_EXCEPTION, 
                format(new Date(), 'yyyy-MM-dd'), 
                `Geo-fence mismatch override. User detected at ${Math.round(distance)}m from ${dbCoordKey}. Area: ${finalArea}`,
                { locationType, duration: 'Immediate Check-in Override' }
            );
        }

        setShowCheckInModal(false);
        setShowGeoAlert(false);
        setOtherAreaText("");
    };

    const initiateCheckOut = () => {
         checkOut([{ id: '1', locationType: LocationType.OFFICE, durationMinutes: 480, notes: 'End of Day' }]);
    };

    const handleSubmitRequest = () => {
        let details: any = { duration };
        if (requestType === RequestType.SHIFT_CHANGE) {
            details = { requestedShift: SHIFT_TEMPLATES.find(s => s.name === selectedShift) };
        } else if (requestType === RequestType.LOCATION_EXCEPTION) {
            details = { locationType: exceptionLocation, duration };
        }

        if (editingRequestId) {
            updateRequest(editingRequestId, requestType, leaveStartDate, leaveReason, details);
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
        setShowLeaveModal(true);
    };

    const closeModal = () => {
        setShowLeaveModal(false);
        setShowCheckInModal(false);
        setShowGeoAlert(false);
        setLeaveReason("");
        setEditingRequestId(null);
        setOtherAreaText("");
    };

    const getNotifications = () => {
        const notifs = [];
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
        return notifs;
    };

    const renderOverview = () => (
        <div className="animate-fade-in space-y-6">
            {currentUser.role === UserRole.HR_ADMIN && <HRDashboard view="dashboard" />}
            {currentUser.role === UserRole.MANAGER && <ManagerDashboard view="dashboard" />}
            
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
                    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                        <div className="space-y-3">
                            <button onClick={() => { setRequestType(RequestType.LEAVE); setShowLeaveModal(true); }} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors text-left">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Request Leave</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                            <button onClick={() => { setRequestType(RequestType.PERMISSION); setShowLeaveModal(true); }} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors text-left">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Request Permission</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                            <button onClick={() => { setRequestType(RequestType.REGULARIZATION); setShowLeaveModal(true); }} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors text-left">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Regularize Attendance</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                            <button onClick={() => { setRequestType(RequestType.LOCATION_EXCEPTION); setShowLeaveModal(true); }} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors text-left">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Request Location Exception</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                            <button onClick={() => { setRequestType(RequestType.SHIFT_CHANGE); setShowLeaveModal(true); }} className="w-full flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50 group transition-colors text-left">
                                <span className="text-sm font-medium text-gray-700 group-hover:text-[#6264A7]">Request Shift Change</span>
                                <ChevronRight size={16} className="text-gray-400 group-hover:text-[#6264A7]"/>
                            </button>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                        <h3 className="font-semibold text-gray-800 mb-4">Leave Balance</h3>
                        <div className="flex justify-between text-center">
                            <div><div className="text-2xl font-bold text-[#6264A7]">{currentUser.leaveBalance.casual}</div><div className="text-xs text-gray-500 uppercase mt-1">Casual</div></div>
                            <div><div className="text-2xl font-bold text-[#6264A7]">{currentUser.leaveBalance.sick}</div><div className="text-xs text-gray-500 uppercase mt-1">Sick</div></div>
                            <div><div className="text-2xl font-bold text-[#6264A7]">{currentUser.leaveBalance.earned}</div><div className="text-xs text-gray-500 uppercase mt-1">Earned</div></div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-md shadow-sm border border-gray-200">
                        <div className="flex items-center space-x-2 mb-4">
                            <Bell size={18} className="text-gray-600"/>
                            <h3 className="font-semibold text-gray-800">Notifications</h3>
                        </div>
                        <div className="space-y-3 overflow-y-auto max-h-[200px] pr-2">
                             {getNotifications().length === 0 ? <p className="text-gray-400 text-sm">No new notifications.</p> : getNotifications().map(n => (
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
                             ))}
                        </div>
                    </div>
                </div>
                </>
            )}
        </div>
    );

    const renderRequestsList = () => {
        const filtered = requests.filter(r => r.userId === currentUser.id && r.reason.toLowerCase().includes(requestSearch.toLowerCase()) && (!requestFilterDate || r.startDate === requestFilterDate));
        return (
            <div className="bg-white h-full flex flex-col shadow-sm border border-gray-200 rounded-md">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                    <div className="flex space-x-2 flex-1 max-w-lg">
                        <div className="relative flex-1"><input type="text" placeholder="Search requests..." value={requestSearch} onChange={(e) => setRequestSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-[#6264A7] focus:border-[#6264A7]"/><Search className="absolute left-2.5 top-2 text-gray-400 w-4 h-4"/></div>
                        <div className="relative"><input type="date" value={requestFilterDate} onChange={(e) => setRequestFilterDate(e.target.value)} className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-[3px] text-sm focus:ring-[#6264A7] focus:border-[#6264A7]"/><CalendarIcon className="absolute left-2.5 top-2 text-gray-400 w-4 h-4"/></div>
                    </div>
                    <button onClick={() => { setEditingRequestId(null); setRequestType(RequestType.LEAVE); setShowLeaveModal(true); }} className="px-4 py-1.5 bg-[#6264A7] text-white text-sm font-medium rounded-[3px] hover:bg-[#51538f] transition-colors">Add Request</button>
                </div>
                <div className="flex bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <div className="flex-1 px-4 py-3">Type</div>
                    <div className="flex-1 px-4 py-3">Date</div>
                    <div className="flex-[2] px-4 py-3">Reason</div>
                    <div className="flex-1 px-4 py-3">Status</div>
                    <div className="w-32 px-4 py-3 text-right">Actions</div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filtered.map(req => (
                        <div key={req.id} className="flex items-center border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm text-gray-700">
                            <div className="flex-1 px-4 py-3 font-medium text-[#6264A7]">{req.type}</div>
                            <div className="flex-1 px-4 py-3">{req.startDate}{req.endDate && req.endDate !== req.startDate ? ` to ${req.endDate}` : ''}</div>
                            <div className="flex-[2] px-4 py-3 text-gray-500 truncate">{req.reason}</div>
                            <div className="flex-1 px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${req.status === RequestStatus.APPROVED ? 'bg-green-100 text-green-800' : req.status === RequestStatus.REJECTED ? 'bg-red-100 text-red-800' : req.status === RequestStatus.MANAGER_APPROVED ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{req.status}</span></div>
                            <div className="w-32 px-4 py-3 text-right flex justify-end space-x-3 text-gray-400">
                                <button onClick={() => handleEditRequest(req)} className="hover:text-[#6264A7] flex items-center text-xs"><Edit size={14} className="mr-1"/> Edit</button>
                                <button onClick={() => deleteRequest(req.id)} className="hover:text-red-600 flex items-center text-xs"><Trash2 size={14} className="mr-1"/> Delete</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderModal = () => {
        if (!showLeaveModal && !showCheckInModal) return null;
        const isCheckIn = showCheckInModal;
        const title = isCheckIn ? "Check In" : (editingRequestId ? "Edit Request" : "New Request");

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
                        <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-6">
                        {isCheckIn ? (
                            <div className="space-y-6">
                                {/* Only Self Check-In Allowed */}
                                <div className="flex items-center space-x-2">
                                    <div className="w-4 h-4 rounded-full border-[5px] border-[#6264A7]"></div>
                                    <span className="text-sm font-semibold text-[#6264A7]">Self Check-In</span>
                                </div>

                                {showGeoAlert ? (
                                    <div className="bg-red-50 border border-red-200 p-4 rounded flex items-start space-x-3 animate-fade-in">
                                        <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={20}/>
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-red-800 uppercase mb-1">Geo-Fence Mismatch</p>
                                            <p className="text-sm text-red-700">
                                                Detected location is approximately <span className="font-bold">{geoMismatchDist} meters</span> away from the selected workplace.
                                            </p>
                                            <p className="text-xs text-red-600 mt-2 font-medium">
                                                * Proceeding will automatically notify your manager for review.
                                            </p>
                                            <div className="flex space-x-3 mt-4">
                                                <button onClick={() => handleConfirmCheckIn(true)} className="px-4 py-1.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 transition-colors">Proceed Anyway</button>
                                                <button onClick={() => setShowGeoAlert(false)} className="px-4 py-1.5 bg-white border border-red-200 text-red-700 text-xs font-bold rounded hover:bg-red-50 transition-colors">Go Back</button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-gray-50 p-3 border border-gray-200 rounded-sm text-center">
                                            <p className="text-xs text-gray-500 uppercase">Detected Coords</p>
                                            <p className="text-gray-800 font-mono text-sm mt-1">{gpsData?.lat.toFixed(4)}, {gpsData?.lng.toFixed(4)}</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Work Location Type</label>
                                                <select 
                                                    value={locationType} 
                                                    onChange={(e) => setLocationType(e.target.value as LocationType)} 
                                                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-[#6264A7] focus:border-[#6264A7] outline-none"
                                                >
                                                    <option value={LocationType.OFFICE}>Office</option>
                                                    <option value={LocationType.CUSTOMER_SITE}>Customer Site</option>
                                                    <option value={LocationType.HOME}>Home</option>
                                                </select>
                                            </div>

                                            {(locationType === LocationType.OFFICE || locationType === LocationType.CUSTOMER_SITE) && (
                                                <>
                                                    {locationType === LocationType.CUSTOMER_SITE && (
                                                        <div className="col-span-2">
                                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Company</label>
                                                            <select value={checkInCompany} onChange={e => setCheckInCompany(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                                                                <option value="TechCorp">TechCorp</option>
                                                                <option value="GlobalIndustries">GlobalIndustries</option>
                                                            </select>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">State</label>
                                                        <select 
                                                            value={checkInState} 
                                                            onChange={e => {
                                                                setCheckInState(e.target.value);
                                                                const firstCity = STATE_CITY_MAP[e.target.value][0];
                                                                setCheckInCity(firstCity);
                                                                setCheckInArea(CITY_AREA_MAP[firstCity][0]);
                                                            }} 
                                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                                        >
                                                            {Object.keys(STATE_CITY_MAP).map(state => (
                                                                <option key={state} value={state}>{state}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">City</label>
                                                        <select 
                                                            value={checkInCity} 
                                                            onChange={e => {
                                                                setCheckInCity(e.target.value);
                                                                setCheckInArea(CITY_AREA_MAP[e.target.value][0]);
                                                            }} 
                                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                                        >
                                                            {STATE_CITY_MAP[checkInState].map(city => (
                                                                <option key={city} value={city}>{city}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2">
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Location Area</label>
                                                        <select 
                                                            value={checkInArea} 
                                                            onChange={e => setCheckInArea(e.target.value)} 
                                                            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                                                        >
                                                            {CITY_AREA_MAP[checkInCity].map(area => (
                                                                <option key={area} value={area}>{area}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {checkInArea === "Others" && (
                                                        <div className="col-span-2 animate-fade-in">
                                                            <label className="block text-xs font-semibold text-gray-500 mb-1">Specify Other Area</label>
                                                            <input 
                                                                type="text" 
                                                                value={otherAreaText}
                                                                onChange={e => setOtherAreaText(e.target.value)}
                                                                placeholder="Enter location area name..."
                                                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-[#6264A7] focus:border-[#6264A7] outline-none"
                                                            />
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-x-8 gap-y-5">
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Request Type</label>
                                    <select value={requestType} onChange={(e) => setRequestType(e.target.value as RequestType)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                                        <option value={RequestType.PERMISSION}>{RequestType.PERMISSION}</option>
                                        <option value={RequestType.LEAVE}>{RequestType.LEAVE}</option>
                                        <option value={RequestType.REGULARIZATION}>{RequestType.REGULARIZATION}</option>
                                        <option value={RequestType.LOCATION_EXCEPTION}>{RequestType.LOCATION_EXCEPTION}</option>
                                        <option value={RequestType.SHIFT_CHANGE}>{RequestType.SHIFT_CHANGE}</option>
                                    </select>
                                </div>
                                {requestType === RequestType.SHIFT_CHANGE ? (
                                    <div className="col-span-2 space-y-4">
                                        <div className="bg-indigo-50 border border-indigo-100 rounded p-3"><p className="text-xs font-semibold text-indigo-700 uppercase mb-1">Current Shift</p><p className="text-sm font-bold text-indigo-900">{currentUser.shift?.name} ({currentUser.shift?.startTime} - {currentUser.shift?.endTime})</p></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Effective Date</label><input type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-[#6264A7] outline-none"/></div>
                                            <div><label className="block text-xs font-semibold text-gray-500 mb-1">New Shift</label><select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">{SHIFT_TEMPLATES.map(s => (<option key={s.name} value={s.name}>{s.name}</option>))}</select></div>
                                        </div>
                                    </div>
                                ) : requestType === RequestType.LOCATION_EXCEPTION ? (
                                    <div className="col-span-2 space-y-4">
                                        <div className="bg-blue-50 border border-blue-100 rounded p-3 flex items-center space-x-3"><MapPinned className="text-blue-600 w-5 h-5"/><div><p className="text-xs font-semibold text-blue-700 uppercase mb-0.5">Location Exception</p><p className="text-sm text-blue-800">Request permission to check-in outside geo-fence.</p></div></div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Target Location</label><select value={exceptionLocation} onChange={(e) => setExceptionLocation(e.target.value as LocationType)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm"><option value={LocationType.HOME}>Home</option><option value={LocationType.CUSTOMER_SITE}>Customer Site</option><option value={LocationType.OTHER}>Other / Outside Fence</option></select></div>
                                            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Duration</label><select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">{DURATION_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></div>
                                        </div>
                                        <div><label className="block text-xs font-semibold text-gray-500 mb-1">Date</label><input type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-[#6264A7] outline-none"/></div>
                                    </div>
                                ) : requestType === RequestType.LEAVE ? (
                                    <><div className="col-span-1"><label className="block text-xs font-semibold text-gray-500 mb-1">From Date</label><input type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-[#6264A7] outline-none"/></div><div className="col-span-1"><label className="block text-xs font-semibold text-gray-500 mb-1">To Date</label><input type="date" value={leaveEndDate} onChange={(e) => setLeaveEndDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-[#6264A7] outline-none"/></div></>
                                ) : (
                                    <><div className="col-span-1"><label className="block text-xs font-semibold text-gray-500 mb-1">Start Date</label><input type="date" value={leaveStartDate} onChange={(e) => setLeaveStartDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-[#6264A7] outline-none"/></div><div className="col-span-1"><label className="block text-xs font-semibold text-gray-500 mb-1">Duration</label><select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">{DURATION_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select></div></>
                                )}
                                <div className="col-span-2">
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Reason / Remarks</label>
                                    <textarea value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} placeholder="Enter reason..." className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-24 resize-none outline-none focus:ring-[#6264A7]"></textarea>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-5 border-t border-gray-200 flex justify-end bg-white">
                        <button 
                            onClick={isCheckIn ? () => handleConfirmCheckIn() : handleSubmitRequest}
                            disabled={isCheckIn && showGeoAlert}
                            className="bg-[#6264A7] hover:bg-[#525491] text-white font-semibold py-2 px-8 rounded-[3px] text-sm transition-colors shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
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
