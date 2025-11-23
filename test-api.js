import { GoogleGenAI } from "@google/genai";

const apiKey = "AIzaSyCsjFfiMl-b8D6iLaDizCjpOFQdQdKQ0Ck";

async function testGemini() {
    console.log("Testing Gemini API with provided key...");

    try {
        const ai = new GoogleGenAI({ apiKey });
        console.log("Using model: gemini-2.5-flash");

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [{ text: "Hello, are you working?" }] }],
        });

        console.log("Success! Response received:");
        // Check if response.text is a function or property based on SDK version
        const text = typeof response.text === 'function' ? response.text() : response.text;
        console.log(text);
    } catch (error) {
        console.error("Error testing Gemini API:");
        console.error(error.message || error);
        if (error.response) {
            console.error(JSON.stringify(error.response, null, 2));
        }
    }
}

testGemini();
