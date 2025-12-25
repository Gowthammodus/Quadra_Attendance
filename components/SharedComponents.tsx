
import React, { useState } from 'react';
import { AttendanceRecord, LocationType, User } from '../types';
import { format, isSameDay, getDay, differenceInMinutes, endOfMonth, eachDayOfInterval, addDays, addMonths } from 'date-fns';
import { CheckCircle, Calendar, Clock, MapPin, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../AppContext';

export const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
};

export const VisualTimeline: React.FC<{ records: AttendanceRecord[] }> = ({ records }) => {
    const shiftStart = 8; // 8 AM
    const shiftEnd = 20;  // 8 PM
    const totalShiftHours = shiftEnd - shiftStart;

    const getPosition = (dateStr: string) => {
        const d = new Date(dateStr);
        const hours = d.getHours() + d.getMinutes() / 60;
        let pos = ((hours - shiftStart) / totalShiftHours) * 100;
        if (pos < 0) pos = 0;
        if (pos > 100) pos = 100;
        return pos;
    };

    // Sort records by time to render sequentially
    const sortedRecords = [...records].sort((a,b) => new Date(a.checkInTime!).getTime() - new Date(b.checkInTime!).getTime());

    return (
        <div className="mt-8 mb-4">
            <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
                <span>08:00 AM</span>
                <span>02:00 PM</span>
                <span>08:00 PM</span>
            </div>
            <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex">
                {/* Hour Markers */}
                {[...Array(totalShiftHours)].map((_, i) => (
                    <div key={i} className="absolute h-full w-px bg-gray-200" style={{ left: `${(i / totalShiftHours) * 100}%` }}></div>
                ))}
                
                {sortedRecords.map((record, index) => {
                    const checkIn = record.checkInTime;
                    const checkOut = record.checkOutTime || new Date().toISOString();
                    const startPos = getPosition(checkIn!);
                    const endPos = getPosition(checkOut);
                    const width = Math.max(endPos - startPos, 1); // Min width visibility

                    // If segments exist, render them inside the bar
                    if (record.segments && record.segments.length > 0) {
                        return (
                             <div 
                                key={record.id}
                                className="absolute top-1 bottom-1 rounded shadow-sm flex overflow-hidden hover:scale-105 transition-transform z-10 cursor-pointer group"
                                style={{ left: `${startPos}%`, width: `${width}%` }}
                             >
                                 {record.segments.map((seg, idx) => {
                                     // Proportional width of this segment relative to the total session duration
                                     const sessionTotal = record.segments!.reduce((acc, s) => acc + s.durationMinutes, 0);
                                     const segWidth = (seg.durationMinutes / sessionTotal) * 100;
                                     
                                     let bgClass = 'bg-blue-500';
                                     if (seg.locationType === LocationType.CUSTOMER_SITE) bgClass = 'bg-orange-500';
                                     if (seg.locationType === LocationType.HOME) bgClass = 'bg-blue-400';

                                     return (
                                         <div key={idx} className={`${bgClass} h-full border-r border-white/20 relative first:rounded-l last:rounded-r`} style={{ width: `${segWidth}%` }} title={`${seg.locationType}: ${seg.durationMinutes}m`}>
                                         </div>
                                     );
                                 })}
                             </div>
                        );
                    }

                    // Default single color bar if no splits
                    return (
                        <div 
                            key={record.id}
                            className={`absolute top-1 bottom-1 rounded shadow-sm transition-all duration-1000 z-10 ${
                                record.checkOutTime ? 'bg-blue-500' : 'bg-green-500 animate-pulse'
                            }`}
                            style={{ left: `${startPos}%`, width: `${width}%` }}
                            title={record.status}
                        >
                            {!record.checkOutTime && (
                                <div className="absolute right-0 top-0 bottom-0 flex items-center pr-1">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {/* Legend for Segments */}
            {sortedRecords.some(r => r.segments && r.segments.length > 0) && (
                <div className="flex flex-wrap justify-center gap-4 mt-3">
                    <div className="flex items-center text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div> Office</div>
                    <div className="flex items-center text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-orange-500 mr-1"></div> Client Site</div>
                    <div className="flex items-center text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-blue-400 mr-1"></div> WFH</div>
                </div>
            )}
            
            {/* Simple Status Text */}
             <div className="flex justify-between mt-3 text-xs">
                 <div className="text-gray-600 font-medium">
                    {sortedRecords.length > 0 ? (
                        <span className="flex items-center text-green-700"><CheckCircle size={12} className="mr-1"/> First In: {format(new Date(sortedRecords[0].checkInTime!), 'hh:mm a')}</span>
                    ) : <span className="text-gray-400">Not started</span>}
                 </div>
                 <div className="text-gray-600 font-medium">
                     {sortedRecords.length > 0 && sortedRecords[sortedRecords.length-1].checkOutTime ? (
                         <span className="flex items-center text-blue-700"><CheckCircle size={12} className="mr-1"/> Last Out: {format(new Date(sortedRecords[sortedRecords.length-1].checkOutTime!), 'hh:mm a')}</span>
                     ) : sortedRecords.length > 0 ? <span className="text-green-600 font-bold">Active Session</span> : <span className="text-gray-400">--:--</span>}
                 </div>
            </div>
        </div>
    );
};

interface AttendanceCalendarProps {
    records: any[];
    currentDate?: Date;
    onMonthChange?: (date: Date) => void;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({ records, currentDate = new Date(), onMonthChange }) => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const getStatusColor = (date: Date) => {
        const record = records.find(r => isSameDay(new Date(r.date), date));
        if (!record) {
            const day = getDay(date);
            if (day === 0 || day === 6) return 'bg-gray-50 text-gray-300';
            return isSameDay(date, new Date()) ? 'bg-white border-2 border-blue-500 text-blue-700' : 'bg-white text-gray-400 border border-transparent';
        }
        // Check for multiple segments to determine color dominance
        if(record.segments && record.segments.some((s: any) => s.locationType === LocationType.CUSTOMER_SITE)) {
            return 'bg-orange-100 text-orange-700 font-bold border border-orange-200';
        }

        switch (record.status) {
            case 'Present': return 'bg-green-100 text-green-700 font-bold border border-green-200';
            case 'Late': return 'bg-yellow-100 text-yellow-700 font-bold border border-yellow-200';
            case 'Absent': return 'bg-red-100 text-red-700 font-bold border border-red-200';
            case 'Work From Home': return 'bg-blue-100 text-blue-700 font-bold border border-blue-200';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    const handlePrevMonth = () => {
        if (onMonthChange) onMonthChange(addMonths(currentDate, -1));
    };

    const handleNextMonth = () => {
        if (onMonthChange) onMonthChange(addMonths(currentDate, 1));
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-center mb-6">
                {onMonthChange && (
                    <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded-full mr-4 text-gray-500">
                        <ChevronLeft size={20} />
                    </button>
                )}
                <h3 className="font-semibold text-gray-700 flex items-center text-lg">
                    <Calendar className="mr-2 text-blue-500" size={18} /> {format(currentDate, 'MMMM yyyy')}
                </h3>
                {onMonthChange && (
                    <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded-full ml-4 text-gray-500">
                        <ChevronRight size={20} />
                    </button>
                )}
            </div>
            
            <div className="grid grid-cols-7 gap-3 text-center text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div className="grid grid-cols-7 gap-3">
                {days.map(day => (
                    <div 
                        key={day.toISOString()} 
                        className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm cursor-pointer transition-all ${getStatusColor(day)}`}
                    >
                        <span>{format(day, 'd')}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const MyAttendanceHistory: React.FC = () => {
    const { currentUser, attendanceRecords } = useApp();
    const [viewDate, setViewDate] = useState(new Date());

    const myRecords = attendanceRecords
        .filter(r => r.userId === currentUser.id)
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const upcomingShifts = [
        { date: new Date(), label: 'Today' },
        { date: addDays(new Date(), 1), label: 'Tomorrow' },
        { date: addDays(new Date(), 2), label: format(addDays(new Date(), 2), 'EEEE') }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-6">
                <h2 className="text-indigo-900 font-bold text-lg flex items-center">
                    <CalendarDays className="mr-2"/> My Attendance & Shifts
                </h2>
                <p className="text-indigo-700 text-sm mt-1">View your past attendance records and upcoming shift schedule.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Upcoming Shifts Card */}
                <div className="md:col-span-1 bg-white rounded-md shadow-sm border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                        <Clock className="mr-2 text-indigo-500" size={18}/> Upcoming Shifts
                    </h3>
                    <div className="space-y-4">
                        {upcomingShifts.map((day, idx) => {
                            const isWeekend = getDay(day.date) === 0 || getDay(day.date) === 6;
                            return (
                                <div key={idx} className="flex items-center p-3 border border-gray-100 rounded-md bg-gray-50">
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-gray-500 uppercase">{day.label}</p>
                                        <p className="text-sm font-semibold text-gray-800">{format(day.date, 'MMM d')}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-indigo-600">
                                            {isWeekend ? 'Weekly Off' : (currentUser.shift?.name || 'General Shift')}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {isWeekend ? 'Rest Day' : `${currentUser.shift?.startTime || '09:00'} - ${currentUser.shift?.endTime || '18:00'}`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Calendar View */}
                <div className="md:col-span-2">
                    <AttendanceCalendar 
                        records={myRecords} 
                        currentDate={viewDate} 
                        onMonthChange={setViewDate}
                    />
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 font-semibold text-gray-700 flex items-center">
                   <CheckCircle className="mr-2 text-green-600" size={18}/> Attendance Logs
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Shift</th>
                                <th className="px-6 py-4">Check In</th>
                                <th className="px-6 py-4">Check Out</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {myRecords.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-gray-400">No records found.</td></tr>
                            ) : (
                                myRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{format(new Date(record.date), 'EEE, MMM d, yyyy')}</td>
                                        <td className="px-6 py-4 text-gray-500">{currentUser.shift?.name || 'General'}</td>
                                        <td className="px-6 py-4 text-green-700">
                                            {format(new Date(record.checkInTime!), 'hh:mm a')}
                                            {record.locationType && <span className="text-xs text-gray-400 block">{record.locationType}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-blue-700">
                                            {record.checkOutTime ? format(new Date(record.checkOutTime), 'hh:mm a') : '-'}
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {record.checkOutTime ? formatDuration(differenceInMinutes(new Date(record.checkOutTime), new Date(record.checkInTime!))) : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                record.status === 'Present' ? 'bg-green-100 text-green-700' :
                                                record.status.includes('Home') ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {record.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
