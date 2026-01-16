import * as tmImage from '@teachablemachine/image';

let model: tmImage.CustomMobileNet | null = null;

// Load the model from public/model/
export const loadBubbleModel = async () => {
    if (model) return model;

    const modelURL = '/model/model.json';
    const metadataURL = '/model/metadata.json';

    try {
        model = await tmImage.load(modelURL, metadataURL);
        console.log("Bubble Classifier Model Loaded");
        console.log("Classes:", model.getClassLabels()); // Log classes
        return model;
    } catch (error) {
        console.error("Failed to load Bubble Classifier:", error);
        throw new Error("Could not load AI model. Please ensure files are in public/model/");
    }
};

export interface PredictionResult {
    className: string; // "Marked" or "Empty"
    probability: number;
}

export const predictBubble = async (image: HTMLImageElement | HTMLCanvasElement): Promise<PredictionResult> => {
    if (!model) await loadBubbleModel();
    if (!model) throw new Error("Model failed to load");

    const predictions = await model.predict(image);

    // Sort by probability desc
    const sorted = predictions.sort((a, b) => b.probability - a.probability);
    return sorted[0]; // Return top match
};
