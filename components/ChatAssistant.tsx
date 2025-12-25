
import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { sendMessageToGemini } from '../services/geminiService';
import { useApp } from '../AppContext';
import { LocationType, AttendanceSegment } from '../types';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
}

const ChatAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: 'Hi! I can help you check in, check out, or view your leave balance. How can I help?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { checkIn, checkOut, attendanceRecords, currentUser } = useApp();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleFunctionCall = (functionCall: { name: string; args: any }) => {
        console.log("Executing Function:", functionCall.name, functionCall.args);
        
        if (functionCall.name === 'performCheckIn') {
             // Simulate geolocation
            const mockLat = 40.7128; 
            const mockLng = -74.0060;
            let type = LocationType.OFFICE;
            if (functionCall.args.locationType?.toLowerCase().includes('home')) type = LocationType.HOME;
            
            checkIn(type, mockLat, mockLng);
            return `Successfully checked in at ${type}.`;
        }
        
        if (functionCall.name === 'performCheckOut') {
            // Find the active record to calculate duration and create a segment
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
                    notes: functionCall.args.notes || 'Checked out via AI Assistant'
                });
            }

            checkOut(segments);
            return `Successfully checked out.`;
        }
        
        if (functionCall.name === 'getAttendanceStatus') {
             // Calculate stats
             const presentCount = attendanceRecords.filter(a => a.userId === currentUser.id && a.status === 'Present').length;
             return `You have been present for ${presentCount} days this month.`;
        }

        return "I processed that action for you.";
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
             // Convert internal messages to Gemini history format
            const history = messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }));
            
            const response = await sendMessageToGemini(userMsg.text, history);
            
            let replyText = response.text;

            if (response.functionCall) {
                const result = handleFunctionCall(response.functionCall);
                // Optionally, we could feed this back to Gemini to get a natural response, 
                // but for speed/simplicity, we'll append the result or a generic success message.
                if (!replyText) replyText = result;
            }

            const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: replyText || "I've completed that request." };
            setMessages(prev => [...prev, modelMsg]);

        } catch (error) {
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Sorry, something went wrong." }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-blue-700 transition-all hover:scale-105 z-50"
            >
                <Sparkles size={24} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-6 right-6 w-80 md:w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 z-50 overflow-hidden font-sans">
            {/* Header */}
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
                <div className="flex items-center space-x-2">
                    <Sparkles size={18} />
                    <span className="font-semibold">AI Assistant</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="hover:bg-blue-500 p-1 rounded">
                    <X size={18} />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                            msg.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                         <div className="bg-white border border-gray-200 px-4 py-2 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-2">
                            <Loader2 size={14} className="animate-spin text-blue-600" />
                            <span className="text-xs text-gray-500">Thinking...</span>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white border-t border-gray-200">
                <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
                    />
                    <button onClick={handleSend} disabled={!input.trim() || isLoading} className="text-blue-600 disabled:text-gray-400">
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatAssistant;