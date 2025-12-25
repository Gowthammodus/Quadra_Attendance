
export enum UserRole {
  EMPLOYEE = 'Employee',
  MANAGER = 'Manager',
  HR_ADMIN = 'HR Admin',
}

export enum UserStatus {
  ACTIVE = 'Active',
  BLOCKED = 'Blocked',
}

export enum AttendanceStatus {
  PRESENT = 'Present',
  ABSENT = 'Absent',
  LATE = 'Late',
  ON_LEAVE = 'On Leave',
  WFH = 'Work From Home',
  CHECKED_OUT = 'Checked Out',
}

export enum LocationType {
  OFFICE = 'Office',
  HOME = 'Home',
  CUSTOMER_SITE = 'Customer Site',
  OTHER = 'Other',
}

export enum RequestType {
  LEAVE = 'Leave',
  REGULARIZATION = 'Regularization',
  PERMISSION = 'Permission',
  LOCATION_EXCEPTION = 'Location Exception',
  SHIFT_CHANGE = 'Shift Change',
}

export enum RequestStatus {
  PENDING = 'Pending',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  INFO_REQUESTED = 'Info Requested',
  MANAGER_APPROVED = 'Manager Approved',
}

export interface ShiftConfig {
  name: string;
  startTime: string; // e.g., "09:00"
  endTime: string;   // e.g., "18:00"
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar: string;
  department: string;
  reportingManagerId?: string;
  status?: UserStatus;
  shift?: ShiftConfig;
  leaveBalance: {
    casual: number;
    sick: number;
    earned: number;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  performedBy: string;
  role: UserRole;
}

export interface AttendanceSegment {
  id: string;
  locationType: LocationType;
  durationMinutes: number;
  notes?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // ISO Date
  checkInTime?: string; // ISO String
  checkOutTime?: string; // ISO String
  locationType: LocationType; // Primary location at check-in
  status: AttendanceStatus;
  coordinates?: { lat: number; lng: number };
  notes?: string;
  segments?: AttendanceSegment[];
}

export interface RequestItem {
  id: string;
  userId: string;
  userName: string;
  type: RequestType;
  status: RequestStatus;
  startDate: string;
  endDate?: string;
  reason: string;
  appliedOn: string;
  
  managerNotes?: string;
  employeeResponse?: string;

  regularizationDetails?: {
    checkInTime: string;
    checkOutTime: string;
    location: LocationType;
  };
  permissionDetails?: {
    startTime: string;
    endTime: string;
  };
  locationExceptionDetails?: {
    locationType: LocationType;
    duration?: string;
  };
  shiftChangeDetails?: {
    requestedShift: ShiftConfig;
  };
}

export interface TeamStats {
  total: number;
  present: number;
  wfh: number;
  leave: number;
  absent: number;
}
