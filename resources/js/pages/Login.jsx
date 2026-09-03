import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2 } from 'lucide-react';
import api from '../api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            // Use Sanctum token approach like mobile
            const response = await api.post('/login', {
                email,
                password,
                device_name: 'web_browser',
            });
            
            const { token, user } = response.data;
            
            // Store token and user
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            // Navigate based on role
            const isAdmin = user.is_super_admin || (user.roles && user.roles.some(r => r.name === 'admin' || r.name === 'super_admin'));
            if (isAdmin) {
                navigate('/admin/dashboard');
            } else {
                navigate('/employee/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal login. Periksa kembali email dan password Anda.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-500 to-green-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-8 text-center bg-green-50 border-b border-green-100">
                    <h1 className="text-3xl font-extrabold text-green-800 tracking-tight">Wonten Teka</h1>
                    <p className="text-green-600 mt-2 text-sm">Sistem Presensi Lemdiklat Taruna Nusantara</p>
                </div>
                
                <div className="p-8">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                            {error}
                        </div>
                    )}
                    
                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input 
                                    type="email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-10 w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 py-3 border px-4"
                                    placeholder="Masukkan email anda"
                                    required
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 w-full rounded-xl border-gray-300 shadow-sm focus:border-green-500 focus:ring focus:ring-green-200 focus:ring-opacity-50 py-3 border px-4"
                                    placeholder="Masukkan password anda"
                                    required
                                />
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:from-green-700 hover:to-green-900 transition-all transform hover:scale-[1.02] active:scale-95 flex justify-center items-center"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Masuk (Login)'}
                        </button>
                    </form>
                </div>
                
                <div className="bg-gray-50 p-4 text-center text-xs text-gray-500">
                    &copy; 2026 Lemdiklat Taruna Nusantara Indonesia
                </div>
            </div>
        </div>
    );
};

export default Login;
