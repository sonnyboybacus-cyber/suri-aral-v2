
import React, { useState, useEffect, useRef } from 'react';
import firebase from 'firebase/compat/app';
import { assessReadingSession, generateReadingMaterial, generateSpeech } from '../services/geminiService';
import { logUserActivity, awardXP } from '../services/databaseService';
import { MicIcon, StopCircleIcon, RefreshIcon, BookOpenIcon, SparklesIcon, TrendingUpIcon, AlertTriangleIcon, SpinnerIcon, PlusIcon, WandIcon, XIcon, SpeakerIcon, VolumeXIcon, InfoIcon } from './icons';

interface ReadingSAProps {
    user: firebase.User;
}

// Helper to decode base64 audio data
async function decodeAudioData(base64Data: string, ctx: AudioContext): Promise<AudioBuffer> {
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    // Manual PCM decoding (Float32)
    const dataInt16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(dataInt16.length);
    for (let i = 0; i < dataInt16.length; i++) {
        float32[i] = dataInt16[i] / 32768.0;
    }
    
    const buffer = ctx.createBuffer(1, float32.length, 24000);
    buffer.getChannelData(0).set(float32);
    return buffer;
}

// Simple Waveform Visualizer using Canvas
const Waveform = ({ isRecording, audioContext, analyser }: { isRecording: boolean, audioContext: AudioContext | null, analyser: AnalyserNode | null }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        if (!isRecording || !analyser || !canvasRef.current) return;
        
        let animationId: number;
        const canvas = canvasRef.current;
        const canvasCtx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            if (!canvasCtx) return;
            animationId = requestAnimationFrame(draw);
            
            analyser.getByteTimeDomainData(dataArray);
            
            canvasCtx.fillStyle = 'rgb(248, 250, 252)'; // slate-50
            // Clear with slight transparency for trail effect if desired, or opaque
            canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw background line
            canvasCtx.beginPath();
            canvasCtx.moveTo(0, canvas.height / 2);
            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.strokeStyle = '#e2e8f0';
            canvasCtx.stroke();

            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = '#6366f1'; // Indigo-500
            canvasCtx.beginPath();
            
            const sliceWidth = canvas.width * 1.0 / bufferLength;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;
                
                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }
                
                x += sliceWidth;
            }
            
            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        };
        
        draw();
        
        return () => cancelAnimationFrame(animationId);
    }, [isRecording, analyser]);
    
    return <canvas ref={canvasRef} width={600} height={100} className="w-full h-24 rounded-xl bg-slate-50 dark:bg-slate-900/50" />;
};

const WordWithTooltip: React.FC<{ word: string, isMissed: boolean }> = ({ word, isMissed }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <span 
            className={`relative inline-block mx-1 px-1 rounded transition-all duration-200 cursor-default ${
                isMissed 
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 underline decoration-wavy decoration-orange-400' 
                : 'text-slate-700 dark:text-slate-200'
            }`}
            onMouseEnter={() => isMissed && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {word}
            {showTooltip && (
                <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-bold text-white bg-slate-800 rounded-lg shadow-lg whitespace-nowrap z-20 animate-fade-in">
                    Pronunciation Check
                    <svg className="absolute top-full left-1/2 transform -translate-x-1/2 text-slate-800" width="8" height="4" viewBox="0 0 8 4" fill="currentColor">
                        <path d="M0 0L4 4L8 0H0Z" />
                    </svg>
                </span>
            )}
        </span>
    );
};

const SAMPLE_TEXTS = [
    {
        title: "The Solar System",
        level: "Easy",
        content: "The sun is a star found at the center of our solar system. It is very hot and gives us light and heat. There are eight planets that travel around the sun. Earth is the third planet from the sun. It is the only planet we know that has life."
    },
    {
        title: "Photosynthesis",
        level: "Medium",
        content: "Photosynthesis is the process used by plants to convert light energy into chemical energy. This energy is stored in carbohydrate molecules, such as sugars, which are synthesized from carbon dioxide and water. Oxygen is released as a waste product."
    },
    {
        title: "The Quantum Realm",
        level: "Hard",
        content: "Quantum mechanics is a fundamental theory in physics that describes nature at the smallest scales of energy levels of atoms and subatomic particles. Classical physics, the description of physics that existed before the theory of relativity and quantum mechanics, cannot explain the mechanics of these small particles."
    }
];

export const ReadingSA = ({ user }: ReadingSAProps) => {
    const [currentText, setCurrentText] = useState(SAMPLE_TEXTS[0]);
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<{ accuracyScore: number, wpm: number, missedWords: string[], feedback: string } | null>(null);
    const [duration, setDuration] = useState(0);
    
    // Generation State
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [genTopic, setGenTopic] = useState('');
    const [genLevel, setGenLevel] = useState('Medium');
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    
    // Reference Audio State
    const [isPlayingRef, setIsPlayingRef] = useState(false);
    const [refAudioLoading, setRefAudioLoading] = useState(false);
    const refSource = useRef<AudioBufferSourceNode | null>(null);
    
    // Audio Context Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const startTimeRef = useRef<number>(0);

    const getAudioContext = () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        return audioContextRef.current;
    };

    const handlePlayReference = async () => {
        // If currently playing, stop it
        if (isPlayingRef) {
            if (refSource.current) {
                refSource.current.stop();
                refSource.current = null;
            }
            setIsPlayingRef(false);
            return;
        }

        // Start playing
        setRefAudioLoading(true);
        try {
            // 1. Generate Audio
            const base64Audio = await generateSpeech(currentText.content);
            
            // 2. Init Context
            const ctx = getAudioContext();
            if (ctx.state === 'suspended') await ctx.resume();

            // 3. Decode
            const buffer = await decodeAudioData(base64Audio, ctx);
            
            // 4. Play
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            
            source.onended = () => {
                setIsPlayingRef(false);
                refSource.current = null;
            };
            
            refSource.current = source;
            source.start(0);
            setIsPlayingRef(true);

        } catch (error) {
            console.error("TTS Error:", error);
            alert("Failed to load audio. Please try again.");
        } finally {
            setRefAudioLoading(false);
        }
    };

    // Cleanup audio on unmount or text change
    useEffect(() => {
        return () => {
            if (refSource.current) {
                refSource.current.stop();
            }
        };
    }, [currentText]); // Stop audio if text changes

    const handleStartRecording = async () => {
        // Stop reference audio if playing
        if (isPlayingRef && refSource.current) {
            refSource.current.stop();
            setIsPlayingRef(false);
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            // Setup Analyzer
            const audioCtx = getAudioContext();
            if (audioCtx.state === 'suspended') await audioCtx.resume();

            const analyser = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyser);
            
            analyserRef.current = analyser;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            
            const chunks: BlobPart[] = [];
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/wav' });
                setAudioBlob(blob);
            };
            
            mediaRecorder.start();
            startTimeRef.current = Date.now();
            setIsRecording(true);
            setAnalysis(null);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone.");
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            setDuration(elapsed);
            setIsRecording(false);
            
            // Cleanup stream but keep context for playback
            streamRef.current?.getTracks().forEach(track => track.stop());
        }
    };

    const handleAnalyze = async () => {
        if (!audioBlob) return;
        setIsAnalyzing(true);
        
        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            try {
                // Using existing transcribeUserAudio function
                const { transcribeUserAudio, assessReadingSession } = await import('../services/geminiService');
                
                const transcription = await transcribeUserAudio(base64Audio);
                const result = await assessReadingSession(currentText.content, transcription, duration);
                
                setAnalysis(result);
                
                if (result.accuracyScore > 80) {
                    await awardXP(user.uid, 50);
                }
                
                await logUserActivity(user.uid, {
                    type: 'READING',
                    title: `Reading Practice: ${currentText.title}`,
                    subtitle: `Score: ${result.accuracyScore}% | WPM: ${result.wpm}`,
                });

            } catch (e) {
                console.error("Analysis failed", e);
                alert("Failed to analyze reading session.");
            } finally {
                setIsAnalyzing(false);
            }
        };
    };

    const handleGeneratePassage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!genTopic.trim()) return;
        
        setIsGeneratingText(true);
        try {
            const newMaterial = await generateReadingMaterial(genTopic, genLevel);
            setCurrentText(newMaterial);
            setAudioBlob(null);
            setAnalysis(null);
            setShowGenerateModal(false);
            setGenTopic('');
        } catch (error) {
            console.error(error);
            alert("Failed to generate passage.");
        } finally {
            setIsGeneratingText(false);
        }
    };

    const renderHeatmapText = () => {
        if (!analysis) return <p className="text-xl md:text-2xl leading-loose text-slate-700 dark:text-slate-300 font-serif">{currentText.content}</p>;

        const words = currentText.content.split(/\s+/);
        // Simple matching strategy (naive for demonstration, robust alignment usually requires backend)
        // We assume missedWords from AI matches raw tokens.
        
        return (
            <p className="text-xl md:text-2xl leading-loose text-slate-700 dark:text-slate-300 font-serif">
                {words.map((word, idx) => {
                    const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
                    const isMissed = analysis.missedWords.some(m => m.toLowerCase().includes(cleanWord));
                    return <WordWithTooltip key={idx} word={word} isMissed={isMissed} />;
                })}
            </p>
        );
    };

    const getGradeColor = (score: number) => {
        if (score >= 90) return 'text-emerald-500';
        if (score >= 75) return 'text-indigo-500';
        return 'text-orange-500';
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200">
            {/* Generate Modal */}
            {showGenerateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 animate-fade-in-up">
                        <header className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <WandIcon className="w-5 h-5 text-indigo-500" />
                                Generate Reading Passage
                            </h3>
                            <button onClick={() => setShowGenerateModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </header>
                        <form onSubmit={handleGeneratePassage} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Topic</label>
                                <input 
                                    type="text" 
                                    value={genTopic}
                                    onChange={e => setGenTopic(e.target.value)}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Deep Sea Creatures"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 ml-1">Difficulty</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['Easy', 'Medium', 'Hard'].map(l => (
                                        <button 
                                            key={l}
                                            type="button"
                                            onClick={() => setGenLevel(l)}
                                            className={`py-2 rounded-lg text-sm font-bold border transition-all ${
                                                genLevel === l 
                                                ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-700 dark:text-indigo-300' 
                                                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button 
                                type="submit"
                                disabled={isGeneratingText}
                                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-0.5 disabled:opacity-70 disabled:transform-none flex justify-center items-center gap-2 mt-2"
                            >
                                {isGeneratingText ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
                                {isGeneratingText ? 'Generating...' : 'Create Material'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <div className="max-w-5xl mx-auto space-y-8">
                
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-teal-400 to-emerald-600 rounded-2xl text-white shadow-lg">
                            <BookOpenIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white tracking-tight">Reading SA</h1>
                            <p className="text-slate-500 dark:text-slate-400">Fluency & Pronunciation Coach</p>
                        </div>
                    </div>
                    
                    {!isRecording && !analysis && (
                        <div className="flex flex-wrap gap-2">
                            {SAMPLE_TEXTS.map((t, i) => (
                                <button 
                                    key={i}
                                    onClick={() => { setCurrentText(t); setAudioBlob(null); setAnalysis(null); }}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                                        currentText.title === t.title 
                                        ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
                                        : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {t.level}
                                </button>
                            ))}
                            <button 
                                onClick={() => setShowGenerateModal(true)}
                                className="px-4 py-2 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-1 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
                            >
                                <PlusIcon className="w-3 h-3" /> Generate New
                            </button>
                        </div>
                    )}
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Main Reading Area */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-slate-200 dark:border-slate-700 p-8 md:p-12 relative overflow-hidden min-h-[400px] flex flex-col justify-center">
                            {/* Text Content */}
                            <div className="relative z-10 text-center md:text-left">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">{currentText.title}</h2>
                                        <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 uppercase">{currentText.level}</span>
                                    </div>
                                    
                                    <button 
                                        onClick={handlePlayReference}
                                        disabled={refAudioLoading}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                            isPlayingRef 
                                            ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' 
                                            : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                                        }`}
                                        title="Listen to proper pronunciation"
                                    >
                                        {refAudioLoading ? (
                                            <SpinnerIcon className="w-3 h-3 animate-spin" />
                                        ) : isPlayingRef ? (
                                            <VolumeXIcon className="w-3 h-3" />
                                        ) : (
                                            <SpeakerIcon className="w-3 h-3" />
                                        )}
                                        {isPlayingRef ? 'Stop' : refAudioLoading ? 'Loading...' : 'Listen'}
                                    </button>
                                </div>
                                {renderHeatmapText()}
                            </div>
                            
                            {/* Decor */}
                            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-50 dark:bg-emerald-900/10 rounded-full blur-3xl pointer-events-none"></div>
                        </div>

                        {/* Controls */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 flex items-center justify-between">
                            {isRecording ? (
                                <div className="flex-1 mr-6">
                                    <Waveform isRecording={isRecording} audioContext={audioContextRef.current} analyser={analyserRef.current} />
                                </div>
                            ) : (
                                <div className="flex-1 text-sm text-slate-500 font-medium pl-2">
                                    {audioBlob ? "Recording ready for analysis." : "Press the microphone to start reading."}
                                </div>
                            )}

                            <div className="flex gap-4 items-center">
                                {!isRecording && !audioBlob && (
                                    <button 
                                        onClick={handleStartRecording}
                                        className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                                    >
                                        <MicIcon className="w-8 h-8" />
                                    </button>
                                )}
                                
                                {isRecording && (
                                    <button 
                                        onClick={handleStopRecording}
                                        className="w-16 h-16 rounded-full bg-slate-800 hover:bg-slate-900 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 animate-pulse"
                                    >
                                        <StopCircleIcon className="w-8 h-8" />
                                    </button>
                                )}

                                {audioBlob && !isRecording && !isAnalyzing && !analysis && (
                                    <>
                                        <button 
                                            onClick={() => { setAudioBlob(null); setAnalysis(null); }}
                                            className="p-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                                            title="Reset"
                                        >
                                            <RefreshIcon className="w-6 h-6" />
                                        </button>
                                        <button 
                                            onClick={handleAnalyze}
                                            className="px-8 py-4 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-1 flex items-center gap-2"
                                        >
                                            <SparklesIcon className="w-5 h-5" /> Analyze
                                        </button>
                                    </>
                                )}
                                
                                {isAnalyzing && (
                                    <div className="flex items-center gap-3 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-full font-bold">
                                        <SpinnerIcon className="w-5 h-5 animate-spin" /> Analyzing...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Analysis Sidebar */}
                    <div className="space-y-6">
                        {analysis ? (
                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-lg border border-slate-200 dark:border-slate-700 p-8 animate-fade-in-up">
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-6">Performance</h3>
                                
                                {/* Accuracy Gauge */}
                                <div className="text-center mb-8">
                                    <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                                        <svg className="w-full h-full" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="45" fill="none" stroke="#e2e8f0" strokeWidth="8" className="dark:stroke-slate-700"/>
                                            <circle 
                                                cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
                                                strokeDasharray="283" 
                                                strokeDashoffset={283 - (283 * analysis.accuracyScore / 100)} 
                                                className={`${getGradeColor(analysis.accuracyScore)} transition-all duration-1000 ease-out transform -rotate-90 origin-center`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute text-center">
                                            <span className={`text-4xl font-bold ${getGradeColor(analysis.accuracyScore)}`}>{analysis.accuracyScore}%</span>
                                            <span className="block text-[10px] font-bold text-slate-400 uppercase mt-1">Accuracy</span>
                                        </div>
                                    </div>
                                </div>

                                {/* WPM Gauge (Semi-Circle) */}
                                <div className="text-center mb-8 relative">
                                    <div className="relative w-40 h-24 mx-auto flex items-end justify-center overflow-hidden">
                                        <svg className="w-full h-full" viewBox="0 0 100 50">
                                            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e2e8f0" strokeWidth="8" className="dark:stroke-slate-700" />
                                            <path 
                                                d="M 10 50 A 40 40 0 0 1 90 50" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="8" 
                                                strokeDasharray="126"
                                                strokeDashoffset={126 - (126 * Math.min(analysis.wpm / 200, 1))} 
                                                className="text-blue-500 transition-all duration-1000 ease-out"
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute bottom-0 text-center mb-1">
                                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{analysis.wpm}</span>
                                            <span className="block text-[9px] font-bold text-slate-400 uppercase">WPM</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Issues Counter */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 text-center mb-6">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <AlertTriangleIcon className="w-4 h-4 text-orange-500" />
                                        <span className="text-xl font-bold text-slate-800 dark:text-white">{analysis.missedWords.length}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Mispronunciations</div>
                                </div>

                                {/* AI Feedback */}
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                    <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-2 flex items-center">
                                        <SparklesIcon className="w-3 h-3 mr-1" /> Tutor Feedback
                                    </h4>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                        {analysis.feedback}
                                    </p>
                                </div>
                                
                                <button 
                                    onClick={() => { setAudioBlob(null); setAnalysis(null); }}
                                    className="w-full mt-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:scale-105 transition-transform"
                                >
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            // Tips / Placeholder
                            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 p-8 opacity-60">
                                <h3 className="font-bold text-slate-400 uppercase text-xs tracking-widest mb-4">Reading Tips</h3>
                                <ul className="space-y-4 text-sm text-slate-500">
                                    <li className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">1</span>
                                        Read at a natural pace. Don't rush.
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">2</span>
                                        Enunciate clearly, especially word endings.
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs">3</span>
                                        Pause at commas and periods.
                                    </li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
