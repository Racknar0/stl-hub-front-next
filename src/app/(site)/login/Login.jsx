'use client';
import React, { useEffect, useState } from 'react';
import HttpService from '../../../services/HttpService';
import { timerAlert } from '../../../helpers/alerts';
import useStore from '../../../store/useStore';
import { useRouter } from 'next/navigation';

const Login = () => {
    const login = useStore((state) => state.login);
    const httpService = new HttpService();
    const router = useRouter();
    const token = useStore((state) => state.token);

    const [username, setUsername] = useState('racknarow@gmail.com');
    const [password, setPassword] = useState('123456');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (token) {
            router.push('/dashboard');
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
                    router.push('/dashboard');
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

                  <label className="login-field">
                    <span className="label">Password</span>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                  </label>

                  <button type="submit" className="login-submit" disabled={loading}>
                    {loading ? 'Accediendo…' : 'Acceder'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
    );
};

export default Login;
