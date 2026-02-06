import { GoogleGenerativeAI } from '@google/generative-ai';
import { AUDIT_SYSTEM_PROMPT } from '../prompts/auditPrompt';

export interface AuditOutput {
  overallScore: number;
  subscores: {
    completeness: number;
    trust: number;
    conversion: number;
    media: number;
    localSeo: number;
  };
  whatsappTeaser: string;
  reportMarkdown: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateAudit(data: any, language: string): Promise<AuditOutput | null> {
    try {
      // Updated to gemini-3-pro-preview as requested by user and verified in available models
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const prompt = `
        Language: ${language}
        Data: ${JSON.stringify(data, null, 2)}

        ${data.photosCount >= 10 ? 
          'IMPORTANT RULE: The photo count provided (10) is a truncated API limit. The real number is likely much higher. You are STRICTLY FORBIDDEN from criticizing the low number of photos or mentioning "10 photos" in the text. Assume the business has adequate photos unless other signals suggest otherwise.' : 
          'Analyze the photo count as an accurate metric.'}
      `;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: AUDIT_SYSTEM_PROMPT.replace('{language}', language),
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });

      const responseText = result.response.text();
      return JSON.parse(responseText) as AuditOutput;
    } catch (error) {
      console.error('Gemini API Error:', error);
      return null;
    }
  }
}
