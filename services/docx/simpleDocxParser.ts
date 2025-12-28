
/// <reference path="./mammoth.d.ts" />
import mammoth from 'mammoth';

export const extractTextFromDocx = async (file: File): Promise<string> => {
    try {
        console.log("Starting DOCX extraction for:", file.name);
        const arrayBuffer = await file.arrayBuffer();

        // Convert to Buffer/Uint8Array for mammoth
        const options = {
            arrayBuffer: arrayBuffer
        };

        const result = await mammoth.extractRawText(options);

        if (result.messages.length > 0) {
            console.warn("Mammoth messages:", result.messages);
        }

        // Mammoth extracts raw text pretty cleanly, but we might want to normalize it.
        // It separates paragraphs with double newlines usually.
        let text = result.value;

        // Post-processing:
        // Ensure standard spacing for our regex parsers

        return text;
    } catch (error: any) {
        console.error("DOCX Extraction Error:", error);
        throw new Error(error.message || "Unknown DOCX extraction error");
    }
};
