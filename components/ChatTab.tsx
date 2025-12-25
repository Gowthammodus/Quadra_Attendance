
import React, { useState, useRef, useEffect } from 'react';
import { Send, MapPin, Clock, ShieldCheck, ChevronRight, Calendar, Check, X, AlertCircle } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { useApp } from '../AppContext';
import { LocationType, AttendanceSegment, UserRole, RequestType } from '../types';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    isCard?: boolean;
    cardData?: any;
    isForm?: boolean;
    formType?: RequestType;
    formStatus?: 'active' | 'submitted' | 'cancelled';
    submittedData?: any; // To show summary after submission
}

// Inline Form Component for Chat
const RequestForm: React.FC<{
    type: RequestType;
    onSubmit: (data: any) => void;
    onCancel: () => void;
}> = ({ type, onSubmit, onCancel }) => {
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    
    // Type specific states
    const [duration, setDuration] = useState('Full Day'); // Leave
    const [startTime, setStartTime] = useState('09:00'); // Permission
    const [endTime, setEndTime] = useState('11:00'); // Permission
    const [checkInTime, setCheckInTime] = useState('09:00'); // Regularization
    const [checkOutTime, setCheckOutTime] = useState('18:00'); // Regularization

    const handleSubmit = () => {
        if (!reason.trim()) {
            alert("Please enter a reason.");
            return;
        }

        const baseData = { startDate, reason };
        let details = {};

        if (type === RequestType.LEAVE) {
            details = { duration };
        } else if (type === RequestType.PERMISSION) {
            details = { startTime, endTime, duration: `${startTime} - ${endTime}` };
        } else if (type === RequestType.REGULARIZATION) {
            details = { checkInTime, checkOutTime, location: LocationType.OFFICE, duration: 'Correction' };
        }

        onSubmit({ ...baseData, details });
    };

    return (
        <div className="bg-white border border-gray-200 rounded-md p-4 shadow-sm w-full max-w-sm mt-2">
            <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-gray-100">
                <div className={`p-1.5 rounded-md ${
                    type === RequestType.LEAVE ? 'bg-orange-100 text-orange-600' :
                    type === RequestType.REGULARIZATION ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                }`}>
                    <Calendar size={16} />
                </div>
                <h4 className="font-semibold text-gray-800 text-sm">{type} Request</h4>
            </div>

            <div className="space-y-3">
                {/* Date Field - Common */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                </div>

                {/* Conditional Fields */}
                {type === RequestType.LEAVE && (
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                        <select 
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
                        >
                            <option>Full Day</option>
                            <option>First Half</option>
                            <option>Second Half</option>
                        </select>
                    </div>
                )}

                {type === RequestType.PERMISSION && (
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
                            <input 
                                type="time" 
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
                            <input 
                                type="time" 
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none"
                            />
                        </div>
                    </div>
                )}

                {type === RequestType.REGULARIZATION && (
                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Correct In</label>
                            <input 
                                type="time" 
                                value={checkInTime}
                                onChange={(e) => setCheckInTime(e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Correct Out</label>
                            <input 
                                type="time" 
                                value={checkOutTime}
                                onChange={(e) => setCheckOutTime(e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none"
                            />
                        </div>
                    </div>
                )}

                {/* Reason Field - Common */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
                    <textarea 
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Enter reason..."
                        rows={2}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                    ></textarea>
                </div>
            </div>

            <div className="flex space-x-2 mt-4 pt-2 border-t border-gray-100">
                <button 
                    onClick={handleSubmit}
                    className="flex-1 bg-[#6264A7] hover:bg-[#525491] text-white text-sm font-medium py-1.5 rounded transition-colors"
                >
                    Submit Request
                </button>
                <button 
                    onClick={onCancel}
                    className="px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-1.5 rounded transition-colors"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

const ChatTab: React.FC = () => {
    const { currentUser, checkIn, checkOut, attendanceRecords, setActivePage, createRequest } = useApp();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Dynamic Welcome Card based on Role
    const getWelcomeCard = (role: UserRole, name: string): any => {
        if (role === UserRole.HR_ADMIN) {
            return {
                title: `Welcome Admin, ${name}!`,
                subtitle: 'Oversee organization-wide attendance and compliance.',
                points: ['Attendance Overview', 'Compliance', 'Shift Management'],
                actions: [
                    { label: 'Check In', action: 'check_in_prompt' },
                    { label: 'Attendance Overview', action: 'go_directory' },
                    { label: 'Check-In/Out Logs', action: 'go_directory' },
                    { label: 'Shift Management', action: 'go_admin' },
                    { label: 'Request Approvals', action: 'go_approvals' },
                    { label: 'Escalation & Blocks', action: 'go_admin' },
                    { label: 'Custom Reports', action: 'go_reports' },
                    { label: 'Compliance & Audit', action: 'go_compliance' }
                ]
            };
        }
        if (role === UserRole.MANAGER) {
            return {
                title: `Welcome Manager, ${name}!`,
                subtitle: 'Here is your team summary and tasks.',
                points: ['View Team Status', 'Pending Approvals', 'Team Reports'],
                actions: [
                    { label: 'Check In', action: 'check_in_prompt' },
                    { label: 'Team Status', action: 'go_team' },
                    { label: 'Approvals', action: 'go_approvals' },
                    { label: 'Reports', action: 'go_reports' },
                    { label: 'Req Leave', action: 'request_leave_prompt' },
                    { label: 'Req Permission', action: 'request_permission_prompt' },
                    { label: 'Regularize', action: 'regularize_prompt' },
                    { label: 'Shift Info', action: 'check_shifts' }
                ]
            };
        }
        // Default: Employee
        return {
            title: `Welcome, ${name}!`,
            subtitle: 'I am your personal attendance assistant. How can I help you today?',
            points: [], 
            actions: [
                { label: 'Check In', action: 'check_in_prompt' },
                { label: 'Request Leave', action: 'request_leave_prompt' },
                { label: 'Req Permission', action: 'request_permission_prompt' },
                { label: 'Regularize', action: 'regularize_prompt' },
                { label: 'Leave Balance', action: 'check_balance' },
                { label: 'Upcoming Shifts', action: 'check_shifts' },
                { label: 'Attendance Logs', action: 'go_history' },
                { label: 'My Requests', action: 'go_requests' }
            ]
        };
    };

    const [messages, setMessages] = useState<Message[]>(() => [{ 
        id: 'welcome', 
        role: 'model', 
        text: '', 
        isCard: true,
        cardData: getWelcomeCard(currentUser.role, currentUser.name)
    }]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const addLocalInteraction = (userText: string, botText: string) => {
        setMessages(prev => [
            ...prev,
            { id: Date.now().toString(), role: 'user', text: userText },
            { id: (Date.now() + 1).toString(), role: 'model', text: botText }
        ]);
    };

    const addFormMessage = (type: RequestType) => {
        setMessages(prev => [
            ...prev,
            { 
                id: Date.now().toString(), 
                role: 'model', 
                text: `Please provide details for your ${type} request:`,
                isForm: true,
                formType: type,
                formStatus: 'active'
            }
        ]);
    };

    const handleFormSubmit = (msgId: string, type: RequestType, data: any) => {
        // 1. Create Request via Context
        createRequest(type, data.startDate, data.reason, data.details);
    
        // 2. Update Message to 'submitted'
        setMessages(prev => prev.map(m => 
            m.id === msgId ? { ...m, formStatus: 'submitted', submittedData: data } : m
        ));
    
        // 3. Add bot confirmation
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: `✅ Your ${type} request for ${data.startDate} has been submitted successfully.`
            }]);
        }, 300);
    };

    const handleFormCancel = (msgId: string) => {
         setMessages(prev => prev.map(m => 
            m.id === msgId ? { ...m, formStatus: 'cancelled' } : m
        ));
         setTimeout(() => {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "Request cancelled."
            }]);
        }, 300);
    };

    const handleAction = (action: string) => {
        switch (action) {
            case 'go_requests':
                setActivePage('requests');
                break;
            case 'go_history':
                setActivePage('history');
                break;
            case 'check_in_prompt':
                handleSend("I want to check in");
                break;
            case 'go_team':
                setActivePage('team');
                break;
            case 'go_approvals':
                setActivePage('approvals');
                break;
            case 'go_reports':
                setActivePage('reports');
                break;
            case 'go_directory':
                setActivePage('global_directory');
                break;
            case 'go_compliance':
                setActivePage('compliance');
                break;
            case 'go_admin':
                setActivePage('admin_management');
                break;
            // New Employee Actions
            case 'check_balance':
                const bal = currentUser.leaveBalance;
                const balMsg = `**Your Leave Balance**\nCasual: ${bal.casual}\nSick: ${bal.sick}\nEarned: ${bal.earned}`;
                addLocalInteraction("Show my leave balance", balMsg);
                break;
            case 'check_shifts':
                const shift = currentUser.shift;
                const shiftMsg = shift 
                    ? `**Upcoming Shift**\n${shift.name}: ${shift.startTime} - ${shift.endTime}`
                    : "You are assigned to the General Shift (09:00 - 18:00).";
                addLocalInteraction("Show my upcoming shifts", shiftMsg);
                break;
            case 'request_leave_prompt':
                addFormMessage(RequestType.LEAVE);
                break;
            case 'request_permission_prompt':
                addFormMessage(RequestType.PERMISSION);
                break;
            case 'regularize_prompt':
                addFormMessage(RequestType.REGULARIZATION);
                break;
            default:
                break;
        }
    };

    const handleFunctionCall = (functionCall: { name: string; args: any }) => {
        if (functionCall.name === 'performCheckIn') {
             const mockLat = 40.7128; 
             const mockLng = -74.0060;
             let type = LocationType.OFFICE;
             if (functionCall.args.locationType?.toLowerCase().includes('home')) type = LocationType.HOME;
             checkIn(type, mockLat, mockLng);
             return `Successfully checked in at ${type}. Time: ${new Date().toLocaleTimeString()}`;
        }
        
        if (functionCall.name === 'performCheckOut') {
            const activeRecord = attendanceRecords.find(r => r.userId === currentUser.id && !r.checkOutTime);
            let segments: AttendanceSegment[] = [];
            if (activeRecord && activeRecord.checkInTime) {
                const startTime = new Date(activeRecord.checkInTime);
                const now = new Date();
                const durationMinutes = Math.max(1, Math.floor((now.getTime() - startTime.getTime()) / 60000));
                segments.push({
                    id: Math.random().toString(36).substr(2, 9),
                    locationType: activeRecord.locationType,
                    durationMinutes: durationMinutes,
                    notes: functionCall.args.notes || 'Bot Checkout'
                });
            }
            checkOut(segments);
            return `Successfully checked out.`;
        }
        
        if (functionCall.name === 'getAttendanceStatus') {
             const presentCount = attendanceRecords.filter(a => a.userId === currentUser.id && a.status === 'Present').length;
             return `You have been present for **${presentCount} days** this month.`;
        }

        return "Done.";
    };

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages.filter(m => !m.isCard && !m.isForm).map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));
            
            const response = await sendMessageToGemini(textToSend, history);
            let replyText = response.text;

            if (response.functionCall) {
                const result = handleFunctionCall(response.functionCall);
                if (!replyText) replyText = result;
                else replyText += `\n\n${result}`;
            }

            const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: replyText || "I've processed that." };
            setMessages(prev => [...prev, modelMsg]);

        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, I encountered an error." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white max-w-4xl mx-auto shadow-sm border-x border-gray-200">
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.isCard ? (
                            <div className="max-w-md w-full bg-white border border-gray-200 rounded shadow-sm overflow-hidden">
                                <div className="h-1 bg-[#6264A7] w-full"></div>
                                <div className="p-4">
                                    <div className="flex items-start space-x-4">
                                        <div className="bg-[#6264A7] p-2 rounded text-white shrink-0">
                                            <ShieldCheck size={24} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-800">{msg.cardData.title}</h3>
                                            <p className="text-gray-500 text-sm mb-3">{msg.cardData.subtitle}</p>
                                        </div>
                                    </div>
                                    
                                    {msg.cardData.image && (
                                        <img src={msg.cardData.image} alt="Hero" className="w-full h-32 object-cover rounded-md mb-4" />
                                    )}

                                    {msg.cardData.points && msg.cardData.points.length > 0 && (
                                        <ul className="space-y-1 mb-4">
                                            {msg.cardData.points.map((p: string, i: number) => (
                                                <li key={i} className="flex items-center text-sm text-gray-700">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>{p}
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <div className={`gap-2 ${msg.cardData.actions.length > 3 ? 'grid grid-cols-2' : 'flex space-x-2'}`}>
                                        {msg.cardData.actions.map((act: any, i: number) => (
                                            <button 
                                                key={i}
                                                onClick={() => handleAction(act.action)}
                                                className={`bg-white border border-gray-300 hover:bg-gray-50 text-[#6264A7] font-semibold py-2 px-3 rounded text-sm transition-colors text-center ${msg.cardData.actions.length <= 3 ? 'flex-1' : ''}`}
                                            >
                                                {act.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : msg.isForm ? (
                            <div className="flex flex-col items-start max-w-[90%]">
                                <div className="flex items-center space-x-2 mb-1">
                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">BOT</div>
                                    <span className="font-semibold text-xs text-gray-700">Attendance Bot</span>
                                </div>
                                <div className="bg-gray-50 border border-gray-100 p-3 rounded-md text-sm text-gray-800 mb-1">
                                    {msg.text}
                                </div>
                                
                                {msg.formStatus === 'active' ? (
                                    <RequestForm 
                                        type={msg.formType!} 
                                        onSubmit={(data) => handleFormSubmit(msg.id, msg.formType!, data)}
                                        onCancel={() => handleFormCancel(msg.id)}
                                    />
                                ) : (
                                    <div className="mt-2 w-full max-w-sm bg-white border border-gray-200 rounded-md p-3 opacity-70">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-600">{msg.formType} Request</span>
                                            {msg.formStatus === 'submitted' ? (
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium flex items-center"><Check size={12} className="mr-1"/> Submitted</span>
                                            ) : (
                                                 <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium flex items-center"><X size={12} className="mr-1"/> Cancelled</span>
                                            )}
                                        </div>
                                        {msg.formStatus === 'submitted' && msg.submittedData && (
                                            <div className="mt-2 text-xs text-gray-500">
                                                <p>Date: {msg.submittedData.startDate}</p>
                                                <p className="truncate">Reason: {msg.submittedData.reason}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={`flex items-start max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${msg.role === 'user' ? 'ml-3 bg-[#6264A7] text-white' : 'mr-3 bg-gray-200 text-gray-600'}`}>
                                    {msg.role === 'user' ? 'ME' : 'BOT'}
                                </div>
                                <div>
                                    <div className={`flex items-center space-x-2 mb-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <span className="font-semibold text-xs text-gray-700">{msg.role === 'user' ? currentUser.name : 'Attendance Bot'}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(parseInt(msg.id) || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                    <div className={`p-3 rounded-md text-sm whitespace-pre-line ${
                                        msg.role === 'user' 
                                        ? 'bg-[#E8EBFA] text-gray-800' 
                                        : 'bg-gray-50 border border-gray-100 text-gray-800'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && <div className="text-xs text-gray-400 ml-12">Bot is typing...</div>}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
                <div className="relative">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a new message"
                        className="w-full border border-gray-300 rounded-[4px] py-2.5 pl-4 pr-12 focus:ring-1 focus:ring-[#6264A7] focus:border-[#6264A7] text-sm"
                    />
                    <button 
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 top-1.5 text-[#6264A7] hover:bg-gray-100 p-1 rounded disabled:opacity-50"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatTab;
