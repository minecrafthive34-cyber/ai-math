import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type, GenerateContentParameters, Content } from '@google/genai';
import { SOLVER_SYSTEM_INSTRUCTION, CHAT_SYSTEM_INSTRUCTION } from '../constants';
import { SolveInput, ChatMessage, ChatRole } from '../types';

// Schemas copied from original geminiService.ts for use in the serverless function
const solutionResponseSchema = {
    type: Type.OBJECT,
    properties: {
        status: { type: Type.STRING, enum: ['solved', 'unsolved'] },
        title: { type: Type.STRING },
        classification: { type: Type.STRING, description: "The branch of mathematics the problem belongs to (e.g., Algebra, Calculus)." },
        difficulty: { type: Type.STRING, enum: ['Easy', 'Medium', 'Hard', 'Advanced'] },
        difficultyRating: { type: Type.NUMBER, description: "A numerical rating from 1 to 10." },
        difficultyJustification: { type: Type.STRING, description: "Justification for the difficulty rating." },
        keyConcepts: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "An array of key mathematical concepts or theorems required."
        },
        reasoning: { type: Type.STRING, description: "A high-level overview of the solution approach." },
        solution: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            nullable: true
        },
        explanation: { 
            type: Type.STRING,
            nullable: true
        },
        alternativeMethods: {
            type: Type.STRING,
            nullable: true,
            description: "A brief description of an alternative solution method."
        },
        commonPitfalls: {
            type: Type.STRING,
            nullable: true,
            description: "A brief description of common mistakes."
        }
    },
    required: ['status', 'title', 'classification', 'difficulty', 'difficultyRating', 'difficultyJustification', 'keyConcepts', 'reasoning']
};
const exampleProblemsSchema = {
    type: Type.OBJECT,
    properties: {
        problems: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    problem: { type: Type.STRING }
                },
                required: ['id', 'problem']
            }
        }
    },
    required: ['problems']
};
const mathFactSchema = {
    type: Type.OBJECT,
    properties: {
        fact: {
            type: Type.STRING,
            description: "A surprising and fun math fact, explained simply."
        }
    },
    required: ['fact']
};


export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!process.env.API_KEY) {
        return res.status(500).json({ error: 'API_KEY is not configured on the server.' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const { action, payload } = req.body;

    try {
        switch (action) {
            case 'generateInitialData': {
                const { language } = payload;
                const langName = language === 'ar' ? 'Arabic' : 'English';

                const [examplesResponse, factResponse] = await Promise.all([
                    ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `Generate 4 diverse and simple math problems suitable for an educational app. Provide a unique id for each. Your response must be in ${langName}.`,
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: exampleProblemsSchema,
                        },
                    }),
                    ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: `Provide one surprising and fun math fact of the day. Keep it short and easy to understand. Your response must be in ${langName}.`,
                        config: {
                            responseMimeType: 'application/json',
                            responseSchema: mathFactSchema,
                        },
                    })
                ]);
                
                const examplesParsed = JSON.parse(examplesResponse.text.trim());
                const factParsed = JSON.parse(factResponse.text.trim());

                return res.status(200).json({
                    examples: examplesParsed.problems,
                    fact: factParsed.fact,
                });
            }

            case 'solveProblem': {
                const { problem, language } = payload as { problem: SolveInput, language: 'en' | 'ar' };
                const langName = language === 'ar' ? 'Arabic' : 'English';
                const systemInstruction = `${SOLVER_SYSTEM_INSTRUCTION}\n\nYou must provide your entire response in ${langName}.`;

                // FIX: The type for the 'contents' variable was incorrect. It should match the type of the `contents` property
                // in the `generateContent` call, which can be a `string` for a simple prompt, or a `Content` object for multipart requests.
                // The `GenerateContentParameters` type refers to the entire request object, not just the `contents` part.
                let contents: string | Content;
                if (typeof problem === 'string') {
                    contents = problem;
                } else {
                    const imagePart = { inlineData: { mimeType: problem.image.mimeType, data: problem.image.data }};
                    const textPart = { text: problem.prompt };
                    contents = { parts: [imagePart, textPart] };
                }

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: contents,
                    config: {
                        systemInstruction: systemInstruction,
                        responseMimeType: 'application/json',
                        responseSchema: solutionResponseSchema,
                    },
                });

                return res.status(200).json(JSON.parse(response.text.trim()));
            }

            case 'chat': {
                const { history, message, language } = payload as { history: ChatMessage[], message: string, language: 'en' | 'ar' };
                const langName = language === 'ar' ? 'Arabic' : 'English';
                const systemInstruction = `${CHAT_SYSTEM_INSTRUCTION}\n\nYou must provide your entire response in ${langName}.`;

                const geminiHistory: Content[] = history.map(msg => ({
                    role: msg.role,
                    parts: [{ text: msg.text }]
                }));

                const chat = ai.chats.create({
                    model: 'gemini-2.5-flash',
                    config: { systemInstruction },
                    history: geminiHistory,
                });

                const stream = await chat.sendMessageStream({ message });

                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Transfer-Encoding', 'chunked');

                for await (const chunk of stream) {
                    res.write(JSON.stringify({ text: chunk.text }) + '\n');
                }
                
                return res.end();
            }

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }
    } catch (error: any) {
        console.error(`Error in action '${action}':`, error);
        return res.status(500).json({ error: `An internal server error occurred: ${error.message}` });
    }
}
