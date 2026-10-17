import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateMessage = async (req, res) => {
    const { message } = req.body;

    try {
        // 1. Use   ai.models.generateContent instead of ai.interactions.create
        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash", // Use a standard valid model ID like gemini-2.5-flash or gemini-3.8-flash
            contents: message,         // Note: property name is 'contents', not 'input'
        }); 
        
        // console.log('result ', response);
        
        // 2. response.text is a property, not a function
        const text = response.text;
        res.send({ reply: text });

    } catch (err) {
        console.error('ERROR:', err);
        res.status(500).send({ err: 'Error processing your message' });
    }
};