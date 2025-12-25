
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { User } from '../types';

const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an intelligent assistant for an Attendance Management System called "Teams Attendance Pro".
Your goal is to help employees check in/out, view their status, and draft leave requests.
You can also answer policy questions.

Key Policies:
- Office hours are 9:00 AM to 6:00 PM.
- Geo-fencing is active (50m radius).
- 3 consecutive absenses require HR approval.

Always be concise, professional, and helpful.
Do not use emojis in your responses.
If the user asks to perform an action (Check In, Check Out, Leave), use the appropriate tool function.
`;

// Define Tool Functions
const checkInTool: FunctionDeclaration = {
  name: 'performCheckIn',
  description: 'Initiate the check-in process for the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      locationType: { type: Type.STRING, description: 'Type of location: Office, Home, Customer Site' },
    },
    required: ['locationType']
  }
};

const checkOutTool: FunctionDeclaration = {
  name: 'performCheckOut',
  description: 'Initiate the check-out process for the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      notes: { type: Type.STRING, description: 'Optional notes for checking out.' }
    }
  }
};

const getStatusTool: FunctionDeclaration = {
  name: 'getAttendanceStatus',
  description: 'Get the current attendance status summary.',
  parameters: { type: Type.OBJECT, properties: {} }
};

export const sendMessageToGemini = async (
  message: string,
  history: { role: string; parts: { text: string }[] }[]
) => {
  try {
    const ai = getClient();
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        tools: [{ functionDeclarations: [checkInTool, checkOutTool, getStatusTool] }]
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => ({ text: p.text }))
      }))
    });

    const result = await chat.sendMessage({ message });
    
    // Check for function calls
    const call = result.functionCalls?.[0];
    if (call) {
        return {
            text: null,
            functionCall: {
                name: call.name,
                args: call.args
            }
        };
    }

    return { text: result.text, functionCall: null };

  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "I'm having trouble connecting to the AI service right now. Please try again.", functionCall: null };
  }
};
