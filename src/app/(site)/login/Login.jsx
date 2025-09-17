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
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-4">
                    <h2 className="text-center mb-4">Login</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label htmlFor="username" className="form-label">Email</label>
                            <input type="text" className="form-control" id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input type="password" className="form-control" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                            {loading ? 'Accediendo...' : 'Acceder'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
