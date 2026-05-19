'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import HttpService from '../../../services/HttpService';
import { timerAlert } from '../../../helpers/alerts';
import useStore from '../../../store/useStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SimplyModal from '@/components/common/SimplyModal/SimplyModal';
import Button from '@/components/layout/Buttons/Button';
import { useGoogleLogin } from '@react-oauth/google';

const Login = () => {

    const login = useStore((state) => state.login);
    const setLanguage = useStore((s) => s.setLanguage);
    const httpService = useMemo(() => new HttpService(), []);
    const router = useRouter();
    const token = useStore((state) => state.token);
    const language = useStore((s) => s.language);
    const isEn = String(language || 'es').toLowerCase() === 'en';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // tomar los pathparameters
    const searchParams =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search)
            : null;
    const resetToken = searchParams ? searchParams.get('reset') : null;
    const [resetStatus, setResetStatus] = useState(null); // null | 'success' | 'error'
    const [resetMessage, setResetMessage] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    // Restaurar función handleLogin
    const handleLogin = async (data) => {
        setLoading(true);
        try {
            const response = await httpService.postData('/auth/login', data);
            if (response.status === 200) {
                const token = response.data.token;
                // Esperar a que el store procese el login (guarda token y decodifica payload)
                await login(token);

                // Intentar obtener el perfil del usuario y setear idioma
                try {
                    console.log('Language updated on server');
                    const profileRes = await httpService.getData('/me/profile');
                    console.log('FprofileResprofileResprofileResprofileRese:', profileRes);
                    const userLang = profileRes?.data?.language || 'es';
                    console.log('Fetched profile after login, language:', userLang);
                    setLanguage(userLang);
                } catch (errProfile) {
                    console.error('Error fetching profile after login', errProfile);
                }

                timerAlert('success', response.data.message);
                if (isEn) {
                    router.push('/en');
                } else {
                    router.push('/');
                }
            } else {
                setPassword('');
                await timerAlert(
                    isEn ? 'Login error' : 'Error de inicio',
                    response.data?.message || (isEn ? 'Login failed.' : 'Error al iniciar sesión.'),
                    3000
                );
            }
        } catch (err) {
            setPassword('');
            await timerAlert(
                isEn ? 'Login error' : 'Error de inicio',
                err?.response?.data?.message || (isEn ? 'Login failed.' : 'Error al iniciar sesión.'),
                3000
            );
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            try {
                const response = await httpService.postData('/auth/google', {
                    token: tokenResponse.access_token,
                    language: isEn ? 'en' : 'es'
                });
                if (response.status === 200) {
                    const jwtToken = response.data.token;
                    await login(jwtToken);
                    try {
                        const profileRes = await httpService.getData('/me/profile');
                        const userLang = profileRes?.data?.language || 'es';
                        setLanguage(userLang);
                    } catch (e) {}

                    timerAlert('success', response.data.message);
                    if (isEn) {
                        router.push('/en');
                    } else {
                        router.push('/');
                    }
                }
            } catch (error) {
                console.error('Google login error', error);
                timerAlert('error', error.response?.data?.message || (isEn ? 'Google login failed' : 'Error con Google'));
            } finally {
                setLoading(false);
            }
        },
        onError: () => {
            timerAlert('error', isEn ? 'Google login failed' : 'Error al iniciar con Google');
        }
    });


    useEffect(() => {
        if (token) {
            router.push('/');
        }
    }, [token, router]);

    // guard para evitar dobles llamadas (StrictMode y re-renders)
    const resetTokenRef = useRef(null); // guarda el último token procesado

    // Efecto para resetear contraseña si hay token en query param
    useEffect(() => {
        if (!resetToken) return;
        // evitar dobles llamadas
        if (resetTokenRef.current === resetToken) return;
        resetTokenRef.current = resetToken; // marcar como procesado
        setShowResetModal(true);
        setResetStatus(null);
        setResetMessage('');
        setNewPassword('');
        setConfirmNewPassword('');
    }, [resetToken, isEn]);

    // Función para enviar nueva contraseña
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetStatus(null);
        setResetMessage('');
        if (!newPassword || !confirmNewPassword) {
            setResetStatus('error');
            setResetMessage(
                isEn
                    ? 'Please fill in both fields.'
                    : 'Por favor completa ambos campos.'
            );
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setResetStatus('error');
            setResetMessage(
                isEn
                    ? 'Passwords do not match.'
                    : 'Las contraseñas no coinciden.'
            );
            return;
        }
        setResetLoading(true);
        try {
            const response = await httpService.postData(
                '/auth/reset-password',
                {
                    token: resetToken,
                    password: newPassword,
                    language: isEn ? 'en' : 'es',
                }
            );
            if (response.status === 200) {
                setResetStatus('success');
                setResetMessage( response.data?.message || (isEn ? 'Password reset successfully.' : 'Contraseña restablecida correctamente.') );
            } else {
                setResetStatus('error');
                setResetMessage( response.data?.message || (isEn ? 'Error resetting password.' : 'Error al restablecer la contraseña.') );
            }
        } catch (err) {
            setResetStatus('error');
            setResetMessage(
                err?.response?.data?.message ||
                    (isEn
                        ? 'Error resetting password.'
                        : 'Error al restablecer la contraseña.')
            );
        } finally {
            setResetLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = {
            email: username,
            password,
            language: isEn ? 'en' : 'es',
        };
        handleLogin(data);
    };

    if (token) return null;

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
                                {isEn ? 'User Login' : 'Inicio de sesión'}
                            </h2>

                            <button
                                type="button"
                                className="login-social-btn"
                                onClick={() => handleGoogleLogin()}
                            >
                                <svg viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.7 17.74 9.5 24 9.5z"></path>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                    <path fill="none" d="M0 0h48v48H0z"></path>
                                </svg>
                                {isEn ? 'Continue with Google' : 'Continuar con Google'}
                            </button>
                            
                            <div className="login-divider">
                                {isEn ? 'or' : 'o'}
                            </div>

                            <form
                                onSubmit={handleSubmit}
                                className="login-form"
                                aria-label="Formulario de inicio de sesión"
                            >
                                <label className="login-field">
                                    <span className="label">
                                        {isEn ? 'Email' : 'Correo electrónico'}
                                    </span>
                                    <input
                                        type="email"
                                        id="username"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        required
                                        placeholder={`${
                                            isEn
                                                ? 'youremail@example.com'
                                                : 'tucorreo@ejemplo.com'
                                        }`}
                                    />
                                </label>
                                <label className="login-field password-field">
                                    <span className="label">Password</span>
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
                                        />
                                        <button
                                            type="button"
                                            className="pass-toggle"
                                            aria-label={
                                                showPassword
                                                    ? 'Ocultar contraseña'
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
                                <button
                                    type="submit"
                                    className="login-submit"
                                    disabled={loading}
                                >
                                    {loading
                                        ? isEn
                                            ? 'Logging in…'
                                            : 'Accediendo…'
                                        : isEn
                                        ? 'Log In'
                                        : 'Acceder'}
                                </button>
                            </form>
                            <p className="login-help">
                                {isEn
                                    ? "Don't have an account?"
                                    : '¿No tienes cuenta?'}{' '}
                                <Link
                                    href="/register"
                                    className="login-help__link"
                                >
                                    {isEn ? 'Sign Up' : 'Regístrate'}
                                </Link>
                            </p>
                            <p className="login-help">
                                {isEn
                                    ? 'Want to download without limits?'
                                    : '¿Quieres descargar sin limites?'}{' '}
                                <Link
                                    href="/suscripcion"
                                    className="login-help__link"
                                >
                                    {isEn ? 'Subscribe' : 'Suscríbete'}
                                </Link>
                            </p>
                            <div className="login-footer mx-0 mt-3 d-block text-center">
                                <Link
                                    href="/forgot-password"
                                    className="login-help__link"
                                    style={{ fontSize: '0.9rem' }}
                                >
                                    {isEn
                                        ? 'Forgot your password?'
                                        : '¿Olvidaste tu contraseña?'}
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            {/* Modal de reseteo de contraseña */}
            <SimplyModal
                open={showResetModal}
                onClose={() => setShowResetModal(false)}
                title={
                    isEn ? 'Reset your password' : 'Restablece tu contraseña'
                }
            >
                <div style={{ minWidth: 280, maxWidth: 340, margin: '0 auto' }}>
                    {resetStatus !== 'success' && (
                        <form
                            onSubmit={handleResetPassword}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 14,
                            }}
                        >
                            <label className="login-field">
                                <span className="label">
                                    {isEn ? 'New password' : 'Nueva contraseña'}
                                </span>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) =>
                                        setNewPassword(e.target.value)
                                    }
                                    required
                                    placeholder={
                                        isEn
                                            ? 'Enter new password'
                                            : 'Ingresa nueva contraseña'
                                    }
                                    autoComplete="new-password"
                                />
                            </label>
                            <label className="login-field">
                                <span className="label">
                                    {isEn
                                        ? 'Confirm password'
                                        : 'Confirmar contraseña'}
                                </span>
                                <input
                                    type="password"
                                    value={confirmNewPassword}
                                    onChange={(e) =>
                                        setConfirmNewPassword(e.target.value)
                                    }
                                    required
                                    placeholder={
                                        isEn
                                            ? 'Repeat new password'
                                            : 'Repite la nueva contraseña'
                                    }
                                    autoComplete="new-password"
                                />
                            </label>
                            {resetStatus === 'error' && (
                                <div
                                    style={{
                                        color: '#e74c3c',
                                        marginBottom: 4,
                                    }}
                                >
                                    {resetMessage}
                                </div>
                            )}
                            <Button
                                type="submit"
                                variant="purple"
                                className="btn-big"
                                disabled={resetLoading}
                            >
                                {resetLoading
                                    ? isEn
                                        ? 'Saving…'
                                        : 'Guardando…'
                                    : isEn
                                    ? 'Save password'
                                    : 'Guardar contraseña'}
                            </Button>
                        </form>
                    )}
                    {resetStatus === 'success' && (
                        <div
                            style={{
                                textAlign: 'center',
                                minHeight: 60,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <span
                                style={{
                                    color: '#27ae60',
                                    fontWeight: 600,
                                    marginBottom: 8,
                                }}
                            >
                                {isEn
                                    ? 'Your password has been reset! You can now log in.'
                                    : '¡Tu contraseña ha sido restablecida! Ya puedes iniciar sesión.'}
                            </span>
                            <Button
                                as="link"
                                href="/login"
                                variant="purple"
                                className="btn-big"
                                width={'160px'}
                                styles={{ marginTop: 18 }}
                                onClick={() => setShowResetModal(false)}
                            >
                                {isEn ? 'Go to login' : 'Iniciar sesión'}
                            </Button>
                        </div>
                    )}
                </div>
            </SimplyModal>
        </>
    );
};

export default Login;
