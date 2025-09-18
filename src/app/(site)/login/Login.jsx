'use client';
import React, { useEffect, useState } from 'react';
import HttpService from '../../../services/HttpService';
import { timerAlert } from '../../../helpers/alerts';
import useStore from '../../../store/useStore';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const Login = () => {
    const login = useStore((state) => state.login);
    const httpService = new HttpService();
    const router = useRouter();
    const token = useStore((state) => state.token);

    const [username, setUsername] = useState('racknarow1@gmail.com');
    const [password, setPassword] = useState('camilo2676');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (token) {
            router.push('/');
        }
    }, [token, router]);

    if (token) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const data = { email: username, password };
        handleLogin(data);
    };

    const handleLogin = async (data) => {
        try {
            setLoading(true);
            const response = await httpService.postData('/auth/login', data);
            if (response.status === 200) {
                const token = response.data.token;
                login(token);
                await timerAlert('Success!', 'Login successful', 2000).then(() => {
                    router.push('/');
                });
            } else {
                console.error('Error:', response);
            }
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="login-page">
          <div className="container-narrow">
            <div className="login-wrap">
              {/* Icono/branding arriba */}
              <div className="login-brand">
                <img src="/logo_horizontal_final.png" alt="STL HUB" />
              </div>

              {/* Tarjeta glass con el formulario */}
              <div className="login-card">
                <h2 className="login-title">Inicia sesión</h2>
                <form onSubmit={handleSubmit} className="login-form" aria-label="Formulario de inicio de sesión">
                  <label className="login-field">
                    <span className="label">Email</span>
                    <input
                      type="email"
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="tucorreo@ejemplo.com"
                    />
                  </label>

                  <label className="login-field password-field">
                    <span className="label">Password</span>
                    <div className="input-wrap">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        className="pass-toggle"
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          // eye-off
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M10.58 6.14A9.73 9.73 0 0 1 12 6c5.5 0 9.5 6 9.5 6s-.71 1.12-1.98 2.5M6.48 6.5C4.25 8.2 2.5 12 2.5 12s2.2 3.93 5.69 5.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15.5 15.5A4 4 0 0 1 8.5 8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          // eye
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        )}
                      </button>
                    </div>
                  </label>

                  <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? 'Accediendo…' : 'Acceder'}
                  </button>
                </form>

                {/* Mensaje de ayuda bajo el inicio de sesión */}
                <p className="login-help">
                  ¿No tienes cuenta?{' '}
                  <Link href="/suscripcion" className="login-help__link">Suscríbete</Link>
                </p>
              </div>
            </div>
          </div>
        </section>
    );
};

export default Login;
