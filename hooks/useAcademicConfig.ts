import { useState, useEffect } from 'react';
import { AcademicConfig, subscribeToAcademicConfig } from '../services/db/config';

export const useAcademicConfig = () => {
    const [config, setConfig] = useState<AcademicConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToAcademicConfig((newConfig) => {
            setConfig(newConfig);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { config, isLoading };
};
