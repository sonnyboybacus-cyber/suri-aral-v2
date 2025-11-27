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
            // Check for Quirks Mode
            if (document.compatMode === 'BackCompat') {
                console.warn("Browser is in Quirks Mode. KaTeX disabled.");
                ref.current.textContent = math;
                return;
            }

            try {
                katex.render(math, ref.current, {
                    displayMode: false,
                    throwOnError: false,
                    errorColor: '#cc0000'
                });
            } catch (error) {
                console.error("KaTeX error:", error);
                ref.current.textContent = math;
            }
        }
    }, [math]);

    return <span ref={ref} className="katex-inline" />;
};

export const BlockMath: React.FC<MathProps> = ({ math }) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            // Check for Quirks Mode
            if (document.compatMode === 'BackCompat') {
                console.warn("Browser is in Quirks Mode. KaTeX disabled.");
                ref.current.textContent = math;
                return;
            }

            try {
                katex.render(math, ref.current, {
                    displayMode: true,
                    throwOnError: false,
                    errorColor: '#cc0000'
                });
            } catch (error) {
                console.error("KaTeX error:", error);
                ref.current.textContent = math;
            }
        }
    }, [math]);

    return <div ref={ref} className="katex-block my-2" />;
};
