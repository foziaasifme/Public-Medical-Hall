import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || ''; 

export const getDrugInfo = async (drugName: string, queryType: 'interactions' | 'side_effects' | 'general'): Promise<string> => {
  if (!apiKey) return "API Key missing. Please configure.";

  try {
    // @ts-ignore
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-1.5-flash';
    
    let prompt = "";
    switch(queryType) {
      case 'interactions':
        prompt = `What are the common drug interactions for ${drugName}? Keep it concise and bulleted.`;
        break;
      case 'side_effects':
        prompt = `What are the common side effects of ${drugName}? Keep it concise.`;
        break;
      case 'general':
        prompt = `Provide a brief medical summary for ${drugName} (uses, dosage forms).`;
        break;
    }

    // @ts-ignore
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    // @ts-ignore
    return response.text || "No information available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error fetching AI response.";
  }
};
