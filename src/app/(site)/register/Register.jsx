'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import HttpService from '../../../services/HttpService';
import { timerAlert } from '../../../helpers/alerts';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useStore from '../../../store/useStore';
import SimplyModal from '@/components/common/SimplyModal/SimplyModal';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/layout/Buttons/Button';

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
    // Activación automática por token en query param
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const activationToken = searchParams ? searchParams.get('activate') : null;
    const [activationStatus, setActivationStatus] = useState(null); // null | 'success' | 'error'
    const [activationMessage, setActivationMessage] = useState('');
    const [showActivationModal, setShowActivationModal] = useState(false);

    // guard para evitar dobles llamadas (StrictMode y re-renders)
    const activatedRef = useRef(null); // guarda el último token procesado

    // Función para manejar la activación
    const handleActivation = async (token) => {
        setShowActivationModal(true);
        try {
            const response = await httpService.postData('/auth/activate', {
                token,
                language: isEn ? 'en' : 'es',
            });

            if (response.status === 200) {
                setActivationStatus('success');
                setActivationMessage(
                    isEn
                        ? 'Your account has been activated! You can now log in.'
                        : '¡Tu cuenta ha sido activada! Ya puedes iniciar sesión.'
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
        setLoading(true);
        try {
            const data = {
                email,
                password,
                language: isEn ? 'en' : 'es',
            };

            const response = await httpService.postData('/auth/register', data);
            if (response.status === 201) {
                setSuccess(
                    isEn
                        ? 'Registration successful! Check your email to activate your account.'
                        : '¡Registro exitoso! Revisa tu correo para activar tu cuenta.'
                );
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
