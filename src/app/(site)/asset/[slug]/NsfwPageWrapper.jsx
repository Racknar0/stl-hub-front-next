'use client';

import React, { useEffect, useState } from 'react';
import { useNSFW } from '../../../../../hooks/useNSFW';
import './NsfwPageWrapper.scss';

export default function NsfwPageWrapper({ children, isAdult, isEn }) {
    const { isConfirmed, confirmAge } = useNSFW();
    const [mounted, setMounted] = useState(false);

    // Evitar hidratación incorrecta mostrando el velo siempre si isAdult es true inicialmente
    // y luego actualizando cuando el cliente monta y lee el localStorage.
    useEffect(() => {
        setMounted(true);
    }, []);

    // Durante el SSR o antes de montar, si es NSFW, asumimos que NO está confirmado para proteger el contenido.
    const showGate = isAdult && (!mounted || !isConfirmed);

    if (!isAdult) {
        return <>{children}</>;
    }

    return (
        <div className={`nsfw-page-container ${showGate ? 'nsfw-active-page' : ''}`}>
            {showGate && (
                <div className="nsfw-full-overlay">
                    <div className="nsfw-gate-content">
                        <span className="nsfw-icon-large">🔞</span>
                        <h4>{isEn ? 'Adult Content (+18)' : 'Contenido para Adultos (+18)'}</h4>
                        <p>
                            {isEn
                                ? 'This page contains explicit material. You must be 18 or older to view it.'
                                : 'Esta página contiene material explícito. Debes confirmar tu edad para visualizarlo.'}
                        </p>
                        <div className="nsfw-gate-actions">
                            <button className="nsfw-btn-confirm" onClick={confirmAge}>
                                {isEn ? 'I am 18+ (Show Content)' : 'Tengo +18 años (Mostrar Contenido)'}
                            </button>
                            <button className="nsfw-btn-back" onClick={() => window.history.back()}>
                                {isEn ? 'Go Back' : 'Volver'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="nsfw-content-wrapper">
                {children}
            </div>
        </div>
    );
}
