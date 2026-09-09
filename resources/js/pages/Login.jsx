import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const savedEmail = localStorage.getItem('remembered_email');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/login', {
                email,
                password,
                device_name: 'web_browser',
            });
            
            const { token, user } = response.data;
            
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            if (rememberMe) {
                localStorage.setItem('remembered_email', email);
            } else {
                localStorage.removeItem('remembered_email');
            }
            
            // Redirect to the onboarding orchestrator instead of directly to dashboard
            navigate('/onboarding');
            
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal login. Periksa kembali email dan password Anda.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="teka-hero min-h-screen flex items-center justify-end p-4 md:p-12">
            <div className="bg-stone-100 rounded-[2rem] shadow-2xl border border-stone-700 w-full max-w-md overflow-hidden text-stone-950">
                <div className="p-8 border-b border-stone-300">
                    <p className="teka-kicker text-stone-500 mb-5">Portal kehadiran</p>
                    <h1 className="teka-display text-5xl">Wonten <span className="teka-accent">Teka.</span></h1>
                    <p className="text-stone-500 mt-4 text-sm">Masuk untuk mengelola hari kerja Anda.</p>
                </div>
                
                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 w-full rounded-md border-stone-300 bg-transparent focus:border-orange-600 focus:ring focus:ring-orange-200 py-3 border px-4 text-stone-900"
                                    placeholder="Masukkan email anda"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400" />
                                </div>
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 pr-10 w-full rounded-md border-stone-300 bg-transparent focus:border-orange-600 focus:ring focus:ring-orange-200 py-3 border px-4 text-stone-900"
                                    placeholder="Masukkan password anda"
                                    required
                                />
                                <button 
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-stone-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700">
                                Ingat Saya
                            </label>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-black text-white font-semibold py-3 px-4 rounded-md hover:bg-orange-600 transition-colors flex justify-center items-center mt-4"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Masuk (Login)'}
                        </button>
                    </form>
                </div>
                
                <div className="bg-stone-200 p-4 text-center text-xs text-stone-500 border-t border-stone-300">
                    &copy; {new Date().getFullYear()} Lemdiklat Taruna Nusantara Indonesia
                </div>
            </div>
        </div>
    );
};

export default Login;
