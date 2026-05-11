'use client';
import React, { useEffect } from 'react';
import useStore from '../../../store/useStore';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { sendGTMEvent } from '@next/third-parties/google';

export default function PaymentSuccessPage() {
    const language = useStore((s) => s.language);
    const searchParams = useSearchParams();
    const isEn = String(language || 'es').toLowerCase() === 'en';

    useEffect(() => {
        const val = Number(searchParams.get('value')) || 0;
        const cur = searchParams.get('currency') || 'USD';

        // Disparamos el evento de compra para Google Analytics
        sendGTMEvent({ 
            event: 'purchase', 
            transaction_id: `T_${Math.floor(Math.random() * 1000000)}`, // ID temporal para que GA4 no lo cuente como duplicado
            value: val,
            currency: cur
        });
    }, [searchParams]);

    return (
        <div style={{
            minHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px 20px',
            color: '#f8fafc'
        }}>
            <div style={{
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '50%',
                padding: '20px',
                marginBottom: '24px'
            }}>
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="#22c55e" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    style={{ width: 80, height: 80 }}
                >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            </div>
            
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: 16 }}>
                {isEn ? 'Payment Successful!' : '¡Pago Exitoso!'}
            </h1>
            
            <p style={{ color: '#94a3b8', fontSize: '1.15rem', maxWidth: 500, marginBottom: 40, lineHeight: 1.6 }}>
                {isEn 
                    ? 'Your premium account is now active. Thank you for your purchase! You can start exploring and downloading all the assets immediately.'
                    : 'Tu cuenta premium ya está activa. ¡Gracias por tu compra! Puedes empezar a explorar y descargar todos los modelos 3D inmediatamente.'}
            </p>
            
            <Link href="/" style={{ textDecoration: 'none' }}>
                <button style={{
                    backgroundColor: '#a78bfa',
                    color: '#0f1225',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '16px 36px',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 14px 0 rgba(167, 139, 250, 0.39)',
                }}
                onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#8b5cf6';
                    e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#a78bfa';
                    e.target.style.transform = 'translateY(0)';
                }}
                >
                    {isEn ? 'Go to Homepage' : 'Volver al Inicio'}
                </button>
            </Link>
        </div>
    );
}
