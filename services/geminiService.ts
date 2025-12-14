import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIStoryResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const modelName = 'gemini-2.5-flash';

// Schema for generating a math story
const storySchema: Schema = {
  type: Type.OBJECT,
  properties: {
    story: {
      type: Type.STRING,
      description: "A very short, cute story for a 5-year-old involving math (max 20 words). In Chinese.",
    },
    numA: {
      type: Type.INTEGER,
      description: "The first number in the problem (0-10).",
    },
    numB: {
      type: Type.INTEGER,
      description: "The second number in the problem (0-10).",
    },
    operator: {
      type: Type.STRING,
      description: "The operator, either '+' or '-'.",
      enum: ['+', '-']
    },
    answer: {
      type: Type.INTEGER,
      description: "The result of the calculation.",
    },
    emoji: {
      type: Type.STRING,
      description: "A single emoji representing the object in the story (e.g., 🍎, 🐱, 🚗).",
    }
  },
  required: ["story", "numA", "numB", "operator", "answer", "emoji"],
};

export const generateMathStory = async (): Promise<AIStoryResponse | null> => {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: "Generate a simple math word problem for a child learning 1-10 addition or subtraction. Use emojis. Keep it fun.",
      config: {
        responseMimeType: "application/json",
        responseSchema: storySchema,
        temperature: 1.0, 
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AIStoryResponse;
    }
    return null;
  } catch (error) {
    console.error("Gemini Story Error:", error);
    return null;
  }
};

export const getEncouragementOrHint = async (
  isCorrect: boolean,
  numA: number,
  numB: number,
  operator: string
): Promise<string> => {
  try {
    const prompt = isCorrect
      ? `A child just correctly solved ${numA} ${operator} ${numB}. Give them a very short, super enthusiastic praise in Chinese (max 1 sentence).`
      : `A child got ${numA} ${operator} ${numB} wrong. Give them a very gentle, simple hint in Chinese like a kind teacher. Don't give the answer directly. (max 1 sentence).`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    return response.text || (isCorrect ? "太棒了！" : "再试一次哦！");
  } catch (error) {
    console.error("Gemini Feedback Error:", error);
    return isCorrect ? "真棒！" : "加油，再算算看！";
  }
};
