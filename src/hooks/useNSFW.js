'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'stlhub_nsfw_confirmed';

export function useNSFW() {
    const [isConfirmed, setIsConfirmed] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const confirmed = localStorage.getItem(STORAGE_KEY) === 'true';
            setIsConfirmed(confirmed);
        }
    }, []);

    const confirmAge = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, 'true');
            setIsConfirmed(true);
            
            // Dispatch a custom event so other components (like cards) instantly know about the change
            window.dispatchEvent(new Event('nsfw_confirmed'));
        }
    }, []);

    useEffect(() => {
        const handleConfirmed = () => setIsConfirmed(true);
        if (typeof window !== 'undefined') {
            window.addEventListener('nsfw_confirmed', handleConfirmed);
            return () => window.removeEventListener('nsfw_confirmed', handleConfirmed);
        }
    }, []);

    return { isConfirmed, confirmAge };
}
