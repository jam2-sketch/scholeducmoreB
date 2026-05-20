import { GoogleGenAI } from "@google/genai";
import { Type } from "@google/genai";

// Lazy initialization - only create client when needed
let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is not set');
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateAssignmentDescription(title: string, topic: string) {
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Draft a clear, detailed, and engaging assignment description for a classroom. 
    Title: ${title}
    Topic: ${topic}
    Include learning objectives, instructions, and grading criteria.`,
    config: {
      systemInstruction: "You are a helpful, creative teaching assistant. Use markdown for the description.",
    }
  });
  return response.text;
}

export async function summarizeMaterials(content: string) {
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Briefly summarize the following educational material. Highlight key concepts and provide 3 study questions at the end.
    Content: ${content}`,
    config: {
      systemInstruction: "You are a specialized academic summarizer.",
    }
  });
  return response.text;
}

export async function generatePracticeQuestions(topic: string, count: number = 3) {
  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate ${count} multiple choice questions for the topic: ${topic}. 
    Return as a JSON array of objects with 'question', 'options' (array), and 'correctIndex' fields.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.NUMBER }
          },
          required: ["question", "options", "correctIndex"]
        }
      }
    }
  });
  return JSON.parse(response.text || '[]');
}
