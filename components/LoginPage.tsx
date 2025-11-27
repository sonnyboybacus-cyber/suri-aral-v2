
import React, { useState, useEffect } from 'react';
import firebase from 'firebase/compat/app';
import { auth } from '../services/firebase';
import { initializeUserProfile } from '../services/databaseService';
import { BrainCircuitIcon, EyeIcon, EyeOffIcon, KeyIcon, SparklesIcon } from './icons';
import { UserRole } from '../types';

// Floating Label Input Component - Moved OUTSIDE to prevent re-renders/focus loss
const FloatingInput = ({ id, type, value, onChange, label, required = false, icon, className = "" }: any) => (
    <div className="relative mb-5 group">
        <input
            type={type}
            id={id}
            value={value}
            onChange={onChange}
            className={`block px-4 py-3.5 w-full text-sm text-slate-900 bg-transparent rounded-lg border-2 border-slate-200 appearance-none dark:text-white dark:border-slate-700 dark:focus:border-indigo-500 focus:outline-none focus:ring-0 focus:border-indigo-600 peer transition-colors ${className}`}
            placeholder=" "
            required={required}
        />
        <label
            htmlFor={id}
            className="absolute text-sm text-slate-500 dark:text-slate-400 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white dark:bg-slate-800 px-2 peer-focus:px-2 peer-focus:text-indigo-600 peer-focus:dark:text-indigo-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 left-2 pointer-events-none"
        >
            {label}
        </label>
        {icon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                {icon}
            </div>
        )}
    </div>
);

const motivationalQuotes = [
    "The important thing is not to stop questioning. Curiosity has its own reason for existing. - Albert Einstein",
    "Education is not the learning of facts, but the training of the mind to think. - Albert Einstein",
    "I have not failed. I've just found 10,000 ways that won't work. - Thomas Edison",
    "Science is a way of thinking much more than it is a body of knowledge. - Carl Sagan",
    "Somewhere, something incredible is waiting to be known. - Carl Sagan",
    "The good thing about science is that it's true whether or not you believe in it. - Neil deGrasse Tyson",
    "Research is what I'm doing when I don't know what I'm doing. - Wernher von Braun",
    "Nothing in life is to be feared, it is only to be understood. - Marie Curie",
    "It is the supreme art of the teacher to awaken joy in creative expression and knowledge. - Albert Einstein",
    "The art of teaching is the art of assisting discovery. - Mark Van Doren",
    "Education is the most powerful weapon which you can use to change the world. - Nelson Mandela",
    "The mind is not a vessel to be filled, but a fire to be kindled. - Plutarch",
    "Do not go where the path may lead, go instead where there is no path and leave a trail. - Ralph Waldo Emerson",
    "Science knows no country, because knowledge belongs to humanity, and is the torch which illuminates the world. - Louis Pasteur",
    "Equipped with his five senses, man explores the universe around him and calls the adventure Science. - Edwin Hubble",
    "The science of today is the technology of tomorrow. - Edward Teller",
    "Scientists have become the bearers of the torch of discovery in our quest for knowledge. - Stephen Hawking",
    "Intelligence is the ability to adapt to change. - Stephen Hawking",
    "We are just an advanced breed of monkeys on a minor planet of a very average star. But we can understand the Universe. That makes us something very special. - Stephen Hawking",
    "If I have seen further it is by standing on the shoulders of Giants. - Isaac Newton",
    "Truth is ever to be found in simplicity, and not in the multiplicity and confusion of things. - Isaac Newton",
    "Live as if you were to die tomorrow. Learn as if you were to live forever. - Mahatma Gandhi",
    "A person who never made a mistake never tried anything new. - Albert Einstein",
    "Genius is 1% inspiration and 99% perspiration. - Thomas Edison",
    "The task of the modern educator is not to cut down jungles, but to irrigate deserts. - C.S. Lewis",
    "Children must be taught how to think, not what to think. - Margaret Mead",
    "I am among those who think that science has great beauty. - Marie Curie",
    "You cannot teach a man anything, you can only help him find it within himself. - Galileo Galilei",
    "All truths are easy to understand once they are discovered; the point is to discover them. - Galileo Galilei",
    "The feeling of awed wonder that science can give us is one of the highest experiences of which the human psyche is capable. - Richard Dawkins",
    "Biology gives you a brain. Life turns it into a mind. - Jeffrey Eugenides",
    "Everything is theoretically impossible, until it is done. - Robert A. Heinlein",
    "The universe is under no obligation to make sense to you. - Neil deGrasse Tyson",
    "Discovery consists of seeing what everybody has seen and thinking what nobody has thought. - Albert Szent-Györgyi",
    "Hypotheses are the scaffolds which are erected in front of a building and removed when the building is completed. - Johann Wolfgang von Goethe"
];

const LoginPage = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [adminCode, setAdminCode] = useState('');
    const [wantsAdmin, setWantsAdmin] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [quote, setQuote] = useState("");

    useEffect(() => {
        // Set a random quote on mount
        const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        setQuote(randomQuote);
    }, []);

    const handleFirebaseError = (err: any) => {
        console.error("Full Auth Error:", err);
        
        // First check code
        switch (err.code) {
            case 'auth/invalid-email': return 'Please enter a valid email address.';
            case 'auth/user-disabled': return 'This account has been disabled.';
            case 'auth/user-not-found': return 'Incorrect Email or Password.';
            case 'auth/wrong-password': return 'Incorrect Email or Password.';
            case 'auth/invalid-credential': return 'Incorrect Email or Password. (Check caps lock)'; // Handle modern Firebase error
            case 'auth/email-already-in-use': return 'Email already in use.';
            case 'auth/weak-password': return 'Password too short (min 6 chars).';
            case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
        }

        // Fallback check message content for providers that wrap errors differently
        if (err.message && (
            err.message.includes('invalid-credential') || 
            err.message.includes('INVALID_LOGIN_CREDENTIALS') ||
            err.message.includes('auth/invalid-credential')
        )) {
            return 'Incorrect Email or Password.';
        }

        return err.message || 'Authentication failed.';
    };

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        // Artificial delay for smooth animation start
        await new Promise(resolve => setTimeout(resolve, 600));

        try {
            if (isLoginView) {
                await auth.signInWithEmailAndPassword(email, password);
            } else {
                // Sign Up Flow
                let role: UserRole = 'teacher';
                if (wantsAdmin) {
                    if (adminCode !== 'suri2025') {
                        throw { message: 'Invalid Admin Secret Code.' };
                    }
                    role = 'admin';
                }

                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                await userCredential.user?.updateProfile({ displayName: name });
                if (userCredential.user) {
                    await initializeUserProfile(userCredential.user, name, role);
                }
            }
            
            // Success Animation Trigger
            setLoading(false);
            setIsSuccess(true);
            
        } catch (err) {
            setLoading(false);
            triggerShake();
            if ((err as any).message && !(err as any).code) {
                 // If it's a custom error thrown by us (like invalid admin code)
                 setError((err as any).message);
            } else {
                 setError(handleFirebaseError(err));
            }
        }
    };

    return (
        <div className={`flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-1000 ${isSuccess ? 'bg-white dark:bg-slate-900' : ''}`}>
            <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    20%, 60% { transform: translateX(-6px); }
                    40%, 80% { transform: translateX(6px); }
                }
                .animate-shake { animation: shake 0.4s ease-in-out; }
                .floating-card-enter { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
            `}</style>

            {/* Success / Loading Transition Overlay */}
            {isSuccess && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-white dark:bg-slate-900 animate-fade-in">
                    <div className="flex flex-col items-center">
                        <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center animate-pulse">
                            <BrainCircuitIcon className="w-12 h-12 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 className="mt-4 text-xl font-medium text-slate-600 dark:text-slate-300 tracking-wide animate-pulse">Initializing SURI-ARAL...</h2>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in-up w-full max-w-xs">
                    <div className="bg-red-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center justify-center gap-2 text-sm font-medium">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        {error}
                    </div>
                </div>
            )}

            {/* Main Card */}
            <div className={`w-full max-w-md transition-all duration-500 ${isSuccess ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'}`}>
                <div className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 md:p-10 border border-slate-100 dark:border-slate-700 floating-card-enter ${isShaking ? 'animate-shake border-red-300 dark:border-red-700' : ''}`}>
                    
                    {/* Header */}
                    <div className="flex flex-col items-center mb-8 text-center">
                        <div className="relative mb-4 group">
                            <div className="absolute inset-0 bg-indigo-500 rounded-full blur opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                            <div className="relative bg-white dark:bg-slate-700 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600">
                                <BrainCircuitIcon className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">SURI-ARAL</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-3 text-xs md:text-sm font-medium italic leading-relaxed max-w-xs mx-auto">
                            "{quote}"
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-2">
                        {!isLoginView && (
                            <FloatingInput 
                                id="name" 
                                type="text" 
                                label="Full Name" 
                                value={name} 
                                onChange={(e: any) => setName(e.target.value)}
                                required 
                            />
                        )}
                        
                        <FloatingInput 
                            id="email" 
                            type="email" 
                            label="Email Address" 
                            value={email} 
                            onChange={(e: any) => setEmail(e.target.value)}
                            required 
                        />

                        <div className="relative mb-6">
                            <FloatingInput 
                                id="password" 
                                type={showPassword ? 'text' : 'password'} 
                                label="Password" 
                                value={password} 
                                onChange={(e: any) => setPassword(e.target.value)}
                                required 
                                className="pr-10" // Add padding for the eye icon
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute top-3.5 right-3 text-slate-400 hover:text-indigo-600 transition-colors z-20"
                            >
                                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                            </button>
                        </div>

                        {!isLoginView && (
                            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl transition-all duration-300">
                                <label className="flex items-center space-x-3 cursor-pointer group">
                                    <div className="relative flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={wantsAdmin} 
                                            onChange={(e) => setWantsAdmin(e.target.checked)}
                                            className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                        />
                                        <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                            <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Register as Administrator</span>
                                </label>

                                {wantsAdmin && (
                                    <div className="mt-4 animate-fade-in-up">
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={adminCode}
                                                onChange={(e) => setAdminCode(e.target.value)}
                                                placeholder="Admin Secret Code"
                                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <KeyIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 flex items-center justify-center ${
                                loading 
                                ? 'bg-indigo-400 scale-95 cursor-wait' 
                                : 'bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5'
                            }`}
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                isLoginView ? 'Sign In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Footer / Toggle */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isLoginView ? "Don't have an account?" : "Already have an account?"}
                            <button
                                onClick={() => { setIsLoginView(!isLoginView); setError(null); }}
                                className="ml-2 font-bold text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none"
                            >
                                {isLoginView ? "Sign Up" : "Login"}
                            </button>
                        </p>
                    </div>

                    {/* Powered By */}
                    <div className="mt-10 flex items-center justify-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest opacity-70">
                        <SparklesIcon className="w-3 h-3" />
                        Powered by Google Gemini
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
