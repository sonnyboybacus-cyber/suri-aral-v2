// Use Legacy build for better compatibility
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

// Configure worker for Vite - using static file in public folder
// Ensure you have copied pdf.worker.min.mjs to public/ folder
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        console.log("Starting extraction for:", file.name);
        const arrayBuffer = await file.arrayBuffer();

        // Use a typed array which is safer for PDF.js compliance
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(arrayBuffer),
            useSystemFonts: true,
            disableFontFace: false
        });

        const pdf = await loadingTask.promise;
        console.log("PDF Loaded, pages:", pdf.numPages);

        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            // 1. Basic text extraction
            // We join with \n to preserve line structures (like Answer: B \n 2. Next)
            // Our later smart logic will handle reflowing sentences.
            let pageText = textContent.items
                .map((item: any) => item.str)
                .join('\n');

            // 2. Header/Footer removal
            // Remove standalone numbers (likely page numbers) at start or end of the page text
            pageText = pageText.replace(/^\s*(?:Page\s+)?\d+\s+/, '');
            pageText = pageText.replace(/\s+(?:Page\s+)?\d+\s*$/, '');

            // 3. Seamless Join Logic
            if (fullText.length === 0) {
                fullText = pageText;
            } else {
                // Check the end of the previous text
                const trimmedFull = fullText.trimEnd();
                const lastChar = trimmedFull.length > 0 ? trimmedFull[trimmedFull.length - 1] : '';

                // Check if the NEW page starts with a Question Number (e.g., "2. ", "15)")
                // If so, we MUST force a newline to ensure the parser detects it.
                const startsWithQuestion = /^\s*\d+[\.\)]/.test(pageText);

                // Check if the PREVIOUS page ended with an Answer line (e.g. "Answer: C")
                // If so, we MUST force a newline so it doesn't merge with the next page text.
                const endsWithAnswer = /(?:Answer|Ans|ANS)[:\s.-]+(?:[A-D]|[Tt]rue|[Ff]alse)$/i.test(trimmedFull);

                // Heuristic:
                // - New Question Start -> Force Newline
                // - Ends with Answer -> Force Newline
                // - Ends with sentence terminator -> Force Newline
                // - Ends with hyphen -> Remove hyphen, no space
                // - Otherwise -> Join directly (no space) as requested
                if (startsWithQuestion || endsWithAnswer || /[.!?:;]/.test(lastChar)) {
                    fullText += '\n' + pageText;
                } else if (lastChar === '-') {
                    fullText = trimmedFull.slice(0, -1) + pageText;
                } else {
                    fullText += pageText;
                }
            }
        }

        return fullText;
    } catch (error: any) {
        console.error("PDF Extraction Error:", error);
        // Throw the actual error message so we can see it in the UI
        throw new Error(error.message || "Unknown PDF extraction error");
    }
};

export interface ParsedQuestion {
    id: number;
    text: string;
    options: { letter: string; text: string }[];
    inlineAnswer?: string;
}

// Improved Regex Patterns
const QUESTION_START_REGEX = /(?:^|\n)\s*(\d+)[\.\)]\s+/g;
const OPTION_REGEX = /(?:^|\s|<br>)(?:[A-D]|[a-d])[\.\)]\s+/;
const ANSWER_KEY_PATTERN = /(\d+)[\.\)\s:-]+([A-D]|[Tt]rue|[Ff]alse)/gi;

export const parseRawQuestions = (text: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = [];

    // 1. Split text by question numbers
    // Find all "1.", "2." matches

    // Safety: If Answer Key header exists in the text, cut the text there to avoid consuming it as questions
    // This handles cases where the split logic in the UI failed or wasn't used
    const keyMatch = text.match(/(?:^|\n\s*|\n\n)(?:Answer\s*Key|Key\s*to\s*Correction|Answers|Key|Correction\s*Key|Correct\s*Answers)[\s:-]*(?=\n|$)/i);
    if (keyMatch && keyMatch.index) {
        text = text.substring(0, keyMatch.index);
    }

    const indices: { num: number, index: number }[] = [];
    let match;
    while ((match = QUESTION_START_REGEX.exec(text)) !== null) {
        indices.push({ num: parseInt(match[1]), index: match.index });
    }

    if (indices.length === 0) return [];

    // 2. Iterate and extract content chunks
    for (let i = 0; i < indices.length; i++) {
        const current = indices[i];
        const next = indices[i + 1];

        // Extract raw text for this question
        let rawContent = text.slice(current.index, next ? next.index : undefined).trim();

        // Clean up the Question Number "1. "
        rawContent = rawContent.replace(/^\d+[\.\)]\s+/, '');

        // 3. Extract Options
        // Strategy: Split by "A.", "B.", "a)", "b)" etc.
        const options: { letter: string; text: string }[] = [];

        // Check for different option styles
        // We look for the first occurrence of "A." or "a)" etc.
        const parts = rawContent.split(/(?:^|\s)(?:[A-D]|[a-d])[\.\)]\s+/);

        let questionText = parts[0].trim();

        // If options exist (A, B, C, D)
        if (parts.length > 1) {
            // Find the actual letters used matches
            const letterMatches = Array.from(rawContent.matchAll(/(?:^|\s)([A-D]|[a-d])[\.\)]\s+/g));

            // Map the split parts to the letters matched
            // parts[0] is question text
            // parts[1] corresponds to letterMatches[0]

            letterMatches.forEach((m, idx) => {
                const optionText = parts[idx + 1]?.trim();
                let letter = m[1].toUpperCase();

                if (optionText) {
                    options.push({ letter, text: optionText });
                }
            });
        }

        // 4. Handle multiline cleanup (PDFs often have hard wraps)
        // Convert single newlines to spaces, keep double newlines
        questionText = questionText.replace(/([^\n])\n([^\n])/g, '$1 $2');

        // 5. Look for Inline Answer (e.g., "Answer: B" or "Ans: B" at the end)
        let inlineAnswer = '';
        const answerMatch = rawContent.match(/(?:Answer|Ans|ANS)[:\s.-]+([A-D]|[Tt]rue|[Ff]alse)/i);
        if (answerMatch) {
            inlineAnswer = answerMatch[1].toUpperCase();
            // Clean answer from options text if it was accidentally captured in options
            if (options.length > 0) {
                const lastOpt = options[options.length - 1];
                lastOpt.text = lastOpt.text.replace(/(?:Answer|Ans|ANS)[:\s.-]+([A-D]|[Tt]rue|[Ff]alse).*/i, '').trim();
            }
        }

        questions.push({
            id: current.num,
            text: questionText,
            options: options.length > 0 ? options : [],
            inlineAnswer
        });
    }

    return questions;
};

export const parseAnswerKey = (text: string): Record<string, string> => {
    const map: Record<string, string> = {};

    // 1. Standard pattern: "1. A" or "1: A" or "1 A"
    const standardMatches = Array.from(text.matchAll(ANSWER_KEY_PATTERN));
    for (const match of standardMatches) {
        let answer = match[2].toUpperCase();
        if (answer === 'TRUE') answer = 'True';
        if (answer === 'FALSE') answer = 'False';
        map[match[1]] = answer;
    }

    // 2. Tabular/Grid fallback: just numbers and letters sequence
    if (Object.keys(map).length === 0) {
        const simplePairs = text.match(/(\d+)\s+([A-D])/gi);
        if (simplePairs) {
            simplePairs.forEach(pair => {
                const [num, ans] = pair.split(/\s+/);
                map[num] = ans.toUpperCase();
            });
        }
    }

    return map;
};
