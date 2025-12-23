import { useState, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";

interface UseVideoGeneratorReturn {
    generateVideo: (prompt: string, apiKey: string) => Promise<void>;
    videoUrl: string | null;
    isGenerating: boolean;
    statusText: string;
    error: string | null;
    resetVideo: () => void;
}

export const useVideoGenerator = (): UseVideoGeneratorReturn => {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const resetVideo = useCallback(() => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        setError(null);
        setStatusText('');
    }, [videoUrl]);

    const generateVideo = useCallback(async (prompt: string, apiKey: string) => {
        if (!prompt.trim()) {
            setError("Please enter a description for the video scene.");
            return;
        }
        
        resetVideo();
        setIsGenerating(true);
        setError(null);

        const statusMessages = [
            "Warming up the cameras...",
            "Creating storyboard...",
            "Scouting virtual locations...",
            "Casting digital actors...",
            "Rendering frames...",
            "Adding special effects...",
            "Finalizing the cut...",
        ];
        let messageIndex = 0;
        setStatusText(statusMessages[messageIndex]);
        
        const statusInterval = setInterval(() => {
            messageIndex = (messageIndex + 1) % statusMessages.length;
            setStatusText(statusMessages[messageIndex]);
        }, 3000);

        try {
            const ai = new GoogleGenAI({ apiKey });
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt,
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '16:9'
                }
            });

            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (downloadLink) {
                const response = await fetch(`${downloadLink}&key=${apiKey}`);
                const blob = await response.blob();
                const objectUrl = URL.createObjectURL(blob);
                setVideoUrl(objectUrl);
            } else {
                throw new Error("Video generation completed but no download link was found.");
            }
        } catch (e: any) {
            console.error("Video generation failed:", e);
            if (e.message?.includes("Requested entity was not found")) {
                setError("Video generation failed. Please check your API key and project setup.");
            } else {
                setError(`Failed to generate video: ${e.message || 'Unknown error'}`);
            }
        } finally {
            clearInterval(statusInterval);
            setIsGenerating(false);
            setStatusText('');
        }
    }, [resetVideo]);

    return { generateVideo, videoUrl, isGenerating, statusText, error, resetVideo };
};
