
import { GoogleGenAI, Type, Chat, Modality, FunctionCallingConfigMode } from "@google/genai";
import { ChatMode } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

const LOAD_TOOLS = [{
  functionDeclarations: [{
    name: 'addLoadItem',
    description: 'Add a new electrical load to the solar system based on product specifications.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Model/Name of the device' },
        category: { type: Type.STRING, enum: ['DC Loads (Native/DCDC)', 'AC Loads (Inverter)', 'System Overhead'] },
        watts: { type: Type.NUMBER, description: 'Power consumption in Watts' },
        hours: { type: Type.NUMBER, description: 'Estimated hours used per day' },
        dutyCycle: { type: Type.NUMBER, description: 'Duty cycle percentage (1-100)' },
        notes: { type: Type.STRING, description: 'Brief technical spec note' }
      },
      required: ['name', 'category', 'watts', 'hours']
    }
  }]
}];

const SOURCE_TOOLS = [{
  functionDeclarations: [{
    name: 'addChargingSource',
    description: 'Add a new charging source (solar panel, alternator, etc) to the system.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Model/Name of the panel or source' },
        input: { type: Type.NUMBER, description: 'Input value (Watts or Amps)' },
        unit: { type: Type.STRING, enum: ['W', 'A'] },
        hours: { type: Type.NUMBER, description: 'Generation hours per day' },
        efficiency: { type: Type.NUMBER, description: 'Efficiency decimal (0.1 to 1.0)' },
        type: { type: Type.STRING, enum: ['solar', 'alternator', 'generator', 'mppt', 'charger', 'wind', 'other'] }
      },
      required: ['name', 'input', 'unit', 'type']
    }
  }]
}];

export const createChatSession = (mode: ChatMode, useGrounding: 'search' | 'maps' | 'none' = 'none'): Chat => {
  let model = 'gemini-1.5-flash';

  if (mode === 'load' || mode === 'source') {
    return ai.chats.create({
      model: 'gemini-1.5-flash',
      config: {
        systemInstruction: `You are Spec Asst. Your ONLY job is to extract technical specs and CALL TOOLS.
        DO NOT CHAT. DO NOT USE JSON. DO NOT USE MARKDOWN. DO NOT SPEAK.
        If the user provides a product name, model number, or technical description, you MUST IMMEDIATELY use the tool.
        Never explain what you are doing. Never output text. ONLY output the tool call.
        If a specific wattage isn't known, provide a realistic industry estimate based on the product type.`,
        tools: mode === 'load' ? LOAD_TOOLS : SOURCE_TOOLS,
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames: mode === 'load' ? ['addLoadItem'] : ['addChargingSource']
          }
        }
      }
    });
  }

  return ai.chats.create({
    model,
    config: {
      systemInstruction: `You are Sol Sum AI. You MUST respond in JSON format.
      Every response must have:
      - "summary": A very brief 1-2 sentence overview of the answer.
      - "expanded": A detailed, distinct, multi-paragraph markdown explanation.
      Avoid operational sci-fi talk. Be technical and concise.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          expanded: { type: Type.STRING }
        },
        required: ["summary", "expanded"]
      }
    }
  });
};

export const getSolarForecast = async (location: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Solar forecast for ${location}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sunnyHours: { type: Type.NUMBER },
            cloudyHours: { type: Type.NUMBER }
          },
          required: ['sunnyHours', 'cloudyHours']
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch { return null; }
};

export const getDynamicSuggestions = async (systemSummary: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Based on: ${systemSummary}. 3 brief diagnostic questions.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  } catch { return ["System Health?", "Load Audit?", "Cable Check?"]; }
};
