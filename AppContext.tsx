
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AttendanceRecord, RequestItem, UserRole, AttendanceStatus, LocationType, RequestType, RequestStatus, AttendanceSegment, ShiftConfig, UserStatus, AuditLog } from './types';
import { addDays, format } from 'date-fns';

interface AppContextType {
  currentUser: User;
  users: User[];
  attendanceRecords: AttendanceRecord[];
  requests: RequestItem[];
  activePage: string;
  isLoggedIn: boolean;
  auditLogs: AuditLog[];
  setActivePage: (page: string) => void;
  switchUser: (userId: string) => void;
  login: (role: UserRole) => void;
  logout: () => void;
  checkIn: (locationType: LocationType, lat: number, lng: number) => void;
  checkOut: (segments: AttendanceSegment[]) => void;
  approveRequest: (requestId: string) => void;
  rejectRequest: (requestId: string) => void;
  createRequest: (type: RequestType, startDate: string, reason: string, details?: any) => void;
  updateRequest: (requestId: string, type: RequestType, startDate: string, reason: string, details?: any) => void;
  deleteRequest: (requestId: string) => void;
  requestInformation: (requestId: string, notes: string) => void;
  replyToInfoRequest: (requestId: string, response: string) => void;
  updateUserShift: (userId: string, shift: ShiftConfig) => void;
  toggleUserStatus: (userId: string, status: UserStatus) => void;
  managerApproveShiftChange: (requestId: string) => void;
  finalizeShiftChange: (requestId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock Data Generation
const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    name: 'Alex Johnson', 
    role: UserRole.EMPLOYEE, 
    avatar: 'https://picsum.photos/100/100?random=1', 
    department: 'Engineering', 
    status: UserStatus.ACTIVE,
    shift: { name: 'General Shift A', startTime: '09:00', endTime: '18:00' },
    leaveBalance: { casual: 5, sick: 3, earned: 10 } 
  },
  { 
    id: 'u2', 
    name: 'Sarah Connor', 
    role: UserRole.MANAGER, 
    avatar: 'https://picsum.photos/100/100?random=2', 
    department: 'Engineering', 
    status: UserStatus.ACTIVE,
    reportingManagerId: 'u3', 
    shift: { name: 'General Shift A', startTime: '09:00', endTime: '18:00' },
    leaveBalance: { casual: 8, sick: 2, earned: 15 } 
  },
  { 
    id: 'u3', 
    name: 'Michael Smith', 
    role: UserRole.HR_ADMIN, 
    avatar: 'https://picsum.photos/100/100?random=3', 
    department: 'HR', 
    status: UserStatus.ACTIVE,
    shift: { name: 'Morning Shift', startTime: '08:00', endTime: '17:00' },
    leaveBalance: { casual: 10, sick: 10, earned: 20 } 
  },
  { 
    id: 'u4', 
    name: 'David Lee', 
    role: UserRole.EMPLOYEE, 
    avatar: 'https://picsum.photos/100/100?random=4', 
    department: 'Sales', 
    status: UserStatus.BLOCKED,
    shift: { name: 'General Shift A', startTime: '09:00', endTime: '18:00' },
    leaveBalance: { casual: 0, sick: 0, earned: 2 } 
  },
];

const MOCK_AUDIT_LOGS: AuditLog[] = [
    { id: 'l1', timestamp: format(addDays(new Date(), -1), 'yyyy-MM-dd HH:mm'), action: 'Approve Request', details: 'Approved Leave for Alex Johnson', performedBy: 'Michael Smith', role: UserRole.HR_ADMIN },
    { id: 'l2', timestamp: format(addDays(new Date(), -2), 'yyyy-MM-dd HH:mm'), action: 'Update Shift', details: 'Changed shift for Sarah Connor to 09:00-18:00', performedBy: 'Michael Smith', role: UserRole.HR_ADMIN },
    { id: 'l3', timestamp: format(addDays(new Date(), -5), 'yyyy-MM-dd HH:mm'), action: 'Block User', details: 'Blocked user David Lee due to disciplinary action', performedBy: 'Michael Smith', role: UserRole.HR_ADMIN },
];

const MOCK_REQUESTS: RequestItem[] = [
  { 
      id: 'r1', 
      userId: 'u1', 
      userName: 'Alex Johnson', 
      type: RequestType.PERMISSION, 
      status: RequestStatus.PENDING, 
      startDate: format(new Date(), 'yyyy-MM-dd'), 
      reason: 'Dental appointment followup', 
      appliedOn: format(new Date(), 'yyyy-MM-dd'),
      permissionDetails: { startTime: '14:00', endTime: '16:00' }
  },
  { 
      id: 'r2', 
      userId: 'u1', 
      userName: 'Alex Johnson', 
      type: RequestType.LEAVE, 
      status: RequestStatus.PENDING, 
      startDate: format(addDays(new Date(), 3), 'yyyy-MM-dd'), 
      reason: 'Personal family function', 
      appliedOn: format(new Date(), 'yyyy-MM-dd') 
  },
  { 
      id: 'r3', 
      userId: 'u1', 
      userName: 'Alex Johnson', 
      type: RequestType.REGULARIZATION, 
      status: RequestStatus.PENDING, 
      startDate: format(addDays(new Date(), -2), 'yyyy-MM-dd'), 
      reason: 'Network issue preventing checkout', 
      appliedOn: format(new Date(), 'yyyy-MM-dd'), 
      regularizationDetails: { checkInTime: '09:00', checkOutTime: '18:00', location: LocationType.OFFICE } 
  },
  { 
      id: 'r4', 
      userId: 'u1', 
      userName: 'Alex Johnson', 
      type: RequestType.LOCATION_EXCEPTION, 
      status: RequestStatus.PENDING, 
      startDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'), 
      reason: 'Technician visiting home for repairs', 
      appliedOn: format(new Date(), 'yyyy-MM-dd'),
      locationExceptionDetails: { locationType: LocationType.HOME, duration: 'Full Day' }
  },
];

const INITIAL_ATTENDANCE: AttendanceRecord[] = [
    { id: 'a1', userId: 'u1', date: format(addDays(new Date(), -1), 'yyyy-MM-dd'), checkInTime: format(addDays(new Date(), -1), 'yyyy-MM-dd') + 'T09:00:00', checkOutTime: format(addDays(new Date(), -1), 'yyyy-MM-dd') + 'T18:00:00', locationType: LocationType.OFFICE, status: AttendanceStatus.PRESENT, segments: [
        { id: 's1', locationType: LocationType.OFFICE, durationMinutes: 240, notes: 'Morning Shift' },
        { id: 's2', locationType: LocationType.CUSTOMER_SITE, durationMinutes: 180, notes: 'Client Visit - Alpha Corp' },
        { id: 's3', locationType: LocationType.HOME, durationMinutes: 120, notes: 'Evening Documentation' }
    ] },
    { id: 'a2', userId: 'u2', date: format(new Date(), 'yyyy-MM-dd'), checkInTime: format(new Date(), 'yyyy-MM-dd') + 'T08:55:00', locationType: LocationType.HOME, status: AttendanceStatus.WFH },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(MOCK_USERS[0]);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(INITIAL_ATTENDANCE);
  const [requests, setRequests] = useState<RequestItem[]>(MOCK_REQUESTS);
  const [activePage, setActivePage] = useState<string>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);

  const logAudit = (action: string, details: string) => {
    const newLog: AuditLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: format(new Date(), 'yyyy-MM-dd HH:mm'),
        action,
        details,
        performedBy: currentUser.name,
        role: currentUser.role
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const switchUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
        setCurrentUser(user);
        setActivePage('dashboard');
    }
  };

  const login = (role: UserRole) => {
    const user = users.find(u => u.role === role);
    if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        setActivePage('dashboard');
    }
  };

  const logout = () => {
      setIsLoggedIn(false);
      setActivePage('dashboard');
  };

  const updateUserShift = (userId: string, shift: ShiftConfig) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, shift } : u));
      if (currentUser.id === userId) {
          setCurrentUser(prev => ({ ...prev, shift }));
      }
      const u = users.find(u => u.id === userId);
      logAudit('Update Shift', `Updated shift for ${u?.name || userId} to ${shift.name}`);
  };

  const toggleUserStatus = (userId: string, status: UserStatus) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u));
      const u = users.find(u => u.id === userId);
      logAudit('Change User Status', `Changed status of ${u?.name || userId} to ${status}`);
  };

  const checkIn = (locationType: LocationType, lat: number, lng: number) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const newRecord: AttendanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      date: today,
      checkInTime: new Date().toISOString(),
      locationType,
      status: locationType === LocationType.HOME ? AttendanceStatus.WFH : AttendanceStatus.PRESENT,
      coordinates: { lat, lng },
      segments: []
    };
    setAttendanceRecords([...attendanceRecords, newRecord]);
    logAudit('Check In', `User checked in at ${locationType}`);
  };

  const checkOut = (segments: AttendanceSegment[]) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    setAttendanceRecords(prev => {
        const userRecords = prev.filter(r => r.userId === currentUser.id && r.date === today);
        const activeRecord = userRecords.find(r => !r.checkOutTime);

        if (activeRecord) {
            logAudit('Check Out', `User checked out`);
            return prev.map(record => {
                if (record.id === activeRecord.id) {
                    return { 
                        ...record, 
                        checkOutTime: new Date().toISOString(),
                        segments: segments 
                    };
                }
                return record;
            });
        }
        return prev;
    });
  };

  const approveRequest = (requestId: string) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: RequestStatus.APPROVED } : r));
    const req = requests.find(r => r.id === requestId);
    logAudit('Approve Request', `Approved ${req?.type} request for ${req?.userName}`);
  };

  const rejectRequest = (requestId: string) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: RequestStatus.REJECTED } : r));
    const req = requests.find(r => r.id === requestId);
    logAudit('Reject Request', `Rejected ${req?.type} request for ${req?.userName}`);
  };

  const managerApproveShiftChange = (requestId: string) => {
    setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: RequestStatus.MANAGER_APPROVED } : r));
    const req = requests.find(r => r.id === requestId);
    logAudit('Manager Recommended Shift Change', `Manager approved shift change request for ${req?.userName}. Forwarded to HR.`);
  };

  const finalizeShiftChange = (requestId: string) => {
    const req = requests.find(r => r.id === requestId);
    if (req && req.shiftChangeDetails) {
        updateUserShift(req.userId, req.shiftChangeDetails.requestedShift);
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: RequestStatus.APPROVED } : r));
        logAudit('Finalized Shift Change', `HR finalized shift change for ${req.userName} to ${req.shiftChangeDetails.requestedShift.name}`);
    }
  };

  const requestInformation = (requestId: string, notes: string) => {
     setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: RequestStatus.INFO_REQUESTED, managerNotes: notes } : r));
     const req = requests.find(r => r.id === requestId);
     logAudit('Request Info', `Requested info for ${req?.type} request from ${req?.userName}`);
  };

  const replyToInfoRequest = (requestId: string, response: string) => {
     setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: RequestStatus.PENDING, employeeResponse: response } : r));
     logAudit('Reply to Request Info', `User replied to information request`);
  };

  const createRequest = (type: RequestType, startDate: string, reason: string, details?: any) => {
      const newReq: RequestItem = {
          id: Math.random().toString(36).substr(2, 9),
          userId: currentUser.id,
          userName: currentUser.name,
          type,
          startDate,
          reason,
          status: RequestStatus.PENDING,
          appliedOn: format(new Date(), 'yyyy-MM-dd'),
          regularizationDetails: type === RequestType.REGULARIZATION ? details : undefined,
          permissionDetails: type === RequestType.PERMISSION ? details : undefined,
          locationExceptionDetails: type === RequestType.LOCATION_EXCEPTION ? details : undefined,
          shiftChangeDetails: type === RequestType.SHIFT_CHANGE ? details : undefined
      };
      setRequests([newReq, ...requests]);
      logAudit('Create Request', `Created ${type} request`);
  };

  const updateRequest = (requestId: string, type: RequestType, startDate: string, reason: string, details?: any) => {
      setRequests(prev => prev.map(r => {
          if (r.id === requestId) {
              return {
                  ...r,
                  type,
                  startDate,
                  reason,
                  regularizationDetails: type === RequestType.REGULARIZATION ? details : undefined,
                  permissionDetails: type === RequestType.PERMISSION ? details : undefined,
                  locationExceptionDetails: type === RequestType.LOCATION_EXCEPTION ? details : undefined,
                  shiftChangeDetails: type === RequestType.SHIFT_CHANGE ? details : undefined
              };
          }
          return r;
      }));
      logAudit('Update Request', `Updated request ${requestId}`);
  };

  const deleteRequest = (requestId: string) => {
    setRequests(prev => prev.filter(r => r.id !== requestId));
    logAudit('Delete Request', `Deleted request ${requestId}`);
  };

  return (
    <AppContext.Provider value={{ currentUser, users, attendanceRecords, requests, activePage, isLoggedIn, auditLogs, setActivePage, switchUser, login, logout, checkIn, checkOut, approveRequest, rejectRequest, createRequest, updateRequest, deleteRequest, requestInformation, replyToInfoRequest, updateUserShift, toggleUserStatus, managerApproveShiftChange, finalizeShiftChange }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
