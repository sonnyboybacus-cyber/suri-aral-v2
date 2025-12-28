
import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathProps {
    math: string;
    errorColor?: string;
}

export const InlineMath: React.FC<MathProps> = ({ math }) => {
    const ref = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (ref.current) {
            try {
                katex.render(math, ref.current, {
                    displayMode: false,
                    throwOnError: false,
                    errorColor: '#cc0000',
                    strict: false
                });
            } catch (error: any) {
                if (error.message && error.message.includes('quirks mode')) {
                    ref.current.textContent = math;
                } else {
                    console.warn("KaTeX Inline error:", error);
                    ref.current.textContent = math;
                }
            }
        }
    }, [math]);

    return <span ref={ref} className="katex-inline" />;
};

export const BlockMath: React.FC<MathProps> = ({ math }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            try {
                katex.render(math, ref.current, {
                    displayMode: true,
                    throwOnError: false,
                    errorColor: '#cc0000',
                    strict: false
                });
            } catch (error: any) {
                if (error.message && error.message.includes('quirks mode')) {
                    ref.current.textContent = math;
                    return;
                }

                console.warn("KaTeX Block error, trying inline fallback:", error);
                
                try {
                    katex.render(math, ref.current, {
                        displayMode: false,
                        throwOnError: false,
                        errorColor: '#cc0000',
                        strict: false
                    });
                } catch(e2) {
                    ref.current.textContent = math;
                }
            }
        }
    }, [math]);

    return <div ref={ref} className="katex-block my-2 overflow-x-auto" />;
};

export const SmartMathText = ({ text, className = "" }: { text: string, className?: string }) => {
    if (!text) return null;

    let processedText = text;

    // 1. Normalize Delimiters: Convert \[ \] and \( \) to $$ and $
    processedText = processedText
        .replace(/\\\[/g, '$$$$') // \[ -> $$
        .replace(/\\\]/g, '$$$$') // \] -> $$
        .replace(/\\\(/g, '$')    // \( -> $
        .replace(/\\\)/g, '$');   // \) -> $

    // 2. Smart Auto-Wrapper for "Naked" LaTeX (Safety Net for JSON Content)
    if (!processedText.includes('$')) {
        // Regex to detect common math commands
        const mathPattern = /(?:\\(?:frac|lim|int|sum|prod|sqrt|sin|cos|tan|theta|alpha|beta|pi|infty|sigma|delta|gamma|omega|partial|nabla|approx|neq|leq|geq|subset|cup|cap|vec|hat|bar))/;
        
        if (mathPattern.test(processedText)) {
            if (processedText.trim().startsWith('\\') || (processedText.includes('=') && processedText.includes('\\'))) {
                 processedText = `$$${processedText}$$`;
            } 
        }
    }

    // 3. Split by Block Math ($$ ... $$) and Inline Math ($ ... $)
    const parts = processedText.split(/(\$\$[\s\S]+?\$\$|\$[^\$]+?\$)/g);

    return (
        <span className={className}>
            {parts.map((part, i) => {
                // Handle Block Math
                if (part.startsWith('$$') && part.endsWith('$$')) {
                    const mathContent = part.slice(2, -2);
                    return (
                        <div key={i} className="my-3 overflow-x-auto flex justify-center py-2 animate-fade-in w-full">
                            <BlockMath math={mathContent} />
                        </div>
                    );
                }
                // Handle Explicit Inline Math
                if (part.startsWith('$') && part.endsWith('$')) {
                    const mathContent = part.slice(1, -1);
                    return <InlineMath key={i} math={mathContent} />;
                }

                // Render plain text with basic markdown parsing
                const subParts = part.split(/(\*\*.*?\*\*|\*.*?\*)/g);
                return (
                    <span key={i}>
                        {subParts.map((sub, j) => {
                            if (sub.startsWith('**') && sub.endsWith('**')) {
                                return <strong key={j} className="font-bold text-indigo-900 dark:text-indigo-300">{sub.slice(2, -2)}</strong>;
                            }
                            if (sub.startsWith('*') && sub.endsWith('*')) {
                                return <em key={j} className="italic text-slate-600 dark:text-slate-400">{sub.slice(1, -1)}</em>;
                            }
                            return sub;
                        })}
                    </span>
                );
            })}
        </span>
    );
};
