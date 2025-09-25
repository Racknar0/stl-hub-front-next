'use client';
import React, { useState } from 'react';
import HttpService from '../../../services/HttpService';
import { timerAlert } from '../../../helpers/alerts';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useStore from '../../../store/useStore';

const ForgotPassword = () => {
    const httpService = new HttpService();
    const router = useRouter();
    const language = useStore((s) => s.language);
    const isEn = String(language || 'es').toLowerCase() === 'en';

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!email) {
            setError(isEn ? 'Please enter your email.' : 'Por favor ingresa tu correo.');
            return;
        }
        setLoading(true);
        try {
            const response = await httpService.postData('/auth/forgot-password', { email , language: isEn ? 'en' : 'es' });
            if (response.status === 200) {
                setSuccess(isEn ? 'Check your email for password reset instructions.' : 'Revisa tu correo para instrucciones de recuperación.');
                await timerAlert(
                    isEn ? 'Check your email' : 'Revisa tu correo',
                    isEn ? 'We sent you a link to reset your password.' : 'Te enviamos un enlace para restablecer tu contraseña.',
                    5000
                );
                router.push('/login');
            } else {
                setError(response.data?.message || (isEn ? 'Error sending email.' : 'Error enviando el correo.'));
            }
        } catch (err) {
            setError(err?.response?.data?.message || (isEn ? 'Error sending email.' : 'Error enviando el correo.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="login-page">
            <div className="container-narrow">
                <div className="login-wrap">
                    <div className="login-brand">
                        <img src="/nuevo_horizontal.png" alt="STL HUB" />
                    </div>
                    <div className="login-card">
                        <h2 className="login-title">{isEn ? 'Forgot your password?' : '¿Olvidaste tu contraseña?'}</h2>
                        <form onSubmit={handleSubmit} className="login-form" aria-label={isEn ? 'Forgot password form' : 'Formulario de recuperación'}>
                            <label className="login-field">
                                <span className="label">{isEn ? 'Email' : 'Correo electrónico'}</span>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder={isEn ? 'youremail@example.com' : 'tucorreo@ejemplo.com'}
                                    autoComplete="email"
                                />
                            </label>
                            {error && <div className="form-error" style={{ color: '#e74c3c', marginBottom: 8 }}>{error}</div>}
                            {success && <div className="form-success" style={{ color: '#27ae60', marginBottom: 8 }}>{success}</div>}
                            <button type="submit" className="login-submit" disabled={loading}>
                                {loading ? (isEn ? 'Sending…' : 'Enviando…') : (isEn ? 'Send reset link' : 'Enviar enlace')}
                            </button>
                        </form>
                        <p className="login-help">
                            <Link href="/login" className="login-help__link">{isEn ? 'Back to login' : 'Volver a iniciar sesión'}</Link>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ForgotPassword;
