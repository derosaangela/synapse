
import { GoogleGenAI, Type } from "@google/genai";
import { Company, Role } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const enrichCompanyData = async (companyName: string): Promise<Partial<Company>> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide industry, a short one-sentence description, and a probable website URL for the tech company: ${companyName}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            industry: { type: Type.STRING },
            description: { type: Type.STRING },
            website: { type: Type.STRING },
          },
          required: ["industry", "description", "website"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    return data;
  } catch (error) {
    console.error("Error enriching company data:", error);
    return {};
  }
};

export const suggestRolesForCompany = async (companyName: string, industry: string): Promise<Role[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Suggest 3 typical open engineering or product roles for a company named ${companyName} in the ${industry} industry. For each, list 3 key skills.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              skills: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
            },
            required: ["title", "skills"],
          },
        },
      },
    });

    const rawRoles = JSON.parse(response.text || "[]");
    return rawRoles.map((r: any) => ({
      ...r,
      id: Math.random().toString(36).substr(2, 9),
      status: 'Open'
    }));
  } catch (error) {
    console.error("Error suggesting roles:", error);
    return [];
  }
};

export const getConversationStarters = async (contactName: string, notes: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Based on these notes about my professional contact ${contactName}: "${notes}", suggest 3 personalized conversation starters or follow-up questions for our next chat.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
      },
    });
    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error generating starters:", error);
    return [];
  }
};
