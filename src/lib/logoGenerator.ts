import { GoogleGenAI } from "@google/genai";

export async function generateIdealLogo() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `A professional 3D app icon for an aviation security (AVSEC) management system, representing an 'Inspection Channel' (Canal de Inspeção). 
  Style: Modern iOS-style icon with rounded corners and a sleek silver metallic frame on a black background. 
  Composition: 
  - Background left: A baggage X-ray machine with a neon blue screen showing silhouettes of prohibited items. 
  - Center: A security officer (APAC) in a light blue uniform with a gold badge and officer cap. 
  - Background right: A walk-through metal detector gate with a passenger silhouette passing through. 
  - Foreground: A magnifying glass (representing manual inspection) and a security ID badge with a green checkmark. 
  Colors: Royal blue, gold, metallic silver, emerald green, and black. 
  Mood: Professional, high-tech, 3D cartoon/vector illustration style with bold shapes.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "1K"
        }
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Error generating logo:", error);
    return null;
  }
}
