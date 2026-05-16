'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import HttpService from '../../../services/HttpService';
import { timerAlert } from '../../../helpers/alerts';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useStore from '../../../store/useStore';
import SimplyModal from '@/components/common/SimplyModal/SimplyModal';
import Button from '@/components/layout/Buttons/Button';
import { getTrackingFromMiddlewareCookie, getVisitIdentityFromMiddlewareCookie } from '../../../helpers/attributionCookie';
import { sendGTMEvent } from '@next/third-parties/google';

const Register = () => {
    // ⚠️ mantener instancia estable de HttpService
    const httpService = useMemo(() => new HttpService(), []);
    const router = useRouter();
    const language = useStore((s) => s.language);
    const isEn = String(language || 'es').toLowerCase() === 'en';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Gift code
    const [giftCode, setGiftCode] = useState('');
    const [giftCodeStatus, setGiftCodeStatus] = useState(null); // null | 'valid' | 'invalid' | 'checking'
    const [giftCodeDays, setGiftCodeDays] = useState(null);
    const [giftCodeMsg, setGiftCodeMsg] = useState('');
    const giftCodeTimer = useRef(null);

    // Activación automática por token en query param
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const activationToken = searchParams ? searchParams.get('activate') : null;
    const urlCode = searchParams ? searchParams.get('code') : null;
    const [activationStatus, setActivationStatus] = useState(null); // null | 'success' | 'error'
    const [activationMessage, setActivationMessage] = useState('');
    const [showActivationModal, setShowActivationModal] = useState(false);

    // Auto-fill gift code from URL
    useEffect(() => {
        if (urlCode && !giftCode) {
            setGiftCode(urlCode.toUpperCase());
        }
    }, [urlCode]);

    // Validate gift code with debounce
    useEffect(() => {
        if (giftCodeTimer.current) clearTimeout(giftCodeTimer.current);
        const code = giftCode.trim();
        if (!code) {
            setGiftCodeStatus(null);
            setGiftCodeDays(null);
            setGiftCodeMsg('');
            return;
        }
        setGiftCodeStatus('checking');
        giftCodeTimer.current = setTimeout(async () => {
            try {
                const res = await httpService.getData(`/gift-codes/validate?code=${encodeURIComponent(code)}`);
                if (res?.data?.valid) {
                    setGiftCodeStatus('valid');
                    setGiftCodeDays(res.data.days);
                    setGiftCodeMsg(isEn ? `✓ Valid — ${res.data.days} premium days` : `✓ Válido — ${res.data.days} días premium`);
                } else {
                    setGiftCodeStatus('invalid');
                    setGiftCodeDays(null);
                    setGiftCodeMsg(isEn ? 'Invalid or expired code' : 'Código inválido o expirado');
                }
            } catch {
                setGiftCodeStatus('invalid');
                setGiftCodeDays(null);
                setGiftCodeMsg(isEn ? 'Could not validate code' : 'No se pudo validar el código');
            }
        }, 500);
        return () => { if (giftCodeTimer.current) clearTimeout(giftCodeTimer.current); };
    }, [giftCode, isEn]);

    // guard para evitar dobles llamadas (StrictMode y re-renders)
    const activatedRef = useRef(null); // guarda el último token procesado

    // Función para manejar la activación
    const handleActivation = async (token) => {
        setShowActivationModal(true);
        try {
            // Read pending gift code saved during registration
            const pendingCode = typeof window !== 'undefined'
                ? window.localStorage.getItem('pending_gift_code') || ''
                : '';
            const response = await httpService.postData('/auth/activate', {
                token,
                language: isEn ? 'en' : 'es',
                giftCode: pendingCode || undefined,
            });

            if (response.status === 200) {
                // Clear pending gift code
                try { window.localStorage.removeItem('pending_gift_code'); } catch {}
                const giftMsg = response.data?.giftRedeemed
                    ? (isEn
                        ? ` You received ${response.data.giftDays} days of premium!`
                        : ` ¡Recibiste ${response.data.giftDays} días de premium!`)
                    : '';
                setActivationStatus('success');
                setActivationMessage(
                    (isEn
                        ? 'Your account has been activated! You can now log in.'
                        : '¡Tu cuenta ha sido activada! Ya puedes iniciar sesión.') + giftMsg
                );
            } else {
                setActivationStatus('error');
                setActivationMessage(
                    response.data?.message ||
                        (isEn ? 'Activation error.' : 'Error al activar la cuenta.')
                );
            }
        } catch (err) {
            setActivationStatus('error');
            setActivationMessage(
                err?.response?.data?.message ||
                    (isEn ? 'Activation error.' : 'Error al activar la cuenta.')
            );
        }
    };

    // Efecto para activar cuenta si hay token en query param
    useEffect(() => {
        if (!activationToken) return;

        // evitar dobles llamadas
        if (activatedRef.current === activationToken) return;

        activatedRef.current = activationToken; // marcar como procesado
        handleActivation(activationToken);
    }, [activationToken, isEn, httpService]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!email || !password || !confirmPassword) {
            setError(
                isEn
                    ? 'Please fill in all fields.'
                    : 'Por favor completa todos los campos.'
            );
            return;
        }
        if (password !== confirmPassword) {
            setError(
                isEn
                    ? 'Passwords do not match.'
                    : 'Las contraseñas no coinciden.'
            );
            return;
        }
        // Block registration if gift code is filled but invalid
        if (giftCode.trim() && giftCodeStatus !== 'valid') {
            setError(
                isEn
                    ? 'Please enter a valid gift code or remove it.'
                    : 'Por favor ingresa un código válido o quítalo.'
            );
            return;
        }
        setLoading(true);
        try {
            const tracking = getTrackingFromMiddlewareCookie('first');
            const { anonId, sessionId } = getVisitIdentityFromMiddlewareCookie();
            const data = {
                email,
                password,
                language: isEn ? 'en' : 'es',
                tracking,
                anonId,
                sessionId,
                giftCode: giftCode.trim() || undefined,
            };

            const response = await httpService.postData('/auth/register', data);
            if (response.status === 201) {
                try {
                    sendGTMEvent({ event: 'sign_up', method: 'email', email: email });
                } catch (e) {
                    console.error('GTM sign_up error', e);
                }
                
                setSuccess(
                    isEn
                        ? 'Registration successful! Check your email to activate your account.'
                        : '¡Registro exitoso! Revisa tu correo para activar tu cuenta.'
                );
                // Save gift code for post-activation redemption
                if (giftCode.trim()) {
                    try { window.localStorage.setItem('pending_gift_code', giftCode.trim()); } catch {}
                }
                await timerAlert(
                    isEn ? 'Registration successful!' : '¡Registro exitoso!',
                    isEn
                        ? 'Check your email to activate your account.'
                        : 'Revisa tu correo para activar tu cuenta.',
                    7000
                );
                router.push('/login');
            } else {
                setError(
                    response.data?.message ||
                        (isEn ? 'Registration error.' : 'Error en el registro.')
                );
            }
        } catch (err) {
            setError(
                err?.response?.data?.message ||
                    (isEn ? 'Registration error.' : 'Error en el registro.')
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <section className="login-page">
                <div className="container-narrow">
                    <div className="login-wrap">
                        <div className="login-brand">
                            <img src="/nuevo_horizontal.png" alt="STL HUB" />
                        </div>
                        <div className="login-card">
                            <h2 className="login-title">
                                {isEn
                                    ? 'Create your account'
                                    : 'Crea tu cuenta'}
                            </h2>
                            <form
                                onSubmit={handleSubmit}
                                className="login-form"
                                aria-label={
                                    isEn
                                        ? 'Registration form'
                                        : 'Formulario de registro'
                                }
                            >
                                <label className="login-field">
                                    <span className="label">
                                        {isEn ? 'Email' : 'Correo electrónico'}
                                    </span>
                                    <input
                                        type="email"
                                        id="email"
                                        value={email}
                                        onChange={(e) =>
                                            setEmail(e.target.value)
                                        }
                                        required
                                        placeholder={
                                            isEn
                                                ? 'youremail@example.com'
                                                : 'tucorreo@ejemplo.com'
                                        }
                                        autoComplete="email"
                                    />
                                </label>
                                <label className="login-field password-field">
                                    <span className="label">
                                        {isEn ? 'Password' : 'Contraseña'}
                                    </span>
                                    <div className="input-wrap">
                                        <input
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            id="password"
                                            value={password}
                                            onChange={(e) =>
                                                setPassword(e.target.value)
                                            }
                                            required
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            className="pass-toggle"
                                            aria-label={
                                                showPassword
                                                    ? isEn
                                                        ? 'Hide password'
                                                        : 'Ocultar contraseña'
                                                    : isEn
                                                    ? 'Show password'
                                                    : 'Mostrar contraseña'
                                            }
                                            onClick={() =>
                                                setShowPassword((v) => !v)
                                            }
                                        >
                                            {showPassword ? (
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        d="M3 3l18 18"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                    />
                                                    <path
                                                        d="M10.58 6.14A9.73 9.73 0 0 1 12 6c5.5 0 9.5 6 9.5 6s-.71 1.12-1.98 2.5M6.48 6.5C4.25 8.2 2.5 12 2.5 12s2.2 3.93 5.69 5.41"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                    <path
                                                        d="M15.5 15.5A4 4 0 0 1 8.5 8.5"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                    <circle
                                                        cx="12"
                                                        cy="12"
                                                        r="3"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                    />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </label>
                                <label className="login-field password-field">
                                    <span className="label">
                                        {isEn
                                            ? 'Confirm password'
                                            : 'Confirmar contraseña'}
                                    </span>
                                    <div className="input-wrap">
                                        <input
                                            type={
                                                showPassword
                                                    ? 'text'
                                                    : 'password'
                                            }
                                            id="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) =>
                                                setConfirmPassword(
                                                    e.target.value
                                                )
                                            }
                                            required
                                            placeholder="••••••••"
                                            autoComplete="new-password"
                                        />
                                    </div>
                                </label>
                                <label className="login-field" style={{ position: 'relative' }}>
                                    <span className="label">
                                        {isEn ? 'Gift code (optional)' : 'Código de regalo (opcional)'}
                                    </span>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            id="giftCode"
                                            value={giftCode}
                                            onChange={(e) => setGiftCode(e.target.value.toUpperCase())}
                                            placeholder={isEn ? 'e.g. TIKTOK3DIAS' : 'ej. TIKTOK3DIAS'}
                                            autoComplete="off"
                                            maxLength={30}
                                            style={{
                                                paddingRight: 36,
                                                borderColor: giftCodeStatus === 'valid' ? '#22c55e'
                                                    : giftCodeStatus === 'invalid' ? '#ef4444'
                                                    : undefined,
                                            }}
                                        />
                                        {giftCodeStatus === 'valid' && (
                                            <span style={{
                                                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                                color: '#22c55e', fontSize: '1.2rem', fontWeight: 700,
                                            }}>✓</span>
                                        )}
                                        {giftCodeStatus === 'invalid' && (
                                            <span style={{
                                                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                                color: '#ef4444', fontSize: '1.1rem', fontWeight: 700,
                                            }}>✕</span>
                                        )}
                                        {giftCodeStatus === 'checking' && (
                                            <span style={{
                                                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                                color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem',
                                            }}>...</span>
                                        )}
                                    </div>
                                    {giftCodeMsg && (
                                        <span style={{
                                            fontSize: '0.78rem', marginTop: 2,
                                            color: giftCodeStatus === 'valid' ? '#22c55e' : '#ef4444',
                                        }}>
                                            {giftCodeMsg}
                                        </span>
                                    )}
                                </label>
                                {error && (
                                    <div
                                        className="form-error"
                                        style={{
                                            color: '#e74c3c',
                                            marginBottom: 8,
                                        }}
                                    >
                                        {error}
                                    </div>
                                )}
                                {success && (
                                    <div
                                        className="form-success"
                                        style={{
                                            color: '#27ae60',
                                            marginBottom: 8,
                                        }}
                                    >
                                        {success}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    className="login-submit"
                                    disabled={loading}
                                >
                                    {loading
                                        ? isEn
                                            ? 'Registering…'
                                            : 'Registrando…'
                                        : isEn
                                        ? 'Register'
                                        : 'Registrarse'}
                                </button>
                            </form>

                            <p className="login-help">
                                {isEn
                                    ? 'Already have an account?'
                                    : '¿Ya tienes cuenta?'}{' '}
                                <Link
                                    href="/login"
                                    className="login-help__link"
                                >
                                    {isEn ? 'Log in' : 'Inicia sesión'}
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            <SimplyModal
                open={showActivationModal}
                onClose={() => setShowActivationModal(false)}
                title={isEn ? 'Account Activation' : 'Activación de cuenta'}
            >
                <div
                    style={{
                        minHeight: 60,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {activationStatus === null && (
                        <span>
                            {isEn
                                ? 'Activating your account...'
                                : 'Activando tu cuenta...'}
                        </span>
                    )}
                    {activationStatus === 'success' && (
                        <>
                            <span style={{ color: '#27ae60', fontWeight: 600 }}>
                                {isEn ? 'Your account has been activated! You can now log in.' : '¡Tu cuenta ha sido activada! Ya puedes iniciar sesión.'}
                            </span>
                        </>
                    )}
                    {activationStatus === 'error' && (
                        <span style={{ color: '#e74c3c', fontWeight: 600 }}>
                            {isEn ? 'Activation error.' : 'Error al activar la cuenta.'}
                        </span>
                    )}

                    {/* boton de cerrar */}
                    <Button
                        as="link"
                        href="/login"
                        variant="purple"
                        className="btn-big"
                        width={'140px'}
                        styles={{ marginTop: 18 }}
                    >
                        {isEn ? 'Close' : 'Cerrar'}
                    </Button>
                </div>
            </SimplyModal>
        </>
    );
};

export default Register;
