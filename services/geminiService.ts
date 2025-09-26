import { SolutionResponse, SolveInput, ExampleProblem, ChatMessage } from '../types';

async function postToAction(action: string, payload: object): Promise<any> {
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, payload }),
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(`API Error: ${response.statusText} - ${errorBody.error}`);
    }
    
    // For streaming responses, we return the response object itself.
    if (action === 'chat') {
        return response;
    }

    return response.json();
}

export async function generateInitialData(language: 'en' | 'ar'): Promise<{ examples: ExampleProblem[], fact: string }> {
    try {
        return await postToAction('generateInitialData', { language });
    } catch (error) {
        console.error("Error generating initial data:", error);
        return {
            examples: [
                { id: 'fallback-1', problem: language === 'ar' ? 'حل لـ س: 3س - 7 = 5' : 'Solve for x: 3x - 7 = 5' },
                { id: 'fallback-2', problem: language === 'ar' ? 'ما هي مساحة دائرة نصف قطرها 5؟' : 'What is the area of a circle with a radius of 5?' }
            ],
            fact: language === 'ar' ? 'الصفر هو العدد الصحيح الوحيد الذي ليس موجبًا ولا سالبًا.' : 'Zero is the only integer that is neither positive nor negative.',
        };
    }
}

export async function solveProblem(problem: SolveInput, language: 'en' | 'ar'): Promise<SolutionResponse> {
    try {
        return await postToAction('solveProblem', { problem, language });
    } catch (error) {
        console.error("Error solving problem:", error);
        throw new Error("Failed to get a valid response from the AI. Please try again.");
    }
}

export async function streamChatResponse(
    history: ChatMessage[],
    message: string,
    language: 'en' | 'ar'
): Promise<ReadableStream<Uint8Array> | null> {
    try {
        const response = await postToAction('chat', { history, message, language });
        return response.body;
    } catch (error) {
        console.error("Chat error:", error);
        throw new Error("Failed to start chat stream.");
    }
}
