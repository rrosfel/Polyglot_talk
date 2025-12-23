import { useState, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

export type SessionStatus = 'idle' | 'listening' | 'speaking' | 'processing';

interface UseLiveSessionProps {
    apiKey: string;
    onToolCall?: (toolCall: any) => Promise<any>;
    onTranscriptUpdate: (text: string, speaker: 'user' | 'teacher', isFinal: boolean) => void;
}

export const useLiveSession = ({ apiKey, onToolCall, onTranscriptUpdate }: UseLiveSessionProps) => {
    const [isConversing, setIsConversing] = useState(false);
    const [status, setStatus] = useState<SessionStatus>('idle');
    const [error, setError] = useState<string | null>(null);
    const [liveUserTranscript, setLiveUserTranscript] = useState('');
    const [liveTeacherTranscript, setLiveTeacherTranscript] = useState('');

    const sessionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    // Transcripts accumulators for current turn
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    const cleanupAudio = useCallback(async () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            await outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();
    }, []);

    const stopSession = useCallback(async (isError: boolean = false) => {
        setIsConversing(false);
        // If it's an error, we go to idle so user can retry. If it's a normal stop, we go processing to generate summary.
        setStatus(isError ? 'idle' : 'processing'); 
        
        await cleanupAudio();

        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        setLiveUserTranscript('');
        setLiveTeacherTranscript('');
    }, [cleanupAudio]);

    const startSession = useCallback(async (config: any) => {
        setError(null);
        setStatus('listening');
        setIsConversing(true);
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';

        try {
            const ai = new GoogleGenAI({ apiKey });
            
            // Audio Setup
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;
            mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {}, 
                    outputAudioTranscription: {},
                    ...config 
                },
                callbacks: {
                    onopen: () => {
                        const source = audioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
                        processorRef.current = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                        
                        processorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then(session => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(processorRef.current);
                        processorRef.current.connect(audioContextRef.current!.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Tool Calls
                        if (message.toolCall && onToolCall) {
                            for (const fc of message.toolCall.functionCalls) {
                                const response = await onToolCall(fc);
                                if (response) {
                                    sessionPromise.then(session => {
                                        session.sendToolResponse({
                                            functionResponses: {
                                                id: fc.id,
                                                name: fc.name,
                                                response: { result: "OK" },
                                            }
                                        });
                                    });
                                }
                            }
                        }

                        // Transcription
                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            currentInputTranscriptionRef.current += text;
                            setLiveUserTranscript(currentInputTranscriptionRef.current);
                        }
                        if (message.serverContent?.outputTranscription) {
                            setStatus('speaking');
                            const text = message.serverContent.outputTranscription.text;
                            currentOutputTranscriptionRef.current += text;
                            setLiveTeacherTranscript(currentOutputTranscriptionRef.current);
                        }
                        
                        // Turn Complete
                        if (message.serverContent?.turnComplete) {
                            if (currentInputTranscriptionRef.current.trim()) {
                                onTranscriptUpdate(currentInputTranscriptionRef.current.trim(), 'user', true);
                            }
                            if (currentOutputTranscriptionRef.current.trim()) {
                                onTranscriptUpdate(currentOutputTranscriptionRef.current.trim(), 'teacher', true);
                            }
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                            setLiveUserTranscript('');
                            setLiveTeacherTranscript('');
                            setStatus('listening');
                        }

                        // Audio Playback
                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData) {
                            const audioBuffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current!, 24000, 1);
                            const source = outputAudioContextRef.current!.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContextRef.current!.destination);
                            const currentTime = outputAudioContextRef.current!.currentTime;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentTime);
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            audioSourcesRef.current.add(source);
                            source.onended = () => audioSourcesRef.current.delete(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error("Live session error:", e);
                        setError("Connection unstable. Tap mic to resume.");
                        stopSession(true); // Stop with error flag to reset UI to idle
                    },
                    onclose: (e: CloseEvent) => {
                        if (!e.wasClean) {
                            console.log("Session closed unexpectedly", e);
                            setError("Connection lost. Tap mic to resume.");
                            stopSession(true); // Stop with error flag to reset UI to idle
                        }
                    },
                },
            });
            sessionRef.current = await sessionPromise;

        } catch (e: any) {
            console.error("Failed to start conversation:", e);
            setError(`Failed to start: ${e.message || 'Unknown error'}`);
            setIsConversing(false);
            setStatus('idle');
        }
    }, [apiKey, onToolCall, onTranscriptUpdate, stopSession]);

    return { 
        startSession, 
        stopSession, 
        isConversing, 
        status, 
        setStatus, 
        liveUserTranscript, 
        liveTeacherTranscript, 
        error 
    };
};