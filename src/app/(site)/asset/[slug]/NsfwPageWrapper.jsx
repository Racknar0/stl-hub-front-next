'use client';

import React, { useEffect, useState } from 'react';
import { useNSFW } from '../../../../hooks/useNSFW';
import useStore from '../../../../store/useStore';
import './NsfwPageWrapper.scss';

export default function NsfwPageWrapper({ children, isAdult, isEn }) {
    const { isConfirmed, confirmAge } = useNSFW();
    const token = useStore((s) => s.token);
    const hydrated = useStore((s) => s.hydrated);
    const [mounted, setMounted] = useState(false);

    // Evitar hidratación incorrecta mostrando el velo siempre si isAdult es true inicialmente
    // y luego actualizando cuando el cliente monta y lee el localStorage.
    useEffect(() => {
        setMounted(true);
    }, []);

    // No es NSFW → render directo
    if (!isAdult) {
        return <>{children}</>;
    }

    // Antes de montar, proteger contenido
    if (!mounted || !hydrated) {
        return (
            <div className="nsfw-page-container nsfw-active-page">
                <div className="nsfw-full-overlay">
                    <div className="nsfw-gate-content">
                        <span className="nsfw-icon-large">🔞</span>
                        <h4>{isEn ? 'Adult Content (+18)' : 'Contenido para Adultos (+18)'}</h4>
                        <p>{isEn ? 'Loading…' : 'Cargando…'}</p>
                    </div>
                </div>
                <div className="nsfw-content-wrapper">
                    {children}
                </div>
            </div>
        );
    }

    // --- NSFW + NO logueado → Gate de login (no age gate) ---
    if (!token) {
        return (
            <div className="nsfw-page-container nsfw-active-page">
                <div className="nsfw-full-overlay">
                    <div className="nsfw-gate-content">
                        <span className="nsfw-icon-large">🔒</span>
                        <h4>{isEn ? 'Login Required' : 'Inicio de sesión requerido'}</h4>
                        <p>
                            {isEn
                                ? 'This content is restricted to registered users. Please log in to view it.'
                                : 'Este contenido está restringido a usuarios registrados. Inicia sesión para visualizarlo.'}
                        </p>
                        <div className="nsfw-gate-actions">
                            <a href="/login" className="nsfw-btn-confirm">
                                {isEn ? 'Log In' : 'Iniciar Sesión'}
                            </a>
                            <button className="nsfw-btn-back" onClick={() => window.history.back()}>
                                {isEn ? 'Go Back' : 'Volver'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="nsfw-content-wrapper">
                    {children}
                </div>
            </div>
        );
    }

    // --- NSFW + Logueado → Age gate clásico ---
    const showGate = !isConfirmed;

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
