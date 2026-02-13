
import { GoogleGenAI, Type } from "@google/genai";
import { Company, Role, Team } from "../types";

const apiKey = import.meta.env.VITE_API_KEY || "AI_DISABLED";
export const ai = apiKey !== "AI_DISABLED" 
  ? new GoogleGenAI(apiKey) 
  : null;

export const getAnalysis = async (data: Company) => {
  if (!ai) {
    console.warn("AI features are disabled due to missing API key.");
    return "AI insights are currently unavailable.";
  }
  

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const enrichCompanyData = async (companyName: string): Promise<Partial<Company>> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Provide detailed intelligence for the tech company: "${companyName}". 
      Include:
      1. industry: broad industry category.
      2. description: a short one-sentence description.
      3. careerWebsite: direct link to the company's careers or jobs page. Prioritize UK (.co.uk/careers) or US (.com/careers or similar) versions if available.
      4. stage: current stage (e.g., Startup, Scaleup, Corporate, or a specific series like Series B).
      5. valuation: estimated valuation in millions of USD (number only). If unknown, return 0.
      6. leadInvestor: most recent lead investor or prominent investor.
      7. businessModel: core business model (e.g., SaaS, B2B, Marketplace, etc.).
      8. teams: list 4-5 key divisions or functional teams likely to exist within this specific company (e.g., Platform Infrastructure, Product Analytics, Growth Marketing). Each with a 3-word "focus" description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            industry: { type: Type.STRING },
            description: { type: Type.STRING },
            careerWebsite: { type: Type.STRING },
            stage: { type: Type.STRING },
            valuation: { type: Type.NUMBER },
            leadInvestor: { type: Type.STRING },
            businessModel: { type: Type.STRING },
            teams: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  focus: { type: Type.STRING }
                },
                required: ["name", "focus"]
              }
            }
          },
          required: ["industry", "description", "careerWebsite", "stage", "valuation", "leadInvestor", "businessModel", "teams"],
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
